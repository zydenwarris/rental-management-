import { createClient } from "@supabase/supabase-js";

/**
 * The Supabase client, used for authentication only.
 *
 * Data never comes from here. Every property, lease, and payment still travels
 * through the API, which is where the business rules live — this client's whole job
 * is to obtain and refresh an access token that the API can verify.
 *
 * The publishable key is meant to be public; row level security is what protects the
 * data. If you ever find yourself reaching for the secret key in this directory, the
 * work belongs on the server instead.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Fail at startup with the fix in the message, rather than at the first login
  // attempt with an opaque network error.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy web/.env.example to web/.env and fill it in.",
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Password-reset links arrive with their tokens in the URL fragment; this is what
    // turns that fragment into a usable session on /reset-password.
    detectSessionInUrl: true,
  },
});
