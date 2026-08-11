import { Link } from "react-router";
import { LeaseStatus, PaymentStatus, type Lease, type Payment, type Tenant, type Unit } from "@contract";
import { EmptyState } from "@app/components/ui/index.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate, formatMonthAbbrev, recentMonths } from "@app/lib/dates.js";
import { paymentMethodLabels } from "@app/lib/labels.js";
import styles from "./dashboard.module.css";

const MONTHS_SHOWN = 6;

/**
 * The rent book.
 *
 * Before software, a landlord kept a ruled ledger: one row per tenant, one
 * column per month, ticked as rent came in. The grid is the data structure, and
 * it answers "who is behind, and for how long?" in a way no total can. This is
 * that book, drawn from live payments.
 *
 * Cell state is carried by fill *and* shape — solid, half-filled, outlined,
 * dashed — so the grid survives greyscale and colour blindness.
 */
export function RentBook({
  leases,
  payments,
  tenants,
  units,
}: {
  leases: Lease[];
  payments: Payment[];
  tenants: Tenant[];
  units: Unit[];
}) {
  const months = recentMonths(MONTHS_SHOWN);

  // Only leases a landlord is actually collecting on: terminated and long-expired
  // tenancies would pad the book with rows that can never change.
  const trackedLeases = leases.filter(
    (lease) =>
      lease.status === LeaseStatus.Active ||
      lease.status === LeaseStatus.Upcoming ||
      (lease.status === LeaseStatus.Expired && lease.endDate >= `${months[0]}-01`),
  );

  if (trackedLeases.length === 0) {
    return (
      <EmptyState
        title="No leases to track"
        message="Once a lease is running, every month of rent shows up here."
      />
    );
  }

  const tenantName = (id: string) => tenants.find((tenant) => tenant.id === id)?.fullName ?? "Unknown";
  const unitLabel = (id: string) => units.find((unit) => unit.id === id)?.label ?? "—";

  return (
    <>
      <div className={styles.ledgerScroll}>
        <table className={styles.ledger}>
          <thead>
            <tr>
              <th className={styles.ledgerNameHead}>Tenant</th>
              <th className={styles.ledgerNameHead}>Unit</th>
              {months.map((month) => (
                <th key={month} className={styles.ledgerMonthHead}>
                  {formatMonthAbbrev(month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trackedLeases.map((lease, index) => (
              <tr
                key={lease.id}
                className={styles.ledgerRow}
                // Rows cascade in like a page being read down.
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className={styles.ledgerTenant}>
                  <Link to={`/leases/${lease.id}`}>{tenantName(lease.tenantId)}</Link>
                </td>
                <td className={styles.ledgerUnit}>{unitLabel(lease.unitId)}</td>
                {months.map((month) => (
                  <td key={month} className={styles.ledgerCellWrap}>
                    <LedgerCell
                      lease={lease}
                      month={month}
                      payments={payments.filter(
                        (payment) =>
                          payment.leaseId === lease.id && payment.paymentDate.startsWith(month),
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.ledgerLegend}>
        <LegendKey className={styles.cellPaid} label="Paid in full" />
        <LegendKey className={styles.cellPartial} label="Part paid" />
        <LegendKey className={styles.cellLate} label="Late" />
        <LegendKey className={styles.cellNone} label="Nothing recorded" />
      </div>
    </>
  );
}

function LegendKey({ className, label }: { className: string | undefined; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span className={`${styles.cell} ${className}`} style={{ width: 16, height: 16 }} aria-hidden="true" />
      {label}
    </span>
  );
}

function LedgerCell({
  lease,
  month,
  payments,
}: {
  lease: Lease;
  month: string;
  payments: Payment[];
}) {
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  // Months before the tenancy started or after it ended aren't misses — there
  // was no rent due, so the cell is drawn as absent rather than unpaid.
  const outsideTerm = lease.endDate < monthStart || lease.startDate > monthEnd;
  if (outsideTerm) {
    return (
      <span className={`${styles.cell} ${styles.cellOutsideTerm}`} aria-label="Outside the lease term">
        ·
      </span>
    );
  }

  const paid = payments.reduce((total, payment) => total + payment.amount, 0);

  if (payments.length === 0) {
    return (
      <span
        className={`${styles.cell} ${styles.cellNone}`}
        title={`${formatMonthAbbrev(month)} — nothing recorded`}
        aria-label={`${month}: nothing recorded`}
      >
        ·
      </span>
    );
  }

  const isLate = payments.some((payment) => payment.status === PaymentStatus.Late);
  const isShort = paid < lease.monthlyRent;

  const [className, symbol, state] = isShort
    ? [styles.cellPartial, "◪", "part paid"]
    : isLate
      ? [styles.cellLate, "!", "paid late"]
      : [styles.cellPaid, "✓", "paid in full"];

  const detail = payments
    .map(
      (payment) =>
        `${formatDate(payment.paymentDate)} · TTD ${formatAmount(payment.amount)} · ${paymentMethodLabels[payment.method]}`,
    )
    .join("\n");

  return (
    <span
      className={`${styles.cell} ${className}`}
      title={`${formatMonthAbbrev(month)} — ${state}\n${detail}`}
      aria-label={`${month}: ${state}, TTD ${formatAmount(paid)} of ${formatAmount(lease.monthlyRent)}`}
    >
      {symbol}
    </span>
  );
}
