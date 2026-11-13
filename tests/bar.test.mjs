import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attribute } from '../public/js/engine.js';
import { displayTenths } from '../public/js/derived.js';
import { clone } from '../public/js/scenario.js';
import { mountBar } from '../public/js/screens/bar.js';
import { mountConfirm } from '../public/js/screens/confirm.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));

const confirmedFixture = () => {
  const c = clone(fx);
  c.payroll.forEach((p) => (p.confirmed = true));
  return c;
};

// The screens read globalThis.app.state, which app.js installs in the browser.
// Mounting into a bare object keeps these tests DOM-free.
const mount = (fn, scenario, payroll = null) => {
  const el = { innerHTML: '' };
  globalThis.app = { state: { scenario, confirmations: { payroll } } };
  try {
    fn(el);
  } finally {
    delete globalThis.app;
  }
  return el.innerHTML;
};

test('bar labels sum to the displayed total in both states', () => {
  for (const sc of [fx, confirmedFixture()]) {
    const a = attribute(sc);
    const tenths = displayTenths(a.segments.map((s) => s.months), a.totalMonths);
    assert.equal(tenths.reduce((x, y) => x + y, 0), Math.round(a.totalMonths * 10));
  }
});

test('confirmation does not move the date', () => {
  const before = attribute(fx).current.toISOString();
  assert.equal(attribute(confirmedFixture()).current.toISOString(), before);
});

test('labels render as 0.4 / 2.6 before and 2.4 / 0.6 after', () => {
  const before = attribute(fx);
  const after = attribute(confirmedFixture());
  assert.deepEqual(displayTenths(before.segments.map((s) => s.months), before.totalMonths), [4, 26]);
  assert.deepEqual(displayTenths(after.segments.map((s) => s.months), after.totalMonths), [24, 6]);
});

test('bar prints the about-label split, the tenths total, and the anchor sentence', () => {
  const before = mount(mountBar, fx);
  assert.ok(before.includes('Why your date moved 3.0 months earlier'), 'heading total comes from the tenths split');
  assert.ok(before.includes("0.4 months from what you've signed"));
  assert.ok(before.includes('2.6 months not certain yet'));
  assert.ok(
    before.includes('Compared with Jul 12, 2027, the date your plan pointed to. Payroll already paid stays counted.'),
    'anchor line must keep the verbatim sentence'
  );

  const after = mount(mountBar, confirmedFixture(), 'yes');
  assert.ok(after.includes('Why your date moved 3.0 months earlier'));
  assert.ok(after.includes("2.4 months from what you've signed"));
  assert.ok(after.includes('0.6 months not certain yet'));
  assert.ok(!after.includes('Signed 2.4'), 'labels say about, not an exact figure');
});

test('bar with no crossing prints only the no-date sentence, no graphic and no nulls', () => {
  const never = clone(fx);
  never.plan.plannedGrossSpend = 1000000;
  never.payroll = [];
  never.revenue.current = 200000000;

  const html = mount(mountBar, never);
  assert.ok(html.includes('No date to explain yet.'));
  assert.ok(!html.includes('class="bar"'), 'no bar graphic without a crossing');
  assert.ok(!html.includes('Compared with'));
  for (const bad of ['NaN', 'null', 'undefined', 'Invalid Date']) {
    assert.ok(!html.includes(bad), `no-crossing bar contains ${bad}`);
  }
});

test('confirm card asks the question verbatim and offers one mint button', () => {
  const html = mount(mountConfirm, clone(fx));
  assert.ok(html.includes('Payroll through Gusto rose $27K a month in Oct. Is that 3 new hires?'));
  assert.ok(html.includes("app.confirmPayroll('yes')"));
  assert.ok(html.includes('Yes, 3 hires'));
  assert.ok(html.includes("app.confirmPayroll('one-time')"));
  assert.ok(html.includes('One-time'));
  assert.ok(html.includes("app.confirmPayroll('other')"));
  assert.ok(html.includes('Other'));
  assert.equal((html.match(/class="btn"/g) ?? []).length, 1, 'exactly one mint button');
});

test('confirm card derives the amount, month, and hire count from the scenario payroll', () => {
  const custom = clone(fx);
  custom.payroll = [
    { id: 'a', label: 'Design hire', monthlyCost: 1250000, startsOn: '2026-09-01', confirmed: false },
    { id: 'b', label: 'Design hire 2', monthlyCost: 1250000, startsOn: '2026-09-01', confirmed: false },
  ];

  const html = mount(mountConfirm, custom);
  assert.ok(
    html.includes('Payroll through Gusto rose $25K a month in Sep. Is that 2 new hires?'),
    `question is not the custom payroll: ${html}`
  );
  assert.ok(html.includes('Yes, 2 hires'), 'mint button still repeats the fixture hire count');
  assert.ok(!html.includes('$27K'), 'the fixture amount is still literal');
  assert.ok(!html.includes('3 new hires'), 'the fixture hire count is still literal');

  const confirmed = mount(mountConfirm, custom, 'yes');
  assert.ok(
    confirmed.includes('Payroll confirmed by you: $25K a month, from Gusto debits.'),
    `confirmed line is not the custom payroll: ${confirmed}`
  );
});

test('confirm card stays empty when the scenario has no payroll rows', () => {
  const bare = clone(fx);
  bare.payroll = [];
  assert.equal(mount(mountConfirm, bare), '', 'a payroll-less company was asked the fixture question');
});

test('confirmed card replaces the question without inventing a debit count', () => {
  const html = mount(mountConfirm, confirmedFixture(), 'yes');
  assert.ok(html.includes('Payroll confirmed by you: $27K a month, from Gusto debits.'));
  assert.ok(!html.includes('6 Gusto debits'));
  assert.ok(!html.includes('Is that 3 new hires?'));
  assert.ok(!html.includes('app.confirmPayroll'), 'no buttons once confirmed');
});
