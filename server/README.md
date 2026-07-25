# Backend setup

Real backend for The Guild Masters: Supabase (Postgres + Auth + Storage) +
Stripe Connect for payouts. Everything in this folder is code — the steps
below are the manual, one-time setup that only a human can do (creating
accounts, generating API keys). Claude cannot create these accounts for you.

None of this is required for the existing prototype (`app/`) to keep
working — if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset, the
frontend falls back to its original fully-local behavior untouched.

## 1. Create the Supabase project

1. Go to https://supabase.com, create an account, create a new project
   (any region/plan — the free tier covers this stage).
2. In the project's **Settings -> API** page, copy:
   - **Project URL** -> becomes `VITE_SUPABASE_URL` (frontend) and
     `SUPABASE_URL` (edge functions)
   - **anon public key** -> `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
   - **service_role key** -> `SUPABASE_SERVICE_ROLE_KEY` (edge functions
     only — never put this in the frontend `.env`, it bypasses RLS)

## 2. Run the schema

Easiest path (no CLI needed): open the Supabase Dashboard's **SQL Editor**
and run, in order:
1. `supabase/migrations/0001_init_schema.sql`
2. `supabase/migrations/0002_functions_rls.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/migrations/0004_admin_venue_crud.sql`
5. `supabase/seed.sql` (creates the single launch chapter)

(Or, with the Supabase CLI installed: `supabase link --project-ref <ref>`
then `supabase db push`.)

## 3. Enable Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application). Authorized redirect URI is shown
   in the next step.
2. In the Supabase Dashboard: **Authentication -> Providers -> Google**,
   enable it, paste the Client ID and Client Secret from step 1.

## 4. Set your first admin

`is_admin` can only be changed via the `admin_set_role` RPC, which requires
an existing admin — so the very first one has to be set by hand. After you
sign in once through the app (so your `profiles` row exists), run in the
SQL Editor:

```sql
update profiles set is_admin = true where id = '<your-user-id-from-auth.users>';
```

From then on, use the Admin Console (Settings -> "Open Admin Console") or
`admin_set_role` to promote/demote anyone else.

## 5. Stripe (payments)

1. Create a free Stripe account at https://stripe.com — test mode is free,
   no charges happen until you go live.
2. **Developers -> API keys**: copy the test **Secret key** ->
   `STRIPE_SECRET_KEY`.
3. Deploy the edge functions, then **Developers -> Webhooks -> Add
   endpoint**, pointing at your deployed `stripe-webhook` function URL.
   Copy the **Signing secret** -> `STRIPE_WEBHOOK_SECRET`.

## 6. Deploy the Edge Functions

```sh
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://madcowg.github.io/The-Guild-Masters
```

`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are injected
automatically for Supabase-hosted Edge Functions — no need to set those
secrets yourself.

## 7. Frontend

```sh
cp app/.env.example app/.env.local
# fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

## What's still prototype-only after this

- The existing quest/board/party gameplay (`app/src/App.jsx`'s `player`
  state) still runs entirely on `localStorage` — it has not been migrated
  to the `postings`/`disputes`/`steward_log` tables yet. Those tables
  exist and are RLS-protected, but nothing writes to them yet except the
  Admin Console (venues, roles, ID verification).
- ID verification is manual review only (file upload + admin approve/
  reject) — no third-party verification vendor integrated (deferred, see
  CLAUDE.md Tier 1).
- Payments: Stripe Connect account creation/onboarding is wired, but
  there's no checkout/escrow flow yet tying a quest's payout to an actual
  charge — that's the next piece once the quest data model itself moves
  to Supabase.
