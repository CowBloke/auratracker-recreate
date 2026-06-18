# AuraTracker Rebuild Foundation Audit

Date: 2026-06-18  
Scope: codebase audit for recreating AuraTracker from scratch with stronger foundations.

## Assumptions

- The rebuild should preserve the current product identity before redesigning mechanics: private social gaming platform, persistent economy, realtime play, clans, You mode, moderation, and admin tooling.
- The target is a fresh implementation, not a piecemeal refactor of the current repo.
- "Better foundations" means clearer domain boundaries, safer data/economy rules, stronger auth, typed contracts, scalable realtime/session architecture, and meaningful test coverage before feature parity.
- Current feature behavior is inferred from routes, pages, schema, sockets, docs, and constants. Some items may be partial or legacy if they are present in code but not fully exposed.

## Current Stack Snapshot

- Frontend: React 18, TypeScript, Vite 5, React Router 6, Tailwind 3, Radix/shadcn-style UI, Zustand, Axios, Socket.IO client.
- Backend: Node.js, Express 4, Socket.IO, Prisma, SQLite, JWT bearer auth, bcrypt, Zod validation in selected middleware.
- Tooling: npm in root/frontend/backend, concurrently, tsx, TypeScript strict mode, Vitest only on frontend.
- Data: Prisma SQLite `dev.db`, 171 models, 13 migrations.
- Runtime shape: one backend process handles REST API, Socket.IO, static game serving, price engines, daily jobs, schedulers, and admin Prisma Studio proxy.

## Scale Observations

- Backend route surface: about 538 REST route declarations by regex.
- Largest backend files:
  - `backend/src/routes/admin.ts`: 6,590 lines
  - `backend/src/modules/you/service.ts`: 6,275 lines
  - `backend/src/routes/clans.ts`: 3,399 lines
  - `backend/src/routes/horse-race.ts`: 2,103 lines
  - `backend/src/routes/games.ts`: 2,005 lines
- Largest frontend files:
  - `frontend/src/pages/admin/AdminPage.tsx`: 5,317 lines
  - `frontend/src/services/api.ts`: 4,682 lines
  - `frontend/src/pages/HorseRace.tsx`: 4,030 lines
  - `frontend/src/pages/Clans.tsx`: 3,623 lines
  - `frontend/src/pages/you/components/modals.tsx`: 3,185 lines
- Tests found: 3 frontend unit tests, no obvious backend test suite.
- Sockets: 17 socket handler files, with chat, party, game invites, duel matchmaking, and many game-specific state machines.

## Product Feature Inventory

### 1. Identity, Access, And Account Lifecycle

- Registration with username, first name, school, school level, class letter, email, password, motivation message, optional referral code.
- Admin approval/rejection workflow before normal access.
- Login, auth refresh/me endpoint, password change, intro-video seen state.
- Roles/flags: user, beta tester, admin, super admin, fiscal inspector, judge.
- Ban states, ban appeal flow, banned page, active-ban enforcement in HTTP and sockets.
- Name-change requests and admin review.
- Referral codes, referral attribution, configurable referral rewards.
- User settings: theme/custom theme, account settings, sound/game preferences, notification preferences.

### 2. Profiles, Social Identity, And Progression

- Public profile pages with optional user id.
- Username color, profile picture, profile banner, bio.
- Follow/unfollow/social overview.
- Badges catalog, user badges, equip slots, auto-award checks, custom badge requests.
- Overall classement/rank, money/aura/game leaderboards, specialized number leaderboard.
- Economy history and money history display.

### 3. Core Economy, Shop, Inventory, And Marketplace

- Money and aura balances.
- Aura transfer/gift/take system with daily sender cap and messages.
- Shared/composite balance updates for distributed views.
- Game reward caps: daily aura and money caps.
- Shop with item categories and item types: consumable, cosmetic, upgrade, gift.
- Inventory with quantities and use-item flows.
- Consumable effects including money/aura bonuses, Doodle Jump skins, clan upgrades/effects, custom badge eligibility, You adblock.
- Player marketplace for listing/buying/cancelling inventory items.
- Daily pass / daily loot claim with streak, randomized money/aura/item rewards. Note: current route redirects `/pass` to `/quests`, but backend/model support exists.
- Gift templates/gifts/gift items in schema.

