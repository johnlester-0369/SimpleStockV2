# SimpleStock V2 — Web (Admin Portal)

> One admin shell for inventory, suppliers, reports, and account
> settings — try the whole thing without a backend, or point it at the
> real API the moment you need persistence.

Admin-only inventory management frontend for SimpleStock V2, built with
Vite + React 19 + TypeScript + Tailwind CSS v4. Renders the dashboard,
products, suppliers, reports, and account-settings shell and talks to
the Express API in `apps/server` — or, with one env var, runs entirely
offline against `localStorage`, seeded with a 100-product dataset and a
realistic 60-day transaction history, so an evaluator can explore every
screen before ever standing up a database.

## Tech Stack

- **Build tool:** Vite 8 (`@vitejs/plugin-react`, `vite-plugin-svgr` for `?react` SVG imports)
- **Framework:** React 19 + React Router 7 (`createBrowserRouter`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), CSS custom-property theme tokens (light/dark) under `src/app/styles/`
- **Data fetching:** TanStack Query v5
- **Forms & validation:** React Hook Form + Zod (`@hookform/resolvers`)
- **Auth:** better-auth React client, scoped to `/api/admin-auth`
- **Charts:** Recharts v3
- **Language:** TypeScript ~6.0, project-referenced via `tsconfig.app.json` / `tsconfig.node.json`

## Quick Start

```bash
npm install
cp .env.example .env   # adjust VITE_DEMO_MODE as needed
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies every
`/api/*` request to `http://localhost:3000` (see `vite.config.ts`), so
auth cookies stay same-origin with the Express API during local
development.

## Available Scripts

| Script            | Command                | Purpose                              |
| ----------------- | ---------------------- | ------------------------------------ |
| `npm run dev`     | `vite`                 | Start the Vite dev server            |
| `npm run build`   | `tsc -b && vite build` | Type-check project refs, then build  |
| `npm run lint`    | `eslint .`             | Lint the codebase                    |
| `npm run preview` | `vite preview`         | Preview the production build locally |
| `npm run format`  | `prettier --write .`   | Format the codebase with Prettier    |

From the monorepo root, the equivalent `make dev-web`, `make build-web`,
`make lint-web`, and `make format-web` targets are also available (see
the root `Makefile`).

## Environment Variables

Copy `.env.example` to `.env`:

```bash
# 'true' enables demo mode: every feature's api.ts routes CRUD through
# localStorage instead of the Express API, and the auth client swaps in
# a fixed-credential demo client. Purely client-side — no server or
# database is touched either way.
VITE_DEMO_MODE=false
```

When demo mode is enabled, sign in with the credentials shown on the
login page (`DEMO_ADMIN_CREDENTIALS` in
`src/infra/modules/auth/demo/demo-auth.lib.ts`).

## Demo Mode

Every feature's `*.api.ts` checks `env.isDemoMode` and, when true,
delegates to a sibling `*.demo.ts` module instead of calling
`apiClient` — one `if` per method, so the demo branch can never
silently drift from the real endpoint it's standing in for.

Demo data isn't a handful of hardcoded fixtures: `product.demo.ts`
seeds exactly 100 products from a deterministic PRNG (`mulberry32`, a
fixed seed, so every fresh browser generates the _same_ dataset), and
generates a **60-day transaction history** that walks 5 chronological
"fluctuation phases" (rising → steady → falling → steady → rising) so
the dashboard's stock-value chart shows a genuine wave rather than flat
noise. `dashboard.demo.ts` and `reports.demo.ts` both read that same
transaction log (not separate synthetic data), so a sale or restock
made on the Products page is immediately reflected in the dashboard and
reports too. Session state for demo auth lives in `localStorage` and
broadcasts to every `useSession()` subscriber via a small pub/sub store
(`demo-auth.lib.ts`), so a login/logout in one component (Sidebar) is
instantly reflected in another (Navbar) with no page reload.

Demo mode never talks to the real Express/Postgres backend — there is
no account or session to protect, so `DEMO_ADMIN_CREDENTIALS` are
intentionally public and shown right on the login page.

## Project Structure

```
src/
├── app/
│   ├── components/       # Shared UI (admin shell, brand, errors, ui/*)
│   ├── contexts/         # App-wide React contexts (e.g. ToastContext)
│   ├── features/         # Feature modules: api, queries, mutations,
│   │                      schema, types, demo (dashboard, products,
│   │                      reports, settings/account, supplier)
│   ├── guards/            # Route guards (AdminProtectedRoute, AdminPublicRoute)
│   ├── hooks/             # Shared hooks (e.g. useInlineEdit)
│   ├── pages/             # Route-level page components
│   ├── routes/            # Router config, lazy page bundles, route constants
│   ├── styles/            # Tailwind theme bridge, tokens, base, utilities
│   └── App.tsx            # RouterProvider wrapper
├── infra/
│   ├── core/               # env config, cn/polymorphic utils
│   ├── lib/                # HTTP client, localStorage demo helpers
│   └── modules/auth/       # Admin auth client, context, demo auth, validation
├── assets/                 # Static assets (logo.svg)
├── main.tsx                 # App entry point (providers + root render)
└── vite-env.d.ts             # Vite/env type declarations
```

Each feature module under `src/app/features/<name>/` follows the same
shape:

- `<name>.api.ts` — real API calls via `apiClient`, delegating to `<name>.demo.ts` when `env.isDemoMode` is true
- `<name>.queries.ts` / `<name>.mutations.ts` — TanStack Query hooks
- `<name>.schema.ts` — Zod validation schemas (where forms exist)
- `<name>.types.ts` — TypeScript types mirroring the server's response shape
- `<name>.constants.ts` — base path + query key factory
- `<name>.demo.ts` — localStorage-backed CRUD used in demo mode

`dashboard` and `reports` are read-only, so both skip `*.schema.ts`
and `*.mutations.ts` — there's nothing to validate or mutate.

## Routing & Auth

All routes live under `ROUTES.ADMIN.*`
(`src/app/routes/routes.constants.ts`):

| Route               | Page             | Guard                 |
| ------------------- | ---------------- | --------------------- |
| `/`                 | Login            | `AdminPublicRoute`    |
| `/dashboard`        | Dashboard        | `AdminProtectedRoute` |
| `/settings/account` | Account Settings | `AdminProtectedRoute` |
| `/suppliers`        | Suppliers        | `AdminProtectedRoute` |
| `/products`         | Products         | `AdminProtectedRoute` |
| `/reports`          | Reports          | `AdminProtectedRoute` |

Every route renders inside `AdminAuthLayout`, which scopes
`AdminAuthProvider` (and its isolated `admin.session_token` cookie) to
the whole subtree. `AdminProtectedRoute` and `AdminPublicRoute` both
read from `useAdminAuth()` and redirect based on session + `role` —
`AdminPublicRoute` bounces an already-authenticated admin straight to
the dashboard so revisiting `/` mid-session never flashes the login form.

## Path Alias

`@` resolves to `src/` (configured in both `vite.config.ts` and the
TypeScript project references) — always import via `@/...` rather than
relative paths that cross feature/infra boundaries.
