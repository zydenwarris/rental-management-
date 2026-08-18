/** Where an authenticated user lands when no particular page was requested. */
export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

/** Router state RequireAuth attaches so a login can return the user where they were headed. */
export interface FromState {
  readonly from: string;
}

/** Minimum the client asks for. Supabase enforces its own minimum independently. */
export const MIN_PASSWORD_LENGTH = 8;