### 4. Game Hub And Game Reward Platform

- Central `/games` hub with all/singleplayer/multiplayer tabs.
- Game score submission endpoint with score history, stats, high scores, new-record detection, clan money boost integration, badge checks, and chat announcements.
- Daily racer challenge and daily reward state.
- Anti-farming controls through per-game reward caps and trackers.

### 5. Single-Player / Embedded / Score Games

- Doodle Jump, including skins and reward thresholds.
- 2048, including max tile tracking.
- Flappy Bird.
- Chrome Dino, served from static bundle.
- Snake.
- BlockBlast.
- Fruit Ninja.
- QS Watermelon, served from static bundle.
- Stack Tower.
- Geometry Dash.
- Solitaire.
- Racer.
- Tetris, including embedded/public Tetris assets.
- Knife Hit.
- Goyave Empire.
- Clash Village.
- Sudoku / Logic Lab with difficulty-specific stats.
- Minesweeper and speedrun mode.
- Hextris iframe/static integration with postMessage score bridge.
- Paper.io.
- Polytrack static WebGL bundle with records.
- Eaglercraft static bundle.
- HexGL static WebGL bundle.
- Crossy Road static bundle.

### 6. Casino, Trading, Prediction, And Market Games

- Casino page with multiple table variants; routes redirect soccer/mines/crash to casino query params.
- Casino backend start/complete lifecycle, active round TTL, house edge, payout guards.
- AuraCoin trading: stochastic price engine, spot buy/sell, fees, spread/slippage, chart/history, holder leaderboard.
- AuraCoin leveraged positions: long/short, margin, leverage, PnL, liquidation, close history.
- Market room with multiple coins: Aura Stable and Chaos Coin alongside Aura Coin style market systems.
- Polymarket prediction events: suggestions, multi-option events, admin approval, betting, history, resolution and payouts.

### 7. Realtime Multiplayer Games

- Generic game invite/register/update/end socket system.
- Duel challenge/accept/decline/cancel, matchmaking, AI duel entry points.
- Bomb Party with prompts/dictionaries/languages, lives, difficulty, turns, play-again.
- Poker with start stack, blinds, actions, join prompts, play-again.
- Petit Bac with categories, rounds, answer submission, peer review.
- Battleship / Bataille Navale with ship placement and shots.
- Puissance 4 with realtime turns and AI support.
- Chess / Echecs using `chess.js`, realtime turns and AI scheduling.
- Ball Arena simulation.
- Russian Roulette turn game.
- Uno realtime card game.
- Morpion / Tic-Tac-Toe with realtime turns and AI support.
- Dots and Boxes realtime turns.

### 8. Horse Race And Stable System

- Horse-race cycles with betting/racing/results phases.
- Public race state, lineups, odds, entries, total bets, user bets.
- Stable creation/update/listing.
- Horse buying from service businesses or market listings.
- Horse training, race registration, doping and catch risk.
- Horse breeding, retirement, selling/cancel sale.
- Horse cosmetics, patterns/accessories, unlocks.
- Standings, recent races, top horses.
- Horse service business integration in You mode.

### 9. Pixel Board

- Pixel board page and socket handler.
- Pixel board settings, pixels, events.
- Scoring, heatmap, and timelapse scripts.

### 10. Realtime Social, Chat, Party, Messages, And Notifications

- Global chat socket with join, older message loading, send, reaction, pin, typing, page/presence, heartbeat, polls.
- Chat moderation settings, mute/appeal, moderation events, original message tracking, pinned messages.
- Online user counts and online snapshot recording.
- Parties: create, join, request join, invite, kick, leave, delete, update, public listing, game suggestion/selection, party chat.
- Direct/system conversations, participants, read tracking, reactions, reports, user blocks.
- Dedicated messages page and inbox dropdown.
- Notification records with read/archive state.
- Web push subscription support.
- Support chat/messages, support reactions, business support conversations.

### 11. Clans, Clan Economy, Clan Events, And Wars

