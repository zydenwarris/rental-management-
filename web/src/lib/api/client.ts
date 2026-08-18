import { ApiClientError, toApiClientError } from "./error.js";

/**
 * Empty base means same origin: in development the Vite proxy forwards /api to
 * the API, and in production Express can serve this bundle itself. Neither case
 * needs CORS, and neither needs a hardcoded host.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const NO_CONTENT = 204;
const UNAUTHORIZED = 401;

type TokenProvider = () => Promise<string | null>;

let getToken: TokenProvider = async () => null;
let onUnauthorized: (() => Promise<void>) | null = null;

/**
 * Registered once by AuthProvider.
 *
 * Inverted rather than importing the auth context here, for two reasons: this module is
 * imported by every feature's api.ts, so importing auth from it would close a cycle; and
 * a function that re-reads the session on each call always sees the token Supabase has
 * refreshed in the background, where a captured value would go stale after an hour.
 */
export function setAuthTokenProvider(provider: TokenProvider): void {
  getToken = provider;
}

/** Registered by AuthProvider so a rejected token ends the session in one place. */
export function setUnauthorizedHandler(handler: () => Promise<void>): void {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;

  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    // fetch rejects only on network failure, and by far the most common cause
    // here is the API simply not running.
    throw new ApiClientError("NETWORK_ERROR", 0, "Could not reach the server.", [], { cause });
  }

  // A token the API rejects is a token the browser should stop using. Supabase refreshes
  // in the background, so reaching here means the session is genuinely finished — sign
  // out so the router's guard takes over instead of every panel showing its own error.
  if (response.status === UNAUTHORIZED) {
    await onUnauthorized?.();
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
