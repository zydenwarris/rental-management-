import { ApiError } from "../../shared/errors.js";
import { today, type IsoDate } from "../../shared/dates.js";
import {
  ALLOWED_STATUS_TRANSITIONS,
  MaintenanceStatus,
  type MaintenanceRequest,
} from "./maintenance.types.js";
import type { MaintenanceRepository } from "./maintenance.repository.js";
import type { MaintenanceCreateInput, MaintenanceUpdateInput } from "./maintenance.schemas.js";
import type { PropertyService } from "../properties/property.service.js";
import type { UnitService } from "../units/unit.service.js";
import type { RequestContext } from "../../shared/types.js";

export type TodayFn = () => IsoDate;

/**
 * Invariants owned here:
 *  - a request names a real property, and any named unit belongs to it;
 *  - status only moves along ALLOWED_STATUS_TRANSITIONS;
 *  - completing a request stamps completedDate if the caller did not supply one.
 */
export class MaintenanceService {
  constructor(
    private readonly requests: MaintenanceRepository,
    private readonly properties: PropertyService,
    private readonly units: UnitService,
    private readonly todayFn: TodayFn = today,
  ) {
    this.properties.deletionGuards.register(async (propertyId, ctx) => {
      const recorded = await this.requests.findByProperty(propertyId, ctx);
      if (recorded.length > 0) {
        throw ApiError.conflict(
          `Property '${propertyId}' has ${recorded.length} maintenance record(s). Delete them first.`,
        );
      }
    });
  }

  async listRequests(ctx: RequestContext): Promise<readonly MaintenanceRequest[]> {
    return this.requests.findAll(ctx);
  }

  async listRequestsForProperty(
    propertyId: string,
    ctx: RequestContext,
  ): Promise<readonly MaintenanceRequest[]> {
    await this.properties.getProperty(propertyId, ctx);
    return this.requests.findByProperty(propertyId, ctx);
  }

  async getRequest(id: string, ctx: RequestContext): Promise<MaintenanceRequest> {
    const request = await this.requests.findById(id, ctx);
    if (!request) throw ApiError.notFound("Maintenance request", id);
    return request;
  }

  async createRequest(
    input: MaintenanceCreateInput,
    ctx: RequestContext,
  ): Promise<MaintenanceRequest> {
    await this.assertUnitBelongsToProperty(input.propertyId, input.unitId, ctx);
    return this.requests.create(
      {
        ...input,
        status: MaintenanceStatus.Open,
        actualCost: null,
        completedDate: null,
      },
      ctx,
    );
  }

  async updateRequest(
    id: string,
    input: MaintenanceUpdateInput,
    ctx: RequestContext,
  ): Promise<MaintenanceRequest> {
    const existing = await this.getRequest(id, ctx);

    if (input.propertyId !== undefined || input.unitId !== undefined) {
      const propertyId = input.propertyId ?? existing.propertyId;
      const unitId = input.unitId !== undefined ? input.unitId : existing.unitId;
      await this.assertUnitBelongsToProperty(propertyId, unitId, ctx);
    }

    const patch = { ...input };
    if (input.status !== undefined && input.status !== existing.status) {
      assertTransitionAllowed(existing.status, input.status);
      // Completing a job without a date is the common case; stamp it rather than
      // leaving a completed request with no completion date.
      if (input.status === MaintenanceStatus.Completed && input.completedDate === undefined) {
        patch.completedDate = this.todayFn();
      }
    }

    const updated = await this.requests.update(id, patch, ctx);
    if (!updated) throw ApiError.notFound("Maintenance request", id);
    return updated;
  }

  async deleteRequest(id: string, ctx: RequestContext): Promise<void> {
    await this.getRequest(id, ctx);
    await this.requests.delete(id, ctx);
  }

  private async assertUnitBelongsToProperty(
    propertyId: string,
    unitId: string | null,
    ctx: RequestContext,
  ): Promise<void> {
    await this.properties.getProperty(propertyId, ctx);
    if (unitId === null) return;
    const unit = await this.units.getUnit(unitId, ctx);
    if (unit.propertyId !== propertyId) {
      throw ApiError.invalidRelationship(
        `Unit '${unitId}' belongs to property '${unit.propertyId}', not '${propertyId}'.`,
        [{ field: "unitId", message: "Unit must belong to the named property." }],
      );
    }
  }
}

function assertTransitionAllowed(from: MaintenanceStatus, to: MaintenanceStatus): void {
  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    throw ApiError.conflict(`Cannot move a maintenance request from '${from}' to '${to}'.`, [
      { field: "status", message: `Allowed next: ${ALLOWED_STATUS_TRANSITIONS[from].join(", ") || "none"}.` },
    ]);
  }
}
