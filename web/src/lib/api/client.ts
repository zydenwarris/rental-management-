import { ApiClientError, toApiClientError } from "./error.js";

/**
 * Empty base means same origin: in development the Vite proxy forwards /api to
 * the API, and in production Express can serve this bundle itself. Neither case
 * needs CORS, and neither needs a hardcoded host.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const NO_CONTENT = 204;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch (cause) {
    // fetch rejects only on network failure, and by far the most common cause
    // here is the API simply not running.
    throw new ApiClientError("NETWORK_ERROR", 0, "Could not reach the server.", [], { cause });
  }

  // DELETE answers 204 with no body at all, so there is nothing to parse.
  if (response.status === NO_CONTENT) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) throw toApiClientError(response.status, payload);

  // Success envelopes are { data } and { data, meta }. meta.total is always
  // data.length today, so unwrapping to `data` discards nothing. If the API ever
  // gains real pagination, this is the one function to revisit.
  return (payload as { data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  /** body is optional: POST /leases/:id/terminate sends none. */
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};
