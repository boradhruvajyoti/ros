"use strict";
// =============================================================================
// ID utilities — ULID + UUID generation
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateULID = generateULID;
exports.generateUUID = generateUUID;
exports.generateOrderNumber = generateOrderNumber;
exports.generateKotNumber = generateKotNumber;
exports.generatePONumber = generatePONumber;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.generateShortCode = generateShortCode;
const ulid_1 = require("ulid");
const crypto_1 = require("crypto");
/**
 * Generate a ULID — time-sortable, URL-safe, 26 characters.
 * Use for primary IDs on transactional records (orders, payments, stock movements).
 */
function generateULID() {
    return (0, ulid_1.ulid)();
}
/**
 * Generate a UUID v4 — use for client-side idempotency keys,
 * session tokens, and non-time-sortable identifiers.
 */
function generateUUID() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Generate a human-readable sequential order number.
 * Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20240923-0001)
 */
function generateOrderNumber(date, sequence) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(sequence).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
}
/**
 * Generate a KOT number.
 * Format: KOT-XXXX (daily sequence per branch)
 */
function generateKotNumber(sequence) {
    return `KOT-${String(sequence).padStart(4, '0')}`;
}
/**
 * Generate a purchase order number.
 * Format: PO-YYYYMMDD-XXXX
 */
function generatePONumber(date, sequence) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(sequence).padStart(4, '0');
    return `PO-${dateStr}-${seq}`;
}
/**
 * Generate an invoice number.
 * Format: INV-YYYYMMDD-XXXX
 */
function generateInvoiceNumber(date, sequence) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(sequence).padStart(4, '0');
    return `INV-${dateStr}-${seq}`;
}
/**
 * Generate a short alphanumeric code (for coupons, QR tokens, etc.)
 */
function generateShortCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const bytes = (0, crypto_1.randomUUID)().replace(/-/g, '');
    for (let i = 0; i < length; i++) {
        result += chars[parseInt(bytes[i * 2] + bytes[i * 2 + 1], 16) % chars.length];
    }
    return result;
}
//# sourceMappingURL=id.js.map