# The Guild Masters — Project Handoff

Companion app to **The Tavern**, a physical space. Gamifies everyday tasks and
services (odd jobs, professional services, social outings) as an MMORPG/isekai
guild system. Currently a single-file React prototype (`index.html`) built for
demoing the concept and gathering feedback before any real backend exists.

## Current state

The editable source lives in `app/` — a Vite + React project (`app/src/App.jsx`,
`constants.js`, `components/QuestCard.jsx`, etc.). `npm run build` in `app/`
produces `app/dist/index.html` as a **fully self-contained, single-file**
bundle (via `vite-plugin-singlefile`); that output gets copied over the
repo-root `index.html`, which is what GitHub Pages actually deploys at
`https://madcowg.github.io/The-Guild-Masters/`. `app/node_modules/` and
`app/dist/` are gitignored — only source is tracked. There is still no CI/build
step on the deploy side: rebuild locally and commit the updated root
`index.html` alongside any `app/src` changes.

**Gotcha specific to this codebase:** a plain-quoted JSX attribute like
`placeholder="•••"` is NOT interpreted as a JS escape — JSX
treats quoted attribute values as literal text (like HTML), so it renders the
literal backslash-u text instead of the intended character. Any `\uXXXX`
(or similar) escape in an attribute must be wrapped in a JS expression:
`placeholder={"•••"}`. This bit the OTP-dots and several
ellipsis/em-dash placeholders once already — watch for it when adding new
placeholder/label text with non-ASCII characters.

## Critical bug already hit once — avoid repeating it

If you ever rebuild the standalone HTML bundle yourself: **do not import the
app's source file via an absolute filesystem path that lives outside the
bundler's project directory** (e.g. `import App from "/mnt/somewhere/App.jsx"`
from a different project root). Doing this caused esbuild to silently bundle
**two separate copies of React** — react-dom set its internal hook dispatcher
on one copy while the app's `useState` calls read from the other, which stayed
`null` forever. Symptom: blank page, console error `Cannot read properties of
null (reading 'useState')`, page renders nothing, no build errors at all.
Fix: always bundle from a relative import within the same project/node_modules
tree. Verify by counting `react.production` occurrences in the output bundle
— there should be exactly one set (react + react-dom share it), never a
duplicate set.

Also learned: GitHub Pages is case-sensitive and expects the root file to be
named exactly `index.html` (lowercase) — a mobile-uploaded `Index.html` caused
a silent 404 once. And GitHub Pages runs Jekyll by default, which chokes on
`{{ }}` patterns that show up incidentally in minified JS — an empty
`.nojekyll` file at repo root is required and is already in place.

## Core game design rules (do not casually change without re-checking math)

**Ranks:** F → E → D → C → B → A → S. Rank gates real-world access:
- Below E: cannot enter The Tavern at all.
- E+: can enter The Tavern.
- D+: Tavern club membership + guild-covered insurance for sanctioned quests.
- B+: contracts only acceptable *while physically checked into* The Tavern.
- A party (2+ members) lets the party attempt quests one rank above the
  highest member's own rank.

