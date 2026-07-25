// Creates (or resumes) a Stripe Connect Express account for the calling
// player so quest payouts can reach them, and returns an onboarding link
// for the frontend to redirect to. Test-mode Stripe keys are free — no
// live charges happen until the account and a real payment method exist.
import Stripe from "npm:stripe@17";
import { supabaseAdmin, callerProfile } from "../_shared/supabaseAdmin.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const caller = await callerProfile(req);
  if (!caller) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
  }

  const admin = supabaseAdmin();
  let { data: account } = await admin
    .from("payment_accounts")
    .select("*")
    .eq("profile_id", caller.id)
    .maybeSingle();

  let stripeAccountId = account?.stripe_account_id;

  if (!stripeAccountId) {
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
    });
    stripeAccountId = stripeAccount.id;
    await admin.from("payment_accounts").upsert({
      profile_id: caller.id,
      stripe_account_id: stripeAccountId,
      onboarding_status: "pending",
    });
    await admin.from("profiles").update({ stripe_connect_account_id: stripeAccountId }).eq("id", caller.id);
  }

  const origin = req.headers.get("origin") ?? Deno.env.get("APP_URL") ?? "http://localhost:5173";
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${origin}/?stripe=refresh`,
    return_url: `${origin}/?stripe=return`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ url: accountLink.url }), {
    headers: { "Content-Type": "application/json" },
  });
});
