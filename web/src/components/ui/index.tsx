import type { ComponentPropsWithRef, ReactNode, SelectHTMLAttributes } from "react";
import { AlertIcon } from "@app/components/layout/icons.js";
import styles from "./ui.module.css";

export { styles as ui };

export function cx(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

/* ---------- Page header ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </header>
  );
}

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary!,
  secondary: styles.buttonSecondary!,
  ghost: styles.buttonGhost!,
  danger: styles.buttonDanger!,
};

// ComponentPropsWithRef rather than ButtonHTMLAttributes: React 19 passes ref as
// an ordinary prop, and ConfirmDialog needs one to move focus on open.
export function Button({
  variant = "secondary",
  small = false,
  className,
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: ButtonVariant; small?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(styles.button, buttonVariants[variant], small && styles.buttonSmall, className)}
    />
  );
}

/* ---------- Panel ---------- */

export function Panel({
  title,
  actions,
  children,
  padded = false,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={styles.panel}>
      {(title || actions) && (
        <div className={styles.panelHeader}>
          {title && <h2 className={styles.panelTitle}>{title}</h2>}
          {actions}
        </div>
      )}
      {padded ? <div className={styles.panelBody}>{children}</div> : children}
    </section>
  );
}

/* ---------- Badge ---------- */

export type BadgeTone = "positive" | "warning" | "danger" | "neutral" | "accent";

const badgeTones: Record<BadgeTone, string> = {
  positive: styles.badgePositive!,
  warning: styles.badgeWarning!,
  danger: styles.badgeDanger!,
  neutral: styles.badgeNeutral!,
  accent: styles.badgeAccent!,
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx(styles.badge, badgeTones[tone])}>{children}</span>;
}

/* ---------- Field ---------- */

export function Field({
  label,
  error,
  hint,
  required,
  wide,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx(styles.field, wide && styles.fieldWide)}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <select {...props} className={cx(styles.select, className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Form-level errors, including the API's "(body)" sentinel that names no field. */
export function FormBanner({ message }: { message: string }) {
  return (
    <div className={styles.formBanner} role="alert">
      <AlertIcon />
      <span>{message}</span>
    </div>
  );
}

/* ---------- States ---------- */

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.stateBlock}>
      <p className={styles.stateTitle}>{title}</p>
      <p className={styles.stateMessage}>{message}</p>
      {action}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className={styles.skeletonStack} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeleton} style={{ height: 34 }} />
      ))}
    </div>
  );
}