**XP curve (steepens sharply — intentional, gates late ranks behind real
commitment):**
```
E: 10 XP   D: 100 XP   C: 600 XP   B: 2,400 XP   A: 8,000 XP   S: 24,000 XP
```
(cumulative totals to attempt each rank's trial)

**Character level** (separate from rank) costs more XP each level:
`xpForLevel(n) = 25 * (n-1) * n` — i.e. level 2 costs 50 XP, level 3 costs
100 more, etc.

**Stat rewards per completed quest, gated by the quest's rank** — this is a
hard rule, not a suggestion:
| Rank band | # distinct stats trainable | Total points awarded |
|---|---|---|
| F, E | 1 | 1 |
| D, C | 2 | 2 |
| B, A | 3 | 3 |
| S | 4 | 4 |

Six stats: STR, DEX, CON, INT, WIS, CHA — mapped thematically to job type
(labor→STR, crafts/repairs→DEX, endurance/treks→CON, tutoring/coding→INT,
planning/searching→WIS, social/hosting→CHA). Stats have **unlimited growth**
(no cap) — the character sheet displays them as an MvC2-style character-select
grid of tiles rather than progress bars specifically so the UI doesn't break
as numbers grow arbitrarily large. Tile frame color escalates through named
tiers as a stat climbs: Novice (0+) → Tempered (10+) → Gilded (20+) →
Mythril (40+) → Legendary (80+).

## Visual language (intentional, keep consistent)

- **No emoji anywhere in the game board/cards** — every icon is a
  hand-authored inline SVG line-art icon in the app's ink color, to preserve a
  woodcut/engraved aesthetic. (Emoji are fine in casual chrome like toast
  messages, achievements list, buffs list — just not on quest cards or stat
  icons.)
- Quest cards are **wooden tablets hanging from a peg**, not tarot-style
  parchment cards (an earlier iteration used parchment; it was deliberately
  replaced). Each card has a drilled hole with a peg visibly passing through
  it, wood grain via inline SVG texture, chamfered (sawn-plank) corners, and a
  subtle "swing on hover" animation pivoting around the peg hole.
- Cards the player is under-ranked for show **rope bindings**, not padlocks
  or "locked" text. Binding complexity escalates with the quest's rank:
  - F/E: single sagging wrap + simple tied loop knot, frayed rope ends
  - D/C: two wraps (horizontal + vertical) + package-tie knot
  - B/A/S: double vertical + woven ring boss knot
  - Rope color = the quest's rank color. E is steel-gray specifically so it's
    visually distinct from D's teal (this was a deliberate fix — don't let E
    drift back toward green).
- Barter-board cards are the same wooden-tablet shape but sage-green stained
  wood, to distinguish the barter economy from the scrip economy at a glance.
- Attribute icons (hand-authored, keep the metaphor if redesigning): STR =
  flexed bicep silhouette, DEX = feather, CON = heart, INT = open book,
  WIS = all-seeing eye, CHA = theater/mask motif.
- Logo: a woodcut medallion — a guild-hall silhouette with a pennant, inside a
  notched circular ring border, line-art only.
- Fonts: Cinzel (headers/UI chrome), Alegreya (body), IM Fell English
  (italic/flavor text) — high-fantasy serif stack, loaded via Google Fonts.

## Feature inventory (all implemented in the current bundle)

- Email/phone auth + age gate (18+) + mock ID verification (all stubbed —
  no real backend)
- Boards: separate Jobs (scrip) and Barter (trade) sub-boards, same card
  format, rank filter chips colored by rank
- "Post a contract" flow: any player can post a job, rank-gated stat rules
  enforced automatically in the posting form, B+ auto-flagged Tavern-only
- Employer's Desk (in My Quests): view petitions from simulated adventurers
  (name, rank, guild rating, deed count, note), press-seal or decline, then
  confirm-and-rate on completion to release scrip/barter from escrow
- Take-a-quest flow: save to satchel, petition to take, awaiting-seal,
  active, complete → mutual star rating → stat points + XP + scrip awarded
  per the rank rules above
- Party system: form a party, recruit from a roster, unlocks quests one rank
  higher
- Character sheet lives behind tapping the profile avatar (top-left), NOT a
  separate nav tab — keeps bottom nav to 5 items (Boards/Quests/Party/Tavern/
  Hall)
- Profile: avatar upload (client-side canvas crop to a circle), gear icon
  opens settings (personal details, payout preference + tax ID — clearly
  marked prototype-only, chapter/theme preference with future themes greyed
  out, notification toggle)
- The Tavern: locked entirely below rank E; check-in toggle (stand-in for
  geolocation) gates B+ quest acceptance; membership perks list; buffs/boons
  redeemable only while checked in
- Achievements (Fledgling, Journeyfolk, Fair Trader, Fellowship, Past the
  Threshold [rank E], Member of the Hall [rank D], Patron of the Guild
  [fulfill your own posting])
- Guildhall: forum/notice board, DM threads ("ravens"), contact-admin
  petition form
- "Fresh postings" board refresh (recycles completed quest IDs back onto
  the boards — simulates new daily postings without a real backend)
