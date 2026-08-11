import { useMutation, useQuery } from "@tanstack/react-query";
import type { Lease, Payment, Tenant, TenantCreateInput, TenantUpdateInput } from "@contract";
import { api } from "@app/lib/api/client.js";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const tenants = createResource<Tenant, TenantCreateInput, TenantUpdateInput>("/api/tenants");

export function useTenantsQuery() {
  return useQuery({ queryKey: queryKeys.tenants.all, queryFn: tenants.list });
}

export function useTenantQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(id ?? ""),
    queryFn: () => tenants.get(id!),
    enabled: Boolean(id),
  });
}

export function useTenantLeasesQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.leases(id ?? ""),
    queryFn: () => api.get<Lease[]>(`/api/tenants/${id}/leases`),
    enabled: Boolean(id),
  });
}

export function useTenantPaymentsQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.payments(id ?? ""),
    queryFn: () => api.get<Payment[]>(`/api/tenants/${id}/payments`),
    enabled: Boolean(id),
  });
}

export function useCreateTenant() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (body: TenantCreateInput) => tenants.create(body), onSuccess: invalidateAll });
}

export function useUpdateTenant(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: TenantUpdateInput) => tenants.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeleteTenant() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => tenants.remove(id), onSuccess: invalidateAll });
}
