# AuraTracker

A private, social gaming platform with a persistent economy — rebuilt on a
clean, typed, foundations-first stack. This repository is the **working
prototype** described in [`REBUILD_FOUNDATION_AUDIT.md`](./REBUILD_FOUNDATION_AUDIT.md):
it implements the doc's Phase 8 vertical slice end-to-end, with a polished,
animated UI, real security, and an architecture built to grow.

> Default login after seeding: **`admin` / `Password123`** (also `nova`, `pixel`, `echo`).

---

## What's in the slice

A complete, tested user loop proving every layer works together:

- **Auth & lifecycle** — register → admin approval → login, httpOnly session
  cookies, password change, ban/appeal states, banned/pending screens.
- **Roles & permissions** — `USER · BETA · ADMIN · SUPERADMIN · FISCAL · JUDGE`,
  enforced in a shared layer (`@aura/contracts` enums + API guards).
- **Economy ledger** — money + aura as an append-only `LedgerEntry` log with a
  cached `Balance`, idempotency keys, and aura gifting with a daily sender cap.
- **Games platform** — a central **game registry** drives a hub of playable
  games (2048, Snake, Reflex Grid) with capped, idempotent rewards, high
  scores, and auto-awarded badges.
- **Leaderboards** — money, aura, overall, and one board per game.
- **Notifications** — persisted + pushed live over Socket.IO, with toasts.
- **Admin console** — pending-user inbox, user management (ban/role/grant), and
  an immutable **audit log** of every governance action.
- **Realtime** — Socket.IO presence (online count) + live notification pushes,
  authenticated with the same session cookie as REST.

---

## Stack

Per the audit's 2026 recommendations, scoped for a runnable prototype:

| Layer        | Choice |
|--------------|--------|
| Monorepo     | pnpm workspaces + Turborepo |
| Web          | React 19, Vite, TanStack Router + Query, Tailwind v4, Framer Motion |
| API          | Fastify + **ts-rest** contract-first typed routes, Zod |
| Realtime     | Socket.IO (cookie-authed) |
| DB           | Prisma — **SQLite** in dev, **Postgres-portable** (see below) |
| Auth         | Custom httpOnly session cookies + CSRF, bcrypt, rate limiting |
| Tests        | Vitest (domain unit tests) |

### Packages

```
apps/
  api/         Fastify server: auth, REST (ts-rest), sockets, security
  web/         React SPA: design system, shell, feature pages, native games
packages/
  contracts/   Zod schemas, ts-rest contract, enums + the GAME/BADGE registries  ← shared FE/BE truth
  domain/      Pure economy logic (ledger primitive, reward caps, badges) + tests
  db/          Prisma schema, client, mock-data seed
  config/      Validated env loader
```

---

## Quick start

```bash
pnpm install          # install workspace deps (pnpm via `corepack enable pnpm`)
pnpm db:generate      # generate Prisma client
pnpm db:push          # create the SQLite schema (packages/db/prisma/dev.db)
pnpm db:seed          # load mock users, balances, scores, badges, notifications
pnpm dev              # run API (:4000) + web (:5173) together
```

Then open **http://localhost:5173** and sign in as `admin` / `Password123`.

`pnpm setup` runs install + generate + push + seed in one go.

Useful scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:studio`,
`pnpm db:reset`.

---

## Extensibility — the architecture is built to grow

The platform is **registry-driven**. New content is added in one place and
flows everywhere automatically.

### ➕ Add a game

1. Add one entry to `GAME_REGISTRY` in
   [`packages/contracts/src/games.ts`](./packages/contracts/src/games.ts)
   (id, name, category, accent, reward config…). This alone wires it into the
   hub grid, the play-route allow-list, reward computation, and leaderboards.
2. For a **native** game, add its React component to
   [`apps/web/src/features/games/registry.tsx`](./apps/web/src/features/games/registry.tsx).
   The mapping is **compile-time checked**: the build fails if a live native
   game has no component, so a game can never appear without something to play.

That's it — no API, DB, or leaderboard changes needed.

### ➕ Add a badge

Add an entry to `BADGE_REGISTRY` in
[`packages/contracts/src/badges.ts`](./packages/contracts/src/badges.ts) with a
machine-readable `criteria`. The seed inserts it and the award engine
(`@aura/domain/badges`) evaluates it after every run.

### ➕ Add a navigation destination / page

Add it to `NAV_ITEMS` in
[`apps/web/src/app/nav.ts`](./apps/web/src/app/nav.ts) (with optional
`roles`) and register the route in `apps/web/src/router.tsx`.

### ➕ Add an API endpoint

Define it on the contract in
[`packages/contracts/src/contract.ts`](./packages/contracts/src/contract.ts)
(+ Zod schemas), then implement the handler in `apps/api/src/router.ts`. The
web client is typed from the same contract automatically.

---

## Security

- **Sessions** are opaque random tokens; only their SHA-256 hash is stored.
  Cookies are `httpOnly`, `SameSite=Lax`, `Secure` in production. Sessions are
  revocable and revoked on password change and ban.
- **CSRF**: double-submit token (readable cookie echoed in an `x-aura-csrf`
  header) enforced on authenticated state-changing requests.
- **Hardening**: `@fastify/helmet`, CORS allow-list, global rate limiting, a
  per-identifier login throttle, and Zod validation at every boundary.
- **Economy integrity**: all balance changes go through one `applyLedger`
  primitive inside a DB transaction with idempotency keys, so retries never
  double-credit and the cached balance can't drift from the ledger.

> Prototype notes: dev uses SQLite + an in-memory rate-limit/login store. For
> production move to Postgres + Redis (BullMQ workers, Socket.IO Redis adapter)
> as the audit recommends.

---

## Going to Postgres

The Prisma schema is deliberately portable (integer amounts, string-typed enums
enforced by Zod, JSON-as-text). To switch:

```bash
pnpm --filter @aura/db use-postgres   # flips the datasource provider
# set DATABASE_URL to your Postgres URL in .env
pnpm db:generate && pnpm db:migrate
```

All DB access is isolated in `@aura/db`, so nothing else changes.