- Persistence: `window.storage` API when running inside Claude, shimmed to
  `localStorage` in the standalone build for GitHub Pages

## Product roadmap / what "success" looks like (context for prioritization)

North-star metric: **quests completed per active member per month.**

1. **Prototype (current phase)** — success = people who try it want to come
   back and check the board again.
2. **Private alpha, one city, F/E ranks only, ~50–100 members** — the
   marketplace cold-start test. Watch: activation (≥60% complete one quest in
   week one), liquidity (≥70% of postings taken within 72h), posting rate
   (do members post, not just take). Seed the board with Guild Council
   postings if liquidity is weak.
3. **Tavern beta** — physical check-in goes live. Watch: board-to-Tavern-door
   conversion (% of E+ members who check in monthly). If people quest but
   never show up physically, the club/membership business model doesn't
   work.
4. **Trust layer** — real ID verification, real payments, insurance,
   disputes. **Flag for whoever builds this next: paying people for
   completing jobs likely triggers gig-economy labor classification and tax
   reporting obligations — this needs real legal review before payments go
   live, not just a feature flag.** Barter and social quests are much
   lower-risk to launch first for this reason.
5. **Multi-city chapters** — only after one Tavern's unit economics are
   proven. Themes already planned/named in the UI: Neo-Kyoto (cyberpunk),
   The Athenaeum (Victorian), The Speakeasy (roaring '20s).

## Done since the original handoff

1. **Source extraction** — clean `app/src/` Vite project, no more hand-edited
   minified output. See "Current state" above.
2. **Steward/admin moderation view** — new postings land with
   `status: "pendingReview"` and are filtered off the public board
   (`App.jsx`, search `pendingReview`) until cleared from the Steward's
   Ledger (Guildhall tab). Governance rules (added after the initial build,
   see `canStewardApprove` in `App.jsx`):
   - Steward Tools toggle (`player.profile.isSteward`) only takes effect at
     Rank B+ (`canBeSteward`); below that the checkbox is disabled.
   - **No self-review**: a player can never approve/resolve their own
     postings or disputes — those (plus their own taker-side disputes)
     always route to "the Guild Council" (NPC/admin), swept on every
     "Fresh postings" click (`refreshBoard`).
   - **Rank ceiling**: a steward may only approve a request *strictly below*
     their own rank. Rank B/A/S requests always require the Guild Council,
     never a ranked guild member, regardless of the steward's own rank.
   - Third-party postings to review come from `SEED_STEWARD_QUEUE`
     (`constants.js`) / `player.stewardQueue` — needed because in this
     single-player prototype the player's own postings/disputes are always
     self-authored, so a simulated queue is what gives rank-gated approval
     something real to act on.
   - Every approve/reject/resolve action logs to `player.stewardLog`
     (actor + timestamp), shown as "Recent steward actions" in the Ledger.
   - Prototype-only: no real auth, still a client-side flag. Verified
     end-to-end in-browser at Rank C (ledger correctly hidden), Rank B
     (E/D/C approvable, B/S correctly Council-only), and via "Fresh
     postings" sweeping the remaining backlog.
3. **Persistent notifications** — `pushNotification()` appends to
   `player.notifications` (persisted, not just an ephemeral toast), with an
   unread-count badge on the bell icon and a dropdown list. Still no real
   push/OS-level notification — this is an in-app inbox only.
4. **Party reward splitting** — `completeQuestAndRate` in `App.jsx` divides
   XP/scrip/stat points across `partySize` (via `Math.ceil(x / partySize)`)
   when `partyAssisted` is set for that quest. Comment in source explains why
   it's a divided pool rather than per-member payout (no persisted account
   for NPC roster members).

## Beta → launch technical requirements (ranked, 2026-07-25)

Everything in "Done since the original handoff" was the old roadmap and is
done. This list is what's actually left before real (non-prototype) users can
use this, ranked by dependency order — earlier tiers block later ones.

