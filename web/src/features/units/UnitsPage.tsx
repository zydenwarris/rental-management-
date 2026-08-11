import { Link } from "react-router";
import { UnitStatus, type Property, type Unit } from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { formatAmount } from "@app/lib/money.js";
import { unitStatusLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { unitStatusTones } from "@app/features/properties/PropertyDetailPage.js";
import { useUnitsQuery } from "./api.js";

export function UnitsPage() {
  const units = useUnitsQuery();
  const properties = usePropertiesQuery();

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Units"
        description="Every rentable space across your properties, and whether it is earning."
        actions={
          <Link to="/units/new">
            <Button variant="primary">
              <PlusIcon />
              Add unit
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={units}>
          {(rows) => <UnitsTable units={rows} properties={properties.data ?? []} />}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function UnitsTable({ units, properties }: { units: Unit[]; properties: Property[] }) {
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: units,
    searchFields: (unit) => [unit.label, propertyName(unit.propertyId)],
  });

  if (units.length === 0) {
    return (
      <EmptyState
        title="No units yet"
        message="Add a unit to a property before creating a lease."
        action={
          <Link to="/units/new">
            <Button variant="primary">Add unit</Button>
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
          placeholder="Search unit or property"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search units"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["status"] ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {toOptions(unitStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {units.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No unit matches that search or filter." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Property</th>
                <th>Beds</th>
                <th>Baths</th>
                <th className={ui.numeric}>Market rent</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((unit) => (
                <tr key={unit.id}>
                  <td className={ui.primaryCell}>{unit.label}</td>
                  <td className={ui.mutedCell}>
                    <Link to={`/properties/${unit.propertyId}`}>{propertyName(unit.propertyId)}</Link>
                  </td>
                  <td className={ui.mutedCell}>{unit.bedrooms}</td>
                  <td className={ui.mutedCell}>{unit.bathrooms}</td>
                  <td className={ui.numeric}>{formatAmount(unit.marketRent)}</td>
                  <td>
                    <Badge tone={unitStatusTones[unit.status as UnitStatus]}>
                      {unitStatusLabels[unit.status as UnitStatus]}
                    </Badge>
                  </td>
                  <td>
                    <Link to={`/units/${unit.id}/edit`}>
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
