import { AuthError } from "@supabase/supabase-js";

/**
 * Turns a Supabase auth failure into something a landlord can act on.
 *
 * Gotrue's own strings are written for developers ("Invalid login credentials",
 * "For security purposes, you can only request this after 51 seconds") and leak
 * implementation vocabulary into the interface. Every message below names what the
 * person should do next instead.
 *
 * Keyed on `code` where Supabase provides one, because those are stable; the message
 * text is not, and matching on it breaks quietly whenever Gotrue is updated.
 */

const BY_CODE: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Check both and try again.",
  email_not_confirmed: "Confirm your email address first — check your inbox for the link.",
  user_already_exists: "That email is already registered. Sign in instead.",
  email_exists: "That email is already registered. Sign in instead.",
  weak_password: "Choose a stronger password — at least 8 characters.",
  same_password: "That is already your password. Choose a different one.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit: "Too many emails requested. Wait a few minutes and try again.",
  validation_failed: "Check the details above and try again.",
  email_address_invalid: "That email address doesn't look valid. Check it and try again.",
  session_expired: "Your session expired. Sign in again.",
};

const FALLBACK = "Something went wrong. Try again in a moment.";

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AuthError)) {
    // Almost always the browser being offline or the project URL being wrong —
    // neither of which Supabase gets a chance to describe.
    return "Could not reach the authentication service. Check your connection and try again.";
  }

  const known = error.code ? BY_CODE[error.code] : undefined;
  if (known) return known;

  // Rate limiting sometimes arrives as a plain 429 with no code, and it is the one
  // case where saying nothing useful is actively confusing.
  if (error.status === 429) return BY_CODE["over_request_rate_limit"] ?? FALLBACK;

  return FALLBACK;
}