**Tier 1 — Blocking foundation (nothing else works for real users without these)**
1. **Real backend + multi-user database — SCAFFOLDED, needs manual setup.**
   Schema (`server/supabase/migrations/`) covers profiles, chapters, venues
   + venue_history, postings, disputes, steward_log, id_verifications,
   payment_accounts, transactions, with RLS + SECURITY DEFINER RPCs
   enforcing the same governance rules as the client (no self-review, rank
   ceiling, admin-only venue changes). **Not yet done:** the existing
   quest/board/party gameplay in `App.jsx` still runs entirely on
   `localStorage` — only the Admin Console (venues, roles, ID verification)
   actually reads/writes Supabase so far. Migrating the core game loop is
   its own follow-on task. See `server/README.md` for setup (create the
   Supabase project, run the migrations — none of this happens
   automatically, a human has to do it).
2. **Admin console / control panel — BUILT** (`app/src/components/AdminConsole.jsx`,
   reachable from Settings → "Open Admin Console" when `profiles.is_admin`
   is true — a rank-independent flag, only ever changed via `admin_set_role`).
   Functional: Venue Management (add partner venues, switch the chapter's
   one active venue, backed by `admin_set_active_venue`/`admin_create_venue`),
   ID-verification review queue (approve/reject uploaded documents).
   Still stubbed/"coming soon": user account search & suspension, global
   cross-chapter moderation view, payments oversight dashboard — analytics
   dashboard for the north-star/phase-gate metrics not started.
   **Verified live end-to-end 2026-07-25**: real Google sign-up → profile
   row created → promoted to admin (first-admin bootstrap via SQL, per
   `server/README.md`) → Admin Console → added a partner venue → set it
   active → confirmed in `steward_log` with the real admin's name attached.
3. **Real authentication — BUILT AND VERIFIED LIVE** (Google OAuth via
   Supabase Auth, `app/src/auth/SupabaseAuthContext.jsx`). Gates the app in
   front of the existing mock landing flow; if `VITE_SUPABASE_URL`/
   `VITE_SUPABASE_ANON_KEY` are unset, it steps aside entirely and the
   original email/phone/OTP mock flow still runs untouched. Email/phone
   login as an alternative to Google was not built — Google-only for now.
   **Bug caught during live testing, fixed in migration 0005**: profiles
   never had a `chapter_id` assignment path at all (not set anywhere in the
   onboarding insert), which silently broke the Admin Console's venue
   lookups for any real signed-up user. Fixed with a `before insert` trigger
   that auto-assigns the earliest-created chapter — fine while there's only
   one chapter, needs revisiting once multi-chapter signup exists (Tier 5).
4. **Real ID verification — PARTIALLY BUILT, manual review only.** Player
   uploads a document (private Supabase Storage bucket) during onboarding;
   admin approves/rejects from the Admin Console. No third-party
   verification vendor (Stripe Identity/Persona/Onfido) integrated —
   deferred, needs a vendor choice + legal review first.

