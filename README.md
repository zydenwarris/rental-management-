# Rental Management API

Landlord-focused rental management backend. Authentication and identity come from
Supabase; no payment processing. The landlord portal that consumes this API lives in
[`web/`](web/README.md) and runs as its own server — see [Quick start](#quick-start).

All data flows through typed service and repository interfaces. The repositories are
still in-memory mocks, so **portfolio data does not survive an API restart yet**;
identity and the `landlords` table are already in Postgres. Swapping the mocks for
PostgreSQL repositories is the next piece of work and touches no business logic.

## Quick start

The API and the portal are **two separate servers**. One command from the repo root
starts both:

```bash
npm install
npm install --prefix web

cp .env.example .env             # then fill in DATABASE_URL and SUPABASE_URL
cp web/.env.example web/.env     # then fill in the two VITE_ values

npm run dev:all      # API on :4000, portal on :5173
```

Both `.env` files are required: the API refuses to start without `SUPABASE_URL`, and the
portal throws on load without its Supabase values. That is deliberate — the alternative
is a login screen that fails with an opaque network error.

Then open **http://localhost:5173**.

Output is prefixed `[api]` and `[web]` so you can tell which server spoke, and if either
one dies the other is stopped with it — a half-running pair looks like a broken app and
wastes more time than it saves.

To run them separately instead — independent logs, or only one of the two:

```bash
# terminal 1, from the repo root — API on :4000, seeded
npm run dev
```

```bash
# terminal 2, from web/ — portal on :5173
cd web
npm run dev
```

Either way the app is at `:5173`, never `:4000` — the API serves JSON only and no HTML,
so loading it in a browser returns
`{"error":{"code":"NOT_FOUND", ...}}`. That is the API working, not a failure. Vite
proxies `/api` and `/health` through to `:4000`, so the browser stays on one origin and
the backend needs no CORS. Frontend details are in [`web/README.md`](web/README.md).

Commands, all from the repo root:

| Command | What it does |
|---|---|
| `npm run dev:all` | Start the API and the portal together |
| `npm run dev` | Start the API alone, with hot reload and seeded development data |
| `npm test` | Run the business-rule test suite |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` | Compile to `dist/` |
| `SEED=false npm run dev` | Start with an empty portfolio |

Health check: `GET /health` → `{"status":"ok"}`

If either server exits with `EADDRINUSE`, an older instance still holds the port —
`npx kill-port 4000 5173` frees both. The portal sets `strictPort`, so it fails outright
rather than moving to another port.

## Architecture

Each module owns one entity and is split the same way. A request only ever moves
downward through these layers:

```
routes/        HTTP paths and per-route schema validation
controllers/   HTTP in → service call → HTTP out. No business rules.
services/      All business rules and invariants. The only layer that decides anything.
repositories/  Data access behind an interface. Swappable.
types/         Entities and enums
schemas/       Zod request validation
```

Controllers never touch repositories, and services never touch HTTP. That separation is
what makes the data layer replaceable.

```
src/
  app.ts            Express wiring
  server.ts         Entry point
  container.ts      Composition root — the only file that names concrete implementations
  config/           Cross-cutting constants
  shared/           Errors, money, dates, repository interface, middleware, guards
  modules/          properties, units, tenants, leases, payments, expenses,
                    maintenance, dashboard
  seed/             Realistic development data
```

### Swapping the mocks for PostgreSQL

Every repository implements `Repository<TEntity, TCreate, TUpdate>` from
`src/shared/repository.ts`. Every method is `async` and takes a `LandlordScope`, so a SQL
implementation pushes scoping into the `WHERE` clause and drops straight in.

1. Write e.g. `PostgresPropertyRepository implements PropertyRepository`.
2. Change the constructor call in `buildRepositories()` in `src/container.ts`.

No service, controller, route, or test changes.

### Authentication

The browser talks to Supabase for authentication only — never for data. Every property,
lease and payment still goes through this API, which is where the business rules live.

1. The portal signs in with `@supabase/supabase-js` and holds the session.
2. It sends the access token as `Authorization: Bearer <token>` on every request.
3. `requireAuth` in `src/shared/middleware.ts` verifies the token against the project's
   **public JWKS** (ES256) and sets `req.ctx.landlordId` to the `sub` claim.
4. On a user's first request, `ensureLandlord` upserts their `landlords` row.

Verification is local, so there is no round-trip to Supabase per request and **no
service_role key anywhere in this codebase**. `GET /health` is the only unauthenticated
route; everything under `/api` answers `401 UNAUTHORIZED` without a valid token.

Every service already scoped reads and writes to `ctx.landlordId`, so landlord-level
authorization came for free the moment that one middleware started telling the truth.

### Row level security

The API connects as `postgres`, which **owns** these tables — and a table owner bypasses
RLS. `withLandlordScope` in `src/shared/db/scope.ts` therefore opens every transaction as
the `authenticated` role with the caller's JWT claims, so the policies in the migration
actually run. Isolation then holds twice: in the repository's `WHERE` clause and in the
database itself. `src/shared/db/scope.test.ts` guards that the role switch still happens
and does not leak onto the next request sharing a pooled connection.

## Conventions

**Money is always an integer number of cents**, in TTD. `TTD 3,500.00` is `350000`.
Floating-point dollars accumulate rounding error the moment they are summed, and the
dashboard sums many of them. Formatting for display is the frontend's job.

**Calendar dates are `YYYY-MM-DD` strings**, not timestamps. A lease starting 1 March
starts 1 March in every timezone. Audit fields (`createdAt`, `updatedAt`) are full ISO
timestamps. All date comparison uses `date-fns`.

**Derived values are never stored.** Lease status, payment status, and "expiring soon"
are computed from dates and amounts, so they cannot go stale as the calendar moves.

## Response format

Single resource:

```json
{ "data": { "id": "prop_...", "name": "Palm View Apartments" } }
```

Collection:

```json
{ "data": [ ... ], "meta": { "total": 3 } }
```

Error — always this shape, on every failure:

```json
{
  "error": {
    "code": "LEASE_OVERLAP",
    "message": "Unit 'unit_abc' already has an active lease overlapping these dates.",
    "details": [{ "field": "startDate", "message": "Conflicts with lease 'lse_xyz'." }]
  }
}
```

`details` carries field-level messages for form highlighting and is `[]` when not applicable.

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired access token |
| `VALIDATION_ERROR` | 422 | Request body failed schema validation |
| `NOT_FOUND` | 404 | Resource does not exist, or belongs to another landlord |
| `DUPLICATE_UNIT` | 409 | Unit label already used within that property |
| `LEASE_OVERLAP` | 409 | Unit already has an occupying lease over those dates |
| `INVALID_RELATIONSHIP` | 422 | Referenced entity exists but not where claimed |
| `INVALID_PAYMENT_AMOUNT` | 422 | Payment amount fails a business rule |
| `UNIT_NOT_AVAILABLE` | 409 | Unit cannot be leased in its current state |
| `CONFLICT` | 409 | Blocked by dependent records or an illegal state transition |
| `INTERNAL_ERROR` | 500 | Unexpected failure; details are never leaked |

## Endpoints

### Dashboard

`GET /api/dashboard` — aggregated portfolio summary for the current month.

```json
{
  "data": {
    "month": "2026-08",
    "totalProperties": 3,
    "occupancy": {
      "totalUnits": 7, "occupied": 4, "vacant": 2,
      "underMaintenance": 1, "occupancyRate": 57.1
    },
    "financials": {
      "expectedRent": 1620000, "collectedRent": 1100000,
      "outstandingRent": 520000, "expenses": 487000,
      "netIncome": 613000, "collectionRate": 67.9
    },
    "maintenance": {
      "open": 3, "urgent": 1, "inProgress": 0,
      "completed": 1, "totalCost": 82000
    },
    "leasesExpiringSoon": [
      { "leaseId": "lse_...", "tenantId": "tnt_...", "unitId": "unit_...",
        "propertyId": "prop_...", "endDate": "2026-09-18", "daysRemaining": 40 }
    ]
  }
}
```

How the figures are derived:

- **expectedRent** — monthly rent of every non-terminated lease whose term touches the month.
- **collectedRent** — payments dated inside the month, regardless of which month they cover.
- **outstandingRent** — `expectedRent − collectedRent`, floored at zero.
- **netIncome** — `collectedRent − expenses`. Cash in hand, not money merely owed.
- **occupancyRate / collectionRate** — percentages to one decimal; `0` when the denominator is zero.
- **leasesExpiringSoon** — active or upcoming leases ending within 60 days, soonest first.

### Properties

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/properties` | |
| `POST` | `/api/properties` | |
| `GET` | `/api/properties/:id` | |
| `PATCH` | `/api/properties/:id` | |
| `DELETE` | `/api/properties/:id` | Blocked while units, expenses, or maintenance exist |
| `GET` | `/api/properties/:id/units` | |
| `GET` | `/api/properties/:id/expenses` | |
| `GET` | `/api/properties/:id/maintenance` | |

```jsonc
// POST /api/properties
{
  "name": "Palm View Apartments",
  "type": "multi_unit",        // single_family | apartment | multi_unit | townhouse | commercial | other
  "address": "12 Maraval Road",
  "city": "Port of Spain",
  "description": "",           // optional
  "notes": ""                  // optional
}
```

`PATCH` additionally accepts `status`: `active` | `archived`.

### Units

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/units` | |
| `POST` | `/api/units` | |
| `GET` | `/api/units/:id` | |
| `PATCH` | `/api/units/:id` | |
| `DELETE` | `/api/units/:id` | Blocked while lease history exists |
| `GET` | `/api/units/:id/leases` | |

```jsonc
// POST /api/units
{
  "propertyId": "prop_...",
  "label": "1A",               // unique within the property, case-insensitive
  "bedrooms": 2,
  "bathrooms": 1,
  "marketRent": 350000,        // cents
  "description": "",
  "notes": ""
}
```

New units are created `vacant`. `PATCH` accepts `status`: `occupied` | `vacant` |
`under_maintenance`, though occupancy normally follows lease activity automatically.

### Tenants

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/tenants` | |
| `POST` | `/api/tenants` | |
| `GET` | `/api/tenants/:id` | |
| `PATCH` | `/api/tenants/:id` | |
| `DELETE` | `/api/tenants/:id` | Blocked while lease history exists |
| `GET` | `/api/tenants/:id/leases` | |
| `GET` | `/api/tenants/:id/payments` | |

```jsonc
// POST /api/tenants
{
  "fullName": "Asha Ramkissoon",
  "phone": "868-555-0142",
  "email": "asha.r@example.tt",       // optional
  "emergencyContactName": "",         // optional
  "emergencyContactPhone": "",        // optional
  "notes": ""                         // optional
}
```

No medical information is collected, by design.

### Leases

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/leases` | |
| `POST` | `/api/leases` | Rejects overlap with an occupying lease |
| `GET` | `/api/leases/:id` | |
| `PATCH` | `/api/leases/:id` | Re-checks overlap when dates change |
| `POST` | `/api/leases/:id/terminate` | Frees the unit |
| `DELETE` | `/api/leases/:id` | Blocked while payments exist |
| `GET` | `/api/leases/:id/payments` | |

```jsonc
// POST /api/leases
{
  "tenantId": "tnt_...",
  "unitId": "unit_...",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",     // must be after startDate
  "monthlyRent": 350000,       // cents, > 0
  "securityDeposit": 350000,   // cents, >= 0
  "rentDueDay": 1,             // 1-28, so the day exists in every month
  "utilitiesIncluded": false,
  "notes": ""
}
```

Status is derived at creation — `upcoming`, `active`, or `expired` — and is never set
directly. Termination goes through `POST /:id/terminate`, not a status write. Tenant and
unit are immutable on a lease: moving a tenant is a new lease, which preserves history.

### Payments

Manually recorded only; no online payment processing.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/payments` | |
| `POST` | `/api/payments` | |
| `GET` | `/api/payments/:id` | |
| `PATCH` | `/api/payments/:id` | Recalculates status |
| `DELETE` | `/api/payments/:id` | |

```jsonc
// POST /api/payments
{
  "leaseId": "lse_...",
  "amount": 350000,            // cents, whole and > 0
  "paymentDate": "2026-08-01", // must fall inside the lease term
  "dueDate": "2026-08-01",
  "method": "bank_transfer",   // cash | bank_transfer | cheque | card | other
  "reference": "RBC-884219",
  "notes": ""
}
```

Status is derived, never supplied:

- **`partial`** — less than the lease's monthly rent, whatever the timing. The shortfall
  is what the landlord needs to see first.
- **`late`** — full amount, more than 5 days after the due date.
- **`paid`** — full amount within the grace period. Overpayment still counts as paid.

`tenantId`, `unitId`, and `propertyId` are copied from the lease onto the payment.

### Expenses

| Method | Path |
|---|---|
| `GET` | `/api/expenses` |
| `POST` | `/api/expenses` |
| `GET` | `/api/expenses/:id` |
| `PATCH` | `/api/expenses/:id` |
| `DELETE` | `/api/expenses/:id` |

```jsonc
// POST /api/expenses
{
  "propertyId": "prop_...",
  "unitId": null,              // null for a property-wide cost
  "category": "utilities",     // maintenance | utilities | insurance | property_tax
                               // management | repairs | supplies | other
  "description": "Common area electricity",
  "amount": 62000,             // cents, > 0
  "date": "2026-08-03",
  "vendor": "T&TEC",
  "notes": ""
}
```

When `unitId` is given it must belong to `propertyId`, otherwise both properties' net
income would be distorted.

### Maintenance

| Method | Path |
|---|---|
| `GET` | `/api/maintenance` |
| `POST` | `/api/maintenance` |
| `GET` | `/api/maintenance/:id` |
| `PATCH` | `/api/maintenance/:id` |
| `DELETE` | `/api/maintenance/:id` |

```jsonc
// POST /api/maintenance
{
  "propertyId": "prop_...",
  "unitId": "unit_...",        // null for common areas
  "title": "Kitchen tap leaking",
  "description": "Constant drip.",
  "priority": "medium",        // low | medium | high | urgent
  "contractor": "Dave's Plumbing",
  "estimatedCost": 45000,      // cents or null
  "reportedDate": "2026-08-04",
  "scheduledDate": null,
  "notes": ""
}
```

Requests open as `open`. `PATCH` accepts `status`, `actualCost`, and `completedDate`.
Allowed transitions:

```
open        → scheduled, in_progress, completed, cancelled
scheduled   → in_progress, completed, cancelled, open
in_progress → completed, cancelled
completed   → (terminal)
cancelled   → (terminal)
```

Completing a request without a `completedDate` stamps today automatically.

## Business rules enforced

- A unit belongs to exactly one property; labels are unique within a property, case-insensitively.
- A unit never has two overlapping occupying (`upcoming` or `active`) leases. Ranges are
  inclusive of the end date, so a lease ending 31 May conflicts with one starting 31 May.
  Terminated and expired leases never block.
- Tenants reach units only through leases, so tenants can move while history is preserved.
- Payments must be whole positive cents and fall inside their lease term.
- Expenses and maintenance requests naming a unit must name that unit's property.
- Deletion is blocked wherever it would orphan or erase records: properties with units,
  expenses, or maintenance; units and tenants with lease history; leases with payments.
- Every read and write is scoped to the acting landlord.

## Tests

```bash
npm test
```

73 tests covering the rules above — lease overlap and its boundaries, payment status
derivation and amount validation, unit/property integrity, maintenance state transitions,
cross-module deletion guards, and dashboard aggregation against hand-computed totals.
Business logic is tested at the service layer, where the rules live.

## Deliberately out of scope

Tenant accounts and portal, online rent payment processing, document uploads,
notifications, and reporting exports.

## Known gaps

- **Portfolio data is still in memory.** Only identity and `landlords` live in Postgres.
  Restarting the API empties the portfolio. Postgres repositories are next.
- **Email confirmation is off** in the Supabase project so signup returns a session
  immediately. Before real users, turn it back on and configure a custom SMTP provider —
  the built-in sender is rate-limited and on new projects often delivers only to the
  account owner. Password reset needs working email, so it is affected too.
