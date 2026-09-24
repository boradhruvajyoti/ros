/**
 * Generate a ULID — time-sortable, URL-safe, 26 characters.
 * Use for primary IDs on transactional records (orders, payments, stock movements).
 */
export declare function generateULID(): string;
/**
 * Generate a UUID v4 — use for client-side idempotency keys,
 * session tokens, and non-time-sortable identifiers.
 */
export declare function generateUUID(): string;
/**
 * Generate a human-readable sequential order number.
 * Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20240923-0001)
 */
export declare function generateOrderNumber(date: Date, sequence: number): string;
/**
 * Generate a KOT number.
 * Format: KOT-XXXX (daily sequence per branch)
 */
export declare function generateKotNumber(sequence: number): string;
/**
 * Generate a purchase order number.
 * Format: PO-YYYYMMDD-XXXX
 */
export declare function generatePONumber(date: Date, sequence: number): string;
/**
 * Generate an invoice number.
 * Format: INV-YYYYMMDD-XXXX
 */
export declare function generateInvoiceNumber(date: Date, sequence: number): string;
/**
 * Generate a short alphanumeric code (for coupons, QR tokens, etc.)
 */
export declare function generateShortCode(length?: number): string;
//# sourceMappingURL=id.d.ts.map