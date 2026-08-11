import { randomUUID } from "node:crypto";

/**
 * Prefixed identifiers. The prefix makes it obvious in a log or a bug report what a
 * bare id refers to, and catches "passed a unit id where a lease id was expected"
 * during review rather than at runtime.
 */
export const IdPrefix = {
  Property: "prop",
  Unit: "unit",
  Tenant: "tnt",
  Lease: "lse",
  Payment: "pay",
  Expense: "exp",
  Maintenance: "mnt",
  Landlord: "lord",
} as const;

export type IdPrefix = (typeof IdPrefix)[keyof typeof IdPrefix];

export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${randomUUID()}`;
}
