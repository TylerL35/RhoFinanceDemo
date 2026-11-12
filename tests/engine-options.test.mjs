import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceOption, noticeState } from '../public/js/engine.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));

test('deltas are exact and ordered cancel > collect > monthly >= approve', () => {
  const approve = priceOption(fx, 'approve').deltaDays;
  const monthly = priceOption(fx, 'monthly').deltaDays;
  const cancel = priceOption(fx, 'cancel').deltaDays;
  const collect = priceOption(fx, 'collect').deltaDays;
  assert.equal(approve, 0);
  assert.equal(monthly, 0);
  assert.equal(collect, 2);
  assert.equal(cancel, 9);
  assert.ok(cancel > collect && collect > monthly && monthly >= approve);
});

test('collect is a one-off and does not change net burn', () => {
  const before = priceOption(fx, 'approve');
  const after = priceOption(fx, 'collect');
  assert.equal(after.deltaDays, 2);
  assert.equal(before.date.toISOString().slice(0, 10), '2027-04-11');
  assert.equal(after.date.toISOString().slice(0, 10), '2027-04-13');
});

test('options are priced from a scenario with no contract choice', () => {
  const chosen = structuredClone(fx);
  chosen.contracts[0].choice = 'cancel';
  assert.equal(priceOption(chosen, 'monthly').deltaDays, 0);
});

test('the notice window has nine days left', () => {
  const n = noticeState(fx);
  assert.equal(n.daysLeft, 9);
  assert.equal(n.canCancel, true);
});
