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

test('a company with no payroll and spend equal to revenue has no burn', () => {
  const c = clone(fixture);
  c.payroll = [];
  c.plan.plannedGrossSpend = c.revenue.current;
  assert.deepEqual(validate(c), ['NO_BURN']);
});

test('payroll supplies the burn when planned spend equals revenue', () => {
  const c = clone(fixture);
  c.plan.plannedGrossSpend = c.revenue.current;
  assert.deepEqual(validate(c), []);
});

test('the fixture numbers are the ones the deck uses', () => {
  assert.equal(fixture.cash, 210000000);
  assert.equal(fixture.plan.amount, 270000000);
  assert.equal(fixture.plan.plannedGrossSpend, 55000000);
  assert.equal(fixture.plan.plannedRevenue, 40000000);
  assert.equal(fixture.revenue.current, 39100000);
  assert.equal(fixture.payroll.length, 3);
  for (const p of fixture.payroll) assert.equal(p.monthlyCost, 900000);
  assert.equal(fixture.contracts[0].amount, 6000000);
  assert.equal(fixture.contracts[0].monthlyEquivalent, 500000);
  assert.equal(fixture.invoices[0].amount, 1200000);
  assert.equal(fixture.invoices[1].amount, 600000);
  assert.equal(fixture.suppression.count, 41);
  assert.deepEqual(
    fixture.revenue.trailing.map((m) => m.actual),
    [40000000, 39200000, 38000000, 36000000],
  );
});
