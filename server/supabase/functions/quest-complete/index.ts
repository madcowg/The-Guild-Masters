// Employer confirms a sealed quest's work is done ("scrip released to
// the taker" in the original single-player prototype). For non-barter
// quests, this transfers the taker's cut (the posted scrip amount,
// excluding the platform's 3% fee, which was captured on top at seal
// time) from the platform's Stripe balance into the taker's connected
// account, and records the transaction. Also credits the taker's real
// profile with xp/scrip/stat gains -- this is the sole authoritative
// "quest done" event, so real rewards are granted here rather than via
// a separate taker-side "mark complete" self-report.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const XP_PER_RANK: Record<string, number> = { F: 20, E: 35, D: 60, C: 100, B: 160, A: 250, S: 400 };

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

  const { posting_id, rating } = await req.json();
  if (!posting_id || !(rating >= 1 && rating <= 5)) {
    return json({ error: "posting_id and a rating between 1 and 5 are required" }, 400);
  }

  const admin = supabaseAdmin();
  const { data: posting } = await admin
    .from("postings")
    .select("*")
    .eq("id", posting_id)
    .single();
  if (!posting) return json({ error: "posting not found" }, 404);
  if (posting.employer_id !== caller.id) {
    return json({ error: "only the posting's employer may confirm completion" }, 403);
  }
  if (posting.status !== "sealed") {
    return json({ error: "posting is not sealed" }, 400);
  }

  const disputed = rating <= 2;

  if (!posting.is_barter) {
    if (posting.payment_status !== "captured" || !posting.payment_intent_id) {
      return json({ error: "posting has no captured payment to release" }, 400);
    }

    const { data: takerAccount } = await admin
      .from("payment_accounts")
      .select("*")
      .eq("profile_id", posting.taker_id)
      .maybeSingle();
    if (!takerAccount?.stripe_account_id) {
      return json({ error: "taker has no connected payout account" }, 400);
    }

    const takerCutCents = posting.scrip * 100;
    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: takerCutCents,
        currency: "usd",
        destination: takerAccount.stripe_account_id,
        transfer_group: `posting_${posting_id}`,
      });
    } catch (err) {
      return json({ error: `payout transfer failed: ${err.message}` }, 402);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(posting.payment_intent_id);
    const platformFeeCents = (paymentIntent.amount ?? takerCutCents) - takerCutCents;

    await admin.from("transactions").insert({
      posting_id,
      payer_id: posting.employer_id,
      payee_id: posting.taker_id,
      amount_cents: takerCutCents,
      platform_fee_cents: platformFeeCents,
      currency: "usd",
      stripe_payment_intent_id: posting.payment_intent_id,
      status: "succeeded",
    });

    await admin
      .from("postings")
      .update({ payment_status: "transferred", transferred_at: new Date().toISOString() })
      .eq("id", posting_id);

    void transfer;
  }

  // Credit the real taker's own profile -- otherwise a "real" quest has no
  // real consequence for the taker. Reuses postings.stats (the exact
  // {STAT: points} object already computed at posting-creation time, no
  // need to recompute) and applies for barter postings too (xp/stats still
  // awarded, scrip stays 0). Deliberately does not replicate the mock's
  // party-reward-splitting math -- no real party membership backs real
  // postings yet, so the full reward goes to the one real taker.
  const { data: takerProfile } = await admin
    .from("profiles")
    .select("xp, scrip, stats")
    .eq("id", posting.taker_id)
    .single();

  const mergedStats: Record<string, number> = { ...(takerProfile?.stats ?? {}) };
  for (const [k, v] of Object.entries(posting.stats ?? {})) {
    mergedStats[k] = (mergedStats[k] ?? 0) + (v as number);
  }

  await admin
    .from("profiles")
    .update({
      xp: (takerProfile?.xp ?? 0) + (XP_PER_RANK[posting.rank] ?? 0),
      scrip: (takerProfile?.scrip ?? 0) + (posting.is_barter ? 0 : posting.scrip),
      stats: mergedStats,
    })
    .eq("id", posting.taker_id);

  await admin
    .from("postings")
    .update({ status: "done", my_rating: rating, disputed })
    .eq("id", posting_id);

  return json({ ok: true });
});
