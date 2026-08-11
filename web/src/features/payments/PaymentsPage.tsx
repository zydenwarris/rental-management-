import { Link } from "react-router";
import type { Payment, Tenant, Unit } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { paymentMethodLabels, paymentStatusLabels, toOptions } from "@app/lib/labels.js";
import { useTenantsQuery } from "@app/features/tenants/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { paymentStatusTones } from "@app/features/leases/tones.js";
import { usePaymentsQuery } from "./api.js";

export function PaymentsPage() {
  const payments = usePaymentsQuery();
  const tenants = useTenantsQuery();
  const units = useUnitsQuery();

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Payments"
        description="Rent you have received, recorded by hand. Status is worked out from the amount and the date."
        actions={
          <Link to="/payments/new">
            <Button variant="primary">
              <PlusIcon />
              Record payment
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={payments}>
          {(rows) => (
            <PaymentsTable payments={rows} tenants={tenants.data ?? []} units={units.data ?? []} />
          )}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function PaymentsTable({
  payments,
  tenants,
  units,
}: {
  payments: Payment[];
  tenants: Tenant[];
  units: Unit[];
}) {
  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.fullName ?? "—";
  const unitLabel = (id: string) => units.find((u) => u.id === id)?.label ?? "—";

  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: payments,
    searchFields: (payment) => [
      tenantName(payment.tenantId),
      unitLabel(payment.unitId),
      payment.reference,
    ],
    initialSort: { key: "paymentDate", direction: "desc" },
  });

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payments recorded"
        message="Record rent as it comes in to track what is collected and what is still owed."
        action={
          <Link to="/payments/new">
            <Button variant="primary">Record payment</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className={ui.toolbar}>
        <input
          className={cx(ui.input, ui.search)}
          type="search"
          placeholder="Search tenant, unit, or reference"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search payments"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["status"] ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {toOptions(paymentStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["method"] ?? ""}
          onChange={(event) => setFilter("method", event.target.value)}
          aria-label="Filter by method"
        >
          <option value="">All methods</option>
          {toOptions(paymentMethodLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {payments.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No payment matches those filters." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Paid</th>
                <th>Tenant</th>
                <th>Unit</th>
                <th className={ui.numeric}>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((payment) => (
                <tr key={payment.id}>
                  <td className={ui.primaryCell}>{formatDate(payment.paymentDate)}</td>
                  <td className={ui.mutedCell}>
                    <Link to={`/tenants/${payment.tenantId}`}>{tenantName(payment.tenantId)}</Link>
                  </td>
                  <td className={ui.mutedCell}>{unitLabel(payment.unitId)}</td>
                  <td className={ui.numeric}>{formatAmount(payment.amount)}</td>
                  <td className={ui.mutedCell}>{paymentMethodLabels[payment.method]}</td>
                  <td>
                    <Badge tone={paymentStatusTones[payment.status]}>
                      {paymentStatusLabels[payment.status]}
                    </Badge>
                  </td>
                  <td>
                    <Link to={`/payments/${payment.id}/edit`}>
                      <Button small variant="ghost">
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
