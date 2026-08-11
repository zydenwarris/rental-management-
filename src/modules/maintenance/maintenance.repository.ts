import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { LandlordScope } from "../../shared/types.js";
import type {
  MaintenanceCreate,
  MaintenanceRequest,
  MaintenanceUpdate,
} from "./maintenance.types.js";

export interface MaintenanceRepository
  extends Repository<MaintenanceRequest, MaintenanceCreate, MaintenanceUpdate> {
  findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly MaintenanceRequest[]>;
  findByUnit(unitId: string, scope: LandlordScope): Promise<readonly MaintenanceRequest[]>;
}

export class InMemoryMaintenanceRepository
  extends InMemoryRepository<MaintenanceRequest>
  implements MaintenanceRepository
{
  constructor() {
    super(IdPrefix.Maintenance);
  }

  async findByProperty(
    propertyId: string,
    scope: LandlordScope,
  ): Promise<readonly MaintenanceRequest[]> {
    return this.findWhere((request) => request.propertyId === propertyId, scope);
  }

  async findByUnit(unitId: string, scope: LandlordScope): Promise<readonly MaintenanceRequest[]> {
    return this.findWhere((request) => request.unitId === unitId, scope);
  }
}
