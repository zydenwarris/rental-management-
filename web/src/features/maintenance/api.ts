import { useMutation, useQuery } from "@tanstack/react-query";
import type { MaintenanceCreateInput, MaintenanceRequest, MaintenanceUpdateInput } from "@contract";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const maintenance = createResource<MaintenanceRequest, MaintenanceCreateInput, MaintenanceUpdateInput>(
  "/api/maintenance",
);

export function useMaintenanceListQuery() {
  return useQuery({ queryKey: queryKeys.maintenance.all, queryFn: maintenance.list });
}

export function useMaintenanceQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.maintenance.detail(id ?? ""),
    queryFn: () => maintenance.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateMaintenance() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: MaintenanceCreateInput) => maintenance.create(body),
    onSuccess: invalidateAll,
  });
}

export function useUpdateMaintenance(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: MaintenanceUpdateInput) => maintenance.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeleteMaintenance() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => maintenance.remove(id), onSuccess: invalidateAll });
}