**Tier 2 — Trust & economy infrastructure (before money or liability is real)**
5. **Payments integration — SCAFFOLDED AND VERIFIED LIVE (Connect
   onboarding).** Chose Stripe (Connect Express, for marketplace-style
   payouts) — Square was the other real option with a usable sandbox;
   Venmo has no viable public marketplace/payout API, ruled out. Edge
   Functions exist (`server/supabase/functions/stripe-connect-onboarding`,
   `.../stripe-webhook`) for account onboarding and payment/account webhook
   events, writing to `payment_accounts`/`transactions`.
   **Stripe account note:** the original test-mode Stripe account
   (`acct_1TxEVtE2UOxc8cfV`) couldn't create Connect Express accounts —
   Stripe requires a "sandbox" (its newer isolated test-environment
   feature) before Connect is enabled, which required copying the account
   via Dashboard → Sandboxes → Create → "Copy your account". Live sandbox
   is `guild-masters-connect` (`acct_1TxIvl2R9Jk1FQiC`), configured as a
   Marketplace business model. Its API keys + a webhook destination
   (`guild-masters-stripe-webhook`, listening for `account.updated`,
   `payment_intent.succeeded`, `payment_intent.payment_failed`) are set in
   Supabase's `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` function secrets —
   the old account's keys are no longer live. Verified end-to-end: the
   in-app "Connect payout account (Stripe)" button successfully creates an
   Express account and redirects into Stripe's hosted onboarding. Ran a
   trial test-mode charge (test Visa token, destination charge with
   `transfer_data.destination` set to the connected account) — PaymentIntent
   succeeded, the connected account's balance received the transfer, and
   the `stripe-webhook` function logged a clean 200 on `payment_intent.succeeded`.
   **Known gap, fixed:** the `account.updated` webhook did not reliably
   reflect onboarding completion in `payment_accounts.onboarding_status`.
   Root cause: our webhook destination is scoped "Your account" in
   Stripe's newer Accounts-v2 event model, but classic Express connected
   accounts' `account.updated` events don't route there (nor does the
   "Connected accounts" scope expose the classic event — only newer
   v2-account event types). Rather than fight Stripe's event routing,
   added `server/supabase/functions/stripe-connect-refresh-status`: the
   frontend calls it once when Stripe redirects back with `?stripe=return`
   (wired in `app/src/auth/SupabaseAuthContext.jsx`), and it actively
   re-checks `charges_enabled`/`payouts_enabled` via `stripe.accounts.retrieve`
   instead of waiting on a webhook that may never arrive for this account
   type. This is the right pattern generally (webhooks can lag or be
   missed) — don't remove it even if the webhook routing gets sorted out
   later. Note: like the other two Edge Functions, this one deploys via
   the Supabase Dashboard's browser editor, which doesn't bundle sibling
   folders — its Supabase-admin/caller-profile helpers are inlined rather
   than imported from `_shared`, unlike the local repo copy layout elsewhere.
   **Quest payment lifecycle — BACKEND BUILT, NOT WIRED TO THE FRONTEND
   YET.** Business rules (explicit user decision): quests are paid for in
   advance of completion, unclaimed quests refund automatically after 7
   days, and a 3% platform fee (covering operating costs and Stripe's own
   processing fee) is added on top of the posted price rather than
   deducted from the taker's payout — so a 90-scrip quest charges the
   employer $92.70 and the taker still receives the full $90
   (1 scrip = $1, another explicit decision). Chose authorize-then-capture
   (a manual-capture PaymentIntent placed as a hold, not an immediate
   charge) specifically because Stripe never refunds its own processing
   fee — capturing immediately and refunding unclaimed quests would mean
   eating that fee on every expired posting for no reason, whereas
   canceling an uncaptured authorization costs nothing.
   Mapped onto the *existing* single-player prototype's own state
   machine rather than inventing new semantics: `pendingReview` → `open`
   (steward/admin approval, `review_posting` RPC) is where the hold gets
   placed; `sealPetition` (employer picks a taker) → `sealed` is where the
   hold gets captured — this is the actual "paid in advance" moment, well
   before work is verified done; `confirmAndRelease` (employer confirms
   completion) → `done` is where the taker's cut (captured amount minus
   the 3%) transfers to their connected account — this is deliberately
   the *only* point money reaches the taker, so a dispute before then
   still leaves room to refund the employer instead of paying out.
   Four new Edge Functions, `server/supabase/functions/quest-review`
   (wraps `review_posting`, authorizes payment on approval — cancels the
   just-placed hold if the RPC then rejects the reviewer, so a bad
   approval never leaves an orphaned hold on the employer's card),
   `quest-seal` (captures on taker selection), `quest-complete`
   (transfers on completion confirmation), and `quest-expire-sweep`
   (daily cron sweep that cancels holds on postings open 7+ days with no
   taker and marks them `expired` — a new posting status added alongside
   `rejected`, since "nobody claimed it in time" and "a steward actively
   declined it" are different things worth telling apart in the log).
   Schema: migration `0006_quest_payments.sql` adds payment tracking
   columns to `postings` (`payment_intent_id`, `payment_status`,
   `employer_payment_method_id`, timestamps) and `platform_fee_cents` to
   `transactions`. Migration `0007_quest_expire_cron.sql` schedules the
   sweep via `pg_cron`/`pg_net`. The shared secret authorizing that cron
   call lives *only* in Supabase Vault (generated in Postgres with
   `gen_random_bytes`, never typed or seen as a literal value anywhere,
   including this file) — the function verifies a presented token via a
   `check_cron_secret()` SQL function rather than an env var, so there's
   exactly one copy of the secret in existence. Verified end-to-end (SQL
   editor triggering the same `net.http_post` the cron job runs, checked
   against `net._http_response`): 200, `{"expired_count":0}`.
   **Real gaps before this is reachable by an actual user:** (1) there is
   still no employer-facing card collection UI anywhere in the app —
   only the taker side (Connect payout onboarding) exists. `quest-review`
   expects `postings.employer_payment_method_id` to already be set at
   posting-creation time; for now that only has a value if something
   supplies a raw Stripe payment method (a test token like `pm_card_visa`,
   the same approach used for the trial charge in item 5 above) — a real
   Stripe Elements/Payment Element flow in the "Post a Contract" UI is
   still needed. (2) None of this is reachable from the running app at
   all yet, since the quest/board game loop is still entirely
   `localStorage`-based (see item 1) — the existing `sealPetition`/
   `confirmAndRelease` functions in `App.jsx` don't call these Edge
   Functions yet. (3) 1099 tax reporting not started. Gig-economy labor
   classification already flagged elsewhere in this doc as needing legal
   review before this ships for real. No real payment methods are
   attached to the sandbox account per explicit instruction —
   infrastructure only, for future use.
6. **Insurance partner integration** for the D+ "guild-covered insurance"
   promise — currently just UI copy with nothing behind it.
7. **Server-side enforcement of steward permissions — SCAFFOLDED.** The
   `review_posting`/`resolve_dispute` Postgres RPCs (`0002_functions_rls.sql`)
   re-implement the same rank-ceiling + no-self-review rules as
   `canStewardApprove` in `App.jsx`, enforced server-side via SECURITY
   DEFINER functions — a client can't bypass them by skipping the UI gate.
   One correction worth noting: real disputes involve two distinct users,
   so a steward can genuinely recuse only when they're a party to that
   specific dispute (`raised_by`/`against`), rather than every dispute
   always being Council-only as in the single-player prototype. **Not yet
   done:** the existing `App.jsx` game loop doesn't call these RPCs yet —
   it still uses its own local `canStewardApprove`/`refreshBoard` logic
   against `localStorage` data (see item 1).

**Tier 3 — Engagement & the Tavern partner network**
8. **Multi-venue partner network for "The Tavern" — BACKEND BUILT, not yet
   wired into the game's Tavern screen.** `venues`/`chapters`/`venue_history`
   tables + `admin_create_venue`/`admin_set_active_venue` RPCs implement
   the decided model: exactly **one active venue per guild chapter** at a
   time, changeable only via the Admin Console (never a player or steward,
   regardless of rank) — see Venue Management in `AdminConsole.jsx`. Each
   venue has name/address/coordinates/geofence radius/promo terms.
   **Not yet done:** the in-game Tavern tab (`App.jsx`) still shows the old
   generic "The Tavern" with a manual check-in toggle — it doesn't read the
   chapter's real active venue or do real geofencing yet, and there's no
   partner-facing reporting (check-ins/redemptions) for selling/renewing
   sponsorships. This also changes the "Tavern beta" phase metric from one
   door's conversion rate to per-chapter (currently = one door) conversion.
9. **Push notifications** (web push / FCM / APNs) replacing the in-app-only
   inbox — flagged as the strongest re-engagement hook.
10. **Real ratings/reviews** replacing simulated NPC petitioners, once real
    other users exist to rate.

**Tier 4 — Quality/ops**
11. Automated tests for existing flows (moderation, party split,
    notifications) — none exist today.
12. Real CI/CD pipeline — deploy is currently manual (`npm run build` →
    copy `dist/index.html` → commit).

**Tier 5 — Rollout gates (product decisions, not engineering tasks)**
13. Private alpha — F/E ranks only, ~50–100 members, one city (cold-start
    liquidity test, see "Product roadmap" above).
14. Multi-city chapters — only after one city's unit economics prove out.
