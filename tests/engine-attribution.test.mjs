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
