import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Expense,
  MaintenanceRequest,
  Property,
  PropertyCreateInput,
  PropertyUpdateInput,
  Unit,
} from "@contract";
import { api } from "@app/lib/api/client.js";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";

const properties = createResource<Property, PropertyCreateInput, PropertyUpdateInput>("/api/properties");

export function usePropertiesQuery() {
  return useQuery({ queryKey: queryKeys.properties.all, queryFn: properties.list });
}

export function usePropertyQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id ?? ""),
    queryFn: () => properties.get(id!),
    enabled: Boolean(id),
  });
}

export function usePropertyUnitsQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.properties.units(id ?? ""),
    queryFn: () => api.get<Unit[]>(`/api/properties/${id}/units`),
    enabled: Boolean(id),
  });
}

export function usePropertyExpensesQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.properties.expenses(id ?? ""),
    queryFn: () => api.get<Expense[]>(`/api/properties/${id}/expenses`),
    enabled: Boolean(id),
  });
}

export function usePropertyMaintenanceQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.properties.maintenance(id ?? ""),
    queryFn: () => api.get<MaintenanceRequest[]>(`/api/properties/${id}/maintenance`),
    enabled: Boolean(id),
  });
}

/**
 * Entities here are heavily denormalised — a lease carries propertyId, a payment
 * carries all three ids — so almost any write moves figures on screens far from
 * the one that made it. Invalidating everything is correct by construction and
 * costs a handful of sub-millisecond refetches against a local API. Narrow it
 * only if something is measurably slow.
 */
export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useCreateProperty() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: PropertyCreateInput) => properties.create(body),
    onSuccess: invalidateAll,
  });
}

export function useUpdateProperty(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: PropertyUpdateInput) => properties.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeleteProperty() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => properties.remove(id),
    onSuccess: invalidateAll,
  });
}
