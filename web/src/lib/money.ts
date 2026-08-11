import type { Cents } from "@contract";

/**
 * The API speaks integer cents; people read dollars. Conversion happens only at
 * these two edges — display, and the form boundary — so no intermediate value is
 * ever a float that could drift.
 */

const CENTS_PER_DOLLAR = 100;
const CURRENCY = "TTD";

// currencyDisplay "code" gives "TTD 3,500.00" rather than a bare "$", which
// would be ambiguous next to USD in a country that quotes both.
const currencyFormatter = new Intl.NumberFormat("en-TT", {
  style: "currency",
  currency: CURRENCY,
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-TT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "TTD 3,500.00" — for headline figures where the currency matters. */
export function formatMoney(cents: Cents): string {
  return currencyFormatter.format(cents / CENTS_PER_DOLLAR);
}

/** "3,500.00" — for columns where a repeated currency code is just noise. */
export function formatAmount(cents: Cents): string {
  return compactFormatter.format(cents / CENTS_PER_DOLLAR);
}

export function centsToDollars(cents: Cents): number {
  return cents / CENTS_PER_DOLLAR;
}

/** Rounds, because a form can produce 35.005 and the API demands whole cents. */
export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}
