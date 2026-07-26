// Scheduled sweep (invoked by pg_cron, see migration 0007): cancels the
// payment hold on any posting that's been open for 7 days with no taker,
// and marks it 'expired'. Not user-invoked, so it checks a shared secret
// instead of a Supabase JWT -- this function has "Verify JWT" turned off
// in its settings, same as stripe-webhook. The secret itself lives only
// in Supabase Vault (see migration 0007), verified via the
// check_cron_secret() SQL function -- never held as a literal value in
// this function's own env or code.
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

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  const presented = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!presented) return new Response("unauthorized", { status: 401 });

  const admin = supabaseAdmin();
  const { data: validSecret } = await admin.rpc("check_cron_secret", { token: presented });
  if (!validSecret) return new Response("unauthorized", { status: 401 });

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired } = await admin
    .from("postings")
    .select("id, title, payment_intent_id")
    .eq("status", "open")
    .eq("payment_status", "authorized")
    .lt("authorized_at", cutoff);

  let count = 0;
  for (const posting of expired ?? []) {
    if (posting.payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(posting.payment_intent_id);
      } catch (err) {
        // Stripe may have already auto-released the hold — that's fine,
        // we still want to mark the posting expired either way.
        if (!String(err.message).includes("already been canceled") &&
            !String(err.message).includes("no longer cancelable")) {
          console.error(`failed to cancel ${posting.payment_intent_id}:`, err.message);
          continue;
        }
      }
    }

    await admin
      .from("postings")
      .update({ status: "expired", payment_status: "canceled" })
      .eq("id", posting.id);

    await admin.from("steward_log").insert({
      actor_id: null,
      actor_label: "the Guild Council",
      action: "expired (no taker within 7 days)",
      target_type: "posting",
      target_id: posting.id,
      title: posting.title,
    });

    count++;
  }

  return new Response(JSON.stringify({ expired_count: count }), {
    headers: { "Content-Type": "application/json" },
  });
});
