# SimpleStock V2

> Admin-only inventory management, end to end: track products, suppliers,
> stock movements, and revenue — as a real Postgres-backed API, or fully
> offline in the browser with zero setup.

Small teams tracking inventory in spreadsheets lose the audit trail the
moment two people edit at once — no atomic stock updates, no per-sale
price snapshot, no single source of truth for "what do we have right
now." SimpleStock V2 is a two-app admin portal that solves that: a
Postgres-backed Express API enforces atomic sell/restock transactions
and snapshots price-at-sale, while a React admin frontend gives one
place to manage products, suppliers, reports, and account settings.
Run it against a real database, or flip one env var and demo the full
UI against `localStorage` with no backend at all.

## Two Independently-Managed Apps

This is **not** an npm workspaces monorepo — `apps/web` and `apps/server`
each own their own `package.json` and lockfile. The root `Makefile` only
wraps their npm scripts; it never touches a root `node_modules`.

| App        | Path                                   | Stack                                                                 | Purpose                                                                                 |
| ---------- | -------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Server** | [`apps/server`](apps/server/README.md) | Express 5 · TypeScript · Drizzle ORM · PostgreSQL · Better Auth       | Authenticated REST API — products, suppliers, reports, dashboard, account settings      |
| **Web**    | [`apps/web`](apps/web/README.md)       | Vite 8 · React 19 · React Router 7 · Tailwind CSS v4 · TanStack Query | Admin frontend that consumes the server API, or runs fully offline via `VITE_DEMO_MODE` |

Each app's own README covers its full setup, environment variables, and
architecture — this file covers only the monorepo-level Quick Start.

## Quick Start

```bash
# From the repository root
make install   # installs dependencies for both apps independently
```

Configure each app's environment before starting either one:

```bash
cp apps/server/.env.example apps/server/.env   # DATABASE_URL, BETTER_AUTH_SECRET, ...
cp apps/web/.env.example apps/web/.env         # VITE_DEMO_MODE, etc.
```

The server needs a migrated database and one bootstrapped admin account
before the first login:

```bash
cd apps/server
npm run db:migrate
npm run seed:admin   # prints the seeded admin email/password — change it after first login
```

Then, from the repo root:

```bash
make dev   # server on :3000, web on :5173, concurrently
```

Prefer zero setup? Skip the server entirely — set `VITE_DEMO_MODE=true`
in `apps/web/.env` and `npm run dev` inside `apps/web` alone. Every
feature routes through `localStorage` instead of the API; see
[`apps/web/README.md`](apps/web/README.md#demo-mode) for how deep that
goes.

## Production Deployment

For production, `apps/server` can serve the compiled web build directly
instead of running two separate processes: `npm run build` inside
`apps/web` outputs to `apps/web/dist`, and `apps/server`'s `app.ts`
detects that directory at startup and serves it (with an SPA fallback
for client-side routes) alongside the API on the same port. Run
`make build` from the repo root to build both apps, then `make
start-server` (or `cd apps/server && npm run start`) to serve everything
from a single Express process — see
[`apps/server/README.md`](apps/server/README.md#serving-the-web-frontend)
for details. Keeping the two apps on separate hosts is still fully
supported; this is opt-in based on whether `apps/web/dist` exists.

## Makefile Commands

The root `Makefile` wraps each app's npm scripts and never touches a
root `package.json`/`node_modules`, since none exists. Run `make help`
for the full list with descriptions.

| Command                            | Effect                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `make install`                     | `install-web` + `install-server`                                                      |
| `make dev`                         | Runs `dev-server` and `dev-web` concurrently (server on `:3000`, web on `:5173`)      |
| `make dev-web` / `make dev-server` | Start only one app in development mode                                                |
| `make build`                       | `build-server` then `build-web`                                                       |
| `make start-all`                   | Runs both apps' production `start` scripts concurrently (requires `make build` first) |
| `make lint` / `make format`        | Runs ESLint / Prettier across both apps                                               |
| `make clean`                       | Removes `dist/` and `node_modules/` for both apps                                     |
| `make check`                       | Verifies Node.js and npm are installed                                                |
| `make status`                      | Shows dependency-install and build status for both apps                               |

Per-app equivalents (`make lint-server`, `make format-web`, ...) are
also available — see `make help` for the complete list.

## Architecture

```
SimpleStockV2/
├── Makefile              # Monorepo orchestration only — wraps npm scripts, no root deps
├── apps/
│   ├── server/            # Express API — see apps/server/README.md
│   │   └── src/
│   │       ├── app/        # Express app, feature modules (routes → controller → service → repository), middleware
│   │       └── infra/       # env config, Drizzle database + schema, logger, Better Auth admin instance
│   └── web/                # React admin frontend — see apps/web/README.md
│       └── src/
│           ├── app/          # Components, feature modules (api/queries/mutations/demo), pages, routes, styles
│           └── infra/         # env config, HTTP client, Better Auth client (+ demo-mode swap-in)
```

- **Auth**: The web app authenticates against the server's Better Auth
  admin instance, mounted at `/api/admin-auth` and proxied by Vite
  (`server.proxy` in `apps/web/vite.config.ts`) so cookies stay
  same-origin in development.
- **API**: Every feature route is served under `/api/v1` (see
  `apps/server/src/app/routes.ts`) and requires an authenticated admin
  session — enforced per-router, not globally.
- **Independent dependency trees**: each app manages its own
  `package.json`/lockfile by design — see the `Makefile` header comment.

## Further Reading

- [`apps/server/README.md`](apps/server/README.md) — environment
  variables, request pipeline, API route table, database schema, admin
  bootstrapping, graceful shutdown, serving the web frontend
- [`apps/web/README.md`](apps/web/README.md) — demo mode, feature-module
  conventions, routing/auth table, path alias usage, production build & serving
