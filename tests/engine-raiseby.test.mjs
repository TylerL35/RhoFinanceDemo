import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { netBurn, raiseBy, range, bufferAt, grossSpend, projectDate, revenueBand } from '../public/js/engine.js';
import { clone } from '../public/js/scenario.js';
import { fmt } from '../public/js/derived.js';

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

test('provenance uses the as-of month burn and the buffer at the returned date', () => {
  const c = clone(fx);
  c.asOf = '2027-02-15';
  c.payroll.push({ id: 'big', label: 'big', monthlyCost: 5000000, startsOn: '2027-03-01', confirmed: true });
  const d = raiseBy(c);
  const pd = projectDate(c);
  const burn = pd.inputs.find((i) => i.label.startsWith('net burn'));
  const buffer = pd.inputs.find((i) => i.label === 'buffer');
  assert.equal(burn.label, 'net burn (Feb)');
  assert.equal(burn.value, netBurn(c, 2027, 2));
  assert.equal(buffer.value, bufferAt(c, d));
});

test('raise-by is null when cash never crosses the buffer', () => {
  const rich = clone(fx);
  rich.cash = 1e15;
  assert.equal(raiseBy(rich), null);
  const growing = clone(fx);
  growing.revenue.current = 100000000;
  assert.equal(raiseBy(growing), null);
});

test('project date keeps provenance when there is no crossing', () => {
  const rich = clone(fx);
  rich.cash = 1e15;
  const pd = projectDate(rich);
  assert.equal(pd.value, null);
  assert.ok(pd.inputs.length > 0);
  assert.equal(pd.inputs.find((i) => i.label === 'buffer').value, bufferAt(rich, new Date('2026-11-11T00:00:00Z')));
});

test('a non-crossing scenario gives a null raise-by and an all-null range', () => {
  const rich = clone(fx);
  rich.cash = 1e15;
  assert.ok(netBurn(rich, 2026, 11) > 0);
  assert.equal(raiseBy(rich), null);
  const r = range(rich);
  assert.equal(r.base, null);
  assert.equal(r.low, null);
  assert.equal(r.high, null);
});

test('a null date formats as an em dash, not the epoch', () => {
  const rich = clone(fx);
  rich.cash = 1e15;
  const out = fmt(projectDate(rich));
  assert.equal(out, '—');
  assert.ok(!out.includes('1970'));
});

test('the fixture still yields all six pinned dates', () => {
  const cancel = clone(fx);
  cancel.contracts[0].choice = 'cancel';
  const cushion = clone(fx);
  cushion.cushionMonths = 9;
  const r = range(fx);
  assert.deepEqual(
    [iso(raiseBy(fx)), iso(raiseBy(cancel)), iso(raiseBy(cushion)), iso(r.low), iso(r.base), iso(r.high)],
    ['2027-04-11', '2027-04-20', '2027-01-11', '2027-03-01', '2027-04-11', '2027-04-28'],
  );
});

test('a trailing window shorter than two months collapses the range to the base date', () => {
  for (const trailing of [[], [fx.revenue.trailing[0]]]) {
    const c = clone(fx);
    c.revenue.trailing = trailing;
    c.revenue.current = c.plan.plannedRevenue;
    assert.deepEqual(revenueBand(c), {
      mean: 1, s: 0, low: c.plan.plannedRevenue, high: c.plan.plannedRevenue,
    });
    const r = range(c);
    const base = iso(r.base);
    for (const d of [r.low, r.base, r.high]) {
      assert.ok(d instanceof Date && !Number.isNaN(d.getTime()));
      assert.equal(iso(d), base);
    }
  }
});
