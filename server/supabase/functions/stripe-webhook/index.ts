// Stripe sends events here (configure the webhook URL + this function's
// signing secret in the Stripe Dashboard, test mode to start). Runs with
// the service role since Stripe isn't a logged-in Supabase user.
import Stripe from "npm:stripe@17";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  const admin = supabaseAdmin();

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const status = account.charges_enabled && account.payouts_enabled ? "complete" : "pending";
      await admin
        .from("payment_accounts")
        .update({ onboarding_status: status })
        .eq("stripe_account_id", account.id);
      break;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await admin
        .from("transactions")
        .update({ status: event.type === "payment_intent.succeeded" ? "succeeded" : "failed" })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }
    default:
      // Unhandled event types are fine to ignore — Stripe sends many more
      // than this prototype needs to act on yet.
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
