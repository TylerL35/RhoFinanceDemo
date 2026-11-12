import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  activeContract, raiseBy, range, projectDate, priceOption, noticeState, attribute,
  cashAt, netBurn,
} from '../public/js/engine.js';
import { clone } from '../public/js/scenario.js';
import { buildScenario, setupOutcome, setupResult, setupReady } from '../public/js/screens/setup.js';
import { reveal } from '../public/js/screens/reveal.js';
import { bill } from '../public/js/screens/bill.js';
import { trust } from '../public/js/screens/trust.js';
import { claude } from '../public/js/screens/claude.js';
import { home } from '../public/js/screens/home.js';
import { invoices } from '../public/js/screens/invoices.js';
import { alerts } from '../public/js/screens/alerts.js';
import { mountBar } from '../public/js/screens/bar.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));
const iso = (d) => d.toISOString().slice(0, 10);

// The six numbers a judge types with the vendor block left blank: $900K cash,
// $60K revenue, $90K spend -> $30K a month of burn and no contract at all.
// Task 13 had to wrap this scenario in five screen-level copies of a fake
// contract before the engine would touch it. The engine now reads it directly.
const local = () => buildScenario({
  cash: '900000', revenue: '60000', spend: '90000', cushion: '6',
  vendor: '', amount: '', renewsOn: '', noticeDays: '',
});

const localWithInvoice = () => {
  const sc = local();
  sc.invoices = [{
    id: 'acme', customer: 'Acme Corp', amount: 1200000,
    dueOn: '2026-10-21', drafted: false, collected: false,
  }];
  return sc;
};

// ---------------------------------------------------------------------------
// The engine reads a missing contract as zero, not as a TypeError.

test('activeContract is null only when there is no contract', () => {
  assert.equal(activeContract(local()), null);
  assert.equal(activeContract({}), null);
  assert.equal(activeContract({ contracts: [] }), null);
  assert.equal(activeContract(fx), fx.contracts[0]);
});

test('a contract-less company with burn gets a real date, not null and not NaN', () => {
  const sc = local();
  assert.deepEqual(sc.contracts, []);
  assert.ok(netBurn(sc, 2026, 11) > 0, 'this company has burn');

  const d = raiseBy(sc);
  assert.ok(d instanceof Date, 'raiseBy must return a Date, not null');
  assert.ok(!Number.isNaN(d.getTime()), 'raiseBy must not return NaN');
  assert.equal(iso(d), '2028-11-12');
});

test('range and projectDate both work with no contracts', () => {
  const sc = local();
  const r = range(sc);
  assert.ok(r.base !== null && r.low !== null && r.high !== null);
  for (const d of [r.base, r.low, r.high]) {
    assert.ok(!Number.isNaN(d.getTime()), 'range endpoints must be real dates');
  }
  assert.ok(r.low.getTime() <= r.base.getTime() && r.base.getTime() <= r.high.getTime());

  const p = projectDate(sc);
  assert.equal(p.unit, 'date');
  assert.ok(!Number.isNaN(new Date(p.value).getTime()));
  assert.equal(iso(new Date(p.value)), '2028-11-12');
});

test('monthly and cancel are no-ops without a contract: baseline date, delta 0', () => {
  const sc = local();
  const baseline = raiseBy(sc);
  for (const kind of ['monthly', 'cancel']) {
    const o = priceOption(sc, kind);
    assert.equal(o.kind, kind);
    assert.equal(o.deltaDays, 0, `${kind} moved a date that has no contract to move`);
    assert.equal(o.date.getTime(), baseline.getTime());
  }
  const approve = priceOption(sc, 'approve');
  assert.equal(approve.deltaDays, 0);
  assert.equal(approve.date.getTime(), baseline.getTime());
});