- Clan creation, public listing, membership status.
- Join requests, accept/reject, leave/kick, promote/demote, transfer leadership.
- Clan roles, custom role assignment.
- Clan bank deposits and contribution history.
- Clan images, descriptions, tags.
- Clan chat and pump-up feed.
- Clan items/effects, including game money boost and clan upgrades.
- War declaration, preparation, active war lifecycle, war history.
- War defenses: fortress, armory, banner.
- Fortification and attack actions, stamina/score/logs.
- War minigames: memory, bomb, naval shots.
- Clan events with quests, minigames, reward tiers, clan scores, activity.
- Nation/alliance/black-market style mechanics appear in docs/models and may be evolving.

### 12. You Mode: Life Sim, Businesses, Finance, Resources, Social RPG

- Dedicated `/you` page with tabs/components for overview, map, actions, work, supply, marketplace, finance, share market, social, ads, construction, explore.
- You mode access gating through settings.
- Skills with XP/training: business/social/intelligence/charisma/finance/illegal style tracks.
- Business types including lemonade/farm aliases, epicerie, restaurant, coffee shop, agency, formation, transfer, youtube, medecins, startup, bank, illegal market, horse-related businesses, legal/court businesses.
- Business creation and construction project flow.
- Business map/location/profile fields, public profile updates, verified state, ratings.
- Business treasury, deposit/withdraw, transactions.
- Employee/member invitations, HR, roles, salary updates, work reminders, daily work.
- Daily business revenue, bank revenue, salaries, tax, and supply production jobs.
- Loans: request, review, repay, borrower repay/remind, collateral aura.
- Investments and expected returns.
- Shareholders, share proposals, share buybacks, share market listings, buyouts.
- Bank businesses: bank accounts, current/savings, deposits/withdrawals, rates, livret epargne upgrade.
- Formation businesses: products/courses, create/update/delete/list, buy/access/download, reviews/ratings, admin pending review.
- Startup products/research/deploy loops.
- Resource/supply system: business inventories, active resource actions, upgrades, constant production, supply offers, supply links, supply contracts, resource market listings, auto-sell.
- Business purchased items and custom menus.
- Ads/publicites and You adblock item effect.
- Horse business production/capacity upgrade.
- Relationships: create, marriage proposals, divorce proposals, couple shared balance, forget relationship, mistress action, cheating suspicion/accusation response.
- Social contracts with participants and signatures.
- Legal integration through court/law firm flows and lawyer ratings.

### 13. Justice, Fiscal, And Legal Governance

- Plainte filing against defendants in court businesses.
- Admin/judge accept/reject plainte flow.
- Court cases with generated case numbers and linked conversations.
- Court parties, representation selection, law firm discovery.
- Arguments, status changes, verdicts and sentencing.
- Pending sanctions tied to case/fiscal flows.
- Fiscal inspector tools, fiscal settings, sanctions, tax settings/manual tax runs.

### 14. Admin, Moderation, Maintenance, And Operations

- Admin dashboard with tabs: inbox, users, clubs, logs, bans, Braquage Legal, content, ads, taxes, fiscal, game limits, settings, referrals, activity, screen time, demographics, wealth, badges, communication, chat history.
- Pending users, registration reviews, local review import.
- User edit/delete/approve/reject, role changes, force divorce, inventory admin.
- Shop items CRUD/import/image upload and shop category settings.
- Clan admin management, leadership transfer, deletion, horse reset.
- Clan event CRUD.
- Chat history by day, export, soft-delete, moderation events.
- Logs, stats, downloads, activity breakdown, online history/snapshots/stats.
- Bans and ban appeals.
- Game limits and global settings.
- Maintenance mode, per-page blocking, blocked messages, default landing page, You logo admin-only setting.
- Taxes, fiscal sanctions, wealth stats/export.
- BombParty language/prompt recalculation.
- Surveys, warnings, communication controls, announcement and chat block scheduling.
- Referrals stats.
- Badges management and assignment.
- Custom badge review pipeline.
- Dashboard updates/changelog entries with reactions and image upload.
- Bug reports and support operations.
- Admin Prisma Studio proxy.
- Dangerous operational endpoints: backfill score history, purge businesses/marketplaces, reset unlock levels, creation toggles.

