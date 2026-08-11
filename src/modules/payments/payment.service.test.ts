import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../properties/property.repository.js";
import { PropertyService } from "../properties/property.service.js";
import { InMemoryUnitRepository } from "../units/unit.repository.js";
import { UnitService } from "../units/unit.service.js";
import { InMemoryTenantRepository } from "../tenants/tenant.repository.js";
import { TenantService } from "../tenants/tenant.service.js";
import { InMemoryLeaseRepository } from "../leases/lease.repository.js";
import { LeaseService } from "../leases/lease.service.js";
import { InMemoryPaymentRepository } from "./payment.repository.js";
import { PaymentService, derivePaymentStatus } from "./payment.service.js";
import { PaymentMethod, PaymentStatus } from "./payment.types.js";
import { paymentCreateSchema } from "./payment.schemas.js";
import { PropertyType } from "../properties/property.types.js";
import { ErrorCode, isApiError } from "../../shared/errors.js";
import type { RequestContext } from "../../shared/types.js";

const ctx: RequestContext = { landlordId: "lord_test" };
const TODAY = "2026-08-09";
const MONTHLY_RENT = 300000; // TTD 3,000.00

async function expectApiError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}, but the call succeeded`);
  } catch (error) {
    if (!isApiError(error)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("derivePaymentStatus", () => {
  it("is Paid when the full rent arrives on or before the due date", () => {
    expect(derivePaymentStatus(MONTHLY_RENT, MONTHLY_RENT, "2026-08-01", "2026-08-01")).toBe(
      PaymentStatus.Paid,
    );
  });

  it("is Paid when the tenant overpays on time", () => {
    expect(derivePaymentStatus(MONTHLY_RENT + 50000, MONTHLY_RENT, "2026-08-01", "2026-08-01")).toBe(
      PaymentStatus.Paid,
    );
  });

  it("is Partial when less than the full rent arrives on time", () => {
    expect(derivePaymentStatus(100000, MONTHLY_RENT, "2026-08-01", "2026-08-01")).toBe(
      PaymentStatus.Partial,
    );
  });

  it("stays Paid inside the grace period", () => {
    expect(derivePaymentStatus(MONTHLY_RENT, MONTHLY_RENT, "2026-08-05", "2026-08-01")).toBe(
      PaymentStatus.Paid,
    );
  });

  it("is Late once the grace period has passed", () => {
    expect(derivePaymentStatus(MONTHLY_RENT, MONTHLY_RENT, "2026-08-20", "2026-08-01")).toBe(
      PaymentStatus.Late,
    );
  });

  it("prefers Partial over Late when the payment is both short and late", () => {
    expect(derivePaymentStatus(100000, MONTHLY_RENT, "2026-08-20", "2026-08-01")).toBe(
      PaymentStatus.Partial,
    );
  });
});

describe("PaymentService", () => {
  let leaseService: LeaseService;
  let paymentService: PaymentService;
  let unitService: UnitService;
  let leaseId: string;
  let tenantId: string;
  let unitId: string;

  beforeEach(async () => {
    const propertyService = new PropertyService(new InMemoryPropertyRepository());
    unitService = new UnitService(new InMemoryUnitRepository(), propertyService);
    const tenantService = new TenantService(new InMemoryTenantRepository());
    leaseService = new LeaseService(
      new InMemoryLeaseRepository(),
      unitService,
      tenantService,
      () => TODAY,
    );
    paymentService = new PaymentService(new InMemoryPaymentRepository(), leaseService);

    const property = await propertyService.createProperty(
      { name: "P", type: PropertyType.Apartment, address: "1 St", city: "POS", description: "", notes: "" },
      ctx,
    );
    const unit = await unitService.createUnit(
      { propertyId: property.id, label: "1A", bedrooms: 1, bathrooms: 1, marketRent: MONTHLY_RENT, description: "", notes: "" },
      ctx,
    );
    unitId = unit.id;
    const tenant = await tenantService.createTenant(
      { fullName: "Asha Ram", phone: "868-555-0001", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" },
      ctx,
    );
    tenantId = tenant.id;
    const lease = await leaseService.createLease(
      {
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        monthlyRent: MONTHLY_RENT,
        securityDeposit: MONTHLY_RENT,
        rentDueDay: 1,
        utilitiesIncluded: false,
        notes: "",
      },
      ctx,
    );
    leaseId = lease.id;
  });

  const validPayment = () => ({
    leaseId,
    amount: MONTHLY_RENT,
    paymentDate: "2026-08-01",
    dueDate: "2026-08-01",
    method: PaymentMethod.BankTransfer,
    reference: "TT-8891",
    notes: "",
  });

  it("records a payment and denormalises the lease's relationships", async () => {
    const payment = await paymentService.recordPayment(validPayment(), ctx);
    expect(payment.status).toBe(PaymentStatus.Paid);
    expect(payment.tenantId).toBe(tenantId);
    expect(payment.unitId).toBe(unitId);
  });

  it("rejects a payment against a lease that does not exist", async () => {
    await expectApiError(
      paymentService.recordPayment({ ...validPayment(), leaseId: "lse_ghost" }, ctx),
      ErrorCode.NOT_FOUND,
    );
  });

  it("derives Partial for a short payment", async () => {
    const payment = await paymentService.recordPayment({ ...validPayment(), amount: 150000 }, ctx);
    expect(payment.status).toBe(PaymentStatus.Partial);
  });

  it("rejects a payment dated before the lease begins", async () => {
    await expectApiError(
      paymentService.recordPayment({ ...validPayment(), paymentDate: "2025-12-01" }, ctx),
      ErrorCode.INVALID_RELATIONSHIP,
    );
  });

  it("recalculates status when the amount is corrected", async () => {
    const payment = await paymentService.recordPayment({ ...validPayment(), amount: 150000 }, ctx);
    const corrected = await paymentService.updatePayment(payment.id, { amount: MONTHLY_RENT }, ctx);
    expect(corrected.status).toBe(PaymentStatus.Paid);
  });

  it("blocks deleting a lease that has recorded payments", async () => {
    await paymentService.recordPayment(validPayment(), ctx);
    await expectApiError(leaseService.deleteLease(leaseId, ctx), ErrorCode.CONFLICT);
  });

  it("totals only the payments belonging to the given lease", async () => {
    await paymentService.recordPayment(validPayment(), ctx);
    await paymentService.recordPayment({ ...validPayment(), amount: 50000, dueDate: "2026-09-01", paymentDate: "2026-09-01" }, ctx);
    const payments = await paymentService.listPaymentsForLease(leaseId, ctx);
    expect(payments).toHaveLength(2);
  });

  describe("amount validation at the schema boundary", () => {
    it("rejects a zero amount", () => {
      expect(paymentCreateSchema.safeParse({ ...validPayment(), amount: 0 }).success).toBe(false);
    });

    it("rejects a negative amount", () => {
      expect(paymentCreateSchema.safeParse({ ...validPayment(), amount: -100 }).success).toBe(false);
    });

    it("rejects fractional cents", () => {
      expect(paymentCreateSchema.safeParse({ ...validPayment(), amount: 1500.5 }).success).toBe(
        false,
      );
    });

    it("rejects an unknown payment method", () => {
      expect(
        paymentCreateSchema.safeParse({ ...validPayment(), method: "crypto" }).success,
      ).toBe(false);
    });
  });
});
