import test from 'node:test';
import assert from 'node:assert/strict';
import { addAmounts, subtractAmounts, multiplyAmount, percentageOf, round2, toAmount } from './currency';
import { generateULID, generateUUID } from './id';

test('Currency Utilities — precision monetary arithmetic', () => {
  assert.equal(addAmounts(0.1, 0.2), 0.3);
  assert.equal(addAmounts(100.55, 49.45), 150.0);
  assert.equal(subtractAmounts(100, 25.5), 74.5);
  assert.equal(multiplyAmount(45.5, 3), 136.5);
  assert.equal(percentageOf(500, 18), 90);
  assert.equal(percentageOf(1250, 5), 62.5);
  assert.equal(round2(10.555), 10.56);
  assert.equal(toAmount('249.99'), 249.99);
});

test('ID Generator Utilities — ULID and UUID generation', () => {
  const ulid1 = generateULID();
  const ulid2 = generateULID();
  assert.equal(typeof ulid1, 'string');
  assert.ok(ulid1.length > 0);
  assert.notEqual(ulid1, ulid2);

  const uuid1 = generateUUID();
  const uuid2 = generateUUID();
  assert.equal(typeof uuid1, 'string');
  assert.match(uuid1, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.notEqual(uuid1, uuid2);
});
