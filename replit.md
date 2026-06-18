# Smart QR Restaurant Ordering System

A full-stack QR-based restaurant ordering platform where customers scan a QR code at their table, browse the menu, place orders, and track status live. Restaurant staff manage all orders through an admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/restaurant run dev` — run the restaurant frontend (port 18641, served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Wouter routing, TanStack React Query, next-themes
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (`menuItems.ts`, `orders.ts`)
- `artifacts/api-server/src/routes/` — Express route handlers (menu, orders, queue, admin, health)
- `artifacts/restaurant/src/pages/` — React pages (landing, menu, cart, queue, admin/login, admin/dashboard)
- `artifacts/restaurant/src/hooks/use-cart.tsx` — Cart state (Context + localStorage)

## Architecture decisions

- Auth uses a lightweight in-memory token store (X-Admin-Token header) — suitable for single-server deployments; swap for a DB-backed session store for multi-instance production.
- Cart state is persisted to localStorage so customers don't lose items on page refresh.
- Table number is read from `?table=N` URL param and also persisted to localStorage.
- The queue page polls every 5s via React Query `refetchInterval` — no WebSocket needed for MVP.
- Admin stats and order lists poll every 10s for near-real-time kitchen display.

## Product

- **Landing page** (`/`) — QR table detection, restaurant branding, CTA to browse
- **Menu** (`/menu?table=N`) — Category tabs, search, food cards with add-to-cart
- **Cart** (`/cart`) — Order review, quantity controls, place order with success modal
- **Live Queue** (`/queue`) — Public order tracker with progress bars, auto-refreshes every 5s
- **Admin Login** (`/admin`) — Staff login (username: `admin`, password: `admin123`)
- **Admin Dashboard** (`/admin/dashboard`) — Order management table, status pipeline actions, stats cards

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Admin auth uses in-memory token set — restarts the API server clears all sessions (staff must re-login)
- After any OpenAPI spec change, always run codegen before typechecking frontend
- `pnpm run typecheck:libs` must be run before `pnpm --filter @workspace/api-server run typecheck` when DB schema changes — otherwise stale declarations cause false TS2305 errors
- Do not run `pnpm dev` at workspace root — use per-artifact workflow commands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
