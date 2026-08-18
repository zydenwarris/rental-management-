/**
 * Where Supabase sends someone after they click a password-reset link.
 *
 * Must also appear in the project's Redirect URLs allow list (Supabase → Authentication
 * → URL Configuration), or Gotrue silently falls back to the Site URL and the reset
 * form never sees its tokens.
 */
export const RESET_REDIRECT_PATH = "/reset-password";
