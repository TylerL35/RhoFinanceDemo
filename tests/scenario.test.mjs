import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, clone, terms } from '../public/js/scenario.js';

const fixture = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));
const asOf = new Date('2026-11-11T00:00:00Z');

test('the fixture is valid', () => {
  assert.deepEqual(validate(fixture), []);
});

test('the fixture notice window is open, with 9 days left', () => {
  const t = terms(fixture, 'hubspot', asOf);
  assert.equal(t.deadline.toISOString().slice(0, 10), '2026-11-20');
  assert.equal(t.daysLeft, 9);
  assert.equal(t.canCancel, true);
});

test('a closed notice window is detected', () => {
  const old = clone(fixture);
  old.contracts[0].renewsOn = '2026-12-01';
  assert.equal(terms(old, 'hubspot', asOf).canCancel, false);
  assert.equal(terms(old, 'hubspot', asOf).daysLeft, -10);
});

test('hires start unconfirmed', () => {
  assert.equal(fixture.payroll.every((p) => p.confirmed === false), true);
});

test('clone is deep', () => {
  const c = clone(fixture);
  c.payroll[0].confirmed = true;
  assert.equal(fixture.payroll[0].confirmed, false);
});

test('the fixture stores no derived value', () => {
  assert.ok(!('grossSpend' in fixture), 'grossSpend must be derived, never stored');
});

test('validation rejects a zero-burn company', () => {
  const c = clone(fixture);
  c.plan.plannedGrossSpend = c.revenue.current;
  assert.deepEqual(validate(c), ['NO_BURN']);
});
