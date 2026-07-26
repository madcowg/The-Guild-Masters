// Employer selects a taker for an open posting ("sealing" a petition).
// This is the "paid in advance" moment: for non-barter quests, we
// capture the already-authorized PaymentIntent here, charging the
// employer's card in full right when they commit to a taker — well
// before the work is confirmed done. The taker's cut isn't transferred
// yet (see quest-complete); the captured funds sit in the platform's own
// Stripe balance until completion is confirmed, so a dispute before then
// still leaves room to refund the employer instead of paying the taker.
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

async function callerProfile(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return null;
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();
  return profile ?? null;
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

  const caller = await callerProfile(req);
  if (!caller) return json({ error: "unauthenticated" }, 401);

  const { posting_id, taker_id } = await req.json();
  if (!posting_id || !taker_id) return json({ error: "posting_id and taker_id are required" }, 400);

  const admin = supabaseAdmin();
  const { data: posting } = await admin
    .from("postings")
    .select("*")
    .eq("id", posting_id)
    .single();
  if (!posting) return json({ error: "posting not found" }, 404);
  if (posting.employer_id !== caller.id) {
    return json({ error: "only the posting's employer may seal it" }, 403);
  }
  if (posting.status !== "open") {
    return json({ error: "posting is not open" }, 400);
  }

  if (!posting.is_barter) {
    if (posting.payment_status !== "authorized" || !posting.payment_intent_id) {
      return json({ error: "posting has no active payment hold" }, 400);
    }

    const { data: takerAccount } = await admin
      .from("payment_accounts")
      .select("*")
      .eq("profile_id", taker_id)
      .maybeSingle();
    if (!takerAccount || takerAccount.onboarding_status !== "complete") {
      return json({ error: "taker has not finished connecting a payout account" }, 400);
    }

    try {
      await stripe.paymentIntents.capture(posting.payment_intent_id);
    } catch (err) {
      return json({ error: `payment capture failed: ${err.message}` }, 402);
    }

    await admin
      .from("postings")
      .update({ payment_status: "captured", captured_at: new Date().toISOString() })
      .eq("id", posting_id);
  }

  await admin
    .from("postings")
    .update({ taker_id, status: "sealed" })
    .eq("id", posting_id);

  await admin
    .from("posting_petitions")
    .update({ status: "sealed", decided_at: new Date().toISOString() })
    .eq("posting_id", posting_id)
    .eq("petitioner_id", taker_id);

  await admin
    .from("posting_petitions")
    .update({ status: "declined", decided_at: new Date().toISOString() })
    .eq("posting_id", posting_id)
    .eq("status", "pending")
    .neq("petitioner_id", taker_id);

  return json({ ok: true });
});
