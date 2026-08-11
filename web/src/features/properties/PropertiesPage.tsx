import { Link, useNavigate } from "react-router";
import { PropertyType, type Property } from "@contract";
import { PageHeader, Panel, Button, EmptyState, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { propertyTypeLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "./api.js";

const searchFields = (property: Property) => [property.name, property.address, property.city];

export function PropertiesPage() {
  const query = usePropertiesQuery();

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Every building you own. Units, expenses, and maintenance hang off each one."
        actions={
          <Link to="/properties/new">
            <Button variant="primary">
              <PlusIcon />
              Add property
            </Button>
          </Link>
        }
      />

      <Panel>
        <QueryBoundary query={query}>
          {(properties) => <PropertiesTable properties={properties} />}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function PropertiesTable({ properties }: { properties: Property[] }) {
  const navigate = useNavigate();
  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: properties,
    searchFields,
  });

  if (properties.length === 0) {
    return (
      <EmptyState
        title="No properties yet"
        message="Add your first property to start tracking units, tenants, and rent."
        action={
          <Link to="/properties/new">
            <Button variant="primary">Add property</Button>
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
          placeholder="Search name, address, or city"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search properties"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["type"] ?? ""}
          onChange={(event) => setFilter("type", event.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {toOptions(propertyTypeLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {properties.length}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No property matches that search or filter." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>City</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((property) => (
                <tr
                  key={property.id}
                  className={ui.rowLink}
                  onClick={() => navigate(`/properties/${property.id}`)}
                >
                  <td className={ui.primaryCell}>
                    <Link to={`/properties/${property.id}`}>{property.name}</Link>
                  </td>
                  <td className={ui.mutedCell}>
                    {propertyTypeLabels[property.type as PropertyType]}
                  </td>
                  <td className={ui.mutedCell}>{property.city}</td>
                  <td className={ui.mutedCell}>{property.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
