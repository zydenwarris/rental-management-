import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { Property, PropertyCreate, PropertyUpdate } from "./property.types.js";

export type PropertyRepository = Repository<Property, PropertyCreate, PropertyUpdate>;

export class InMemoryPropertyRepository
  extends InMemoryRepository<Property>
  implements PropertyRepository
{
  constructor() {
    super(IdPrefix.Property);
  }
}
