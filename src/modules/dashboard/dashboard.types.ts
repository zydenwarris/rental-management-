import type { Cents } from "../../shared/money.js";
import type { IsoDate } from "../../shared/dates.js";

export interface OccupancySummary {
  readonly totalUnits: number;
  readonly occupied: number;
  readonly vacant: number;
  readonly underMaintenance: number;
  /** Percentage 0-100, rounded to one decimal. 0 when there are no units. */
  readonly occupancyRate: number;
}

export interface FinancialSummary {
  /** Sum of monthly rent across leases active in the reporting month. */
  readonly expectedRent: Cents;
  readonly collectedRent: Cents;
  /** expectedRent - collectedRent, floored at zero: overpayment is not a debt. */
  readonly outstandingRent: Cents;
  readonly expenses: Cents;
  /** collectedRent - expenses. Cash actually in hand, not money merely owed. */
  readonly netIncome: Cents;
  /** collectedRent as a percentage of expectedRent, 0-100, one decimal. */
  readonly collectionRate: number;
}

export interface MaintenanceSummary {
  readonly open: number;
  readonly urgent: number;
  readonly inProgress: number;
  readonly completed: number;
  readonly totalCost: Cents;
}

export interface ExpiringLease {
  readonly leaseId: string;
  readonly tenantId: string;
  readonly unitId: string;
  readonly propertyId: string;
  readonly endDate: IsoDate;
  readonly daysRemaining: number;
}

export interface DashboardSummary {
  /** The month these figures cover, as YYYY-MM. */
  readonly month: string;
  readonly totalProperties: number;
  readonly occupancy: OccupancySummary;
  readonly financials: FinancialSummary;
  readonly maintenance: MaintenanceSummary;
  readonly leasesExpiringSoon: readonly ExpiringLease[];
}
