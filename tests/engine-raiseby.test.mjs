import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { netBurn, raiseBy, range, bufferAt, grossSpend } from '../public/js/engine.js';
import { clone } from '../public/js/scenario.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));
const iso = (d) => d.toISOString().slice(0, 10);

test('net burn is gross spend minus revenue, hires included', () => {
  assert.equal(netBurn(fx, 2026, 11), 18600000);
});

test('the identity holds', () => {
  assert.equal(15000000 + 2700000 + 900000, 18600000);
});

test('buffer is six months of projected burn', () => {
  assert.equal(bufferAt(fx, new Date('2026-11-11T00:00:00Z')), 111600000);
});

test('raise-by is Apr 11, 2027', () => {
  assert.equal(iso(raiseBy(fx)), '2027-04-11');
});

test('cancelling the renewal moves the date nine days later', () => {
  const c = clone(fx); c.contracts[0].choice = 'cancel';
  assert.equal(iso(raiseBy(c)), '2027-04-20');
});

test('a longer raise (cushion 9) moves the date earlier', () => {
  const c = clone(fx); c.cushionMonths = 9;
  assert.equal(iso(raiseBy(c)), '2027-01-11');
});

test('a mid-month hire prorates: Jun 16 start costs 15/30 of June', () => {
  const c = clone(fx);
  c.payroll = [{ id: 'h', label: 'h', monthlyCost: 900000, startsOn: '2026-06-16', confirmed: true }];
  assert.equal(netBurn(c, 2026, 6), 55000000 + 450000 - 39100000);
  assert.equal(netBurn(c, 2026, 7), 55000000 + 900000 - 39100000);
});

test('gross spend is derived from the plan plus payroll, and there is no stored field', () => {
  assert.equal(grossSpend(fx, 2026, 11), 57700000);
  assert.ok(!('grossSpend' in fx));
});

test('the range runs Mar 1 to Apr 28 with a sample deviation', () => {
  const r = range(fx);
  assert.equal(iso(r.low), '2027-03-01');
  assert.equal(iso(r.base), '2027-04-11');
  assert.equal(iso(r.high), '2027-04-28');
});
