import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ALLOWED_STATUS_TRANSITIONS, MaintenanceStatus } from "@contract";
import { Badge, Button, PageHeader, Panel, Select, ui } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { ConfirmDialog } from "@app/components/feedback/ConfirmDialog.js";
import { ApiClientError } from "@app/lib/api/error.js";
import { formatMoney } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { maintenancePriorityLabels, maintenanceStatusLabels } from "@app/lib/labels.js";
import { usePropertyQuery } from "@app/features/properties/api.js";
import { useUnitQuery } from "@app/features/units/api.js";
import { maintenancePriorityTones, maintenanceStatusTones } from "@app/features/leases/tones.js";
import { useDeleteMaintenance, useMaintenanceQuery, useUpdateMaintenance } from "./api.js";

export function MaintenanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const request = useMaintenanceQuery(id);
  const property = usePropertyQuery(request.data?.propertyId);
  const unit = useUnitQuery(request.data?.unitId ?? undefined);
  const update = useUpdateMaintenance(id ?? "");
  const remove = useDeleteMaintenance();

  const [statusError, setStatusError] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  async function onChangeStatus(next: MaintenanceStatus) {
    setStatusError(undefined);
    try {
      await update.mutateAsync({ status: next });
    } catch (error) {
      setStatusError(ApiClientError.is(error) ? error.message : "Could not update the status.");
    }
  }

  async function onConfirmDelete() {
    setDeleteError(undefined);
    try {
      await remove.mutateAsync(id!);
      navigate("/maintenance");
    } catch (error) {
      setDeleteError(ApiClientError.is(error) ? error.message : "Could not delete this request.");
    }
  }

  return (
    <QueryBoundary query={request}>
      {(data) => {
        // The very same transition table the server enforces, imported from the
        // shared contract — so the control can never offer a move the API refuses.
        const nextStatuses = ALLOWED_STATUS_TRANSITIONS[data.status];
        const isTerminal = nextStatuses.length === 0;

        return (
          <>
            <PageHeader
              eyebrow="Maintenance"
              title={data.title}
              description={`${property.data?.name ?? "Property"} · ${unit.data?.label ?? "Common area"} · reported ${formatDate(data.reportedDate)}`}
              actions={
                <>
                  <Link to={`/maintenance/${data.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                    Delete
                  </Button>
                </>
              }
            />

            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              <Panel title="Status" padded>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                  <Badge tone={maintenanceStatusTones[data.status]}>
                    {maintenanceStatusLabels[data.status]}
                  </Badge>
                  <Badge tone={maintenancePriorityTones[data.priority]}>
                    {maintenancePriorityLabels[data.priority]} priority
                  </Badge>

                  {isTerminal ? (
                    <span className={ui.hint}>
                      {maintenanceStatusLabels[data.status]} is final — this request can't move on.
                    </span>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span className={ui.label}>Move to</span>
                      <Select
                        value=""
                        disabled={update.isPending}
                        onChange={(event) => {
                          if (event.target.value) onChangeStatus(event.target.value as MaintenanceStatus);
                        }}
                        options={[
                          { value: "", label: "Choose…" },
                          ...nextStatuses.map((status) => ({
                            value: status,
                            label: maintenanceStatusLabels[status],
                          })),
                        ]}
                      />
                    </label>
                  )}
                </div>
                {statusError && (
                  <p className={ui.fieldError} role="alert" style={{ marginTop: "var(--space-3)" }}>
                    {statusError}
                  </p>
                )}
              </Panel>

              <Panel title="Details" padded>
                <p style={{ marginBottom: "var(--space-4)" }}>{data.description}</p>
                <dl className={ui.fieldGrid} style={{ margin: 0 }}>
                  <Detail label="Contractor">{data.contractor || "Not assigned"}</Detail>
                  <Detail label="Estimated cost">
                    {data.estimatedCost !== null ? formatMoney(data.estimatedCost) : "—"}
                  </Detail>
                  <Detail label="Actual cost">
                    {data.actualCost !== null ? formatMoney(data.actualCost) : "—"}
                  </Detail>
                  <Detail label="Scheduled">
                    {data.scheduledDate ? formatDate(data.scheduledDate) : "Not scheduled"}
                  </Detail>
                  <Detail label="Completed">
                    {data.completedDate ? formatDate(data.completedDate) : "—"}
                  </Detail>
                </dl>
                {data.notes && <p className={ui.pageDescription}>{data.notes}</p>}
              </Panel>
            </div>

            <ConfirmDialog
              open={confirmOpen}
              title="Delete this request?"
              message="The maintenance record is removed permanently."
              error={deleteError}
              pending={remove.isPending}
              onConfirm={onConfirmDelete}
              onCancel={() => {
                setConfirmOpen(false);
                setDeleteError(undefined);
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
