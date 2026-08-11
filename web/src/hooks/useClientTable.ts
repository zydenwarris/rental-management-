import { useMemo, useState } from "react";

/**
 * Search, filter, and sort in memory.
 *
 * No list endpoint on the API reads query parameters, so this is where all of it
 * happens — and it is the single file to revisit if the API ever grows them.
 * Fine at portfolio scale; it would not survive ten thousand payments.
 */

export type SortDirection = "asc" | "desc";

export function useClientTable<T>({
  rows,
  searchFields,
  initialSort,
}: {
  rows: readonly T[];
  searchFields: (row: T) => string[];
  initialSort?: { key: keyof T & string; direction: SortDirection };
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(initialSort);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = rows.filter((row) => {
      if (term && !searchFields(row).some((value) => value.toLowerCase().includes(term))) {
        return false;
      }
      return Object.entries(filters).every(
        ([key, value]) => !value || String((row as Record<string, unknown>)[key]) === value,
      );
    });

    if (sort) {
      const { key, direction } = sort;
      // Sorting a copy: the incoming rows are query cache data and must not be
      // mutated in place.
      result = [...result].sort((a, b) => {
        const left = (a as Record<string, unknown>)[key];
        const right = (b as Record<string, unknown>)[key];
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left ?? "").localeCompare(String(right ?? ""));
        return direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, search, sort, filters, searchFields]);

  function toggleSort(key: keyof T & string) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  function setFilter(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return { visibleRows, search, setSearch, sort, toggleSort, filters, setFilter };
}
