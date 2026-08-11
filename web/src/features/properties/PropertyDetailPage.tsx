import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { UnitStatus, type Expense, type MaintenanceRequest, type Unit } from "@contract";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  ui,
  type BadgeTone,
} from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { ConfirmDialog } from "@app/components/feedback/ConfirmDialog.js";
import { ApiClientError } from "@app/lib/api/error.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import {
  expenseCategoryLabels,
  maintenancePriorityLabels,
  maintenanceStatusLabels,
  propertyTypeLabels,
  unitStatusLabels,
} from "@app/lib/labels.js";
import {
  useDeleteProperty,
  usePropertyExpensesQuery,
  usePropertyMaintenanceQuery,
  usePropertyQuery,
  usePropertyUnitsQuery,
} from "./api.js";

export const unitStatusTones: Record<UnitStatus, BadgeTone> = {
  [UnitStatus.Occupied]: "positive",
  [UnitStatus.Vacant]: "neutral",
  [UnitStatus.UnderMaintenance]: "warning",
};

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = usePropertyQuery(id);
  const units = usePropertyUnitsQuery(id);
  const expenses = usePropertyExpensesQuery(id);
  const maintenance = usePropertyMaintenanceQuery(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const remove = useDeleteProperty();

  async function onConfirmDelete() {
    setDeleteError(undefined);
    try {
      await remove.mutateAsync(id!);
      navigate("/properties");
    } catch (error) {
      // The API refuses to delete a property that still has units, expenses, or
      // maintenance. Show that reason in place rather than closing the dialog.
      setDeleteError(
        ApiClientError.is(error) ? error.message : "Could not delete this property.",
      );
    }
  }

  return (
    <QueryBoundary query={property}>
      {(data) => (
        <>
          <PageHeader
            eyebrow={propertyTypeLabels[data.type]}
            title={data.name}
            description={`${data.address}, ${data.city}`}
            actions={
              <>
                <Link to={`/properties/${data.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
                <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                  Delete
                </Button>
              </>
            }
          />

          {data.description && <p className={ui.pageDescription}>{data.description}</p>}

          <div style={{ display: "grid", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
            <Panel
              title="Units"
              actions={
                <Link to="/units/new">
                  <Button small>Add unit</Button>
                </Link>
              }
            >
              <QueryBoundary query={units} loadingRows={2}>
                {(rows) => <UnitsTable units={rows} />}
              </QueryBoundary>
            </Panel>

            <Panel title="Expenses">
              <QueryBoundary query={expenses} loadingRows={2}>
                {(rows) => <ExpensesTable expenses={rows} />}
              </QueryBoundary>
            </Panel>

            <Panel title="Maintenance">
              <QueryBoundary query={maintenance} loadingRows={2}>
                {(rows) => <MaintenanceTable requests={rows} />}
              </QueryBoundary>
            </Panel>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title={`Delete ${data.name}?`}
            message="This removes the property permanently. Units, expenses, and maintenance records must be removed first."
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

function UnitsTable({ units }: { units: Unit[] }) {
  if (units.length === 0) {
    return <EmptyState title="No units" message="Add a unit to start leasing this property." />;
  }
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Beds</th>
            <th>Baths</th>
            <th className={ui.numeric}>Market rent</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id}>
              <td className={ui.primaryCell}>{unit.label}</td>
              <td className={ui.mutedCell}>{unit.bedrooms}</td>
              <td className={ui.mutedCell}>{unit.bathrooms}</td>
              <td className={ui.numeric}>{formatAmount(unit.marketRent)}</td>
              <td>
                <Badge tone={unitStatusTones[unit.status]}>{unitStatusLabels[unit.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return <EmptyState title="No expenses" message="Nothing has been recorded against this property." />;
  }
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Vendor</th>
            <th className={ui.numeric}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className={ui.mutedCell}>{formatDate(expense.date)}</td>
              <td className={ui.mutedCell}>{expenseCategoryLabels[expense.category]}</td>
              <td className={ui.primaryCell}>{expense.description}</td>
              <td className={ui.mutedCell}>{expense.vendor || "—"}</td>
              <td className={ui.numeric}>{formatAmount(expense.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTable({ requests }: { requests: MaintenanceRequest[] }) {
  if (requests.length === 0) {
    return <EmptyState title="Nothing outstanding" message="No maintenance has been logged here." />;
  }
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Reported</th>
            <th>Issue</th>
            <th>Priority</th>
            <th>Status</th>
            <th className={ui.numeric}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td className={ui.mutedCell}>{formatDate(request.reportedDate)}</td>
              <td className={ui.primaryCell}>
                <Link to={`/maintenance/${request.id}`}>{request.title}</Link>
              </td>
              <td className={ui.mutedCell}>{maintenancePriorityLabels[request.priority]}</td>
              <td className={ui.mutedCell}>{maintenanceStatusLabels[request.status]}</td>
              <td className={ui.numeric}>
                {request.actualCost !== null ? formatAmount(request.actualCost) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
