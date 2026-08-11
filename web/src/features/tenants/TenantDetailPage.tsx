import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Lease, Payment } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { ConfirmDialog } from "@app/components/feedback/ConfirmDialog.js";
import { ApiClientError } from "@app/lib/api/error.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { leaseStatusLabels, paymentMethodLabels, paymentStatusLabels } from "@app/lib/labels.js";
import { leaseStatusTones, paymentStatusTones } from "@app/features/leases/tones.js";
import {
  useDeleteTenant,
  useTenantLeasesQuery,
  useTenantPaymentsQuery,
  useTenantQuery,
} from "./api.js";

export function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenant = useTenantQuery(id);
  const leases = useTenantLeasesQuery(id);
  const payments = useTenantPaymentsQuery(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const remove = useDeleteTenant();

  async function onConfirmDelete() {
    setDeleteError(undefined);
    try {
      await remove.mutateAsync(id!);
      navigate("/tenants");
    } catch (error) {
      setDeleteError(ApiClientError.is(error) ? error.message : "Could not delete this tenant.");
    }
  }

  return (
    <QueryBoundary query={tenant}>
      {(data) => (
        <>
          <PageHeader
            eyebrow="Tenant"
            title={data.fullName}
            description={[data.phone, data.email].filter(Boolean).join(" · ")}
            actions={
              <>
                <Link to={`/tenants/${data.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
                <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                  Delete
                </Button>
              </>
            }
          />

          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            {(data.emergencyContactName || data.notes) && (
              <Panel title="Details" padded>
                <dl style={{ display: "grid", gap: "var(--space-3)", margin: 0 }}>
                  {data.emergencyContactName && (
                    <div>
                      <dt className={ui.label}>Emergency contact</dt>
                      <dd style={{ margin: 0 }}>
                        {data.emergencyContactName}
                        {data.emergencyContactPhone && ` · ${data.emergencyContactPhone}`}
                      </dd>
                    </div>
                  )}
                  {data.notes && (
                    <div>
                      <dt className={ui.label}>Notes</dt>
                      <dd style={{ margin: 0 }}>{data.notes}</dd>
                    </div>
                  )}
                </dl>
              </Panel>
            )}

            <Panel title="Leases">
              <QueryBoundary query={leases} loadingRows={2}>
                {(rows) => <LeasesTable leases={rows} />}
              </QueryBoundary>
            </Panel>

            <Panel title="Payment history">
              <QueryBoundary query={payments} loadingRows={3}>
                {(rows) => <PaymentsTable payments={rows} />}
              </QueryBoundary>
            </Panel>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title={`Delete ${data.fullName}?`}
            message="Tenants with lease history cannot be deleted — the record is kept so past tenancies stay intact."
            error={deleteError}
            pending={remove.isPending}
            onConfirm={onConfirmDelete}
            onCancel={() => {
              setConfirmOpen(false);
              setDeleteError(undefined);
            }}
          />
        </>
      )}
    </QueryBoundary>
  );
}

function LeasesTable({ leases }: { leases: Lease[] }) {
  if (leases.length === 0) {
    return <EmptyState title="No leases" message="This tenant has never been placed in a unit." />;
  }
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Term</th>
            <th className={ui.numeric}>Monthly rent</th>
            <th>Rent due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => (
            <tr key={lease.id}>
              <td className={ui.primaryCell}>
                <Link to={`/leases/${lease.id}`}>
                  {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                </Link>
              </td>
              <td className={ui.numeric}>{formatAmount(lease.monthlyRent)}</td>
              <td className={ui.mutedCell}>Day {lease.rentDueDay}</td>
              <td>
                <Badge tone={leaseStatusTones[lease.status]}>{leaseStatusLabels[lease.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <EmptyState title="No payments" message="Nothing has been recorded for this tenant yet." />;
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
