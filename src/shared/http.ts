import type { ErrorCode, ErrorDetail } from "./errors.js";

/**
 * One response envelope for the entire API, so the frontend writes its unwrapping
 * and its error handling exactly once.
 */

export interface SuccessResponse<T> {
  readonly data: T;
}

export interface ListResponse<T> {
  readonly data: readonly T[];
  readonly meta: { readonly total: number };
}

export interface ErrorResponse {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details: readonly ErrorDetail[];
  };
}

export function ok<T>(data: T): SuccessResponse<T> {
  return { data };
}

export function list<T>(items: readonly T[]): ListResponse<T> {
  return { data: items, meta: { total: items.length } };
}