test('collect still prices the invoices, and one-offs apply without a contract', () => {
  const sc = localWithInvoice();
  const collect = priceOption(sc, 'collect');
  assert.ok(Number.isInteger(collect.deltaDays), 'collect must return a day count');
  assert.ok(collect.deltaDays > 0, 'collecting a 30-day-late invoice moves the date later');
  assert.ok(collect.date.getTime() > raiseBy(sc).getTime());

  // The cash that arrives is the invoice, with no renewal anywhere in sight.
  const before = cashAt(sc, new Date('2026-11-20T00:00:00Z'));
  const after = cashAt({ ...sc, invoices: sc.invoices.map((i) => ({ ...i, collected: true })) },
    new Date('2026-11-20T00:00:00Z'));
  assert.equal(after - before, 1200000);
});

test('noticeState without a contract says there is nothing to notice', () => {
  assert.deepEqual(noticeState(local()), { deadline: null, daysLeft: null, canCancel: false });
});

test('attribute does not throw without a contract; the signed part is the hires', () => {
  const sc = local();
  sc.payroll = [{
    id: 'hire-1', label: 'Eng hire 1', monthlyCost: 900000,
    startsOn: '2026-10-01', confirmed: true,
  }];

  const a = attribute(sc);
  assert.ok(!Number.isNaN(a.totalMonths), 'totalMonths must be a number');
  assert.ok(!Number.isNaN(a.segments[0].months), 'signed months must be a number');
  assert.ok(!Number.isNaN(a.segments[1].months), 'uncertain months must be a number');
  assert.ok(a.segments[0].months > 0, 'the confirmed hire is the signed factor');
  assert.equal(Math.round(a.segments[1].months * 10), 0, 'nothing signed-but-uncertain moved');

  const inert = attribute(local());
  assert.equal(inert.totalMonths, 0, 'a company with nothing signed has moved 0 months');
});

// ---------------------------------------------------------------------------
// Every screen now calls the engine directly on the contract-less scenario.

const badTokens = ['NaN', 'Invalid Date', '1970', '[object Object]'];

test('reveal, bill, trust, ask, home, invoices and alerts render the contract-less company', () => {
  const state = { scenario: local(), choice: { hubspot: null }, guesses: { made: false, value: null } };
  const screens = {
    reveal: reveal({ state }),
    bill: bill({ state }),
    trust: trust({ state }),
    ask: claude({ state }),
    home: home({ state }),
    invoices: invoices({ state }),
    alerts: alerts({ state }),
  };
  for (const [name, html] of Object.entries(screens)) {
    assert.ok(html.length > 0, `${name} rendered nothing`);
    for (const bad of badTokens) assert.ok(!html.includes(bad), `${name} contains ${bad}`);
  }
  assert.ok(screens.reveal.includes('November 2028'), 'reveal carries the company\'s own date');
  assert.ok(screens.bill.includes('No contract entered.'));
  assert.ok(screens.trust.includes("Didn't bother you: 0 items"));
  assert.ok(screens.ask.includes('Rho estimates'));
  assert.ok(screens.home.includes('Raise-by holds at'), 'home carries the company\'s own date');
  assert.ok(screens.invoices.includes('Sales are'), 'invoices renders its headline');
  assert.ok(screens.alerts.includes('Nothing unusual right now.'), 'alerts says there is nothing to see');
});

// ---------------------------------------------------------------------------
// The as-of date and the cushion are inputs to the projection, not decorations.

test('an as-of date that is not a real YYYY-MM-DD builds no scenario', () => {
  for (const asOf of ['not a date', '2026-13-01', '2026-02-30', '11/11/2026', '2026-1-1', ' 2026-11-11 ']) {
    const sc = buildScenario({
      cash: '900000', revenue: '60000', spend: '90000', cushion: '6',
      asOf, vendor: '', amount: '', renewsOn: '', noticeDays: '',
    });
    assert.equal(sc, null, `asOf ${JSON.stringify(asOf)} must not build a scenario`);
    assert.deepEqual(setupOutcome(sc), { note: 'Some numbers are missing.', ready: false });
    assert.equal(setupResult(sc), 'Some numbers are missing.');
    assert.equal(setupReady(sc), false);
  }
});

