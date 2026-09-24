// =============================================================================
// ID utilities — ULID + UUID generation (Universal / Browser & Node Safe)
// =============================================================================

import { ulid } from 'ulid';

/**
 * Generate a ULID — time-sortable, URL-safe, 26 characters.
 * Use for primary IDs on transactional records (orders, payments, stock movements).
 */
export function generateULID(): string {
  return ulid();
}

/**
 * Generate a UUID v4 — use for client-side idempotency keys,
 * session tokens, and non-time-sortable identifiers.
 * Fully compatible with Node.js and Browser (works on HTTP & HTTPS).
 */
export function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // Fallback if in insecure HTTP context in older browsers
    }
  }

  // RFC4122 v4 UUID fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a human-readable sequential order number.
 * Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20240923-0001)
 */
export function generateOrderNumber(date: Date, sequence: number): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequence).padStart(4, '0');
  return `ORD-${dateStr}-${seq}`;
}

/**
 * Generate a KOT number.
 * Format: KOT-XXXX (daily sequence per branch)
 */
export function generateKotNumber(sequence: number): string {
  return `KOT-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate a purchase order number.
 * Format: PO-YYYYMMDD-XXXX
 */
export function generatePONumber(date: Date, sequence: number): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequence).padStart(4, '0');
  return `PO-${dateStr}-${seq}`;
}

/**
 * Generate an invoice number.
 * Format: INV-YYYYMMDD-XXXX
 */
export function generateInvoiceNumber(date: Date, sequence: number): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequence).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

/**
 * Generate a short alphanumeric code (for coupons, QR tokens, etc.)
 */
export function generateShortCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
