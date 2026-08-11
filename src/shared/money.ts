import { DEFAULT_CURRENCY } from "../config/constants.js";

/**
 * Money is always an integer number of cents.
 *
 * Floating-point dollars accumulate rounding error the moment you sum them, and the
 * dashboard sums hundreds of them. Storing cents keeps every total exact; formatting
 * for display is the frontend's job.
 *
 * TTD 3,500.00 is represented as 350000.
 */
export type Cents = number;

export const CENTS_PER_DOLLAR = 100;

export function isValidCents(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

export function centsToDollars(cents: Cents): number {
  return cents / CENTS_PER_DOLLAR;
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0);
}

/** Human-readable form, used in logs and error messages rather than API payloads. */
export function formatCents(cents: Cents, currency: string = DEFAULT_CURRENCY): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / CENTS_PER_DOLLAR);
  const remainder = absolute % CENTS_PER_DOLLAR;
  return `${sign}${currency} ${dollars.toLocaleString("en-US")}.${String(remainder).padStart(2, "0")}`;
}
