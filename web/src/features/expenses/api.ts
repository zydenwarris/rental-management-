import { useMutation, useQuery } from "@tanstack/react-query";
import type { Expense, ExpenseCreateInput, ExpenseUpdateInput } from "@contract";
import { createResource } from "@app/lib/api/resource.js";
import { queryKeys } from "@app/lib/api/keys.js";
import { useInvalidateAll } from "@app/features/properties/api.js";

const expenses = createResource<Expense, ExpenseCreateInput, ExpenseUpdateInput>("/api/expenses");

export function useExpensesQuery() {
  return useQuery({ queryKey: queryKeys.expenses.all, queryFn: expenses.list });
}

export function useExpenseQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id ?? ""),
    queryFn: () => expenses.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateExpense() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (body: ExpenseCreateInput) => expenses.create(body), onSuccess: invalidateAll });
}

export function useUpdateExpense(id: string) {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: ExpenseUpdateInput) => expenses.update(id, body),
    onSuccess: invalidateAll,
  });
}

export function useDeleteExpense() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => expenses.remove(id), onSuccess: invalidateAll });
}
