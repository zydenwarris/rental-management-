import { Link, useNavigate } from "react-router";
import { LeaseStatus, type Lease, type Tenant } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { useLeasesQuery } from "@app/features/leases/api.js";
import { useTenantsQuery } from "./api.js";

export function TenantsPage() {
  const tenants = useTenantsQuery();
  const leases = useLeasesQuery();

  return (
    <>
      <PageHeader
        eyebrow="Occupancy"
        title="Tenants"
        description="People renting from you now, and those who have before. Tenants connect to units through leases."
        actions={
          <Link to="/tenants/new">
            <Button variant="primary">
              <PlusIcon />
              Add tenant
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={tenants}>
          {(rows) => <TenantsTable tenants={rows} leases={leases.data ?? []} />}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function TenantsTable({ tenants, leases }: { tenants: Tenant[]; leases: Lease[] }) {
  const navigate = useNavigate();
  const { visibleRows, search, setSearch } = useClientTable({
    rows: tenants,
    searchFields: (tenant) => [tenant.fullName, tenant.phone, tenant.email],
  });

  const activeLeaseFor = (tenantId: string) =>
    leases.find((lease) => lease.tenantId === tenantId && lease.status === LeaseStatus.Active);

  if (tenants.length === 0) {
    return (
      <EmptyState
        title="No tenants yet"
        message="Add a tenant, then create a lease to place them in a unit."
        action={
          <Link to="/tenants/new">
            <Button variant="primary">Add tenant</Button>
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
          placeholder="Search name, phone, or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search tenants"
        />
        <span className={ui.resultCount}>
          {visibleRows.length} of {tenants.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No tenant matches that search." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Tenancy</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((tenant) => {
                const lease = activeLeaseFor(tenant.id);
                return (
                  <tr
                    key={tenant.id}
                    className={ui.rowLink}
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <td className={ui.primaryCell}>
                      <Link to={`/tenants/${tenant.id}`}>{tenant.fullName}</Link>
                    </td>
                    <td className={ui.mutedCell}>{tenant.phone}</td>
                    <td className={ui.mutedCell}>{tenant.email || "—"}</td>
                    <td>
                      {lease ? (
                        <Badge tone="positive">Active lease</Badge>
                      ) : (
                        <Badge tone="neutral">Past tenant</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
