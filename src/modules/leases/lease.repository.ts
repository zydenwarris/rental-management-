import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { LandlordScope } from "../../shared/types.js";
import type { Lease, LeaseCreate, LeaseUpdate } from "./lease.types.js";

export interface LeaseRepository extends Repository<Lease, LeaseCreate, LeaseUpdate> {
  findByUnit(unitId: string, scope: LandlordScope): Promise<readonly Lease[]>;
  findByTenant(tenantId: string, scope: LandlordScope): Promise<readonly Lease[]>;
  findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Lease[]>;
}

export class InMemoryLeaseRepository extends InMemoryRepository<Lease> implements LeaseRepository {
  constructor() {
    super(IdPrefix.Lease);
  }

  async findByUnit(unitId: string, scope: LandlordScope): Promise<readonly Lease[]> {
    return this.findWhere((lease) => lease.unitId === unitId, scope);
  }

  async findByTenant(tenantId: string, scope: LandlordScope): Promise<readonly Lease[]> {
    return this.findWhere((lease) => lease.tenantId === tenantId, scope);
  }

  async findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Lease[]> {
    return this.findWhere((lease) => lease.propertyId === propertyId, scope);
  }
}
