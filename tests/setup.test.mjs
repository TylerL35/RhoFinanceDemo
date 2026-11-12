import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildScenario, setup, setupOutcome, setupResult, setupReady } from '../public/js/screens/setup.js';
import { validate, clone } from '../public/js/scenario.js';
import { raiseBy } from '../public/js/engine.js';
import { reveal } from '../public/js/screens/reveal.js';
import { bill } from '../public/js/screens/bill.js';
import { trust } from '../public/js/screens/trust.js';
import { claude } from '../public/js/screens/claude.js';
import { mountBar } from '../public/js/screens/bar.js';
import { mountConfirm } from '../public/js/screens/confirm.js';

// The six numbers a judge types. The vendor block is optional: an empty vendor
// is a company with no contract entered, which is a supported scenario.
const form = {
  cash: '900000', revenue: '60000', spend: '60000', cushion: '6',
  vendor: 'Figma', amount: '12000', renewsOn: '2027-02-15', noticeDays: '30',
};

const healthy = { ...form, spend: '90000' };
const healthyNoContract = { ...healthy, vendor: '', amount: '', renewsOn: '', noticeDays: '' };

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const mintCount = (html) => (html.match(/<button class="btn"(?![^>]*ghost)/g) ?? []).length;
const badTokens = ['NaN', 'Invalid Date', '1970'];

// ---------------------------------------------------------------------------
// The scenario onboarding builds.

test('a zero-burn company is rejected with a code, not NaN', () => {
  const sc = buildScenario(form);
  assert.deepEqual(validate(sc), ['NO_BURN']);
});

test('a real company gets a real date', () => {
  const sc = buildScenario({ ...form, spend: '90000' });
  assert.deepEqual(validate(sc), []);
  const d = raiseBy(sc);
  assert.ok(!Number.isNaN(d.getTime()));
  assert.equal(d.toISOString().slice(0, 10), '2028-10-30', 'the date comes from the form, not the fixture');
  assert.equal(sc.cushionMonths, 6);
});

test('setup scenarios start clean', () => {
  const sc = buildScenario({ ...form, spend: '90000' });
  assert.equal(sc.payroll.length, 0);
  assert.equal(sc.alerts.length, 0);
  assert.equal(sc.source, 'local');
});

test('the built scenario has the ruled shape and no invented history', () => {
  const sc = buildScenario(healthy);
  assert.ok(!('grossSpend' in sc), 'onboarding must not write a grossSpend key');
  assert.equal(sc.id, 'local');
  assert.equal(sc.asOf, '2026-11-11', 'the as-of date is the form default, not the wall clock');
  assert.deepEqual(sc.invoices, []);
  assert.deepEqual(sc.revenue.trailing, [], 'no trailing months were entered');
  assert.equal(sc.suppression.count, 0);
  assert.equal(sc.plan.plannedGrossSpend, 9000000, 'planned spend comes from the form');
  assert.equal(sc.plan.plannedRevenue, 6000000, 'planned revenue comes from the form');
  assert.equal(sc.contracts.length, 1);
  assert.equal(sc.contracts[0].id, 'main');
  assert.equal(sc.contracts[0].vendor, 'Figma');
  assert.equal(sc.contracts[0].amount, 1200000);
});

test('a blank vendor builds no contract at all', () => {
  assert.deepEqual(buildScenario(healthyNoContract).contracts, []);
});

test('the as-of field is what the projection starts from', () => {
  const later = buildScenario({ ...healthy, asOf: '2026-12-11' });
  assert.equal(later.asOf, '2026-12-11');
  assert.equal(
    raiseBy(later).toISOString().slice(0, 10),
    '2028-11-29',
    'moving the as-of date must move the raise-by date'
  );
});

// ---------------------------------------------------------------------------
// The note under the button. Refusals are sentences, never NaN and never 1970.