### 15. Content, Community, And Help

- Dashboard/home experience.
- Rules page.
- Tutorials page with tutorial definitions for games, clans, You onboarding, create business, build business.
- Suggestions with votes, comments, ratings/status.
- Forum with subreddit creation/joining, posts, comments, votes, deletion.
- Ads system for business/system ads, pending review, active toggles.
- Changelog/dashboard updates, though current `/changelog` route redirects to dashboard.
- Bug report panel.
- Support page.
- Information/legacy pages exist in source.

### 16. Automation And Background Processing

- Aura daily cap reset/sync using Europe/Paris day boundaries.
- Daily game reward cap sync.
- Daily racer rewards.
- Daily business revenue.
- Daily bank revenue and account interest.
- Daily salaries.
- Daily tax.
- Supply production scheduler.
- Resource action settlement interval.
- Badge auto-award scheduler and default badge seed.
- Overall classement recomputation scheduler.
- AuraCoin price/mining engine.
- Market room engines.
- Online snapshot recording.
- Bomb Party cleanup.
- Clan war state advancement and clan event state advancement.
- Braquage Legal auto-draw for expired sessions.

### 17. Static Assets And Embedded Game Bundles

- Static game folders under `frontend/public`: polytrack, eaglercraft, watermelon, hexgl, hextris, chrome-dino, paper-io, crossy-road, tetrjs.
- Static images for games, mock dashboards, icons, videos, themes, uploads.
- Custom Vite middleware and backend static mounts for embedded games.

## Foundational Risks In The Current Codebase

1. The backend process owns too much at once: HTTP API, sockets, schedulers, price engines, static serving, and admin tooling.
2. SQLite with connection limit 1 is not the right production base for a multi-user economy with trading, betting, marketplace, and realtime writes.
3. Auth uses JWT bearer tokens stored in localStorage on the client, making session revocation, theft recovery, CSRF strategy, and device/session management weak.
4. The API client is manually maintained in one giant file, creating type drift risk between frontend and backend.
5. Large route/page/service files blur domain boundaries, make testing difficult, and encourage accidental cross-system coupling.
6. Many Prisma "enum-like" fields are plain strings, so invalid states are easier to create.
7. Realtime game state is largely process-memory plus timers; restarts and horizontal scaling become risky.
8. Schedulers are in-process intervals. Duplicate workers or server restarts can double-run or miss economic jobs.
9. Tests are far below the risk profile of the app, especially for money/aura/market/trading/clan/You systems.
10. Embedded game integration is ad hoc per game; a shared sandbox/score SDK would reduce future fragility.
11. Logging exists, but observability is not structured as traces/metrics/job status/dead-letter queues.
12. Admin and operational powers are broad and should have explicit permission/audit boundaries in a rebuild.

## Recommended 2026 Stack

### Short Version

Use a typed, game-friendly web app plus a serious backend platform:

- Runtime/package: Node.js 24 LTS, pnpm workspaces, Turborepo.
- Frontend: React 19, Vite 8, TanStack Router, TanStack Query, Tailwind CSS 4, Radix/shadcn-style components.
- API: Fastify with contract-first typed APIs using oRPC or ts-rest, plus Zod 4 or Valibot schemas.
- Database: PostgreSQL with Prisma ORM, using explicit transactions and row locks/constraints for economy flows.
- Auth: Better Auth or a custom session-cookie auth layer with HTTP-only cookies, session/device revocation, role/permission tables, and rate limits.
- Realtime: Socket.IO kept as the transport, split into a realtime service, backed by Redis adapter and sticky sessions.
- Jobs: BullMQ + Redis workers for scheduled/delayed/economic jobs.
- Storage/assets: S3/R2-compatible object storage for uploads and packaged game assets, CDN in front.
- Testing: Vitest for unit/integration, Playwright for end-to-end, Testcontainers for Postgres/Redis, socket integration tests.
- Observability: Pino logs, OpenTelemetry traces/metrics, Sentry or equivalent error reporting, job dashboard.

