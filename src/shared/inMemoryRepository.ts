import type { Repository } from "./repository.js";
import type { BaseEntity, LandlordScope } from "./types.js";
import { generateId, type IdPrefix } from "./ids.js";
import { nowTimestamp } from "./dates.js";

/**
 * Generic in-memory Repository implementation shared by every module.
 *
 * Stands in for a real database: same interface, same landlord scoping, no
 * persistence. Replacing it with PostgreSQL means writing new classes against
 * `Repository` and swapping them in the container — services never know.
 *
 * Mutation is confined to the private Map; entities themselves are treated as
 * immutable snapshots (updates build a new object rather than editing in place).
 */
export class InMemoryRepository<TEntity extends BaseEntity>
  implements Repository<TEntity, Omit<TEntity, keyof BaseEntity>, Partial<Omit<TEntity, keyof BaseEntity>>>
{
  private readonly store = new Map<string, TEntity>();

  constructor(private readonly idPrefix: IdPrefix) {}

  async findById(id: string, scope: LandlordScope): Promise<TEntity | null> {
    const entity = this.store.get(id);
    return entity && entity.landlordId === scope.landlordId ? entity : null;
  }

  async findAll(scope: LandlordScope): Promise<readonly TEntity[]> {
    return [...this.store.values()].filter((e) => e.landlordId === scope.landlordId);
  }

  /** Scoped predicate query — the in-memory analogue of a WHERE clause. */
  async findWhere(
    predicate: (entity: TEntity) => boolean,
    scope: LandlordScope,
  ): Promise<readonly TEntity[]> {
    const all = await this.findAll(scope);
    return all.filter(predicate);
  }

  async create(data: Omit<TEntity, keyof BaseEntity>, scope: LandlordScope): Promise<TEntity> {
    const now = nowTimestamp();
    // Safe: Omit<TEntity, keyof BaseEntity> plus every BaseEntity field is exactly TEntity.
    const entity = {
      ...data,
      id: generateId(this.idPrefix),
      landlordId: scope.landlordId,
      createdAt: now,
      updatedAt: now,
    } as TEntity;
    this.store.set(entity.id, entity);
    return entity;
  }

  async update(
    id: string,
    patch: Partial<Omit<TEntity, keyof BaseEntity>>,
    scope: LandlordScope,
  ): Promise<TEntity | null> {
    const existing = await this.findById(id, scope);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: nowTimestamp() } as TEntity;
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string, scope: LandlordScope): Promise<boolean> {
    const existing = await this.findById(id, scope);
    if (!existing) return false;
    return this.store.delete(id);
  }
}
