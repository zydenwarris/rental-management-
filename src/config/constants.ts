/**
 * Single home for cross-cutting values. Anything referenced in more than one
 * module belongs here rather than being retyped at each use site.
 */

/** Trinidad & Tobago dollar. The only currency this version handles. */
export const DEFAULT_CURRENCY = "TTD" as const;

/** A lease is "expiring soon" on the dashboard within this many days. */
export const LEASE_EXPIRING_SOON_DAYS = 60;

/** Rent is considered outstanding once the due date is this many days past. */
export const RENT_GRACE_PERIOD_DAYS = 5;

/** Bounds on the day-of-month a lease can name as its rent due date. */
export const MIN_RENT_DUE_DAY = 1;
export const MAX_RENT_DUE_DAY = 28;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_PORT = 4000;
