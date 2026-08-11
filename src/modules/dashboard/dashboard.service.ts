import { LEASE_EXPIRING_SOON_DAYS } from "../../config/constants.js";
import { daysBetween, datesOverlap, today, type IsoDate } from "../../shared/dates.js";
import { sumCents } from "../../shared/money.js";
import { UnitStatus } from "../units/unit.types.js";
import { LeaseStatus } from "../leases/lease.types.js";
import {
  MaintenancePriority,
  MaintenanceStatus,
  OPEN_MAINTENANCE_STATUSES,
} from "../maintenance/maintenance.types.js";
import type { PropertyService } from "../properties/property.service.js";
import type { UnitService } from "../units/unit.service.js";
import type { LeaseService } from "../leases/lease.service.js";
import type { PaymentService } from "../payments/payment.service.js";
import type { ExpenseService } from "../expenses/expense.service.js";
import type { MaintenanceService } from "../maintenance/maintenance.service.js";
import type { RequestContext } from "../../shared/types.js";
import type {
  DashboardSummary,
  ExpiringLease,
  FinancialSummary,
  MaintenanceSummary,
  OccupancySummary,
} from "./dashboard.types.js";

export type TodayFn = () => IsoDate;

/**
 * Read-only aggregation across every module. It owns no repository of its own —
 * it composes the other services, so any rule they enforce (landlord scoping
 * above all) applies here for free.
 */
export class DashboardService {
  constructor(
    private readonly properties: PropertyService,
    private readonly units: UnitService,
    private readonly leases: LeaseService,
    private readonly payments: PaymentService,
    private readonly expenses: ExpenseService,
    private readonly maintenance: MaintenanceService,
    private readonly todayFn: TodayFn = today,
  ) {}

  async getSummary(ctx: RequestContext): Promise<DashboardSummary> {
    const todayDate = this.todayFn();
    const month = todayDate.slice(0, 7);
    const { firstDay, lastDay } = monthBounds(month);

    const [properties, units, leases, payments, expenses, requests] = await Promise.all([
      this.properties.listProperties(ctx),
      this.units.listUnits(ctx),
      this.leases.listLeases(ctx),
      this.payments.listPayments(ctx),
      this.expenses.listExpenses(ctx),
      this.maintenance.listRequests(ctx),
    ]);

    // A lease contributes rent if its term touches the reporting month at all
    // and it was not terminated — a mid-month move-in still owes that month.
    const leasesBillableThisMonth = leases.filter(
      (lease) =>
        lease.status !== LeaseStatus.Terminated &&
        datesOverlap(lease.startDate, lease.endDate, firstDay, lastDay),
    );

    const expectedRent = sumCents(leasesBillableThisMonth.map((lease) => lease.monthlyRent));
    const collectedRent = sumCents(
      payments.filter((p) => isWithinMonth(p.paymentDate, month)).map((p) => p.amount),
    );
    const monthlyExpenses = sumCents(
      expenses.filter((e) => isWithinMonth(e.date, month)).map((e) => e.amount),
    );

    const occupancy: OccupancySummary = {
      totalUnits: units.length,
      occupied: units.filter((u) => u.status === UnitStatus.Occupied).length,
      vacant: units.filter((u) => u.status === UnitStatus.Vacant).length,
      underMaintenance: units.filter((u) => u.status === UnitStatus.UnderMaintenance).length,
      occupancyRate: percentage(
        units.filter((u) => u.status === UnitStatus.Occupied).length,
        units.length,
      ),
    };

    const financials: FinancialSummary = {
      expectedRent,
      collectedRent,
      // Overpayment is not a negative debt; the landlord owes nothing back here.
      outstandingRent: Math.max(0, expectedRent - collectedRent),
      expenses: monthlyExpenses,
      netIncome: collectedRent - monthlyExpenses,
      collectionRate: percentage(collectedRent, expectedRent),
    };

    const maintenanceSummary: MaintenanceSummary = {
      open: requests.filter((r) => OPEN_MAINTENANCE_STATUSES.includes(r.status)).length,
      urgent: requests.filter(
        (r) =>
          r.priority === MaintenancePriority.Urgent &&
          OPEN_MAINTENANCE_STATUSES.includes(r.status),
      ).length,
      inProgress: requests.filter((r) => r.status === MaintenanceStatus.InProgress).length,
      completed: requests.filter((r) => r.status === MaintenanceStatus.Completed).length,
      totalCost: sumCents(requests.map((r) => r.actualCost ?? 0)),
    };

    return {
      month,
      totalProperties: properties.length,
      occupancy,
      financials,
      maintenance: maintenanceSummary,
      leasesExpiringSoon: findExpiringLeases(leases, todayDate),
    };
  }
}

function findExpiringLeases(
  leases: readonly {
    id: string;
    tenantId: string;
    unitId: string;
    propertyId: string;
    endDate: IsoDate;
    status: LeaseStatus;
  }[],
  todayDate: IsoDate,
): readonly ExpiringLease[] {
  return leases
    .filter((lease) => {
      if (lease.status !== LeaseStatus.Active && lease.status !== LeaseStatus.Upcoming) return false;
      const remaining = daysBetween(todayDate, lease.endDate);
      return remaining >= 0 && remaining <= LEASE_EXPIRING_SOON_DAYS;
    })
    .map((lease) => ({
      leaseId: lease.id,
      tenantId: lease.tenantId,
      unitId: lease.unitId,
      propertyId: lease.propertyId,
      endDate: lease.endDate,
      daysRemaining: daysBetween(todayDate, lease.endDate),
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** Percentage to one decimal; an empty denominator is 0, never NaN or Infinity. */
function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function isWithinMonth(date: IsoDate, month: string): boolean {
  return date.startsWith(month);
}

/** Last day derived from the first of the next month, so leap years are free. */
function monthBounds(month: string): { firstDay: IsoDate; lastDay: IsoDate } {
  const firstDay = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const lastDayDate = new Date(Date.UTC(year, monthNumber, 0));
  return { firstDay, lastDay: lastDayDate.toISOString().slice(0, 10) };
}
