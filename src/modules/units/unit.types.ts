import type { BaseEntity } from "../../shared/types.js";
import type { Cents } from "../../shared/money.js";

export const UnitStatus = {
  Occupied: "occupied",
  Vacant: "vacant",
  UnderMaintenance: "under_maintenance",
} as const;

export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export interface Unit extends BaseEntity {
  readonly propertyId: string;
  /** Human label unique within its property, e.g. "Apt 2B". */
  readonly label: string;
  readonly bedrooms: number;
  readonly bathrooms: number;
  /** Advertised monthly rent in TTD cents; the lease's own rent governs billing. */
  readonly marketRent: Cents;
  readonly status: UnitStatus;
  readonly description: string;
  readonly notes: string;
}

export type UnitCreate = Omit<Unit, keyof BaseEntity>;
export type UnitUpdate = Partial<UnitCreate>;
