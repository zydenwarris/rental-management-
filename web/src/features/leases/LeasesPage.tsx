import { Link, useNavigate } from "react-router";
import type { Lease, Tenant, Unit } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { leaseStatusLabels, toOptions } from "@app/lib/labels.js";
import { useTenantsQuery } from "@app/features/tenants/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { leaseStatusTones } from "./tones.js";
import { useLeasesQuery } from "./api.js";

export function LeasesPage() {
  const leases = useLeasesQuery();
  const tenants = useTenantsQuery();
  const units = useUnitsQuery();

  return (
    <>
      <PageHeader
        eyebrow="Occupancy"
        title="Leases"
        description="Leases join a tenant to a unit for a term. A unit can only hold one running lease at a time."
        actions={
          <Link to="/leases/new">
            <Button variant="primary">
              <PlusIcon />
              Create lease
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={leases}>
          {(rows) => (
            <LeasesTable leases={rows} tenants={tenants.data ?? []} units={units.data ?? []} />
          )}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function LeasesTable({
  leases,
  tenants,
  units,
}: {
  leases: Lease[];
  tenants: Tenant[];
  units: Unit[];
}) {
  const navigate = useNavigate();
  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.fullName ?? "—";
  const unitLabel = (id: string) => units.find((u) => u.id === id)?.label ?? "—";

  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: leases,
    searchFields: (lease) => [tenantName(lease.tenantId), unitLabel(lease.unitId)],
  });

  if (leases.length === 0) {
    return (
      <EmptyState
        title="No leases yet"
        message="Create a lease to place a tenant in a unit and start tracking rent."
        action={
          <Link to="/leases/new">
            <Button variant="primary">Create lease</Button>
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
          placeholder="Search tenant or unit"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search leases"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["status"] ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {toOptions(leaseStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {leases.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No lease matches that search or filter." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Term</th>
                <th className={ui.numeric}>Monthly rent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((lease) => (
                <tr
                  key={lease.id}
                  className={ui.rowLink}
                  onClick={() => navigate(`/leases/${lease.id}`)}
                >
                  <td className={ui.primaryCell}>
                    <Link to={`/leases/${lease.id}`}>{tenantName(lease.tenantId)}</Link>
                  </td>
                  <td className={ui.mutedCell}>{unitLabel(lease.unitId)}</td>
                  <td className={ui.mutedCell}>
                    {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                  </td>
                  <td className={ui.numeric}>{formatAmount(lease.monthlyRent)}</td>
                  <td>
                    <Badge tone={leaseStatusTones[lease.status]}>
                      {leaseStatusLabels[lease.status]}
                    </Badge>
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
