import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@contract";
import { api } from "@app/lib/api/client.js";
import { queryKeys } from "@app/lib/api/keys.js";

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardSummary>("/api/dashboard"),
  });
}
