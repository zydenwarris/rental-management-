import { useState } from "react";
import { Link, useParams } from "react-router";
import { LeaseStatus, type Payment } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { ConfirmDialog } from "@app/components/feedback/ConfirmDialog.js";
import { ApiClientError } from "@app/lib/api/error.js";
import { formatAmount, formatMoney } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { leaseStatusLabels, paymentMethodLabels, paymentStatusLabels } from "@app/lib/labels.js";
import { useTenantQuery } from "@app/features/tenants/api.js";
import { useUnitQuery } from "@app/features/units/api.js";
import { leaseStatusTones, paymentStatusTones } from "./tones.js";
import { useLeasePaymentsQuery, useLeaseQuery, useTerminateLease } from "./api.js";

export function LeaseDetailPage() {
  const { id } = useParams();
  const lease = useLeaseQuery(id);
  const payments = useLeasePaymentsQuery(id);
  const tenant = useTenantQuery(lease.data?.tenantId);
  const unit = useUnitQuery(lease.data?.unitId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [terminateError, setTerminateError] = useState<string>();
  const terminate = useTerminateLease();

  async function onConfirmTerminate() {
    setTerminateError(undefined);
    try {
      await terminate.mutateAsync(id!);
      setConfirmOpen(false);
    } catch (error) {
      setTerminateError(
        ApiClientError.is(error) ? error.message : "Could not terminate this lease.",
      );
    }
  }

  return (
    <QueryBoundary query={lease}>
      {(data) => {
        const canTerminate =
          data.status === LeaseStatus.Active || data.status === LeaseStatus.Upcoming;

        return (
          <>
            <PageHeader
              eyebrow="Lease"
              title={tenant.data?.fullName ?? "Lease"}
              description={`${unit.data?.label ?? "Unit"} · ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`}
              actions={
                <>
                  <Link to={`/leases/${data.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  {canTerminate && (
                    <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                      Terminate
                    </Button>
                  )}
                  <Link to={`/payments/new?leaseId=${data.id}`}>
                    <Button variant="primary">Record payment</Button>
                  </Link>
                </>
              }
            />

            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              <Panel title="Terms" padded>
                <dl className={ui.fieldGrid} style={{ margin: 0 }}>
                  <Detail label="Status">
                    <Badge tone={leaseStatusTones[data.status]}>
                      {leaseStatusLabels[data.status]}
                    </Badge>
                  </Detail>
                  <Detail label="Monthly rent">{formatMoney(data.monthlyRent)}</Detail>
                  <Detail label="Security deposit">{formatMoney(data.securityDeposit)}</Detail>
                  <Detail label="Rent due">Day {data.rentDueDay} of each month</Detail>
                  <Detail label="Utilities">
                    {data.utilitiesIncluded ? "Included" : "Not included"}
                  </Detail>
                </dl>
                {data.notes && <p className={ui.pageDescription}>{data.notes}</p>}
              </Panel>

              <Panel title="Payments against this lease">
                <QueryBoundary query={payments} loadingRows={3}>
                  {(rows) => <PaymentsTable payments={rows} />}
                </QueryBoundary>
              </Panel>
            </div>

            <ConfirmDialog
              open={confirmOpen}
              title="Terminate this lease?"
              message="The lease is marked terminated and, if it was running, the unit becomes vacant again. Payment history is kept."
              confirmLabel="Terminate lease"
              error={terminateError}
              pending={terminate.isPending}
              onConfirm={onConfirmTerminate}
              onCancel={() => {
                setConfirmOpen(false);
                setTerminateError(undefined);
              }}
            />
          </>
        );
      }}
    </QueryBoundary>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={ui.label}>{label}</dt>
      <dd style={{ margin: 0, marginTop: "var(--space-1)" }}>{children}</dd>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <EmptyState title="No payments recorded" message="Record a payment when rent comes in." />
    );
  }
  const sorted = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Paid</th>
            <th>Due</th>
            <th className={ui.numeric}>Amount</th>
            <th>Method</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((payment) => (
            <tr key={payment.id}>
              <td className={ui.primaryCell}>{formatDate(payment.paymentDate)}</td>
              <td className={ui.mutedCell}>{formatDate(payment.dueDate)}</td>
              <td className={ui.numeric}>{formatAmount(payment.amount)}</td>
              <td className={ui.mutedCell}>{paymentMethodLabels[payment.method]}</td>
              <td className={ui.mutedCell}>{payment.reference || "—"}</td>
              <td>
                <Badge tone={paymentStatusTones[payment.status]}>
                  {paymentStatusLabels[payment.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
