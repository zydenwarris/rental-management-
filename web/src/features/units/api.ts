import { useMutation, useQuery } from "@tanstack/react-query";
import type { Lease, Unit, UnitCreateInput, UnitUpdateInput } from "@contract";
import { api } from "@app/lib/api/client.js";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const units = createResource<Unit, UnitCreateInput, UnitUpdateInput>("/api/units");

export function useUnitsQuery() {
  return useQuery({ queryKey: queryKeys.units.all, queryFn: units.list });
}

export function useUnitQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.units.detail(id ?? ""),
    queryFn: () => units.get(id!),
    enabled: Boolean(id),
  });
}

export function useUnitLeasesQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.units.leases(id ?? ""),
    queryFn: () => api.get<Lease[]>(`/api/units/${id}/leases`),
    enabled: Boolean(id),
  });
}

export function useCreateUnit() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (body: UnitCreateInput) => units.create(body), onSuccess: invalidateAll });
}

export function useUpdateUnit(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: UnitUpdateInput) => units.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeleteUnit() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => units.remove(id), onSuccess: invalidateAll });
}
