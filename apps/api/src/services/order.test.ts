import test from 'node:test';
import assert from 'node:assert/strict';

// Test Order status transition rules matching restaurant operational lifecycle
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SENT_TO_KITCHEN', 'CANCELLED'],
  SENT_TO_KITCHEN: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED'],
  SERVED: ['BILLED'],
  BILLED: ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID'],
  PAID: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

function canTransition(current: string, next: string): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

test('Order State Machine — Valid lifecycle transitions', () => {
  assert.ok(canTransition('DRAFT', 'CONFIRMED'), 'DRAFT -> CONFIRMED should be valid');
  assert.ok(canTransition('CONFIRMED', 'SENT_TO_KITCHEN'), 'CONFIRMED -> SENT_TO_KITCHEN should be valid');
  assert.ok(canTransition('SENT_TO_KITCHEN', 'PREPARING'), 'SENT_TO_KITCHEN -> PREPARING should be valid');
  assert.ok(canTransition('PREPARING', 'READY'), 'PREPARING -> READY should be valid');
  assert.ok(canTransition('READY', 'SERVED'), 'READY -> SERVED should be valid');
  assert.ok(canTransition('SERVED', 'BILLED'), 'SERVED -> BILLED should be valid');
  assert.ok(canTransition('BILLED', 'PAID'), 'BILLED -> PAID should be valid');
  assert.ok(canTransition('PAID', 'COMPLETED'), 'PAID -> COMPLETED should be valid');
});

test('Order State Machine — Disallow illegal state jumps', () => {
  assert.equal(canTransition('DRAFT', 'COMPLETED'), false, 'DRAFT -> COMPLETED is illegal');
  assert.equal(canTransition('COMPLETED', 'DRAFT'), false, 'Terminal state cannot transition');
  assert.equal(canTransition('CANCELLED', 'PAID'), false, 'Cancelled order cannot be paid');
  assert.equal(canTransition('READY', 'DRAFT'), false, 'Backward jumps disallowed');
});
