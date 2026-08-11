import { ApiError } from "../../shared/errors.js";
import { GuardRegistry } from "../../shared/guards.js";
import { PropertyStatus, type Property } from "./property.types.js";
import type { PropertyRepository } from "./property.repository.js";
import type { PropertyCreateInput, PropertyUpdateInput } from "./property.schemas.js";
import type { RequestContext } from "../../shared/types.js";

/**
 * Property business logic. Controllers call this; this calls the repository.
 *
 * Contract for every method: inputs are schema-validated already; anything that
 * fails a business rule throws ApiError; a returned entity always belongs to
 * ctx.landlordId (scoping is enforced at the repository).
 */
export class PropertyService {
  /** Units register here: a property that still has units cannot be deleted. */
  readonly deletionGuards = new GuardRegistry();

  constructor(private readonly properties: PropertyRepository) {}

  async listProperties(ctx: RequestContext): Promise<readonly Property[]> {
    return this.properties.findAll(ctx);
  }

  async getProperty(id: string, ctx: RequestContext): Promise<Property> {
    const property = await this.properties.findById(id, ctx);
    if (!property) throw ApiError.notFound("Property", id);
    return property;
  }

  async createProperty(input: PropertyCreateInput, ctx: RequestContext): Promise<Property> {
    return this.properties.create({ ...input, status: PropertyStatus.Active }, ctx);
  }

  async updateProperty(
    id: string,
    input: PropertyUpdateInput,
    ctx: RequestContext,
  ): Promise<Property> {
    const updated = await this.properties.update(id, input, ctx);
    if (!updated) throw ApiError.notFound("Property", id);
    return updated;
  }

  async deleteProperty(id: string, ctx: RequestContext): Promise<void> {
    await this.getProperty(id, ctx);
    await this.deletionGuards.assertAllPass(id, ctx);
    await this.properties.delete(id, ctx);
  }
}
