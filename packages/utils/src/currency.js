"use strict";
// =============================================================================
// Currency utilities — Decimal-safe monetary math using decimal.js
// NEVER use JavaScript floats for money
// =============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDecimal = toDecimal;
exports.toAmount = toAmount;
exports.addAmounts = addAmounts;
exports.subtractAmounts = subtractAmounts;
exports.multiplyAmount = multiplyAmount;
exports.percentageOf = percentageOf;
exports.formatCurrency = formatCurrency;
exports.round2 = round2;
const decimal_js_1 = __importDefault(require("decimal.js"));
decimal_js_1.default.set({ precision: 20, rounding: decimal_js_1.default.ROUND_HALF_UP });
/** Parse any monetary input to Decimal */
function toDecimal(value) {
    return new decimal_js_1.default(value);
}
/** Format to 2 decimal places as number (for DB storage and API responses) */
function toAmount(value) {
    return new decimal_js_1.default(value).toDecimalPlaces(2).toNumber();
}
/** Add two monetary amounts */
function addAmounts(...values) {
    return values
        .reduce((acc, v) => acc.plus(new decimal_js_1.default(v)), new decimal_js_1.default(0))
        .toDecimalPlaces(2)
        .toNumber();
}
/** Subtract monetary amounts */
function subtractAmounts(a, b) {
    return new decimal_js_1.default(a).minus(new decimal_js_1.default(b)).toDecimalPlaces(2).toNumber();
}
/** Multiply amount by quantity */
function multiplyAmount(amount, qty) {
    return new decimal_js_1.default(amount).times(new decimal_js_1.default(qty)).toDecimalPlaces(2).toNumber();
}
/** Calculate percentage of amount */
function percentageOf(amount, percentage) {
    return new decimal_js_1.default(amount)
        .times(new decimal_js_1.default(percentage))
        .dividedBy(100)
        .toDecimalPlaces(2)
        .toNumber();
}
/** Format amount for display (INR) */
function formatCurrency(amount, currency = 'INR', locale = 'en-IN') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}
/** Round to 2 dp */
function round2(value) {
    return new decimal_js_1.default(value).toDecimalPlaces(2).toNumber();
}
//# sourceMappingURL=currency.js.map