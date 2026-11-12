import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attribute } from '../public/js/engine.js';
import { clone } from '../public/js/scenario.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));
const confirmAll = (sc) => { sc.payroll.forEach((p) => (p.confirmed = true)); return sc; };

test('unconfirmed: signed is small, notCertain dominates', () => {
  const a = attribute(fx);
  assert.equal(a.hiresConfirmed, false);
  assert.ok(Math.abs(a.segments[0].months - 0.36) < 0.01, `signed ${a.segments[0].months}`);
  assert.ok(Math.abs(a.segments[1].months - 2.66) < 0.01, `notCertain ${a.segments[1].months}`);
  assert.ok(Math.abs(a.totalDays - 92) < 0.5);
});

test('confirmed: signed carries the move', () => {
  const a = attribute(confirmAll(clone(fx)));
  assert.equal(a.hiresConfirmed, true);
  assert.ok(Math.abs(a.segments[0].months - 2.37) < 0.01, `signed ${a.segments[0].months}`);
  assert.ok(Math.abs(a.segments[1].months - 0.66) < 0.01, `notCertain ${a.segments[1].months}`);
});

test('segments sum exactly to the total', () => {
  for (const sc of [fx, confirmAll(clone(fx))]) {
    const a = attribute(sc);
    assert.equal(a.segments[0].days + a.segments[1].days, a.totalDays);
  }
});

test('the anchor is the plan-consistent date, not July 1', () => {
  assert.equal(attribute(fx).anchor.toISOString().slice(0, 10), '2027-07-12');
});

test('attribution is order-independent', () => {
  const a = attribute(confirmAll(clone(fx)));
  assert.deepEqual(a.segments.map((s) => s.days), [72, 20]);
});

test('non-crossing scenario returns null attribution, not epoch arithmetic', () => {
  const sc = clone(fx);
  sc.revenue.current = 1e12; // never crosses the buffer inside the horizon
  const a = attribute(sc);
  assert.equal(a.current, null);
  assert.equal(a.totalDays, null);
  assert.equal(a.totalMonths, null);
  assert.equal(a.segments[0].days, null);
  assert.equal(a.segments[1].days, null);
  assert.equal(a.segments[0].months, null);
  assert.equal(a.segments[1].months, null);

  const numbers = [];
  const walk = (value) => {
    if (typeof value === 'number') numbers.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object' && !(value instanceof Date)) Object.values(value).forEach(walk);
  };
  walk(a);
  assert.ok(
    numbers.every((n) => !Number.isNaN(n) && Math.abs(n) <= 1000),
    `unexpected magnitudes: ${numbers}`,
  );
});

test('empty payroll is unconfirmed, not vacuously confirmed', () => {
  const sc = clone(fx);
  sc.payroll = [];
  const a = attribute(sc);
  assert.equal(a.hiresConfirmed, false);
  assert.ok(Number.isFinite(a.totalDays), `totalDays ${a.totalDays}`);
});
