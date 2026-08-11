import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../properties/property.repository.js";
import { PropertyService } from "../properties/property.service.js";
import { InMemoryUnitRepository } from "../units/unit.repository.js";
import { UnitService } from "../units/unit.service.js";
import { UnitStatus } from "../units/unit.types.js";
import { InMemoryTenantRepository } from "../tenants/tenant.repository.js";
import { TenantService } from "../tenants/tenant.service.js";
import { InMemoryLeaseRepository } from "./lease.repository.js";
import { LeaseService } from "./lease.service.js";
import { LeaseStatus } from "./lease.types.js";
import { leaseCreateSchema } from "./lease.schemas.js";
import { PropertyType } from "../properties/property.types.js";
import { ErrorCode, isApiError } from "../../shared/errors.js";
import type { RequestContext } from "../../shared/types.js";

const ctx: RequestContext = { landlordId: "lord_test" };
const TODAY = "2026-08-09"; // fixed "today" injected into the service so tests never rot

async function expectApiError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}, but the call succeeded`);
  } catch (error) {
    if (!isApiError(error)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("LeaseService", () => {
  let propertyService: PropertyService;
  let unitService: UnitService;
  let tenantService: TenantService;
  let leaseService: LeaseService;
  let unitId: string;
  let tenantId: string;
  let propertyId: string;

  beforeEach(async () => {
    propertyService = new PropertyService(new InMemoryPropertyRepository());
    unitService = new UnitService(new InMemoryUnitRepository(), propertyService);
    tenantService = new TenantService(new InMemoryTenantRepository());
    leaseService = new LeaseService(
      new InMemoryLeaseRepository(),
      unitService,
      tenantService,
      () => TODAY,
    );

    const property = await propertyService.createProperty(
      { name: "P", type: PropertyType.Apartment, address: "1 St", city: "POS", description: "", notes: "" },
      ctx,
    );
    propertyId = property.id;
    const unit = await unitService.createUnit(
      { propertyId, label: "1A", bedrooms: 1, bathrooms: 1, marketRent: 300000, description: "", notes: "" },
      ctx,
    );
    unitId = unit.id;
    const tenant = await tenantService.createTenant(
      { fullName: "Asha Ram", phone: "868-555-0001", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" },
      ctx,
    );
    tenantId = tenant.id;
  });

  const validLease = () => ({
    tenantId,
    unitId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    monthlyRent: 300000,
    securityDeposit: 300000,
    rentDueDay: 1,
    utilitiesIncluded: false,
    notes: "",
  });

  describe("creation and derived status", () => {
    it("derives Active when today falls inside the term, and occupies the unit", async () => {
      const lease = await leaseService.createLease(validLease(), ctx);
      expect(lease.status).toBe(LeaseStatus.Active);
      expect(lease.propertyId).toBe(propertyId);
      const unit = await unitService.getUnit(unitId, ctx);
      expect(unit.status).toBe(UnitStatus.Occupied);
    });

    it("derives Upcoming for a future term and leaves the unit vacant", async () => {
      const lease = await leaseService.createLease(
        { ...validLease(), startDate: "2026-10-01", endDate: "2027-09-30" },
        ctx,
      );
      expect(lease.status).toBe(LeaseStatus.Upcoming);
      const unit = await unitService.getUnit(unitId, ctx);
      expect(unit.status).toBe(UnitStatus.Vacant);
    });

    it("derives Expired for a fully past term (historical record)", async () => {
      const lease = await leaseService.createLease(
        { ...validLease(), startDate: "2024-01-01", endDate: "2024-12-31" },
        ctx,
      );
      expect(lease.status).toBe(LeaseStatus.Expired);
    });

    it("rejects a lease for a tenant that does not exist", async () => {
      await expectApiError(
        leaseService.createLease({ ...validLease(), tenantId: "tnt_ghost" }, ctx),
        ErrorCode.NOT_FOUND,
      );
    });

    it("rejects a lease for a unit that does not exist", async () => {
      await expectApiError(
        leaseService.createLease({ ...validLease(), unitId: "unit_ghost" }, ctx),
        ErrorCode.NOT_FOUND,
      );
    });
  });

  describe("overlap prevention", () => {
    it("rejects a second lease overlapping an active one on the same unit", async () => {
      await leaseService.createLease(validLease(), ctx);
      await expectApiError(
        leaseService.createLease(
          { ...validLease(), startDate: "2026-06-01", endDate: "2027-05-31" },
          ctx,
        ),
        ErrorCode.LEASE_OVERLAP,
      );
    });

    it("rejects a lease starting on the exact end date of an existing one", async () => {
      await leaseService.createLease(validLease(), ctx);
      await expectApiError(
        leaseService.createLease(
          { ...validLease(), startDate: "2026-12-31", endDate: "2027-12-30" },
          ctx,
        ),
        ErrorCode.LEASE_OVERLAP,
      );
    });

    it("allows a lease starting the day after an existing one ends", async () => {
      await leaseService.createLease(validLease(), ctx);
      const next = await leaseService.createLease(
        { ...validLease(), startDate: "2027-01-01", endDate: "2027-12-31" },
        ctx,
      );
      expect(next.status).toBe(LeaseStatus.Upcoming);
    });

    it("rejects overlap with an upcoming lease, not just an active one", async () => {
      await leaseService.createLease(
        { ...validLease(), startDate: "2026-10-01", endDate: "2027-09-30" },
        ctx,
      );
      await expectApiError(
        leaseService.createLease(
          { ...validLease(), startDate: "2027-01-01", endDate: "2027-12-31" },
          ctx,
        ),
        ErrorCode.LEASE_OVERLAP,
      );
    });

    it("ignores terminated leases when checking overlap", async () => {
      const first = await leaseService.createLease(validLease(), ctx);
      await leaseService.terminateLease(first.id, ctx);
      const replacement = await leaseService.createLease(
        { ...validLease(), startDate: "2026-08-01", endDate: "2027-07-31" },
        ctx,
      );
      expect(replacement.status).toBe(LeaseStatus.Active);
    });

    it("ignores expired historical leases when checking overlap", async () => {
      await leaseService.createLease(
        { ...validLease(), startDate: "2024-01-01", endDate: "2024-12-31" },
        ctx,
      );
      const current = await leaseService.createLease(
        { ...validLease(), startDate: "2024-06-01", endDate: "2026-12-31" },
        ctx,
      );
      expect(current.status).toBe(LeaseStatus.Active);
    });

    it("allows overlapping dates on a different unit", async () => {
      const second = await unitService.createUnit(
        { propertyId, label: "1B", bedrooms: 1, bathrooms: 1, marketRent: 280000, description: "", notes: "" },
        ctx,
      );
      await leaseService.createLease(validLease(), ctx);
      const other = await leaseService.createLease({ ...validLease(), unitId: second.id }, ctx);
      expect(other.unitId).toBe(second.id);
    });

    it("re-checks overlap when updating lease dates", async () => {
      await leaseService.createLease(validLease(), ctx);
      const next = await leaseService.createLease(
        { ...validLease(), startDate: "2027-01-01", endDate: "2027-12-31" },
        ctx,
      );
      await expectApiError(
        leaseService.updateLease(next.id, { startDate: "2026-12-01" }, ctx),
        ErrorCode.LEASE_OVERLAP,
      );
    });
  });

  describe("termination", () => {
    it("marks the lease terminated and frees the unit", async () => {
      const lease = await leaseService.createLease(validLease(), ctx);
      const terminated = await leaseService.terminateLease(lease.id, ctx);
      expect(terminated.status).toBe(LeaseStatus.Terminated);
      const unit = await unitService.getUnit(unitId, ctx);
      expect(unit.status).toBe(UnitStatus.Vacant);
    });

    it("rejects terminating an already-terminated lease", async () => {
      const lease = await leaseService.createLease(validLease(), ctx);
      await leaseService.terminateLease(lease.id, ctx);
      await expectApiError(leaseService.terminateLease(lease.id, ctx), ErrorCode.CONFLICT);
    });
  });

  describe("referential integrity guards", () => {
    it("blocks deleting a tenant who holds a lease", async () => {
      await leaseService.createLease(validLease(), ctx);
      await expectApiError(tenantService.deleteTenant(tenantId, ctx), ErrorCode.CONFLICT);
    });

    it("blocks deleting a unit that has lease history", async () => {
      await leaseService.createLease(validLease(), ctx);
      await expectApiError(unitService.deleteUnit(unitId, ctx), ErrorCode.CONFLICT);
    });
  });

  describe("schema-level date rules", () => {
    it("rejects an end date on or before the start date", () => {
      const result = leaseCreateSchema.safeParse({
        ...validLease(),
        startDate: "2026-06-01",
        endDate: "2026-06-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a rent due day outside 1-28", () => {
      const result = leaseCreateSchema.safeParse({ ...validLease(), rentDueDay: 31 });
      expect(result.success).toBe(false);
    });

    it("rejects malformed dates", () => {
      const result = leaseCreateSchema.safeParse({ ...validLease(), startDate: "01/06/2026" });
      expect(result.success).toBe(false);
    });
  });
});
