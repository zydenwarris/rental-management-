import { useMutation, useQuery } from "@tanstack/react-query";
import type { Payment, PaymentCreateInput, PaymentUpdateInput } from "@contract";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const payments = createResource<Payment, PaymentCreateInput, PaymentUpdateInput>("/api/payments");

export function usePaymentsQuery() {
  return useQuery({ queryKey: queryKeys.payments.all, queryFn: payments.list });
}

export function usePaymentQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id ?? ""),
    queryFn: () => payments.get(id!),
    enabled: Boolean(id),
  });
}

export function useRecordPayment() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: PaymentCreateInput) => payments.create(body),
    onSuccess: invalidateAll,
  });
}

export function useUpdatePayment(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: PaymentUpdateInput) => payments.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeletePayment() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => payments.remove(id), onSuccess: invalidateAll });
}
