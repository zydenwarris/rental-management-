import { useMutation, useQuery } from "@tanstack/react-query";
import type { Lease, LeaseCreateInput, LeaseUpdateInput, Payment } from "@contract";
import { api } from "@app/lib/api/client.js";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const leases = createResource<Lease, LeaseCreateInput, LeaseUpdateInput>("/api/leases");

export function useLeasesQuery() {
  return useQuery({ queryKey: queryKeys.leases.all, queryFn: leases.list });
}

export function useLeaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leases.detail(id ?? ""),
    queryFn: () => leases.get(id!),
    enabled: Boolean(id),
  });
}

export function useLeasePaymentsQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leases.payments(id ?? ""),
    queryFn: () => api.get<Payment[]>(`/api/leases/${id}/payments`),
    enabled: Boolean(id),
  });
}

export function useCreateLease() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (body: LeaseCreateInput) => leases.create(body), onSuccess: invalidateAll });
}

export function useUpdateLease(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: LeaseUpdateInput) => leases.update(id, body),
    onSuccess: invalidateAll,
  });
}

/**
 * Termination is a state transition with its own rules, not a status write —
 * hence a dedicated endpoint that takes no body.
 */
export function useTerminateLease() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.post<Lease>(`/api/leases/${id}/terminate`),
    onSuccess: invalidateAll,
  });
}

export function useDeleteLease() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => leases.remove(id), onSuccess: invalidateAll });
}
