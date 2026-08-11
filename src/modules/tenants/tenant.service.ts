import { ApiError } from "../../shared/errors.js";
import { GuardRegistry } from "../../shared/guards.js";
import type { Tenant } from "./tenant.types.js";
import type { TenantRepository } from "./tenant.repository.js";
import type { TenantCreateInput, TenantUpdateInput } from "./tenant.schemas.js";
import type { RequestContext } from "../../shared/types.js";

export class TenantService {
  /** Leases register here: a tenant with an active lease cannot be deleted. */
  readonly deletionGuards = new GuardRegistry();

  constructor(private readonly tenants: TenantRepository) {}

  async listTenants(ctx: RequestContext): Promise<readonly Tenant[]> {
    return this.tenants.findAll(ctx);
  }

  async getTenant(id: string, ctx: RequestContext): Promise<Tenant> {
    const tenant = await this.tenants.findById(id, ctx);
    if (!tenant) throw ApiError.notFound("Tenant", id);
    return tenant;
  }

  async createTenant(input: TenantCreateInput, ctx: RequestContext): Promise<Tenant> {
    return this.tenants.create(input, ctx);
  }

  async updateTenant(id: string, input: TenantUpdateInput, ctx: RequestContext): Promise<Tenant> {
    const updated = await this.tenants.update(id, input, ctx);
    if (!updated) throw ApiError.notFound("Tenant", id);
    return updated;
  }

  async deleteTenant(id: string, ctx: RequestContext): Promise<void> {
    await this.getTenant(id, ctx);
    await this.deletionGuards.assertAllPass(id, ctx);
    await this.tenants.delete(id, ctx);
  }
}
