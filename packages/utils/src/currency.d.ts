import Decimal from 'decimal.js';
/** Parse any monetary input to Decimal */
export declare function toDecimal(value: number | string | Decimal): Decimal;
/** Format to 2 decimal places as number (for DB storage and API responses) */
export declare function toAmount(value: number | string | Decimal): number;
/** Add two monetary amounts */
export declare function addAmounts(...values: (number | string | Decimal)[]): number;
/** Subtract monetary amounts */
export declare function subtractAmounts(a: number | string, b: number | string): number;
/** Multiply amount by quantity */
export declare function multiplyAmount(amount: number | string, qty: number | string): number;
/** Calculate percentage of amount */
export declare function percentageOf(amount: number | string, percentage: number | string): number;
/** Format amount for display (INR) */
export declare function formatCurrency(amount: number, currency?: string, locale?: string): string;
/** Round to 2 dp */
export declare function round2(value: number): number;
//# sourceMappingURL=currency.d.ts.map