import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { MoonIcon, SunIcon } from "@app/components/layout/icons.js";
import { useTheme, Theme } from "@app/hooks/useTheme.js";
import styles from "./auth.module.css";

/**
 * The frame every signed-out screen sits in.
 *
 * The card is keyed on the pathname so moving between sign in, sign up and the reset
 * screens replays its entrance — the same trick the signed-in shell uses for route
 * changes, so navigation feels consistent on both sides of the login.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === Theme.Dark ? "light" : "dark"} mode`}
        >
          {theme === Theme.Dark ? <SunIcon /> : <MoonIcon />}
          <span>{theme === Theme.Dark ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className={styles.centre}>
        <div key={pathname} className={styles.card}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              R
            </span>
            <span>
              <span className={styles.brandName}>Rentbook</span>
              <span className={styles.brandMeta}>Trinidad &amp; Tobago</span>
            </span>
          </div>

          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>

          {children}

          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>

      <p className={styles.pageFooter}>Rent, leases and expenses in one ledger.</p>
    </div>
  );
}
