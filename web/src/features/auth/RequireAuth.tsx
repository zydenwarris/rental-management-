import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthProvider.js";
import { AuthStatus } from "./authStatus.js";
import styles from "./auth.module.css";

/**
 * Gate on every signed-in route.
 *
 * The Loading branch matters more than it looks: restoring a session from storage is
 * asynchronous, and redirecting during that window would bounce a signed-in user to the
 * login screen on every refresh.
 *
 * This is convenience, not security. The API verifies the token on every request and
 * answers 401 regardless of what the router allows.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === AuthStatus.Loading) {
    return (
      <div className={styles.booting}>
        <div className={styles.bootingMark} aria-label="Loading" />
      </div>
    );
  }

  if (status === AuthStatus.SignedOut) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
