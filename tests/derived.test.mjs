import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derived, fmt, displayTenths } from '../public/js/derived.js';

test('derived with no inputs throws in test mode', () => {
  assert.throws(() => derived(41, 'count', [], 'suppression count'), /no inputs/);
});

test('fmt renders a derived value', () => {
  const d = derived(6000000, 'cents', [{ label: 'renewal', value: 6000000, source: 'contract' }], 'contract.amount');
  assert.equal(fmt(d), '$60K');
});

test('largest remainder makes parts sum to the total (post-confirmation)', () => {
  assert.deepEqual(displayTenths([2.37, 0.66], 3.02), [24, 6]);
});

test('largest remainder makes parts sum to the total (pre-confirmation)', () => {
  assert.deepEqual(displayTenths([0.3614, 2.6612], 3.0226), [4, 26]);
});

test('largest remainder never loses a tenth', () => {
  for (const [parts, total] of [[[1.05, 1.05], 2.1], [[0.5, 0.5], 1.0], [[2.5, 0.5], 3.0]]) {
    const t = displayTenths(parts, total);
    const sum = t.reduce((a, b) => a + b, 0);
    assert.equal(sum, Math.round(total * 10));
  }
});
