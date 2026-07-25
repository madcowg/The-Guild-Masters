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
1. **Real backend + multi-user database.** The entire app today is
   single-player/localStorage with simulated NPCs (seed petitioners, seed
   steward queue, etc.). Every item below assumes real accounts and shared
   state that doesn't exist yet.
2. **Admin console / control panel.** A separate control surface (not just
   the in-app Steward's Ledger) to run every operational aspect of the
   platform: user account management (verify, suspend, support rank
   overrides), global moderation oversight (all postings/disputes/steward
   actions across all users, not just one player's own), Tavern partner-venue
   roster management (see Tier 3), payments/scrip oversight, ID-verification
   review queue, and an analytics dashboard for the north-star and
   phase-gate metrics already defined in "Product roadmap" above. In-fiction,
   this is where a real human plays "the Guild Council" — right now that's
   just an NPC label on auto-resolved actions.
3. **Real authentication** — Google OAuth + email/phone, replacing the
   stubbed landing-screen auth, tied to the real backend above.
4. **Real ID verification integration** (e.g. Stripe Identity, Persona,
   Onfido) — replaces the "mock ID verification, mark as verified" button.

**Tier 2 — Trust & economy infrastructure (before money or liability is real)**
5. **Payments integration** (Stripe Connect or equivalent) for scrip
   payout/escrow, plus 1099 tax reporting. Gig-economy labor classification
   already flagged elsewhere in this doc as needing legal review before this
   ships.
6. **Insurance partner integration** for the D+ "guild-covered insurance"
   promise — currently just UI copy with nothing behind it.
7. **Server-side enforcement of steward permissions.** The rank-ceiling /
   no-self-review governance logic (`canStewardApprove` in `App.jsx`) is
   correct but client-side only; once other real accounts exist it must be
   enforced server-side via the Admin Console's role system, not trusted
   from the client.

**Tier 3 — Engagement & the Tavern partner network**
8. **Multi-venue partner network for "The Tavern."** Since there's no fixed
   physical location at launch, "The Tavern" becomes a rotating roster of
   partner bars/breweries. Each partner venue needs: name/address, real
   coordinates + geofence radius for check-in, an active rotation window,
   and per-venue perks/promo terms — this is also the mechanism for
   promotional partnerships (sponsors get check-in/redemption analytics).
   **Rotation model (decided 2026-07-25):** exactly **one active venue per
   guild chapter** at a time — not a player-facing list/map. A chapter's
   venue can only be changed by the Guild Council (i.e. only via the Admin
   Console, item 2 — no player- or steward-level control over this,
   regardless of rank). Launch starts with one chapter, so one venue overall;
   the data model still needs to be chapter-scoped (`chapter -> activeVenue`)
   since multi-city chapters (Tier 5) will each rotate independently. This
   also changes the "Tavern beta" phase metric from one door's conversion
   rate to per-chapter (currently = one door) conversion.
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