test('a no-burn company is refused in words', () => {
  const note = setupResult(buildScenario(form));
  assert.equal(note, 'At this rate cash never runs out. Raise-By needs a positive burn.');
  assert.equal(setupReady(buildScenario(form)), false);
});

test('a missing number is refused as missing', () => {
  const noCash = setupResult(buildScenario({ ...healthy, cash: '' }));
  assert.equal(noCash, 'Add your cash today.');

  const noRevenue = setupResult(buildScenario({ ...healthy, revenue: '' }));
  assert.equal(noRevenue, 'Add your monthly revenue (0 is fine).');

  const noSpend = setupResult(buildScenario({ ...healthy, spend: '' }));
  assert.equal(noSpend, 'Add your monthly spend.');

  // An empty form is missing numbers, never "cash never runs out" (Number('') is 0).
  const empty = setupResult(buildScenario({ cash: '', revenue: '', spend: '', cushion: '', asOf: '', vendor: '', amount: '', renewsOn: '', noticeDays: '' }));
  assert.equal(empty, 'Add your cash today.');

  for (const bad of badTokens) {
    assert.ok(!noCash.includes(bad), `missing-cash note contains ${bad}`);
    assert.ok(!noRevenue.includes(bad), `missing-revenue note contains ${bad}`);
  }
});

test('a half-typed contract is refused as missing, not projected', () => {
  for (const f of [
    { ...healthy, amount: '', renewsOn: '', noticeDays: '' },
    { ...healthy, renewsOn: '' },
    { ...healthy, amount: '' },
    { ...healthy, renewsOn: 'next quarter' },
  ]) {
    const sc = buildScenario(f);
    assert.equal(setupResult(sc), 'Finish the contract: add its amount and renewal date, or clear its name.');
    assert.equal(setupReady(sc), false);
  }
});

test('a healthy company is told its own date', () => {
  const sc = buildScenario(healthy);
  assert.equal(setupResult(sc), 'Raise by Oct 30, 2028.');
  assert.equal(setupReady(sc), true);
  assert.deepEqual(setupOutcome(sc), { note: 'Raise by Oct 30, 2028.', ready: true });
});

test('only a note with a date is ready to navigate', () => {
  for (const f of [form, { ...healthy, cash: '' }, { ...healthyNoContract, cash: '900000000' }]) {
    const outcome = setupOutcome(buildScenario(f));
    assert.equal(outcome.ready, false, `${outcome.note} must not navigate`);
    assert.equal(outcome.note, setupResult(buildScenario(f)), 'the outcome and the note must agree');
  }
});

test('a positive burn with no crossing inside three years stays on the page', () => {
  const rich = buildScenario({ ...healthyNoContract, cash: '900000000' });
  assert.deepEqual(validate(rich), [], 'the burn is positive, so this is not a validation failure');
  assert.equal(setupResult(rich), 'No raise-by date within three years.');
  assert.equal(setupReady(rich), false);
});

// ---------------------------------------------------------------------------
// A scenario from the form must not break the screens that read it.

test('a contract-less, payroll-less company renders reveal, bill, trust and ask', () => {
  const sc = buildScenario(healthyNoContract);
  const state = { scenario: sc, choice: { hubspot: null } };
  const screens = {
    reveal: reveal({ state }),
    bill: bill({ state }),
    trust: trust({ state }),
    ask: claude({ state }),
  };

  for (const [name, html] of Object.entries(screens)) {
    for (const bad of badTokens) {
      assert.ok(!html.includes(bad), `${name} contains ${bad}`);
    }
  }

  assert.ok(text(screens.reveal).includes('November 2028'), 'reveal should carry the form\'s date');
  assert.ok(text(screens.bill).includes('No contract entered.'), 'bill should name the missing contract');
  assert.ok(text(screens.trust).includes("Didn't bother you: 0 items"), 'trust should read suppression 0');
  assert.ok(text(screens.ask).includes('Rho estimates'), 'ask should still answer for a crossing company');
});

