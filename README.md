# Spectrum Sweepstakes

Private office tournament tracker — knockout draws, season-long league draws, and
points-based standings across football, motorsport, and American sports, with an
optional bridge into Betfred's B-Hive recognition platform.

Full architecture and phased roadmap: see the engineering plan (Cloudflare
Workers + D1 + R2 + KV + Durable Objects, React Router v7 + Hono).

## Stack

- **Runtime**: Cloudflare Workers (Workers Static Assets — single deployable)
- **UI**: React Router v7 (framework mode) + Tailwind CSS
- **API**: Hono, mounted under `/api/*` in the same Worker
- **Data**: D1 via Drizzle ORM (`packages/db`)
- **Shared types/validation**: `packages/shared` (zod scoring-config schemas per `format_type`)

## Layout

```
apps/worker/       React Router UI + Hono API + scoring engine + Worker entry
packages/db/        Drizzle schema, migrations, seed data
packages/shared/    format_type, scoring-config zod schemas, shared types, id helper
```

## Getting started

```bash
pnpm install

# one-time: point apps/worker/wrangler.jsonc at your own D1 database
# (wrangler d1 create spectrum-sweeps-db) and replace the placeholder database_id

pnpm --filter @spectrum-sweeps/worker exec wrangler d1 migrations apply spectrum-sweeps-db --local
pnpm run db:seed
pnpm --filter @spectrum-sweeps/worker exec wrangler d1 execute spectrum-sweeps-db --local --file=../../packages/db/seed/seed.sql

pnpm run dev
```

## Scripts

- `pnpm run typecheck` / `pnpm run lint` / `pnpm run test` / `pnpm run build`
- `pnpm run db:generate` — regenerate Drizzle migrations after a schema change
- `pnpm run db:seed` — regenerate `packages/db/seed/seed.sql` from the sports catalog

## Status

Phase 1 (core tracker) scaffold: office groups, leagues, sports (seeded:
World Cup / Premier League / F1), competitions, participants, manual
draw/assignment entry, result entry, and a format-aware leaderboard are all
wired end-to-end. Admin routes are expected to sit behind Cloudflare Access
at the edge — no app-level auth yet (phase 2).
