import { NavLink, Outlet, useLocation } from "react-router";
import { useTheme, Theme } from "@app/hooks/useTheme.js";
import styles from "./AppShell.module.css";
import {
  DashboardIcon,
  ExpenseIcon,
  LeaseIcon,
  MaintenanceIcon,
  MoonIcon,
  PaymentIcon,
  PropertyIcon,
  SunIcon,
  TenantIcon,
  UnitIcon,
} from "./icons.js";

/**
 * Navigation mirrors the API's modules, grouped the way a landlord thinks about
 * them: what you own, who lives there, and what it costs.
 */
const NAV_GROUPS = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Dashboard", Icon: DashboardIcon }],
  },
  {
    label: "Portfolio",
    items: [
      { to: "/properties", label: "Properties", Icon: PropertyIcon },
      { to: "/units", label: "Units", Icon: UnitIcon },
    ],
  },
  {
    label: "Occupancy",
    items: [
      { to: "/tenants", label: "Tenants", Icon: TenantIcon },
      { to: "/leases", label: "Leases", Icon: LeaseIcon },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/payments", label: "Payments", Icon: PaymentIcon },
      { to: "/expenses", label: "Expenses", Icon: ExpenseIcon },
      { to: "/maintenance", label: "Maintenance", Icon: MaintenanceIcon },
    ],
  },
] as const;

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Rentbook</span>
            <span className={styles.brandMeta}>Trinidad &amp; Tobago</span>
          </span>
        </div>

        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className={styles.navGroup}>
            {group.label && <p className={styles.navLabel}>{group.label}</p>}
            {group.items.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className={styles.navFooter}>
          <button
            type="button"
            className={styles.navLink}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === Theme.Dark ? "light" : "dark"} mode`}
          >
            {theme === Theme.Dark ? <SunIcon /> : <MoonIcon />}
            <span>{theme === Theme.Dark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </nav>

      <div className={styles.main}>
        {/* key remounts on navigation, which restarts the enter animation. */}
        <main key={pathname} className={`${styles.content} ${styles.routeEnter}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
