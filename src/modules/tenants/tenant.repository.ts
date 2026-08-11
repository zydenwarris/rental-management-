import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { Tenant, TenantCreate, TenantUpdate } from "./tenant.types.js";

export type TenantRepository = Repository<Tenant, TenantCreate, TenantUpdate>;

export class InMemoryTenantRepository
  extends InMemoryRepository<Tenant>
  implements TenantRepository
{
  constructor() {
    super(IdPrefix.Tenant);
  }
}
