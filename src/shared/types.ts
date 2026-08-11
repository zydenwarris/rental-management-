import type { IsoDateTime } from "./dates.js";

/**
 * Every request carries a context identifying the acting landlord.
 *
 * Right now a middleware fills this in with a fixed development landlord, because
 * authentication is out of scope for this version. When real auth arrives it replaces
 * that one middleware and nothing downstream changes: services already scope every
 * read and write to `ctx.landlordId`, so a landlord can never reach another's data.
 * Building the seam now is what makes adding auth later a one-file change.
 */
export interface RequestContext {
  readonly landlordId: string;
}

/** Passed to repositories so data access is always scoped at the query, not filtered after. */
export interface LandlordScope {
  readonly landlordId: string;
}

/** Fields every stored entity carries. */
export interface BaseEntity {
  readonly id: string;
  readonly landlordId: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