### Why This Fit Beats "Just Use Next.js"

Next.js App Router is strong for SSR, Server Components, and content/product sites. Its docs describe the App Router as file-system routing built around React Server Components, Suspense, and Server Functions. That is valuable, but AuraTracker is mostly a private, interactive, socket-heavy app with embedded games, canvas/WebGL, realtime rooms, and game state that belongs outside the frontend framework.

For this app, the first-order problems are domain boundaries, realtime session integrity, economy correctness, and job safety. A Vite app with typed routing and a separate backend keeps those concerns clearer.

If public SEO pages, marketing pages, or server-rendered content become important, consider Next.js or TanStack Start for those surfaces. TanStack Start is promising, but its docs currently label it RC, so I would avoid making it the core foundation unless you accept framework maturity risk.

### Source Notes From Current Research

- Node.js official releases list v24 as LTS and v26 as Current as of June 2026: https://nodejs.org/en/about/previous-releases
- React 19 added Actions/pending/optimistic form primitives that suit mutation-heavy UI: https://react.dev/blog/2024/12/05/react-19
- Vite 8 requires Node 20.19+/22.12+ and adds built-in devtool/path improvements: https://vite.dev/blog/announcing-vite8
- TanStack Router emphasizes typed route trees, params, search state, loaders, and route-owned lifecycle: https://tanstack.com/router/latest
- Next.js App Router uses Server Components/Suspense/Server Functions and remains a good SSR alternative: https://nextjs.org/docs/app
- Fastify is built around low overhead, plugin architecture, and schema-based validation/serialization: https://fastify.dev/
- Hono is a good edge/multiruntime alternative, but this app's sockets and long-running jobs point more naturally to Node/Fastify: https://hono.dev/
- Prisma ORM provides type-safe data modeling, migrations, and client generation across PostgreSQL and other databases: https://www.prisma.io/orm
- Better Auth provides framework-agnostic TypeScript auth with email/password, sessions, rate limiting, 2FA, passkeys, org/access-control plugins: https://better-auth.com/docs/introduction
- oRPC offers end-to-end type safety, OpenAPI, typed errors, OpenTelemetry, streaming/SSE, and TanStack Query integration: https://orpc.dev/
- ts-rest is a more conservative contract-first REST option with shared client/server contracts: https://ts-rest.com/
- tRPC is the simplest option if the only clients are TypeScript apps and OpenAPI is not needed: https://trpc.io/
- Socket.IO Redis adapter is the standard path for routing events across multiple Socket.IO servers; sticky sessions still matter: https://socket.io/docs/v4/redis-adapter/
- BullMQ is a Redis-backed queue for background jobs and delayed tasks: https://bullmq.io/
- Playwright provides browser E2E testing with auto-waiting and web-first assertions: https://playwright.dev/

## Foundations-First Rebuild Plan

### Phase 0: Product Contract And Boundaries

Deliverable: a rebuild spec before writing product code.

- Define bounded contexts:
  - Identity/Auth
  - Economy/Ledger
  - Rewards/Progression
  - Games Platform
  - Realtime Sessions
  - Chat/Social/Messages
  - Clans/Wars
  - You Mode
  - Marketplace/Shop
  - Trading/Prediction/Casino
  - Admin/Governance
  - Notifications/Support
- Create a feature parity checklist from this document.
- Decide which legacy/partial features should be cut or postponed.
- Define invariants for money, aura, rewards, bets, trades, item quantities, clan wars, and business shares.

### Phase 1: Monorepo And Tooling

Deliverable: empty app with CI passing.

- Create `apps/web`, `apps/api`, `apps/realtime`, `apps/worker`, `packages/contracts`, `packages/domain`, `packages/db`, `packages/ui`, `packages/config`.
- Use pnpm workspaces and Turborepo task graph.
- Establish TypeScript strict settings, Biome or ESLint+Prettier, Vitest, Playwright, env validation, Docker Compose for Postgres/Redis.
- Add CI gates: typecheck, lint, unit tests, migrations check, contract build.

### Phase 2: Data Foundation

Deliverable: Postgres schema v1 and migration discipline.