test('the mounted reveal slots survive a contract-less, payroll-less company', () => {
  const sc = buildScenario(healthyNoContract);
  globalThis.app = { state: { scenario: sc, confirmations: { payroll: null } } };
  try {
    const bar = { innerHTML: '' };
    assert.doesNotThrow(() => mountBar(bar), 'the attribution bar must not throw without a contract');
    for (const bad of badTokens) assert.ok(!bar.innerHTML.includes(bad), `mounted bar contains ${bad}`);

    const confirm = { innerHTML: '' };
    assert.doesNotThrow(() => mountConfirm(confirm));
    assert.equal(
      confirm.innerHTML,
      '',
      'a company with no payroll rows has nothing to confirm, so the fixture question must not appear'
    );
  } finally {
    delete globalThis.app;
  }
});

// ---------------------------------------------------------------------------
// The screen itself: copy, labels, one mint button, and the mobile form.

test('setup prints the ruled headline, lead, labels and one mint button', () => {
  const html = setup({ state: {} });
  const copy = text(html);

  assert.ok(copy.includes('Your numbers, your date.'), 'headline is not verbatim');
  assert.ok(copy.includes('Nothing leaves this browser.'), 'lead is not verbatim');
  for (const label of [
    'Cash today', 'Monthly revenue', 'Monthly spend', 'Cushion months', 'As of',
    'Largest contract', 'Amount', 'Renews on', 'Notice days',
  ]) {
    assert.ok(copy.includes(label), `field label missing: ${label}`);
  }
  for (const id of ['f-cash', 'f-revenue', 'f-spend', 'f-cushion', 'f-asof',
    'f-vendor', 'f-amount', 'f-renew', 'f-notice', 'setup-note']) {
    assert.ok(html.includes(`id="${id}"`), `field missing: ${id}`);
  }
  assert.ok(html.includes('value="2026-11-11"'), 'the as-of field defaults to the fixture date');
  // The example company is filled in as values, not placeholders, so the
  // button works at once.
  assert.ok(html.includes('id="f-cash" value="900,000"'), 'cash is not prefilled');
  assert.ok(!html.includes('placeholder='), 'placeholders look like values; the form uses real values');
  assert.ok(html.includes('onclick="app.saveSetup()"'), 'the button does not call app.saveSetup');
  assert.ok(copy.includes('Show my date'), 'button copy is not verbatim');
  assert.equal(mintCount(html), 1, 'the mint button must be the only mint on the screen');
});