test('a blank as-of keeps the form default, which is a real date', () => {
  const sc = buildScenario({
    cash: '900000', revenue: '60000', spend: '90000', cushion: '6',
    asOf: '', vendor: '', amount: '', renewsOn: '', noticeDays: '',
  });
  assert.equal(sc.asOf, '2026-11-11');
  assert.ok(!Number.isNaN(raiseBy(sc).getTime()), 'the projection starts from the default date');
});

test('a typed zero cushion is out of range, not silently six', () => {
  const sc = buildScenario({
    cash: '900000', revenue: '60000', spend: '90000', cushion: '0',
    asOf: '2026-11-11', vendor: '', amount: '', renewsOn: '', noticeDays: '',
  });
  assert.equal(sc.cushionMonths, 0, 'a typed zero must not become 6');
  assert.equal(setupResult(sc), 'Some numbers are missing.');
  assert.equal(setupReady(sc), false);
});

test('the bar renders the contract-less company and calls the engine directly', () => {
  const el = { innerHTML: '' };
  globalThis.app = { state: { scenario: local() } };
  try {
    assert.doesNotThrow(() => mountBar(el));
  } finally {
    delete globalThis.app;
  }
  assert.ok(el.innerHTML.length > 0, 'the bar rendered nothing');
  for (const bad of badTokens) assert.ok(!el.innerHTML.includes(bad), `bar contains ${bad}`);
});

test('a zero total renders "Nothing has moved your date yet." and no bar graphic', () => {
  const el = { innerHTML: '' };
  globalThis.app = { state: { scenario: local() } };
  try {
    mountBar(el);
  } finally {
    delete globalThis.app;
  }
  assert.ok(el.innerHTML.includes('Nothing has moved your date yet.'), 'zero total needs the empty state');
  assert.ok(!el.innerHTML.includes('Why it moved'), 'a zero total must not claim a move');
  assert.ok(!el.innerHTML.includes('class="bar"'), 'a zero total has nothing to draw');
  assert.ok(!el.innerHTML.includes('0.0 months'), 'no zero-total tenths in the copy');
});

test('no screen fabricates a contract to stand in for the missing one', () => {
  for (const file of ['reveal', 'trust', 'claude', 'setup', 'bar']) {
    const src = readFileSync(new URL(`../public/js/screens/${file}.js`, import.meta.url), 'utf8');
    assert.ok(!/id:\s*'none'/.test(src), `${file}.js still carries a fake contract`);
    assert.ok(!/engineScenario|calculable/.test(src), `${file}.js still wraps the engine`);
  }
});

// ---------------------------------------------------------------------------
// The fixture's pinned values, in one place, so the fix above cannot move them.

test('the fixture pins are untouched', () => {
  assert.equal(iso(raiseBy(fx)), '2027-04-11');

  const monthly = priceOption(fx, 'monthly');
  assert.equal(iso(monthly.date), '2027-04-12');
  assert.equal(monthly.deltaDays, 1);

  const collect = priceOption(fx, 'collect');
  assert.equal(iso(collect.date), '2027-04-13');
  assert.equal(collect.deltaDays, 2);

  const cancel = priceOption(fx, 'cancel');
  assert.equal(iso(cancel.date), '2027-04-20');
  assert.equal(cancel.deltaDays, 9);

  assert.equal(priceOption(fx, 'approve').deltaDays, 0);

  const n = noticeState(fx);
  assert.equal(n.daysLeft, 9);
  assert.equal(n.canCancel, true);
  assert.equal(iso(n.deadline), '2026-11-20');

  const a = attribute(fx);
  assert.equal(a.totalMonths.toFixed(1), '3.0');
  assert.equal(a.anchor.toISOString().slice(0, 10), '2027-07-12');

  // And the fixture is still a scenario with a contract: the null path above
  // is a branch, not a replacement.
  assert.equal(activeContract(clone(fx)).id, 'hubspot');
});