- Move to PostgreSQL.
- Keep Prisma if you want pragmatic schema/model productivity; use raw SQL for tricky locking where necessary.
- Replace string statuses with enums or constrained lookup tables.
- Introduce a proper ledger:
  - money ledger
  - aura ledger
  - item inventory ledger
  - reward grants
  - market/bet/trade settlement records
- Add idempotency keys for economic writes.
- Add audit tables for admin/fiscal/legal operations.
- Add outbox table for reliable notifications/realtime/job side effects.

### Phase 3: Auth, Roles, And Permissions

Deliverable: secure login/session/role foundation.

- Prefer HTTP-only secure session cookies over localStorage bearer tokens.
- Model sessions/devices/revocation.
- Add rate limiting and login auditing.
- Build role/permission checks as a shared package, not scattered booleans.
- Keep current roles but express permissions explicitly:
  - admin
  - super admin
  - beta tester
  - fiscal inspector
  - judge
  - clan roles
  - business roles
  - court roles

### Phase 4: API Contracts

Deliverable: first typed end-to-end vertical slice.

- Choose oRPC or ts-rest and define contracts per domain.
- Co-locate schemas, request/response types, and error models.
- Use TanStack Query generated/wrapped clients on the frontend.
- Stop building one global `api.ts`; each feature owns its API client.
- Add contract tests to prove backend responses match contracts.

### Phase 5: Realtime Architecture

Deliverable: reliable realtime skeleton before porting games.

- Split Socket.IO into `apps/realtime`.
- Use Redis adapter and sticky-session-aware deployment.
- Create namespaces/rooms by domain:
  - chat
  - party
  - game
  - duel
  - clan
  - pixel-board
  - notifications
- Create shared socket event contracts.
- Persist game/session snapshots where restart recovery matters.
- Define a game session state machine with lifecycle events.

### Phase 6: Jobs And Economic Automation

Deliverable: job worker with repeatable jobs and idempotent handlers.

- Move daily resets, rewards, tax, salaries, revenue, supply production, badge awards, rank recompute, market ticks, clan event transitions, and race settlement into BullMQ workers.
- Use one source of truth for Paris day keys and scheduling.
- Add job dedupe/idempotency.
- Add retries, dead-letter handling, job dashboards, and alerts.

### Phase 7: App Shell And Design System

Deliverable: usable logged-in shell with navigation, auth, theme, notifications, and blocked-page behavior.

- Build `packages/ui` with the app shell, sidebar/topbar, modal/dialog primitives, toasts, loading states, empty states, error states, and responsive rules.
- Recreate maintenance/blocked page handling as a foundation, not an afterthought.
- Define page metadata and route permissions in one typed route registry.
- Rebuild the current navigation, but leave feature pages as placeholders until each domain is ported.

### Phase 8: Core Vertical Slice

Deliverable: one complete, tested user loop.

Recommended first slice:

1. Register/login/admin approval.
2. Dashboard/profile.
3. Money/aura balances through ledger.
4. One simple score game, e.g. 2048 or Snake.
5. Reward grant with daily caps.
6. Leaderboard entry.
7. Notification.
8. Admin audit log.

This proves auth, API contracts, DB transactions, jobs, frontend data fetching, rewards, logs, and tests all work together.

### Phase 9: Rebuild Order After Foundations

1. Identity/profile/settings.
2. Economy ledger, aura transfers, reward caps.
3. Game platform SDK and 2-3 simple games.
4. Shop/inventory/marketplace.
5. Quests/pass/badges/leaderboards.
6. Chat/party/messages/notifications.
7. Realtime multiplayer games.
8. Clans and clan wars.
9. Trading/casino/prediction systems.
10. You mode business core.
11. You mode advanced systems: supply, shares, bank, formation, relationships, justice integration.
12. Admin full parity.
13. Embedded/static games migration.

## Feature Rebuild Checklist

Use this as a tracker when planning implementation tickets.

