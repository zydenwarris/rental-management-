/**
 * The error taxonomy for the whole API.
 *
 * Errors are sorted into three buckets:
 *   - Bug         → an impossible state. Throw a plain Error and let it crash loudly.
 *   - Exceptional → infrastructure failure. Surfaced as INTERNAL_ERROR.
 *   - Expected    → ordinary business outcomes (not found, overlapping lease).
 *                   These are ApiError and carry a stable machine-readable code.
 *
 * Only the third bucket lives here. Services throw ApiError; the HTTP layer is the
 * only place that knows how to turn one into a status code and JSON body.
 */

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_UNIT: "DUPLICATE_UNIT",
  LEASE_OVERLAP: "LEASE_OVERLAP",
  INVALID_RELATIONSHIP: "INVALID_RELATIONSHIP",
  INVALID_PAYMENT_AMOUNT: "INVALID_PAYMENT_AMOUNT",
  UNIT_NOT_AVAILABLE: "UNIT_NOT_AVAILABLE",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Field-level detail, used mainly by validation failures so a form can highlight inputs. */
export interface ErrorDetail {
  readonly field: string;
  readonly message: string;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: readonly ErrorDetail[];

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details: readonly ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static validation(message: string, details: readonly ErrorDetail[] = []): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, 422, message, details);
  }

  /** `resource` is the human-facing noun, e.g. "Property". */
  static notFound(resource: string, id: string): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, 404, `${resource} '${id}' was not found.`);
  }

  /** A referenced entity exists but does not belong where the caller claimed. */
  static invalidRelationship(message: string, details: readonly ErrorDetail[] = []): ApiError {
    return new ApiError(ErrorCode.INVALID_RELATIONSHIP, 422, message, details);
  }

  static duplicateUnit(label: string, propertyId: string): ApiError {
    return new ApiError(
      ErrorCode.DUPLICATE_UNIT,
      409,
      `Unit '${label}' already exists on property '${propertyId}'.`,
      [{ field: "label", message: "Unit labels must be unique within a property." }],
    );
  }

  static leaseOverlap(unitId: string, conflictingLeaseId: string): ApiError {
    return new ApiError(
      ErrorCode.LEASE_OVERLAP,
      409,
      `Unit '${unitId}' already has an active lease overlapping these dates.`,
      [{ field: "startDate", message: `Conflicts with lease '${conflictingLeaseId}'.` }],
    );
  }

  static invalidPaymentAmount(message: string): ApiError {
    return new ApiError(ErrorCode.INVALID_PAYMENT_AMOUNT, 422, message, [
      { field: "amount", message },
    ]);
  }

  static unitNotAvailable(unitId: string, reason: string): ApiError {
    return new ApiError(ErrorCode.UNIT_NOT_AVAILABLE, 409, reason, [
      { field: "unitId", message: `Unit '${unitId}' cannot be leased right now.` },
    ]);
  }

  static conflict(message: string, details: readonly ErrorDetail[] = []): ApiError {
    return new ApiError(ErrorCode.CONFLICT, 409, message, details);
  }

  /** No usable credentials. 401, not 403: the caller may retry with a valid token. */
  static unauthorized(message: string): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, 401, message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
