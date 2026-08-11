import type { BaseEntity } from "../../shared/types.js";
import type { Cents } from "../../shared/money.js";
import type { IsoDate } from "../../shared/dates.js";

/**
 * Stored lease statuses. "Expiring soon" is intentionally NOT a stored status —
 * it is a function of endDate and today's date, derived where needed. Storing it
 * would let it go stale the moment the calendar moves.
 */
export const LeaseStatus = {
  Upcoming: "upcoming",
  Active: "active",
  Expired: "expired",
  Terminated: "terminated",
} as const;

export type LeaseStatus = (typeof LeaseStatus)[keyof typeof LeaseStatus];

/** Statuses under which a lease occupies its unit and blocks overlapping leases. */
export const OCCUPYING_STATUSES: readonly LeaseStatus[] = [
  LeaseStatus.Upcoming,
  LeaseStatus.Active,
];

export interface Lease extends BaseEntity {
  readonly tenantId: string;
  readonly unitId: string;
  /** Denormalised from the unit for cheap property-level queries. */
  readonly propertyId: string;
  /** Inclusive first and last day of the term. */
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly monthlyRent: Cents;
  readonly securityDeposit: Cents;
  /** Day of month rent falls due (1-28, so it exists in every month). */
  readonly rentDueDay: number;
  readonly status: LeaseStatus;
  readonly utilitiesIncluded: boolean;
  readonly notes: string;
}

export type LeaseCreate = Omit<Lease, keyof BaseEntity>;
export type LeaseUpdate = Partial<LeaseCreate>;