test('the form is a 16px single-column grid with labels above inputs', () => {
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  const rule = (selector) => {
    const at = css.indexOf(`${selector} {`);
    assert.ok(at !== -1, `missing rule: ${selector}`);
    return css.slice(at, css.indexOf('}', at) + 1);
  };

  assert.match(rule('.form-grid'), /display:\s*grid/, 'fields must be a grid, not a shrink-to-fit row');
  assert.match(rule('.form-grid label'), /display:\s*block/, 'labels must sit above their inputs');
  assert.match(rule('.form-grid input'), /font-size:\s*16px/, 'inputs must be 16px so iOS does not zoom');
  assert.match(rule('.form-grid input'), /width:\s*100%/, 'inputs must fit their column');

  const media = css.slice(css.indexOf('@media (max-width: 760px)'));
  assert.match(media.slice(0, 400), /\.form-grid\s*\{\s*grid-template-columns:\s*1fr/, 'one column at 375px');
});

// ---------------------------------------------------------------------------
// The handler: the note, then the navigation (or not).

async function bootStubbed() {
  const store = new Map();
  const els = new Map();
  const root = (globalThis.__rbRoot ??= { innerHTML: '', textContent: '' });
  root.innerHTML = '';
  const fixture = JSON.parse(
    readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
  );
  globalThis.location = { search: '', hash: '#/setup' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = {
    getElementById: (id) => {
      if (id === 'app') return root;
      if (!els.has(id)) els.set(id, { value: '', textContent: '' });
      return els.get(id);
    },
  };
  globalThis.fetch = async () => ({ json: async () => clone(fixture) });
  const { app } = await import('../public/js/app.js');
  await app.boot();
  app.route = '/setup';
  return { app, els, store, root, fixture };
}

test('a healthy entry saves the value, shows the date and navigates to reveal', async () => {
  const { app, store, els } = await bootStubbed();
  for (const [id, value] of Object.entries({
    'f-cash': healthy.cash, 'f-revenue': healthy.revenue, 'f-spend': healthy.spend,
    'f-cushion': healthy.cushion, 'f-asof': '2026-11-11', 'f-vendor': healthy.vendor,
    'f-amount': healthy.amount, 'f-renew': healthy.renewsOn, 'f-notice': healthy.noticeDays,
  })) {
    els.set(id, { value, textContent: '' });
  }

  app.state.appliedIntents = [{ text: 'hire 2', echo: 'I read that as: 2 more hires', before: app.state.scenario }];
  app.state.intentBase = app.state.scenario;
  app.state.lastEcho = 'I read that as: 2 more hires';

  app.saveSetup();

  assert.equal(els.get('setup-note').textContent, 'Raise by Oct 30, 2028.');
  assert.equal(app.route, '/reveal', 'a real date navigates to the reveal');
  assert.equal(app.state.scenario.source, 'local');
  assert.deepEqual(app.state.appliedIntents, [], 'an old what-if stack must not survive new numbers');
  assert.equal(app.state.intentBase, null);
  assert.equal(app.state.lastEcho, null, 'the what-if echo described the fixture');
  const saved = JSON.parse(store.get('raise-by.scenario.v1'));
  assert.equal(saved.source, 'local', 'the scenario was not persisted');
  assert.equal(saved.plan.plannedGrossSpend, 9000000);
});

test('a no-burn entry shows the refusal and does not navigate', async () => {
  const { app, els } = await bootStubbed();
  for (const [id, value] of Object.entries({
    'f-cash': form.cash, 'f-revenue': form.revenue, 'f-spend': form.spend,
    'f-cushion': form.cushion, 'f-asof': '', 'f-vendor': '', 'f-amount': '', 'f-renew': '', 'f-notice': '',
  })) {
    els.set(id, { value, textContent: '' });
  }

  app.saveSetup();

  assert.equal(
    els.get('setup-note').textContent,
    'At this rate cash never runs out. Raise-By needs a positive burn.'
  );
  assert.equal(app.route, '/setup', 'a refusal stays on the form');
});

test('a no-crossing entry says so and does not navigate', async () => {
  const { app, els } = await bootStubbed();
  for (const [id, value] of Object.entries({
    'f-cash': '900000000', 'f-revenue': healthy.revenue, 'f-spend': healthy.spend,
    'f-cushion': healthy.cushion, 'f-asof': '', 'f-vendor': '', 'f-amount': '', 'f-renew': '', 'f-notice': '',
  })) {
    els.set(id, { value, textContent: '' });
  }

  app.saveSetup();

  assert.equal(els.get('setup-note').textContent, 'No raise-by date within three years.');
  assert.equal(app.route, '/setup', 'a company with no crossing stays on the form');
});

test('the saved scenario renders the reveal without a bad token', async () => {
  const { app, els, root } = await bootStubbed();
  for (const [id, value] of Object.entries({
    'f-cash': healthy.cash, 'f-revenue': healthy.revenue, 'f-spend': healthy.spend,
    'f-cushion': healthy.cushion, 'f-asof': '', 'f-vendor': '', 'f-amount': '', 'f-renew': '', 'f-notice': '',
  })) {
    els.set(id, { value, textContent: '' });
  }
  app.saveSetup();

  app.route = '/reveal';
  assert.doesNotThrow(() => app.render());
  for (const bad of badTokens) assert.ok(!root.innerHTML.includes(bad), `reveal contains ${bad}`);
});
