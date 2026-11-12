import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceOption, noticeState, raiseBy, netBurn, bufferAt, cashAt, parseDate } from '../public/js/engine.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));
const iso = (d) => d.toISOString().slice(0, 10);

test('deltas are exact and ordered cancel > collect > monthly >= approve', () => {
  const approve = priceOption(fx, 'approve');
  const monthly = priceOption(fx, 'monthly');
  const cancel = priceOption(fx, 'cancel');
  const collect = priceOption(fx, 'collect');
  assert.equal(iso(approve.date), '2027-04-11');
  assert.equal(approve.deltaDays, 0);
  assert.equal(iso(monthly.date), '2027-04-12');
  assert.equal(monthly.deltaDays, 1);
  assert.equal(iso(collect.date), '2027-04-13');
  assert.equal(collect.deltaDays, 2);
  assert.equal(iso(cancel.date), '2027-04-20');
  assert.equal(cancel.deltaDays, 9);
  assert.ok(
    cancel.deltaDays > collect.deltaDays &&
      collect.deltaDays > monthly.deltaDays &&
      monthly.deltaDays >= approve.deltaDays,
  );
});

test('approve prices the fixture at the engine raise-by date', () => {
  const approve = priceOption(fx, 'approve');
  const independent = raiseBy(fx);
  assert.equal(approve.date.getTime(), independent.getTime());
  assert.equal(iso(approve.date), '2027-04-11');
  assert.equal(approve.deltaDays, 0);
});

test('collect is a one-off: cash rises, burn and buffer do not move', () => {
  const collected = structuredClone(fx);
  collected.invoices.forEach((inv) => (inv.collected = true));

  assert.equal(netBurn(collected, 2026, 11), netBurn(fx, 2026, 11));
  assert.equal(
    bufferAt(collected, parseDate(fx.asOf)),
    bufferAt(fx, parseDate(fx.asOf)),
  );

  const when = parseDate('2026-11-12');
  assert.equal(cashAt(collected, when) - cashAt(fx, when), 1800000);

  const before = priceOption(fx, 'approve');
  const after = priceOption(fx, 'collect');
  assert.equal(before.deltaDays, 0);
  assert.equal(after.deltaDays, 2);
  assert.equal(iso(before.date), '2027-04-11');
  assert.equal(iso(after.date), '2027-04-13');
});

test('options are priced from a scenario with no contract choice', () => {
  const chosen = structuredClone(fx);
  chosen.contracts[0].choice = 'cancel';
  const monthly = priceOption(chosen, 'monthly');
  assert.equal(monthly.deltaDays, 1);
  assert.equal(monthly.date.getTime(), priceOption(fx, 'monthly').date.getTime());
});

test('a non-crossing scenario prices options as null, not epoch', () => {
  const rich = structuredClone(fx);
  rich.cash = 1e12;
  const approve = priceOption(rich, 'approve');
  assert.equal(approve.date, null);
  assert.equal(approve.deltaDays, null);
});

test('the notice window has nine days left', () => {
  const n = noticeState(fx);
  assert.equal(n.daysLeft, 9);
  assert.equal(n.canCancel, true);
});
