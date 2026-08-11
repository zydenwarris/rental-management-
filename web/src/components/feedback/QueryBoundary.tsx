import type { ReactNode } from "react";
import { ApiClientError } from "@app/lib/api/error.js";
import { Button, EmptyState, LoadingRows } from "@app/components/ui/index.js";

/**
 * One place that turns a query's pending/error state into UI, so every screen
 * fails the same way. Without it, eight modules grow eight slightly different
 * spinners and eight slightly different error messages.
 */
export function QueryBoundary<T>({
  query,
  children,
  loadingRows,
}: {
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => void };
  children: (data: T) => ReactNode;
  loadingRows?: number;
}) {
  if (query.isPending) return <LoadingRows {...(loadingRows === undefined ? {} : { rows: loadingRows })} />;

  if (query.error) {
    const isNetwork = ApiClientError.is(query.error) && query.error.code === "NETWORK_ERROR";
    return (
      <EmptyState
        title={isNetwork ? "Can't reach the server" : "Something went wrong"}
        message={
          isNetwork
            ? "The API isn't responding. Check that it's running on port 4000, then try again."
            : ApiClientError.is(query.error)
              ? query.error.message
              : "An unexpected error occurred."
        }
        action={
          <Button variant="secondary" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  // isPending and error are both false here, so data has resolved.
  return <>{children(query.data as T)}</>;
}
