import { Link } from "react-router";
import type { Expense, Property, Unit } from "@contract";
import { Button, EmptyState, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { PlusIcon } from "@app/components/layout/icons.js";
import { useClientTable } from "@app/hooks/useClientTable.js";
import { formatAmount } from "@app/lib/money.js";
import { formatDate } from "@app/lib/dates.js";
import { expenseCategoryLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { useExpensesQuery } from "./api.js";

export function ExpensesPage() {
  const expenses = useExpensesQuery();
  const properties = usePropertiesQuery();
  const units = useUnitsQuery();

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Expenses"
        description="What the portfolio costs to run. Expenses sit against a property, and optionally one of its units."
        actions={
          <Link to="/expenses/new">
            <Button variant="primary">
              <PlusIcon />
              Add expense
            </Button>
          </Link>
        }
      />
      <Panel>
        <QueryBoundary query={expenses}>
          {(rows) => (
            <ExpensesTable
              expenses={rows}
              properties={properties.data ?? []}
              units={units.data ?? []}
            />
          )}
        </QueryBoundary>
      </Panel>
    </>
  );
}

function ExpensesTable({
  expenses,
  properties,
  units,
}: {
  expenses: Expense[];
  properties: Property[];
  units: Unit[];
}) {
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";
  const unitLabel = (id: string | null) =>
    id === null ? "Whole property" : (units.find((u) => u.id === id)?.label ?? "—");

  const { visibleRows, search, setSearch, filters, setFilter } = useClientTable({
    rows: expenses,
    searchFields: (expense) => [expense.description, expense.vendor, propertyName(expense.propertyId)],
    initialSort: { key: "date", direction: "desc" },
  });

  const total = visibleRows.reduce((sum, expense) => sum + expense.amount, 0);

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses recorded"
        message="Track repairs, utilities, insurance, and tax to see real net income."
        action={
          <Link to="/expenses/new">
            <Button variant="primary">Add expense</Button>
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
          placeholder="Search description, vendor, or property"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search expenses"
        />
        <select
          className={cx(ui.select, ui.filterSelect)}
          value={filters["category"] ?? ""}
          onChange={(event) => setFilter("category", event.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {toOptions(expenseCategoryLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={ui.resultCount}>
          {visibleRows.length} of {expenses.length} · TTD {formatAmount(total)}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState title="No matches" message="No expense matches those filters." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Property</th>
                <th>Unit</th>
                <th>Category</th>
                <th>Vendor</th>
                <th className={ui.numeric}>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((expense) => (
                <tr key={expense.id}>
                  <td className={ui.mutedCell}>{formatDate(expense.date)}</td>
                  <td className={ui.primaryCell}>{expense.description}</td>
                  <td className={ui.mutedCell}>
                    <Link to={`/properties/${expense.propertyId}`}>
                      {propertyName(expense.propertyId)}
                    </Link>
                  </td>
                  <td className={ui.mutedCell}>{unitLabel(expense.unitId)}</td>
                  <td className={ui.mutedCell}>{expenseCategoryLabels[expense.category]}</td>
                  <td className={ui.mutedCell}>{expense.vendor || "—"}</td>
                  <td className={ui.numeric}>{formatAmount(expense.amount)}</td>
                  <td>
                    <Link to={`/expenses/${expense.id}/edit`}>
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
