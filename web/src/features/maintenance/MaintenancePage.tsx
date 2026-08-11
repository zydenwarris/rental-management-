import { Link, useNavigate } from "react-router";
import { MaintenanceStatus, type MaintenanceRequest, type Property, type Unit } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { maintenancePriorityLabels, maintenanceStatusLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { maintenancePriorityTones, maintenanceStatusTones } from "@app/features/leases/tones.js";
import { useMaintenanceListQuery } from "./api.js";

export function MaintenancePage() {
  const requests = useMaintenanceListQuery();
  const properties = usePropertiesQuery();
  const units = useUnitsQuery();

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Maintenance"
        description="Issues logged against a property or unit, from reported through to done."
        actions={
          <Link to="/maintenance/new">
            <Button variant="primary">
              <PlusIcon />
              Log issue
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={requests}>
          {(rows) => (
            <MaintenanceTable
              requests={rows}
              properties={properties.data ?? []}
              units={units.data ?? []}
            />
          )}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function MaintenanceTable({
  requests,
  properties,
  units,
}: {
  requests: MaintenanceRequest[];
  properties: Property[];
  units: Unit[];
}) {
  const navigate = useNavigate();
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";
  const unitLabel = (id: string | null) =>
    id === null ? "Common area" : (units.find((u) => u.id === id)?.label ?? "—");

  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: requests,
    searchFields: (request) => [request.title, request.contractor, propertyName(request.propertyId)],
    initialSort: { key: "reportedDate", direction: "desc" },
  });

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Nothing outstanding"
        message="Log an issue to track repairs, contractors, and what they cost."
        action={
          <Link to="/maintenance/new">
            <Button variant="primary">Log issue</Button>
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
          placeholder="Search issue, contractor, or property"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search maintenance"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["status"] ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {toOptions(maintenanceStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["priority"] ?? ""}
          onChange={(event) => setFilter("priority", event.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {toOptions(maintenancePriorityLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {requests.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No request matches those filters." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Reported</th>
                <th>Issue</th>
                <th>Where</th>
                <th>Priority</th>
                <th>Status</th>
                <th className={ui.numeric}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((request) => (
                <tr
                  key={request.id}
                  className={ui.rowLink}
                  onClick={() => navigate(`/maintenance/${request.id}`)}
                >
                  <td className={ui.mutedCell}>{formatDate(request.reportedDate)}</td>
                  <td className={ui.primaryCell}>
                    <Link to={`/maintenance/${request.id}`}>{request.title}</Link>
                  </td>
                  <td className={ui.mutedCell}>
                    {propertyName(request.propertyId)} · {unitLabel(request.unitId)}
                  </td>
                  <td>
                    <Badge tone={maintenancePriorityTones[request.priority]}>
                      {maintenancePriorityLabels[request.priority]}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={maintenanceStatusTones[request.status as MaintenanceStatus]}>
                      {maintenanceStatusLabels[request.status as MaintenanceStatus]}
                    </Badge>
                  </td>
                  <td className={ui.numeric}>
                    {request.actualCost !== null
                      ? formatAmount(request.actualCost)
                      : request.estimatedCost !== null
                        ? `~${formatAmount(request.estimatedCost)}`
                        : "—"}
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
