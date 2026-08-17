# AIPMS — AI-Powered Holiday Letting Platform

A property management platform for holiday letting, positioned as a cost-saving
alternative to incumbents by billing owners for **actual usage** instead of
flat fees:

- Housekeeping is billed by verified time on-site (key-box photo + server
  timestamp), not a flat clean rate.
- Linen is billed by what's actually used per clean, not a fixed per-stay
  allowance.
- An AI clean-check compares each turnover's photos against the property's
  reference photos and soft-flags anything off for a supervisor — it never
  blocks the housekeeper from finishing the job.

This is a working full-stack demo across five portals, sharing one database
and one set of business rules:

| Portal | Route | Who |
|---|---|---|
| Web portal (back office) | `/portal` | Staff |
| Owner portal (desktop) | `/owner` | Property owners |
| Contractor portal (desktop) | `/contractor` | Cleaning/maintenance companies |
| Owner App (mobile) | `/app/owner` | Property owners, on the go |
| Housekeeper App (mobile) | `/app/housekeeper` | Field housekeepers |

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4) — one app, every
  portal is a route group with its own auth guard and layout.
- **Prisma + SQLite** for zero-config local/demo persistence. Swap the
  datasource to Postgres for anything beyond a local demo (SQLite needs a
  persistent filesystem, which serverless hosts don't provide).
- **Auth.js (NextAuth v5)**, credentials provider, JWT sessions, role-based
  middleware (`src/proxy.ts`) gating every portal route.
- **Anthropic API** (optional) powers AI clean-check, inbox classification,
  and the AI Trainer chat — see [AI features](#ai-features) below.

## Getting started

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (openssl rand -base64 32)
npx prisma migrate dev         # creates prisma/dev.db and seeds demo data
npm run dev
```

Open `http://localhost:3000` and sign in with any demo account below
(password **`demo1234`** for all of them) — the login page has one-click
buttons for each.

| Email | Role | What you'll see |
|---|---|---|
| `staff@aipms.demo` | Staff | Full back-office web portal |
| `james@aipms.demo` | Owner | Owner portal + Owner App, 5 properties |
| `priya@aipms.demo` | Owner | Owner portal + Owner App, 2 properties (for testing data isolation) |
| `clean@aipms.demo` | Contractor | Contractor portal — Coastal Clean Co |
| `maria@aipms.demo` | Housekeeper | Housekeeper App, 2 pending jobs |
| `tom@aipms.demo` | Housekeeper | Housekeeper App, 1 accepted job |
| `maint@aipms.demo` | Contractor | Contractor portal — South Coast Maintenance |

If you need to wipe local data and reseed: `rm prisma/dev.db && npx prisma migrate dev`.

## AI features

Every AI call lives in `src/lib/ai.ts` behind a single `ANTHROPIC_API_KEY`
check. Without a key, each feature runs on a **deterministic mock** so the
product story still demos end-to-end:

- **AI clean-check** (`cleanCheckRoom`) — compares a captured after-photo
  against the property's reference photos per room. With a key, it's a real
  vision call to Claude; without one, a seeded mock returns a stable
  match % + note per job/room.
- **Inbox classification** (`classifyInboxMessage`) — classifies guest/owner
  messages into booking / maintenance / complaint / general with a suggested
  action. Mock fallback uses keyword heuristics.
- **AI Trainer** (`trainerChat`) — the onboarding/pricing/ops chat assistant
  in the staff portal.
- **Listing suggestions** (`generateListingSuggestions`) — the owner-facing
  "AI suggestions" panel on each property.

Set `ANTHROPIC_API_KEY` in `.env` to switch all four over to real model
calls — nothing else needs to change.

## What's real vs. demo-simplified

This is a **demo-grade** build: real database, real auth, real billing math,
working AI calls — but a few things are deliberately simplified from the
production posture described in the original design handoff, each flagged
in code comments at the point it matters:

- **Photo storage** — captured photos (key-box, room clean-checks) are stored
  as inline base64 data URLs in SQLite (`src/app/api/housekeeper/jobs/[id]/arrival/route.ts`,
  `.../room-check/route.ts`). Production should upload to object storage and
  store a signed URL instead.
- **Geofencing** — arrival/departure geo coordinates are recorded as reported
  by the device but not cross-checked against the property's registered
  location. **Timestamps**, however, are always server-set
  (`new Date()` at the moment the API request lands) — never trusted from the
  client, which is the part that actually matters for billing integrity.
- **AI cost controls** — the original spec calls for rate-limiting/caching AI
  calls per job. The demo calls the API directly; add a queue + cache layer
  before scaling real usage.

## Architecture notes

- **Auth**: `src/auth.config.ts` is the edge-safe base config (used by
  `src/proxy.ts` middleware); `src/auth.ts` adds the Prisma-backed
  Credentials provider (Node runtime only, keeps Prisma out of the edge
  bundle).
- **Data access**: every portal's pages call Prisma directly from React
  Server Components — no separate REST layer for reads. Mutations use
  Next.js Server Actions (`actions.ts` files) for simple form submits, and
  small route handlers under `src/app/api/housekeeper/...` for the
  multi-step capture flow the mobile client drives with `fetch`.
- **Tenant isolation**: `src/lib/owner.ts` / `src/lib/contractor.ts` /
  `src/lib/housekeeper.ts` are the single choke points that scope every
  query to the signed-in owner/contractor/housekeeper — an owner can never
  load another owner's property or statement (see the 404 checks in every
  `[id]` route).
- **Future PMS integration**: reservation/property/owner data lives behind
  Prisma models with no hardcoded coupling to a specific channel manager —
  see `prisma/schema.prisma`. Swapping in a real sync from Guesty or another
  PMS means writing an importer into these same tables, not touching the UI.

## Repo structure

```
prisma/schema.prisma        Data model
prisma/seed.ts               Demo data (properties, bookings, jobs, statements...)
src/lib/ai.ts                AI provider abstraction (real + mock)
src/lib/billing.ts           Usage-based billing engine
src/lib/{owner,contractor,housekeeper}.ts   Per-role auth + data scoping
src/app/portal/...           Staff web portal
src/app/owner/...            Owner portal (desktop)
src/app/contractor/...       Contractor portal (desktop)
src/app/app/owner/...        Owner App (mobile)
src/app/app/housekeeper/...  Housekeeper App (mobile)
```

## Deployment

SQLite needs a persistent filesystem, so it's fine for local dev but not for
serverless hosts (Vercel, Netlify). To deploy:

1. Point `DATABASE_URL` at a hosted Postgres instance (Neon and Supabase both
   have free tiers) and change `provider = "sqlite"` to `"postgresql"` in
   `prisma/schema.prisma`.
2. Set `AUTH_SECRET` (generate with `openssl rand -base64 32`) and optionally
   `ANTHROPIC_API_KEY` in your host's environment variables.
3. Run `npx prisma migrate deploy` against the new database, then `npm run
   db:seed` once to load demo data.
4. Deploy — Vercel needs no extra config for Next.js; a `netlify.toml` using
   `@netlify/plugin-nextjs` is included for Netlify.

## Original design handoff

The visual language (colors, type, spacing — see `src/app/globals.css`) and
screen-by-screen scope came from a Claude Design handoff bundle for this
project (static HTML mockups + a written spec). That bundle intentionally
faked every interaction (camera capture, AI results, database writes); this
repo is the real implementation.
