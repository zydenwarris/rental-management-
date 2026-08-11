import { ApiError } from "../../shared/errors.js";
import { GuardRegistry } from "../../shared/guards.js";
import { UnitStatus, type Unit } from "./unit.types.js";
import type { UnitRepository } from "./unit.repository.js";
import type { UnitCreateInput, UnitUpdateInput } from "./unit.schemas.js";
import type { PropertyService } from "../properties/property.service.js";
import type { RequestContext } from "../../shared/types.js";

/**
 * Invariants owned by this service:
 *  - every unit's propertyId names a property of the same landlord;
 *  - unit labels are unique (case-insensitive) within a property;
 *  - a property with units cannot be deleted (guard registered in constructor).
 */
export class UnitService {
  /** Leases register here: a unit under an active lease cannot be deleted. */
  readonly deletionGuards = new GuardRegistry();

  constructor(
    private readonly units: UnitRepository,
    private readonly properties: PropertyService,
  ) {
    this.properties.deletionGuards.register(async (propertyId, ctx) => {
      const attached = await this.units.findByProperty(propertyId, ctx);
      if (attached.length > 0) {
        throw ApiError.conflict(
          `Property '${propertyId}' still has ${attached.length} unit(s). Delete or move them first.`,
        );
      }
    });
  }

  async listUnits(ctx: RequestContext): Promise<readonly Unit[]> {
    return this.units.findAll(ctx);
  }

  async listUnitsForProperty(propertyId: string, ctx: RequestContext): Promise<readonly Unit[]> {
    await this.properties.getProperty(propertyId, ctx);
    return this.units.findByProperty(propertyId, ctx);
  }

  async getUnit(id: string, ctx: RequestContext): Promise<Unit> {
    const unit = await this.units.findById(id, ctx);
    if (!unit) throw ApiError.notFound("Unit", id);
    return unit;
  }

  async createUnit(input: UnitCreateInput, ctx: RequestContext): Promise<Unit> {
    await this.properties.getProperty(input.propertyId, ctx);
    await this.assertLabelAvailable(input.propertyId, input.label, ctx);
    return this.units.create({ ...input, status: UnitStatus.Vacant }, ctx);
  }

  async updateUnit(id: string, input: UnitUpdateInput, ctx: RequestContext): Promise<Unit> {
    const existing = await this.getUnit(id, ctx);
    if (input.propertyId !== undefined && input.propertyId !== existing.propertyId) {
      await this.properties.getProperty(input.propertyId, ctx);
    }
    const targetProperty = input.propertyId ?? existing.propertyId;
    if (input.label !== undefined && !sameLabel(input.label, existing.label)) {
      await this.assertLabelAvailable(targetProperty, input.label, ctx);
    }
    const updated = await this.units.update(id, input, ctx);
    if (!updated) throw ApiError.notFound("Unit", id);
    return updated;
  }

  async deleteUnit(id: string, ctx: RequestContext): Promise<void> {
    await this.getUnit(id, ctx);
    await this.deletionGuards.assertAllPass(id, ctx);
    await this.units.delete(id, ctx);
  }

  async setStatus(id: string, status: UnitStatus, ctx: RequestContext): Promise<Unit> {
    return this.updateUnit(id, { status }, ctx);
  }

  private async assertLabelAvailable(
    propertyId: string,
    label: string,
    ctx: RequestContext,
  ): Promise<void> {
    const siblings = await this.units.findByProperty(propertyId, ctx);
    if (siblings.some((unit) => sameLabel(unit.label, label))) {
      throw ApiError.duplicateUnit(label, propertyId);
    }
  }

}

/** "Apt 1A" and "apt 1a" are the same unit to a human, so they collide. */
function sameLabel(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
