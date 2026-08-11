import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { LandlordScope } from "../../shared/types.js";
import type { Unit, UnitCreate, UnitUpdate } from "./unit.types.js";

export interface UnitRepository extends Repository<Unit, UnitCreate, UnitUpdate> {
  findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Unit[]>;
}

export class InMemoryUnitRepository extends InMemoryRepository<Unit> implements UnitRepository {
  constructor() {
    super(IdPrefix.Unit);
  }

  async findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Unit[]> {
    return this.findWhere((unit) => unit.propertyId === propertyId, scope);
  }
}
