// =============================================================================
// Currency utilities — Decimal-safe monetary math using decimal.js
// NEVER use JavaScript floats for money
// =============================================================================

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** Parse any monetary input to Decimal */
export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

/** Format to 2 decimal places as number (for DB storage and API responses) */
export function toAmount(value: number | string | Decimal): number {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}

/** Add two monetary amounts */
export function addAmounts(...values: (number | string | Decimal)[]): number {
  return values
    .reduce<Decimal>((acc, v) => acc.plus(new Decimal(v)), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}

/** Subtract monetary amounts */
export function subtractAmounts(a: number | string, b: number | string): number {
  return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(2).toNumber();
}

/** Multiply amount by quantity */
export function multiplyAmount(amount: number | string, qty: number | string): number {
  return new Decimal(amount).times(new Decimal(qty)).toDecimalPlaces(2).toNumber();
}

/** Calculate percentage of amount */
export function percentageOf(amount: number | string, percentage: number | string): number {
  return new Decimal(amount)
    .times(new Decimal(percentage))
    .dividedBy(100)
    .toDecimalPlaces(2)
    .toNumber();
}

/** Format amount for display (INR) */
export function formatCurrency(amount: number, currency = 'INR', locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Round to 2 dp */
export function round2(value: number): number {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}
