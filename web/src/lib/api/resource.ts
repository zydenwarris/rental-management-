import { api } from "./client.js";

/**
 * All eight modules expose the same five verbs over the same URL shape, so the
 * calls are generated once here. Anything a module does that isn't one of these
 * five — terminating a lease, reading nested collections — stays hand-written in
 * that module's own api.ts, where it can be found by searching for the path.
 */
export function createResource<TEntity, TCreate, TUpdate>(basePath: string) {
  return {
    list: () => api.get<TEntity[]>(basePath),
    get: (id: string) => api.get<TEntity>(`${basePath}/${id}`),
    create: (body: TCreate) => api.post<TEntity>(basePath, body),
    update: (id: string, body: TUpdate) => api.patch<TEntity>(`${basePath}/${id}`, body),
    remove: (id: string) => api.delete(`${basePath}/${id}`),
  };
}
