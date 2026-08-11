import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiClientError, ROOT_FIELD } from "@app/lib/api/error.js";

/**
 * Maps an API rejection back onto the form that caused it.
 *
 * Deliberately never looks at the status code. The API attaches field details to
 * 409 conflicts as well as 422 validations — a duplicate unit label names
 * `label`, an overlapping lease names `startDate`. Keying on 422 would turn the
 * most informative errors in the system into anonymous banners.
 *
 * Returns true when the error was displayed, so callers know whether they still
 * need a fallback.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!ApiClientError.is(error)) return false;

  let namedAField = false;

  for (const detail of error.details) {
    // Zod's sentinel for issues with no path — there is no such input to mark.
    if (detail.field === ROOT_FIELD) continue;
    setError(detail.field as Path<T>, { type: "server", message: detail.message });
    namedAField = true;
  }

  // Nothing matched a field, so show it at form level rather than dropping it.
  if (!namedAField) {
    setError("root.serverError" as Path<T>, { type: "server", message: error.message });
  }

  return true;
}