- [ ] Auth: register, approval, login, sessions, password change, bans, ban appeals.
- [ ] Roles/permissions: admin, superadmin, beta, fiscal, judge, clan/business/court roles.
- [ ] Profiles: avatar/banner/color/bio, follows, badges, custom badges.
- [ ] Economy: money ledger, aura ledger, transfers, caps, money history.
- [ ] Rewards: game rewards, daily caps, high scores, badge triggers, reward queue.
- [ ] Shop: item catalog, categories, purchase, use item, effect handling.
- [ ] Inventory: quantities, acquisition history, admin inventory tools.
- [ ] Marketplace: list, buy, cancel, stats.
- [ ] Quests/pass: daily selection/progress/rewards, pass streak/loot.
- [ ] Leaderboards: aura, money, games, overall rank, specialized boards.
- [ ] Game hub: game catalog, visibility flags, beta/new toggles.
- [ ] Single-player games: Doodle Jump, 2048, Flappy, Dino, Snake, BlockBlast, Fruit Ninja, Watermelon, Stack Tower, Geometry Dash, Solitaire, Racer, Tetris, Knife Hit, Goyave, Clash, Sudoku, Minesweeper, Paper.io, Hextris, Polytrack, Eaglercraft, HexGL, Crossy Road.
- [ ] Casino/trading: casino tables, AuraCoin, Stable/Chaos coin, market room, positions, liquidation.
- [ ] Polymarket: suggestions, events, bets, resolution.
- [ ] Realtime core: socket auth, rooms, presence, event contracts.
- [ ] Chat: messages, older history, reactions, pins, typing, polls, moderation/mutes.
- [ ] Party: create/join/invite/kick/chat/game suggestions.
- [ ] Messages: conversations, read state, reactions, reports, blocks.
- [ ] Notifications: inbox, web push, preferences.
- [ ] Support: tickets/messages/reactions/business support conversations.
- [ ] Multiplayer games: Bomb Party, Poker, Petit Bac, Battleship, P4, Chess, Ball Arena, Russian Roulette, Uno, Morpion, Dots and Boxes.
- [ ] Horse race: cycles, bets, stables, horses, training, breeding, doping, cosmetics, markets.
- [ ] Pixel Board: pixels, settings, sockets, scoring/timelapse/heatmap.
- [ ] Clans: create/join/roles/bank/chat/items/effects/events.
- [ ] Clan wars: declare, prepare, fortify, attack, minigames, settlement/rewards/history.
- [ ] You core: access, skills, business types, create/construct, map/profile/ratings.
- [ ] You HR: members, invitations, salaries, daily work, reminders.
- [ ] You finance: treasury, transactions, loans, investments, shares, buyouts, share market.
- [ ] You resources: inventory, production, resource actions, supply offers/contracts/links, resource market.
- [ ] You bank: accounts, deposits, withdrawals, interest, rates, upgrades.
- [ ] You formation: products, purchase/access/download, reviews, admin review.
- [ ] You social: relationships, marriage/divorce, couple balance, cheating/mistress, social contracts.
- [ ] Justice: plaintes, court cases, parties, representation, arguments, verdicts, sanctions.
- [ ] Fiscal/taxes: tax settings/runs, fiscal users, pending sanctions, wealth stats.
- [ ] Admin users: approvals, edits, roles, bans, warnings, surveys, name changes.
- [ ] Admin content: items, categories, badges, ads, changelog/dashboard updates.
- [ ] Admin operations: logs, chat history/export, activity, screen time, demographics, maintenance, game limits, purges/backfills.
- [ ] Forum: communities, posts, comments, votes, moderation.
- [ ] Suggestions: create, vote, comment, rate, status.
- [ ] Tutorials/rules/info pages.
- [ ] Static game asset pipeline and iframe/postMessage score SDK.

## Open Decisions

1. Should the rebuild preserve every feature before UX/mechanics changes, or should some legacy/partial systems be retired?
2. Where will it be hosted, and do you want one deployable monolith first or split services from day one?
3. Is mobile/PWA support required for launch?
4. Do you need to migrate existing production data, or can the new app start with clean data/seeds?
5. Should the embedded third-party games be kept as-is, replaced, or moved behind a standardized sandbox SDK only?
6. Is the app still private/community-only, or should public SEO pages become a product goal?

