import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@app/lib/supabase/client.js";
import { setAuthTokenProvider, setUnauthorizedHandler } from "@app/lib/api/client.js";
import { AuthStatus } from "./authStatus.js";

/**
 * The one place session state lives.
 *
 * Supabase keeps the session in localStorage and refreshes it in the background, so
 * this provider does not manage tokens — it mirrors them into React state and tells the
 * API client where to find the current one.
 *
 * `status` exists so nothing renders on a guess. Restoring a session from storage is
 * asynchronous, and treating "not known yet" as "signed out" is what makes an app flash
 * its login screen at an already-authenticated user on every reload.
 */

interface AuthContextValue {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly email: string;
  /** Display name from signup, falling back to the email address. */
  readonly displayName: string;
  /** True while the user arrived through a password-reset link. */
  readonly isRecoveringPassword: boolean;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/*
 * Wired at module load, not in an effect.
 *
 * Neither of these depends on React state, and doing it in an effect leaves a window —
 * however brief — where a request could go out with no Authorization header, get a 401,
 * and sign the user out for no reason. There is no such window if the bridge is in place
 * before anything can render.
 *
 * Reads through to supabase on every call rather than closing over a token, so the value
 * is always the one Supabase has most recently refreshed.
 */
setAuthTokenProvider(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

setUnauthorizedHandler(async () => {
  // Supabase refreshes in the background, so a token the API rejects means the session
  // is genuinely finished. Ending it here is what lets RequireAuth take over, instead of
  // every panel on the page showing its own error.
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.auth.signOut();
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.Loading);
  const [session, setSession] = useState<Session | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? AuthStatus.SignedIn : AuthStatus.SignedOut);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setStatus(next ? AuthStatus.SignedIn : AuthStatus.SignedOut);

      // Fired when a recovery link is opened. The session it creates is real, so
      // without this flag a half-way-through-a-reset user looks like an ordinary one.
      if (event === "PASSWORD_RECOVERY") setIsRecoveringPassword(true);
      if (event === "USER_UPDATED") setIsRecoveringPassword(false);

      if (event === "SIGNED_OUT") {
        setIsRecoveringPassword(false);
        // Cached portfolio data belongs to the landlord who just left. Clearing it is
        // what stops the next person to sign in on this browser seeing their figures.
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const email = session?.user.email ?? "";
    const metadataName = session?.user.user_metadata["display_name"];

    return {
      status,
      session,
      email,
      displayName: typeof metadataName === "string" && metadataName !== "" ? metadataName : email,
      isRecoveringPassword,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [status, session, isRecoveringPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("BUG: useAuth used outside AuthProvider.");
  return value;
}
