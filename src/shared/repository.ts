import type { LandlordScope } from "./types.js";

/**
 * The seam between business logic and storage.
 *
 * Services depend on this interface only. The in-memory implementations that ship
 * today and a PostgreSQL implementation added later are interchangeable, so swapping
 * the database touches the wiring in `container.ts` and nothing else.
 *
 * Every method is async even though the in-memory versions resolve immediately. A
 * synchronous interface would be a one-way door: making it async later would change
 * the signature of every caller. Async from the start costs nothing and keeps the
 * decision reversible.
 *
 * Every method takes a LandlordScope so filtering happens in the query rather than
 * after the fact. A real database can then push it into the WHERE clause, and it is
 * impossible to accidentally return another landlord's rows.
 */
export interface Repository<TEntity, TCreate, TUpdate> {
  findById(id: string, scope: LandlordScope): Promise<TEntity | null>;
  findAll(scope: LandlordScope): Promise<readonly TEntity[]>;
  create(data: TCreate, scope: LandlordScope): Promise<TEntity>;
  update(id: string, patch: TUpdate, scope: LandlordScope): Promise<TEntity | null>;
  delete(id: string, scope: LandlordScope): Promise<boolean>;
}
