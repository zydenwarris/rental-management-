import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../properties/property.repository.js";
import { PropertyService } from "../properties/property.service.js";
import { InMemoryUnitRepository } from "../units/unit.repository.js";
import { UnitService } from "../units/unit.service.js";
import { UnitStatus } from "../units/unit.types.js";
import { InMemoryTenantRepository } from "../tenants/tenant.repository.js";
import { TenantService } from "../tenants/tenant.service.js";
import { InMemoryLeaseRepository } from "../leases/lease.repository.js";
import { LeaseService } from "../leases/lease.service.js";
import { InMemoryPaymentRepository } from "../payments/payment.repository.js";
import { PaymentService } from "../payments/payment.service.js";
import { PaymentMethod } from "../payments/payment.types.js";
import { InMemoryExpenseRepository } from "../expenses/expense.repository.js";
import { ExpenseService } from "../expenses/expense.service.js";
import { ExpenseCategory } from "../expenses/expense.types.js";
import { InMemoryMaintenanceRepository } from "../maintenance/maintenance.repository.js";
import { MaintenanceService } from "../maintenance/maintenance.service.js";
import { MaintenancePriority, MaintenanceStatus } from "../maintenance/maintenance.types.js";
import { DashboardService } from "./dashboard.service.js";
import { PropertyType } from "../properties/property.types.js";
import type { RequestContext } from "../../shared/types.js";

const ctx: RequestContext = { landlordId: "lord_test" };
const TODAY = "2026-08-09";
const MONTH = "2026-08";

const RENT_A = 300000; // TTD 3,000.00
const RENT_B = 450000; // TTD 4,500.00

/**
 * A deliberately hand-computable scenario:
 *   Property 1: unit A (leased, rent 3000, paid in full) + unit B (vacant)
 *   Property 2: unit C (leased, rent 4500, only 1000 paid)
 *   Expenses in August: 450 + 1200 = 1650
 *   Maintenance: one urgent open, one completed costing 800
 */
