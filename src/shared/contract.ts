/**
 * The API contract, re-exported for consumers outside this project.
 *
 * The web frontend imports this module (aliased as `@contract`) instead of
 * redeclaring entity shapes and enum strings. Nine enums of string literals
 * would drift silently if copied — a stale literal still compiles.
 *
 * Two rules keep this safe to load in a browser:
 *
 *  1. `export type` for anything whose module value-imports a runtime dependency.
 *     `money.ts` imports config constants and `dates.ts` imports date-fns; a plain
 *     `export {}` would drag date-fns into the browser bundle. `export type` is
 *     erased at compile time, so nothing is emitted.
 *
 *  2. Named re-exports only, never `export *`, so what crosses this boundary is
 *     always visible here. `ApiError` deliberately does NOT cross — the frontend
 *     has its own error class, and two classes with one name is a debugging tax.
 *
 * Note the two families of shape, which are genuinely different things:
 *   - `Property`, `Lease`, … are what the API *returns*.
 *   - `*CreateInput` / `*UpdateInput` are what the API *accepts*, taken from the
 *     Zod schemas that validate them. They omit every server-derived field —
 *     a lease request carries no `status` or `propertyId`, because the server
 *     works those out. The stored `*Create` types are NOT the request contract
 *     and are deliberately not exported.
 */

export type { BaseEntity } from "./types.js";
export type { Cents } from "./money.js";
export type { IsoDate, IsoDateTime } from "./dates.js";

export { ErrorCode } from "./errors.js";
export type { ErrorDetail } from "./errors.js";

export { PropertyType, PropertyStatus } from "../modules/properties/property.types.js";
export type { Property } from "../modules/properties/property.types.js";
export type {
  PropertyCreateInput,
  PropertyUpdateInput,
} from "../modules/properties/property.schemas.js";

export { UnitStatus } from "../modules/units/unit.types.js";
export type { Unit } from "../modules/units/unit.types.js";
export type { UnitCreateInput, UnitUpdateInput } from "../modules/units/unit.schemas.js";

export type { Tenant } from "../modules/tenants/tenant.types.js";
export type { TenantCreateInput, TenantUpdateInput } from "../modules/tenants/tenant.schemas.js";

export { LeaseStatus, OCCUPYING_STATUSES } from "../modules/leases/lease.types.js";
export type { Lease } from "../modules/leases/lease.types.js";
export type { LeaseCreateInput, LeaseUpdateInput } from "../modules/leases/lease.schemas.js";

export { PaymentMethod, PaymentStatus } from "../modules/payments/payment.types.js";
export type { Payment } from "../modules/payments/payment.types.js";
export type { PaymentCreateInput, PaymentUpdateInput } from "../modules/payments/payment.schemas.js";

export { ExpenseCategory } from "../modules/expenses/expense.types.js";
export type { Expense } from "../modules/expenses/expense.types.js";
export type { ExpenseCreateInput, ExpenseUpdateInput } from "../modules/expenses/expense.schemas.js";

export {
  MaintenancePriority,
  MaintenanceStatus,
  ALLOWED_STATUS_TRANSITIONS,
  OPEN_MAINTENANCE_STATUSES,
} from "../modules/maintenance/maintenance.types.js";
export type { MaintenanceRequest } from "../modules/maintenance/maintenance.types.js";
export type {
  MaintenanceCreateInput,
  MaintenanceUpdateInput,
} from "../modules/maintenance/maintenance.schemas.js";

export type {
  DashboardSummary,
  OccupancySummary,
  FinancialSummary,
  MaintenanceSummary,
  ExpiringLease,
} from "../modules/dashboard/dashboard.types.js";
