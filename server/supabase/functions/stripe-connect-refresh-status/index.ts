// Actively re-checks the caller's Connect account status against Stripe,
// rather than waiting on the account.updated webhook. Needed because
// Connect account.updated events for classic Express accounts don't
// reliably reach an account-scoped ("Your account") webhook destination
// under newer Stripe API versions — the "Connected accounts" event scope
// only exposes newer v2-account event types, not the classic event. The
// frontend calls this once when the user lands back from Stripe's hosted
// onboarding (`?stripe=return`), so onboarding completion is reflected
// immediately instead of depending solely on webhook delivery.
// Inlined rather than imported from ../_shared — this project deploys via
// the Supabase Dashboard's browser editor, which only bundles files within
// a function's own directory, not sibling folders.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const caller = await callerProfile(req);
  if (!caller) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = supabaseAdmin();
  const { data: account } = await admin
    .from("payment_accounts")
    .select("*")
    .eq("profile_id", caller.id)
    .maybeSingle();

  if (!account?.stripe_account_id) {
    return new Response(JSON.stringify({ error: "no_connect_account" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
  const status = stripeAccount.charges_enabled && stripeAccount.payouts_enabled
    ? "complete"
    : "pending";

  await admin
    .from("payment_accounts")
    .update({ onboarding_status: status })
    .eq("profile_id", caller.id);

  return new Response(JSON.stringify({ status }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
