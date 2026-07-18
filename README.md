# Spectrum Sweepstakes

Private office tournament tracker — knockout draws, season-long league draws, and
points-based standings across football, motorsport, and American sports, with an
optional bridge into Betfred's B-Hive recognition platform.

## Architecture

Split frontend/backend:

- **Frontend** — a static React Router v7 SPA (Tailwind CSS), hosted on **GitHub Pages**.
- **Backend** — a Cloudflare **Worker** (Hono API + **D1** database via Drizzle ORM), deployed separately.

The SPA calls the Worker cross-origin; the Worker URL is injected at build time
via `VITE_API_BASE_URL`. Live API: `https://spectrum-sweeps.relics62statues.workers.dev`.

## Layout

```
apps/worker/
  app/                # React Router SPA (frontend → GitHub Pages)
  server/             # Hono API + scoring engine (backend → Cloudflare Worker)
  workers/app.ts      # Worker entry (API-only)
packages/db/          # Drizzle schema, migrations, seed data
packages/shared/      # format_type, scoring-config zod schemas, shared types, id helper
```

## Getting started (local dev)

```bash
pnpm install

# one-time: create your own D1 database and apply migrations + seed
cd apps/worker
pnpm exec wrangler d1 migrations apply spectrum-sweeps-db --local
pnpm --filter @spectrum-sweeps/db run seed
pnpm exec wrangler d1 execute spectrum-sweeps-db --local --file=../../packages/db/seed/seed.sql

# run the two halves in separate terminals:
pnpm run dev:api    # Worker API on http://localhost:8787
pnpm run dev        # SPA (defaults to calling localhost:8787)
```

## Deploying

- **API (Worker)**: `cd apps/worker && pnpm run deploy:api` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), or via the `deploy-api.yml` GitHub Actions workflow on push to `main`.
- **Frontend (Pages)**: the `deploy-pages.yml` workflow builds the SPA and publishes to GitHub Pages on push to `main`. Set repo variable `API_BASE_URL` to the Worker URL (and `PAGES_BASE` if serving under a subpath rather than a custom-domain root).

## Scripts

- `pnpm run typecheck` / `pnpm run lint` / `pnpm run test` / `pnpm run build`
- `pnpm run db:generate` — regenerate Drizzle migrations after a schema change
- `pnpm run db:seed` — regenerate `packages/db/seed/seed.sql` from the sports catalog

## Status

Phase 1 (core tracker), deployed live: office groups, leagues, sports (seeded:
World Cup / Premier League / F1), competitions, participants, manual
draw/assignment entry, result entry, and a format-aware leaderboard, all wired
end-to-end against the real D1 database. Admin routes are expected to sit behind
Cloudflare Access at the edge — no app-level auth yet (phase 2).
