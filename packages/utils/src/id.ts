// =============================================================================
// ID utilities — ULID + UUID generation
// =============================================================================

import { ulid } from 'ulid';
import { randomUUID } from 'crypto';

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
 */
export function generateUUID(): string {
  return randomUUID();
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
  const bytes = randomUUID().replace(/-/g, '');
  for (let i = 0; i < length; i++) {
    result += chars[parseInt(bytes[i * 2] + bytes[i * 2 + 1], 16) % chars.length];
  }
  return result;
}
