# Spectrum Sweepstakes — Product Roadmap & Vision

Living document. Captures agreed direction + ideas to iterate on. Nothing here is final;
the owner will keep adding ideas. Engineering sequences these in dependency order.

## Live now (built + deployed)
- Cloudflare Worker API (`api.spectrum-sweeps.co.uk`) + D1, static SPA frontend on GitHub Pages (`spectrum-sweeps.co.uk`).
- Leagues → Competitions with three format types (knockout / season-long / standings) and an admin-configurable scoring engine.
- Capacity-gated entry + a random draw (crypto RNG, pre-committed hash, published-seed audit trail).
- Admin UI (create leagues/competitions/participants/teams, run draw, enter results), format-aware leaderboard.
- Spectrum design system (dark + crimson/gold, branded shell, rank medallions, trust row).

## Accounts, roles & permissions
- **Password + invite-code signup.** First-ever account registered = **site owner**, highest level (L7), created automatically with no code. Everyone else needs a one-time code.
- **Two axes, both editable in housekeeping by L7+:**
  - **Level** (numeric, ~L1–L7): gates powerful actions (e.g. only L7+ edits roles/permissions; only a set level+ can click "Spin").
  - **Account type / role** (e.g. Owner, Admin, Organiser, Trader, Moderator, Participant): each carries a **permissions map** (capability flags) that L7+ can edit.
- Capabilities include: manage roles/permissions, manage users, generate codes (per type), organise leagues, run/spin draws, view audit/transparency, moderate community, enter results.
- Example: a **Trader** (nosy but not an admin) gets `viewAudit` so they can inspect any draw's paper trail.

## One-time codes (typed, generated from housekeeping)
Each code has a **purpose**; admins click a purpose-specific button in the relevant housekeeping section to mint one.
- **Signup code** — lets a new person register (optionally pre-sets their role/level/office).
- **Organiser grant** — issued by the **site owner** to let an existing **Organiser**-type account create + administer their **own** league/sweepstake (guards against abuse of the shared system). Redeemed in the "create sweepstake" section; grants admin of *that* league only.
- **Draw-entry code** — a participant verifies entry into a specific draw via a one-time code from an admin.
Codes are single-use, attributable (who created, who redeemed, when), and optionally expiring.

## Entry verification & payment
- Entering a sweepstake requires admin verification — either the participant redeems a **draw-entry code**, or an admin **assigns** them directly.
- On direct assignment the admin **must leave a payment note** (per-draw, individual). Payment can be **free** (engagement-only / just-for-fun / bragging-rights draws).
- Paid/unpaid + payment note tracked per entry.

## Scheduled live draw (the centrepiece)
- A full sweepstake does **not** auto-draw. An admin **schedules** the draw for a date/time.
- At that time, entered participants + the admin gather on the **draw page**. Only a sufficiently-privileged admin (e.g. L7) can click **Spin**.
- The spin is **synchronized live for everyone watching** (Durable Object + WebSockets) — same animation, same result, same moment.
- Shows: whose pick it is, who the admin running it is, all relevant draw info; a **per-draw chat/discussion**.
- Reveals one allocation at a time until the last, then **finalises** that sweepstake.
- The resulting **table / bracket / group view** shows each team (or driver/athlete) with the allocated person's name — a **continuous, permanent** feature of the sweepstake.
- **Visual identity per pick:** motorsport → **driver number** in its stylistic branding; teams/athletes → **crest/logo** (sourced from the web where available/applicable), with graceful fallback.

## Multiple sweepstake types per event
One real-world event can carry **several sweepstakes** at once, each with its own prize structure:
- Direct cash — **winner takes all**.
- Direct cash — **ranked** (top 3, or comp-specific e.g. top 4 for the Premier League) — can co-exist with a winner-takes-all.
- **Prize** (physical item) — winner-takes-all and/or ranked.
- **B-Hive points** — contingent on management allocating a points pool; winner-takes-all or ranked.
Model direction: an **Event** groups multiple **Sweepstakes (draws)**; each sweepstake has its own entrants, draw, prize structure and payouts.

## Transparency / audit page
- A dedicated page where permitted account types (e.g. Trader) can **inspect any individual spin** end-to-end: who was involved, exact timestamp, where it happened, the RNG **seed/token & commit hash**, algorithm, and the full ordered paper trail — verifiable against the published seed.

## Community (attached to accounts)
- **Profiles** with **badges**: which sweepstakes someone's in + their **current position** (format-aware — round reached for brackets, league position for season-long, points-rank for standings), plus **historic placements** from finished sweepstakes.
- **Discussions** (forum) and **Polls**, per league/event.
- **Realtime chat** (WebSockets), including a chat window per draw/sweepstake.

## Build order (engineering)
1. Auth foundation: password signup, typed one-time codes, first-user-owner, sessions. *(in progress)*
2. Roles/levels + editable permissions in housekeeping; auth-gate API + login/register UI.
3. Scheduled live draw (Durable Object + WebSockets): schedule, synchronized spin, per-draw chat, finalise.
4. Transparency/audit page.
5. Entry verification (draw-entry codes, admin assign + payment note).
6. Multiple sweepstakes/prize structures per event.
7. Profiles + badges + historic placements.
8. Discussions + polls; team/driver visual identity (crests / driver numbers).
9. Organiser delegation end-to-end.
