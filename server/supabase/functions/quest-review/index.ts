// Steward/admin approval of a pendingReview posting. For non-barter
// postings, approval also places a manual-capture payment hold (the
// employer's card is authorized but not charged) for the quest price
// plus the platform's 3% fee, added on top of what the employer pays.
//
// Order matters here: we authorize the payment FIRST, then flip the
// posting to 'open' via the review_posting RPC (which re-checks the
// rank-ceiling/no-self-review rules using the caller's own auth.uid()).
// If the RPC rejects the caller (not actually authorized to review this
// posting), we cancel the just-created authorization rather than leaving
// an orphaned hold on the employer's card.
//
// Inlined helpers rather than imported from ../_shared — this project
// deploys via the Supabase Dashboard's browser editor, which only
// bundles files within a function's own directory.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// A client scoped to the caller's own JWT, so RPCs relying on auth.uid()
// (like review_posting's rank-ceiling check) resolve correctly — the
// admin client above has no user session and would see auth.uid() as null.
function callerClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const client = callerClient(req);
  if (!client) return json({ error: "unauthenticated" }, 401);

  const { posting_id, approve } = await req.json();
  if (!posting_id || typeof approve !== "boolean") {
    return json({ error: "posting_id and approve are required" }, 400);
  }

  const admin = supabaseAdmin();
  const { data: posting } = await admin
    .from("postings")
    .select("*")
    .eq("id", posting_id)
    .single();
  if (!posting) return json({ error: "posting not found" }, 404);
  if (posting.status !== "pendingReview") {
    return json({ error: "posting is not awaiting review" }, 400);
  }

  // Barter postings and rejections never touch Stripe — just delegate
  // straight to the RPC.
  if (posting.is_barter || !approve) {
    const { error } = await client.rpc("review_posting", {
      p_posting_id: posting_id,
      p_approve: approve,
    });
    if (error) return json({ error: error.message }, 403);
    return json({ ok: true });
  }

  if (!posting.employer_payment_method_id) {
    return json({ error: "no payment method on file for this quest" }, 400);
  }

  const takerCutCents = posting.scrip * 100;
  const totalChargeCents = Math.round(takerCutCents * 1.03);

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeCents,
      currency: "usd",
      payment_method: posting.employer_payment_method_id,
      confirm: true,
      capture_method: "manual",
      off_session: true,
      description: `The Guild Masters quest: ${posting.title}`,
      metadata: { posting_id },
    });
  } catch (err) {
    await admin.from("postings").update({ payment_status: "failed" }).eq("id", posting_id);
    return json({ error: `payment authorization failed: ${err.message}` }, 402);
  }

  const { error: reviewError } = await client.rpc("review_posting", {
    p_posting_id: posting_id,
    p_approve: true,
  });
  if (reviewError) {
    // Don't leave a hold on the employer's card for a posting that
    // didn't actually get approved.
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
    return json({ error: reviewError.message }, 403);
  }

  await admin
    .from("postings")
    .update({
      payment_intent_id: paymentIntent.id,
      payment_status: "authorized",
      authorized_at: new Date().toISOString(),
    })
    .eq("id", posting_id);

  return json({ ok: true, payment_intent_id: paymentIntent.id });
});
