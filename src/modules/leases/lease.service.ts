import { ApiError } from "../../shared/errors.js";
import { GuardRegistry } from "../../shared/guards.js";
import { datesOverlap, isDateAfter, isDateBefore, type IsoDate, today } from "../../shared/dates.js";
import { LeaseStatus, OCCUPYING_STATUSES, type Lease } from "./lease.types.js";
import type { LeaseRepository } from "./lease.repository.js";
import type { LeaseCreateInput, LeaseUpdateInput } from "./lease.schemas.js";
import type { UnitService } from "../units/unit.service.js";
import { UnitStatus } from "../units/unit.types.js";
import type { TenantService } from "../tenants/tenant.service.js";
import type { RequestContext } from "../../shared/types.js";

/** Injectable clock so tests can pin "today"; production uses the real date. */
export type TodayFn = () => IsoDate;

/**
 * Invariant owned here, the core rule of the whole system:
 * a unit never has two occupying leases (upcoming or active) whose inclusive
 * date ranges share a day. Terminated and expired leases never block.
 */
export class LeaseService {
  constructor(
    private readonly leases: LeaseRepository,
    private readonly units: UnitService,
    private readonly tenants: TenantService,
    private readonly todayFn: TodayFn = today,
  ) {
    this.tenants.deletionGuards.register(async (tenantId, ctx) => {
      const held = await this.leases.findByTenant(tenantId, ctx);
      if (held.length > 0) {
        throw ApiError.conflict(
          `Tenant '${tenantId}' has ${held.length} lease record(s). Lease history is preserved; delete is blocked.`,
        );
      }
    });
    this.units.deletionGuards.register(async (unitId, ctx) => {
      const held = await this.leases.findByUnit(unitId, ctx);
      if (held.length > 0) {
        throw ApiError.conflict(
          `Unit '${unitId}' has ${held.length} lease record(s). Lease history is preserved; delete is blocked.`,
        );
      }
    });
  }

  async listLeases(ctx: RequestContext): Promise<readonly Lease[]> {
    return this.leases.findAll(ctx);
  }

  async listLeasesForUnit(unitId: string, ctx: RequestContext): Promise<readonly Lease[]> {
    await this.units.getUnit(unitId, ctx);
    return this.leases.findByUnit(unitId, ctx);
  }

  async listLeasesForTenant(tenantId: string, ctx: RequestContext): Promise<readonly Lease[]> {
    await this.tenants.getTenant(tenantId, ctx);
    return this.leases.findByTenant(tenantId, ctx);
  }

  async getLease(id: string, ctx: RequestContext): Promise<Lease> {
    const lease = await this.leases.findById(id, ctx);
    if (!lease) throw ApiError.notFound("Lease", id);
    return lease;
  }

  async createLease(input: LeaseCreateInput, ctx: RequestContext): Promise<Lease> {
    const tenant = await this.tenants.getTenant(input.tenantId, ctx);
    const unit = await this.units.getUnit(input.unitId, ctx);

    await this.assertNoOverlap(unit.id, input.startDate, input.endDate, ctx);

    const status = deriveInitialStatus(input.startDate, input.endDate, this.todayFn());
    const lease = await this.leases.create(
      {
        tenantId: tenant.id,
        unitId: unit.id,
        propertyId: unit.propertyId,
        startDate: input.startDate,
        endDate: input.endDate,
        monthlyRent: input.monthlyRent,
        securityDeposit: input.securityDeposit,
        rentDueDay: input.rentDueDay,
        status,
        utilitiesIncluded: input.utilitiesIncluded,
        notes: input.notes,
      },
      ctx,
    );

    if (status === LeaseStatus.Active) {
      await this.units.setStatus(unit.id, UnitStatus.Occupied, ctx);
    }
    return lease;
  }

  async updateLease(id: string, input: LeaseUpdateInput, ctx: RequestContext): Promise<Lease> {
    const existing = await this.getLease(id, ctx);
    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;

    if (!isDateBefore(startDate, endDate)) {
      throw ApiError.validation("endDate must be after startDate.", [
        { field: "endDate", message: "endDate must be after startDate." },
      ]);
    }
    if (input.startDate !== undefined || input.endDate !== undefined) {
      await this.assertNoOverlap(existing.unitId, startDate, endDate, ctx, existing.id);
    }

    const updated = await this.leases.update(id, input, ctx);
    if (!updated) throw ApiError.notFound("Lease", id);
    return updated;
  }

  /**
   * pre: lease is not already terminated.
   * post: status is Terminated and, if the lease was the one occupying the
   * unit, the unit is marked vacant again.
   */
  async terminateLease(id: string, ctx: RequestContext): Promise<Lease> {
    const lease = await this.getLease(id, ctx);
    if (lease.status === LeaseStatus.Terminated) {
      throw ApiError.conflict(`Lease '${id}' is already terminated.`);
    }
    const updated = await this.leases.update(id, { status: LeaseStatus.Terminated }, ctx);
    if (!updated) throw ApiError.notFound("Lease", id);

    if (lease.status === LeaseStatus.Active) {
      await this.units.setStatus(lease.unitId, UnitStatus.Vacant, ctx);
    }
    return updated;
  }

  async deleteLease(id: string, ctx: RequestContext): Promise<void> {
    await this.getLease(id, ctx);
    await this.deletionGuards.assertAllPass(id, ctx);
    await this.leases.delete(id, ctx);
  }

  /** Payments register here: a lease with recorded payments cannot be deleted. */
  readonly deletionGuards = new GuardRegistry();

  private async assertNoOverlap(
    unitId: string,
    startDate: IsoDate,
    endDate: IsoDate,
    ctx: RequestContext,
    ignoreLeaseId?: string,
  ): Promise<void> {
    const existing = await this.leases.findByUnit(unitId, ctx);
    const conflict = existing.find(
      (lease) =>
        lease.id !== ignoreLeaseId &&
        OCCUPYING_STATUSES.includes(lease.status) &&
        datesOverlap(lease.startDate, lease.endDate, startDate, endDate),
    );
    if (conflict) throw ApiError.leaseOverlap(unitId, conflict.id);
  }
}

/**
 * Status at creation is a pure function of the term and today:
 * fully in the past → Expired, fully in the future → Upcoming, else Active.
 */
export function deriveInitialStatus(
  startDate: IsoDate,
  endDate: IsoDate,
  todayDate: IsoDate,
): LeaseStatus {
  if (isDateBefore(endDate, todayDate)) return LeaseStatus.Expired;
  if (isDateAfter(startDate, todayDate)) return LeaseStatus.Upcoming;
  return LeaseStatus.Active;
}
