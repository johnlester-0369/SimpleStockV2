# SimpleStockV2 — Server

> A Postgres-backed REST API where stock never oversells and every sale
> keeps its price forever — because inventory math done in application
> code, not the database transaction, is how two concurrent sales end up
> selling the same last unit twice.

Express + TypeScript backend for the SimpleStockV2 inventory admin
portal. Authenticated REST endpoints for products, suppliers, reports,
dashboard, and account-settings — backed by PostgreSQL via Drizzle ORM,
with `sell()`/`restock()` implemented as guarded atomic `UPDATE`s
(row-locked by the `WHERE` clause, not a read-then-write race) so two
concurrent requests can never combine to oversell.

## Tech Stack

- **Runtime**: Node.js (ESM, `"type": "module"`)
- **Framework**: Express 5
- **Language**: TypeScript (strict mode, `nodenext` module resolution, `@/*` path aliases → `./src/*`)
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`) over `pg`
- **Auth**: Better Auth (`better-auth`), admin-only instance mounted at `/api/admin-auth`
- **Validation**: Zod
- **Logging**: Winston (console in dev, JSON + file transports in production)
- **Hardening**: Helmet, CORS, `express-rate-limit` (global + a stricter per-endpoint tier), `hpp`, prototype-pollution sanitization, request timeout guard
- **Dev tooling**: `tsx` (watch mode), `tsc` + `tsc-alias` (build), ESLint, Prettier

## Quick Start

```bash
# From this directory (apps/server)
npm install
cp .env.example .env   # then fill in the required values below
npm run db:migrate     # apply migrations to your database
npm run seed:admin     # create the first admin account
npm run dev             # start the dev server (tsx watch)
```

The server listens on `PORT` (default `3000`) once started.

## npm Scripts

| Script        | Command                        | Purpose                                                                      |
| ------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `dev`         | `tsx watch src/server.ts`      | Run the server in watch mode for local development                           |
| `build`       | `tsc && tsc-alias`             | Type-check and compile to `dist/`, rewriting `@/*` aliases to relative paths |
| `start`       | `node dist/server.js`          | Run the compiled production build                                            |
| `lint`        | `eslint .`                     | Lint the codebase                                                            |
| `format`      | `prettier --write .`           | Format the codebase                                                          |
| `audit`       | `npm audit --audit-level=high` | Check for high-severity dependency vulnerabilities                           |
| `db:generate` | `drizzle-kit generate`         | Generate SQL migrations from the Drizzle schema                              |
| `db:migrate`  | `drizzle-kit migrate`          | Apply pending migrations to `DATABASE_URL`                                   |
| `seed:admin`  | `tsx scripts/seed-admin.ts`    | Bootstrap the first admin account (see below)                                |

These map onto the Makefile's `install-server`, `dev-server`,
`build-server`, `start-server`, `lint-server`, and `format-server`
targets at the monorepo root.

## Environment Variables

Copy `.env.example` to `.env` and configure the following — validated
at startup by `src/infra/core/config/env.config.ts`, which fails fast
on any missing required variable rather than crashing later on the
first request that needs it:

| Variable                     | Required      | Default                 | Notes                                                                                                                                                |
| ---------------------------- | ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | Yes           | —                       | One of `development` \| `production` \| `test`                                                                                                       |
| `PORT`                       | Yes           | —                       | HTTP port the server binds to                                                                                                                        |
| `LOG_LEVEL`                  | No            | `info`                  | One of `error`\|`warn`\|`info`\|`http`\|`verbose`\|`debug`\|`silly`                                                                                  |
| `LOG_FILE_PATH`              | No            | —                       | Enables file logging; only used when `NODE_ENV=production`                                                                                           |
| `ERROR_LOG_FILE_PATH`        | No            | —                       | Error-only log file; only used when `NODE_ENV=production`                                                                                            |
| `CORS_ORIGIN`                | Conditionally | —                       | Comma-separated allowlist; **required in production** — a wildcard origin is rejected at startup, not silently allowed                               |
| `RATE_LIMIT_WINDOW_MS`       | No            | `900000`                | Global IP-based rate limit window                                                                                                                    |
| `RATE_LIMIT_MAX`             | No            | `100`                   | Global IP-based rate limit ceiling                                                                                                                   |
| `ADMIN_RATE_LIMIT_WINDOW_MS` | No            | `900000`                | Stricter window layered on top of the global limit for mutating endpoints                                                                            |
| `ADMIN_RATE_LIMIT_MAX`       | No            | `10`                    | Stricter ceiling for mutating endpoints (create/update/delete/sell/restock)                                                                          |
| `BODY_LIMIT`                 | No            | `10kb`                  | Max JSON/urlencoded request body size                                                                                                                |
| `REQUEST_TIMEOUT_MS`         | No            | `30000`                 | App-level handler timeout (503 on expiry) — independent of the Node-level socket timeout in `server.ts`                                              |
| `SHUTDOWN_DRAIN_MS`          | No            | `10000`                 | Delay between SIGTERM/SIGINT and closing the HTTP server                                                                                             |
| `DATABASE_URL`               | Yes           | —                       | Postgres connection string — use a pooled connection string (e.g. Neon's `-pooler` host), since this is a long-running process sharing one `pg.Pool` |
| `BETTER_AUTH_SECRET`         | Yes           | —                       | Better Auth instance secret                                                                                                                          |
| `BETTER_AUTH_URL`            | Yes           | `http://localhost:3000` | Better Auth base URL                                                                                                                                 |

## Architecture

```
src/
├── app/
│   ├── app.ts                 # Express app: middleware pipeline, health checks, route mounting
│   ├── routes.ts               # Feature router wiring, mounted at /api/v1
│   ├── features/                # One folder per domain feature (controller/service/repository/routes/...)
│   │   ├── products/             # Full CRUD + sell()/restock() atomic stock mutation
│   │   ├── supplier/              # Full CRUD
│   │   ├── reports/                # Read-only aggregates (sales summary, stock value over time)
│   │   ├── dashboard/               # Read-only aggregate (single /summary endpoint)
│   │   └── settings/account/         # Read-only profile — name/email/password go through Better Auth's own endpoints
│   └── middleware/               # Auth, admin-role, rate-limit, sanitize, logging, error handling
├── infra/
│   ├── core/                    # env config, HTTP status constants, Express type augmentation
│   ├── lib/                     # Database (Drizzle), logger, app errors, shutdown state
│   └── modules/auth/             # Better Auth admin instance
└── server.ts                    # Process entry point: binds the port, graceful shutdown, signal handling
```

Every feature follows a consistent layering: **routes → controller →
service → repository**, with a **mapper** shaping outbound responses, a
**schema** (Zod) validating inbound input where the feature accepts
writes, and a **types** file for shared interfaces. `dashboard` and
`reports` skip the schema layer where they have no mutating input beyond
query params.

### Request Pipeline (`app.ts`)

Registered in this exact order — each step depends on the one before it
(e.g. rate limiting must run before body parsing, so an abusive client
is rejected before its payload is ever parsed):

1. `helmet` (secure headers, strict CSP for a JSON-only API — `scriptSrc`/`styleSrc`/`imgSrc` all denied by default since this API serves no browser-rendered content of its own)
2. `cors` (origin allowlist from `CORS_ORIGIN`)
3. Better Auth admin handler (`/api/admin-auth/*`, mounted before body parsing — Better Auth needs the raw request stream)
4. Global rate limiter
5. `compression`
6. Request logger (assigns a correlation ID, logged with every request)
7. Request timeout guard (application-level backstop, independent of the Node socket timeout)
8. `express.json()` / `express.urlencoded()` (size-capped by `BODY_LIMIT`)
9. `hpp` + prototype-pollution sanitization (strips `__proto__`/`constructor`/`prototype` keys)
10. Health checks (`/health/live`, `/health/ready`) and root route
11. Feature routes (`/api/v1/*`)
12. 404 handler → centralized error handler

### Authentication

Every feature route requires an authenticated **admin** session,
enforced by `requireAdminAuth` (resolves the Better Auth admin session)
followed by `requireAdmin` (checks `role === 'admin'`). Sessions are
issued via Better Auth's admin instance at `/api/admin-auth/*`
(email/password only, `autoSignIn` disabled so a role-rejected sign-in
never leaves the client half-authenticated), with a 7-day expiry and a
`before`-hook that rejects non-admin sign-ins and enforces account
bans — checked _before_ the role gate, so a banned admin sees "account
banned," not the generic "admin access required."

## API Routes

All routes are mounted under `/api/v1` and require an authenticated
admin session.

| Base Path           | Feature   | Endpoints                                                                                       |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `/products`         | Products  | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/sell`, `POST /:id/restock` |
| `/suppliers`        | Suppliers | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`                                        |
| `/reports`          | Reports   | `GET /sales-summary`, `GET /stock-value`                                                        |
| `/dashboard`        | Dashboard | `GET /summary`                                                                                  |
| `/settings/account` | Account   | `GET /` (read-only; name/email/password mutations go through Better Auth's own endpoints)       |

Mutating product/supplier endpoints are additionally guarded by a
stricter, per-endpoint rate limit (`ADMIN_RATE_LIMIT_*`) layered on top
of the global limiter — sized for endpoints that mutate state or touch
privileged data, so a scripted-abuse client can't exhaust a read-sized
budget before ever being throttled on the writes that actually matter.

Outside `/api/v1`:

- `GET /health/live` — liveness probe (process is up; no dependency checks, so a slow DB never causes a false-negative restart)
- `GET /health/ready` — readiness probe (returns 503 while draining on shutdown)
- `GET /` — minimal service info
- `ALL /api/admin-auth/*` — Better Auth admin sign-in/session endpoints

## Database

Schema is defined in `src/infra/lib/database/schema/` (`auth.schema.ts`
for Better Auth tables, `product.schema.ts`, `supplier.schema.ts`) and
re-exported from `schema.ts`. Migrations are generated by `drizzle-kit`
into `database/migrations/` per `drizzle.config.ts`. Run
`npm run db:generate` after schema changes, then `npm run db:migrate`
to apply them.

`product_transaction` (`type: sale | in | adjustment`) is the single
append-only ledger every stock change writes to: `sell()` snapshots the
product's unit price at the moment of sale — never the current price —
so historical revenue in `reports` stays accurate even after a later
price edit. `sell()`/`restock()` are each a single guarded `UPDATE ...
WHERE` (not a separate read-check-then-write), so concurrent requests
can never both pass a stock check and combine to oversell or underflow.

## Bootstrapping an Admin

`npm run seed:admin` creates the first admin account through Better
Auth's own sign-up path (so password hashing matches a real sign-up),
then promotes it to `role: 'admin'` directly in the database — the only
supported way to create the very first admin, since Better Auth's own
role-management API requires an existing admin session to call. Change
the seeded password immediately after first login.

## Graceful Shutdown

On `SIGTERM`/`SIGINT`, the server flips `/health/ready` to `503`
immediately (so the load balancer stops routing new traffic), waits
`SHUTDOWN_DRAIN_MS` for in-flight connections to drain, then closes the
HTTP server. A forced exit fires 10 seconds after the drain window if
shutdown hasn't completed by then — so a stuck drain never blocks an
orchestrator restart indefinitely.
