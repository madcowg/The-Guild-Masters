# The Guild Masters — Project Handoff

Companion app to **The Tavern**, a physical space. Gamifies everyday tasks and
services (odd jobs, professional services, social outings) as an MMORPG/isekai
guild system. Currently a single-file React prototype (`index.html`) built for
demoing the concept and gathering feedback before any real backend exists.

## Current state

`index.html` is a **fully self-contained, bundled** file: React + ReactDOM +
the entire app, minified into one `<script>` tag, deployed via GitHub Pages at
`https://madcowg.github.io/The-Guild-Masters/`. There is no build step for the
deployed artifact today — it's a finished bundle, not source.

The actual editable source (JSX, pre-bundle) is NOT currently in this repo in
clean form — it was developed conversationally and bundled directly to HTML.
**First task for Claude Code: reconstruct/extract a clean `src/` (e.g.
`App.jsx` + a proper `package.json`/Vite or esbuild setup) from `index.html`
so the project is maintainable going forward, rather than continuing to hand-edit
minified output.**

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

## Suggested next steps for Claude Code

1. Extract clean source from `index.html` into a real `src/` + build config
   (Vite recommended over hand-rolled esbuild for DX) so future changes don't
   require re-editing minified output.
2. Add the employer-side "steward/admin" view (approving new postings before
   they go public, handling disputes) — currently postings go live
   immediately with no moderation step.
3. Consider real notifications (the "your seal was pressed" moment is the
   strongest re-engagement hook and currently only shows as an in-session
   toast).
4. Party-quest flow currently only unlocks rank access — reward splitting
   across party members on completion isn't implemented yet.
