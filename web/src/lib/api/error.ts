import type { ErrorCode, ErrorDetail } from "@contract";

/**
 * The sentinel the API uses for validation issues with no field path.
 * `middleware.ts` emits it as `issue.path.join(".") || "(body)"`, so it must map
 * to a form-level banner rather than a field that doesn't exist.
 */
export const ROOT_FIELD = "(body)";

/** The server's taxonomy, plus the two failures only a client can observe. */
export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "BAD_RESPONSE";

export class ApiClientError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;
  readonly details: readonly ErrorDetail[];

  constructor(
    code: ClientErrorCode,
    status: number,
    message: string,
    details: readonly ErrorDetail[] = [],
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static is(error: unknown): error is ApiClientError {
    return error instanceof ApiClientError;
  }

  /**
   * Whether the server named specific fields.
   *
   * Deliberately ignores the status code. The API attaches field details to 409s
   * as well as 422s — DUPLICATE_UNIT points at `label`, LEASE_OVERLAP at
   * `startDate`, UNIT_NOT_AVAILABLE at `unitId`. Keying this on `status === 422`
   * would downgrade the most useful business errors to anonymous toasts.
   */
  get hasFieldErrors(): boolean {
    return this.details.some((detail) => detail.field !== ROOT_FIELD);
  }
}

interface ErrorEnvelope {
  error?: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

export function toApiClientError(status: number, payload: unknown): ApiClientError {
  const envelope = payload as ErrorEnvelope | null;
  if (envelope?.error) {
    return new ApiClientError(
      envelope.error.code,
      status,
      envelope.error.message,
      envelope.error.details ?? [],
    );
  }

  // The API's error handler shapes *every* failure it produces into the envelope,
  // including its own 500s. So a 5xx arriving without one did not come from the
  // API at all — it came from something in between. In development that is the
  // Vite proxy answering for a backend that isn't running, which is worth saying
  // plainly instead of reporting a bare status code.
  if (status >= 500) {
    return new ApiClientError(
      "NETWORK_ERROR",
      status,
      "Could not reach the server. Check that the API is running on port 4000.",
    );
  }

  return new ApiClientError("BAD_RESPONSE", status, `Unexpected ${status} response from the server.`);
}
