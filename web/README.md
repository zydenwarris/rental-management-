# Rentbook — landlord portal

The web frontend for the rental management API. Vite + React + TypeScript, white and
deep-emerald, light and dark.

## Running it

The API must be running first — the portal has no data of its own.

```bash
# terminal 1, from the repo root
npm run dev          # API on :4000, seeded

# terminal 2, from web/
npm run dev          # portal on :5173
```

Open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | Type-check, including the shared contract |
| `npm run build` | Type-check then build to `dist/` |
| `npm run preview` | Serve the production build |

## How it talks to the API

Vite proxies `/api` and `/health` to `http://localhost:4000`, so the browser only ever
sees one origin. That means **no CORS is needed and the backend needs no changes**.

The fetch wrapper reads `VITE_API_BASE_URL` and defaults to empty — same origin. Leave it
unset in development. In production, either serve `dist/` from Express (still same origin)
or put a proxy rule in front of a static host.

## The shared contract

`web/src/**` imports entity types and enum values from `@contract`, which is aliased to
`../src/shared/contract.ts` in the backend. There is no second copy of `UnitStatus` or
`PaymentStatus` anywhere — nine enums of bare strings would drift silently, because a stale
string literal still compiles.

Two shapes cross that boundary and they are different on purpose:

- `Property`, `Lease`, `Payment`, … — what the API **returns**.
- `PropertyCreateInput`, `LeaseCreateInput`, … — what the API **accepts**, inferred from
  the Zod schemas that validate it. These omit every server-derived field: a lease request
  carries no `status` or `propertyId` because the server works those out.

The maintenance status control is driven by `ALLOWED_STATUS_TRANSITIONS` imported from that
same file, so the UI offers exactly the moves the server permits — one table, not two.

Three settings make the cross-project import work, and all three are load-bearing:
`resolve.alias` and `server.fs.allow` in `vite.config.ts`, and `paths` in `tsconfig.json`.
The tsconfig entry omits the `.ts` extension while the Vite alias includes it — asymmetric,
both correct for their own resolver.

## Errors and forms

`applyServerErrors` maps an API rejection back onto the form field that caused it. It keys
on whether the response named any fields, **never on the status code** — the API attaches
field details to 409 conflicts as well as 422 validations:

| Response | Field marked |
|---|---|
| 422 validation | the offending input |
| 409 `DUPLICATE_UNIT` | `label` |
| 409 `LEASE_OVERLAP` | `startDate` |
| 409 `UNIT_NOT_AVAILABLE` | `unitId` |

Keying on `status === 422` would quietly downgrade the four most useful business errors to
anonymous banners. Validation issues with no path arrive as the sentinel field `"(body)"`
and become a form-level banner instead.

## Conventions

**Money** is integer TTD cents everywhere except the inside of a form, where it is dollars.
Conversion happens only at the form boundary (`lib/money.ts`).

**Dates** are `YYYY-MM-DD` strings, which is exactly what `<input type="date">` emits — so
there is no date library on the frontend at all. Parsing appends `T00:00:00` so a lease
starting 1 March never renders as 28 February.

**Server-derived values are read-only.** Payment status is shown as a badge, never an input.

**Filtering and sorting are client-side**, because no list endpoint on the API reads query
parameters. `hooks/useClientTable.ts` is the single place that changes if that ever lands.

## Design

White canvas, deep forest `#0F5132`, signal green `#16A34A`. In dark mode the primary
inverts to a light green — `#0F5132` is unreadable as a foreground on a dark canvas — which
is why components name semantic tokens (`--accent-strong`) and never a hex.

Type is the IBM Plex superfamily, self-hosted: Serif for display, Sans for UI, and **Mono
for every figure**, because rent columns have to align. That last one is a functional
requirement, not a flourish.

### The rent book

The dashboard's centrepiece is a ledger: one row per lease, one column per month, each cell
a payment state. It is the artifact landlords actually kept before software, and the grid
answers "who is behind, and for how long?" in a way no total can.

Cell state is carried by **fill and shape** — solid, half-filled, outlined, dashed — so it
survives greyscale and colour blindness rather than relying on hue alone. Months outside a
lease's term are drawn as absent, not as missed payments.

Occupancy is a segment per real unit rather than a percentage ring: seven units is seven
things a landlord can point at, and "57.1%" is not.

Motion is restrained: ledger rows cascade in, the collection bar fills, the headline figure
counts up once, routes enter with a short rise. A single `prefers-reduced-motion` rule in
`styles/global.css` collapses all of it.

## Structure

```
src/
  styles/       tokens.css (primitives) · theme.css (semantic, light + dark) · global.css
  lib/api/      client.ts · error.ts · keys.ts · resource.ts
  lib/          money.ts · dates.ts · labels.ts · form/applyServerErrors.ts
  components/   layout/ · ui/ · feedback/
  features/     one folder per API module, each with api.ts and its pages
  hooks/        useTheme · useClientTable · useCountUp
```

`features/` mirrors the backend's `src/modules/` one-for-one. All eight modules share the
same five verbs, so `lib/api/resource.ts` generates those calls once; anything module-specific
(`POST /leases/:id/terminate`, the nested reads) stays hand-written in that module's `api.ts`.

## Known constraints

- **Data is in-memory and reseeds on every backend restart.** Editing backend files while
  working in the UI wipes everything the portal just created.
- `web/` resolves the repo root's `node_modules` through hoisting, so `date-fns` and `express`
  would import successfully without being declared. Treat "is it in `web/package.json`?" as
  the rule. `zod` is declared as a devDependency because typechecking the inferred request
  types needs it, even though none of it reaches the bundle.
- No authentication. Every request acts as the same development landlord.
