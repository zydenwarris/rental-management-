import type { IsoDate } from "@contract";

/**
 * The API's calendar dates are "YYYY-MM-DD" strings, which is exactly what a
 * native <input type="date"> produces and consumes. That match is why the
 * frontend needs no date library at all.
 *
 * Parsing appends T00:00:00 rather than passing the bare string to Date, because
 * "2026-03-01" alone is parsed as UTC midnight and then displayed in local time —
 * which renders as 28 February for anyone west of Greenwich.
 */

function toLocalDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00`);
}

const shortFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
const monthYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** "1 Mar 2026" */
export function formatDate(date: IsoDate): string {
  return shortFormatter.format(toLocalDate(date));
}

/** "Mar" — column headers in the rent book. */
export function formatMonthAbbrev(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00`));
}

/** "August 2026" — from a "YYYY-MM" string. */
export function formatMonthLong(month: string): string {
  return monthYearFormatter.format(new Date(`${month}-01T00:00:00`));
}

export function todayIso(): IsoDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Current month as "YYYY-MM". */
export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

/** Walks back from a "YYYY-MM" month, oldest first. Used by the rent book columns. */
export function recentMonths(count: number, from: string = currentMonth()): string[] {
  const [year, month] = from.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}