describe("DashboardService", () => {
  let dashboard: DashboardService;
  let unitService: UnitService;
  let unitBId: string;

  beforeEach(async () => {
    const propertyService = new PropertyService(new InMemoryPropertyRepository());
    unitService = new UnitService(new InMemoryUnitRepository(), propertyService);
    const tenantService = new TenantService(new InMemoryTenantRepository());
    const leaseService = new LeaseService(
      new InMemoryLeaseRepository(),
      unitService,
      tenantService,
      () => TODAY,
    );
    const paymentService = new PaymentService(new InMemoryPaymentRepository(), leaseService);
    const expenseService = new ExpenseService(
      new InMemoryExpenseRepository(),
      propertyService,
      unitService,
    );
    const maintenanceService = new MaintenanceService(
      new InMemoryMaintenanceRepository(),
      propertyService,
      unitService,
      () => TODAY,
    );
    dashboard = new DashboardService(
      propertyService,
      unitService,
      leaseService,
      paymentService,
      expenseService,
      maintenanceService,
      () => TODAY,
    );

    const p1 = await propertyService.createProperty(
      { name: "P1", type: PropertyType.MultiUnit, address: "1 St", city: "POS", description: "", notes: "" },
      ctx,
    );
    const p2 = await propertyService.createProperty(
      { name: "P2", type: PropertyType.SingleFamily, address: "2 St", city: "Arima", description: "", notes: "" },
      ctx,
    );

    const unitA = await unitService.createUnit(
      { propertyId: p1.id, label: "A", bedrooms: 2, bathrooms: 1, marketRent: RENT_A, description: "", notes: "" },
      ctx,
    );
    const unitB = await unitService.createUnit(
      { propertyId: p1.id, label: "B", bedrooms: 1, bathrooms: 1, marketRent: 250000, description: "", notes: "" },
      ctx,
    );
    unitBId = unitB.id;
    const unitC = await unitService.createUnit(
      { propertyId: p2.id, label: "C", bedrooms: 3, bathrooms: 2, marketRent: RENT_B, description: "", notes: "" },
      ctx,
    );

    const tenant1 = await tenantService.createTenant(
      { fullName: "Asha", phone: "1", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" },
      ctx,
    );
    const tenant2 = await tenantService.createTenant(
      { fullName: "Devon", phone: "2", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" },
      ctx,
    );

    const leaseA = await leaseService.createLease(
      {
        tenantId: tenant1.id, unitId: unitA.id,
        startDate: "2026-01-01", endDate: "2026-12-31",
        monthlyRent: RENT_A, securityDeposit: RENT_A, rentDueDay: 1,
        utilitiesIncluded: false, notes: "",
      },
      ctx,
    );
    // Ends 2026-09-30, i.e. 52 days after TODAY — inside the 60-day window.
    const leaseC = await leaseService.createLease(
      {
        tenantId: tenant2.id, unitId: unitC.id,
        startDate: "2026-01-01", endDate: "2026-09-30",
        monthlyRent: RENT_B, securityDeposit: RENT_B, rentDueDay: 1,
        utilitiesIncluded: false, notes: "",
      },
      ctx,
    );

    await paymentService.recordPayment(
      { leaseId: leaseA.id, amount: RENT_A, paymentDate: "2026-08-01", dueDate: "2026-08-01", method: PaymentMethod.BankTransfer, reference: "", notes: "" },
      ctx,
    );
    await paymentService.recordPayment(
      { leaseId: leaseC.id, amount: 100000, paymentDate: "2026-08-03", dueDate: "2026-08-01", method: PaymentMethod.Cash, reference: "", notes: "" },
      ctx,
    );
    // July payment: must NOT count toward August's collected rent.
    await paymentService.recordPayment(
      { leaseId: leaseA.id, amount: RENT_A, paymentDate: "2026-07-01", dueDate: "2026-07-01", method: PaymentMethod.Cash, reference: "", notes: "" },
      ctx,
    );

    await expenseService.createExpense(
      { propertyId: p1.id, unitId: null, category: ExpenseCategory.Utilities, description: "WASA", amount: 45000, date: "2026-08-02", vendor: "", notes: "" },
      ctx,
    );
    await expenseService.createExpense(
      { propertyId: p2.id, unitId: null, category: ExpenseCategory.Insurance, description: "Cover", amount: 120000, date: "2026-08-05", vendor: "", notes: "" },
      ctx,
    );
    // July expense: excluded from August.
    await expenseService.createExpense(
      { propertyId: p1.id, unitId: null, category: ExpenseCategory.Repairs, description: "Old", amount: 999900, date: "2026-07-15", vendor: "", notes: "" },
      ctx,
    );

    await maintenanceService.createRequest(
      { propertyId: p1.id, unitId: unitA.id, title: "Burst pipe", description: "Water everywhere", priority: MaintenancePriority.Urgent, contractor: "", estimatedCost: null, reportedDate: "2026-08-06", scheduledDate: null, notes: "" },
      ctx,
    );
    const done = await maintenanceService.createRequest(
      { propertyId: p2.id, unitId: null, title: "Gate hinge", description: "Squeaks", priority: MaintenancePriority.Low, contractor: "", estimatedCost: 70000, reportedDate: "2026-07-20", scheduledDate: null, notes: "" },
      ctx,
    );
    await maintenanceService.updateRequest(
      done.id,
      { status: MaintenanceStatus.Completed, actualCost: 80000 },
      ctx,
    );
  });

  it("counts every property in the portfolio", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.totalProperties).toBe(2);
    expect(summary.month).toBe(MONTH);
  });

  it("splits units by occupancy status", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.occupancy.totalUnits).toBe(3);
    expect(summary.occupancy.occupied).toBe(2);
    expect(summary.occupancy.vacant).toBe(1);
    expect(summary.occupancy.underMaintenance).toBe(0);
    expect(summary.occupancy.occupancyRate).toBe(66.7);
  });

  it("counts a unit marked under maintenance separately from vacant", async () => {
    await unitService.setStatus(unitBId, UnitStatus.UnderMaintenance, ctx);
    const summary = await dashboard.getSummary(ctx);
    expect(summary.occupancy.vacant).toBe(0);
    expect(summary.occupancy.underMaintenance).toBe(1);
  });

  it("expects rent only from leases active in the reporting month", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.financials.expectedRent).toBe(RENT_A + RENT_B);
  });

  it("counts only payments dated inside the reporting month", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.financials.collectedRent).toBe(RENT_A + 100000);
  });

  it("derives outstanding rent as expected minus collected", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.financials.outstandingRent).toBe(RENT_B - 100000);
  });

  it("counts only expenses dated inside the reporting month", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.financials.expenses).toBe(45000 + 120000);
  });

  it("computes net income as collected rent minus expenses", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.financials.netIncome).toBe(RENT_A + 100000 - (45000 + 120000));
  });

  it("reports the collection rate as a percentage of expected rent", async () => {
    const summary = await dashboard.getSummary(ctx);
    // 400000 collected of 750000 expected = 53.3%
    expect(summary.financials.collectionRate).toBe(53.3);
  });

  it("summarises maintenance by status, priority, and actual cost", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.maintenance.open).toBe(1);
    expect(summary.maintenance.urgent).toBe(1);
    expect(summary.maintenance.completed).toBe(1);
    expect(summary.maintenance.totalCost).toBe(80000);
  });

  it("lists leases ending inside the expiry window with days remaining", async () => {
    const summary = await dashboard.getSummary(ctx);
    expect(summary.leasesExpiringSoon).toHaveLength(1);
    expect(summary.leasesExpiringSoon[0]?.endDate).toBe("2026-09-30");
    expect(summary.leasesExpiringSoon[0]?.daysRemaining).toBe(52);
  });

  it("reports zeroes rather than dividing by zero for an empty portfolio", async () => {
    const emptyProperties = new PropertyService(new InMemoryPropertyRepository());
    const emptyUnits = new UnitService(new InMemoryUnitRepository(), emptyProperties);
    const emptyTenants = new TenantService(new InMemoryTenantRepository());
    const emptyLeases = new LeaseService(
      new InMemoryLeaseRepository(), emptyUnits, emptyTenants, () => TODAY,
    );
    const emptyDashboard = new DashboardService(
      emptyProperties,
      emptyUnits,
      emptyLeases,
      new PaymentService(new InMemoryPaymentRepository(), emptyLeases),
      new ExpenseService(new InMemoryExpenseRepository(), emptyProperties, emptyUnits),
      new MaintenanceService(
        new InMemoryMaintenanceRepository(), emptyProperties, emptyUnits, () => TODAY,
      ),
      () => TODAY,
    );

    const summary = await emptyDashboard.getSummary(ctx);
    expect(summary.occupancy.occupancyRate).toBe(0);
    expect(summary.financials.collectionRate).toBe(0);
    expect(summary.financials.netIncome).toBe(0);
  });
});
