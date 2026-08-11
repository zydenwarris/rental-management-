import { areIntervalsOverlapping, isAfter, isBefore, parseISO, differenceInCalendarDays } from "date-fns";

/**
 * Calendar dates (lease start/end, payment due) are stored as "YYYY-MM-DD" strings
 * rather than Date objects or timestamps.
 *
 * A lease that starts on 1 March starts on 1 March everywhere. Storing that as an
 * instant means it silently becomes 28 February for anyone east or west of the server,
 * which is the classic rental-software bug. A plain date string has no timezone to get
 * wrong. All comparison goes through date-fns rather than hand-rolled arithmetic.
 */
export type IsoDate = string;

/** A full instant, for audit fields like createdAt. */
export type IsoDateTime = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime());
}

export function toDate(value: IsoDate): Date {
  return parseISO(value);
}

export function today(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimestamp(): IsoDateTime {
  return new Date().toISOString();
}

export function isDateBefore(a: IsoDate, b: IsoDate): boolean {
  return isBefore(toDate(a), toDate(b));
}

export function isDateAfter(a: IsoDate, b: IsoDate): boolean {
  return isAfter(toDate(a), toDate(b));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return differenceInCalendarDays(toDate(to), toDate(from));
}

/**
 * Whether two closed date ranges share at least one day.
 *
 * Both ranges are inclusive of their end date: a lease ending 31 May and one starting
 * 31 May DO overlap, because the unit is occupied on that day by both.
 */
export function datesOverlap(
  firstStart: IsoDate,
  firstEnd: IsoDate,
  secondStart: IsoDate,
  secondEnd: IsoDate,
): boolean {
  return areIntervalsOverlapping(
    { start: toDate(firstStart), end: toDate(firstEnd) },
    { start: toDate(secondStart), end: toDate(secondEnd) },
    { inclusive: true },
  );
}
