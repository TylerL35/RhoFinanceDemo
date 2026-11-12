import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceOption, raiseBy, attribute } from '../public/js/engine.js';
import { displayTenths } from '../public/js/derived.js';
import { invoices } from '../public/js/screens/invoices.js';
import { alerts } from '../public/js/screens/alerts.js';
import { trust } from '../public/js/screens/trust.js';
import { claude } from '../public/js/screens/claude.js';

const fixture = JSON.parse(
  readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
);

const clone = (x) => structuredClone(x);
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const mintCount = (html) => (html.match(/<button class="btn"(?![^>]*ghost)/g) ?? []).length;
const badTokens = ['Invalid Date', '1970', 'NaN', 'null', 'undefined'];

const renderInvoices = (scenario, state = {}) => invoices({ state: { scenario, ...state } });
const renderAlerts = (scenario, duplicate = null) =>
  alerts({ state: { scenario, alerts: { duplicate } } });
const renderTrust = (scenario) => trust({ state: { scenario } });
const renderClaude = (scenario) => claude({ state: { scenario } });

// ---------------------------------------------------------------------------
// Invoicing: drafting is not collecting, and every figure is derived.

test('invoices prints the spec rows, the derived shortfall, and one mint button', () => {
  const html = renderInvoices(clone(fixture));
  const copy = text(html);

  assert.ok(copy.includes('Sales are $9K a month behind your plan.'), 'headline is not the derived shortfall');
  assert.ok(copy.includes('Acme Corp $12,000 21 days overdue'), 'Acme row is wrong');
  assert.ok(copy.includes('Brightline $6,000 14 days overdue'), 'Brightline row is wrong');
  assert.ok(copy.includes('Draft 2 reminders'), 'mint button copy is wrong');
  assert.ok(copy.includes('If both pay, about 2 days.'), 'caption does not match the priced collect option');
  assert.ok(
    copy.includes('Collecting moves timing. Closing $9K a month more by Feb holds the date.'),
    'closing line is not verbatim'
  );
  assert.equal(mintCount(html), 1, 'invoicing must have exactly one mint button');
  assert.equal((copy.match(/Mark collected/g) ?? []).length, 2, 'each open invoice needs a ghost action');
  assert.ok(!copy.includes('reminder drafted'), 'draft state leaked before drafting');
  assert.equal((html.match(/<td class="mono">collected<\/td>/g) ?? []).length, 0, 'collected state leaked before collecting');
});

test('the +2 days figure is derived from priceOption, not a literal', () => {
  const bigger = clone(fixture);
  bigger.invoices.forEach((i) => (i.amount *= 3));
  const delta = priceOption(bigger, 'collect').deltaDays;
  assert.equal(delta, 8, 'tripled invoices should price at 8 days');
  assert.notEqual(delta, 2, 'the fixture delta must not be hardcoded');

  const copy = text(renderInvoices(bigger));
  assert.ok(copy.includes('If both pay, about 8 days.'), `caption did not follow the engine: ${copy}`);
  assert.ok(!copy.includes('about 2 days.'), 'the fixture literal survived a changed invoice total');
});

test('the overdue days and the shortfall headline are read from the scenario', () => {
  const moved = clone(fixture);
  moved.invoices[1].dueOn = '2026-11-04'; // 7 days before asOf
  moved.revenue.current = 38800000; // 40,000,000 - 38,800,000 = $12K behind
  const copy = text(renderInvoices(moved));

  assert.ok(copy.includes('Brightline $6,000 7 days overdue'), 'overdue days are not derived from dueOn');
  assert.ok(copy.includes('Sales are $12K a month behind your plan.'), 'headline is not derived');
  assert.ok(copy.includes('Closing $12K a month more by Feb holds the date.'), 'closing shortfall is not derived');
});

test('a drafted invoice list turns the draft action into a disabled, non-mint control', () => {
  const drafted = clone(fixture);
  drafted.invoices.forEach((i) => (i.drafted = true));
  const html = renderInvoices(drafted);
  const copy = text(html);

  assert.ok(copy.includes('Reminders drafted'), 'drafted control copy missing');
  assert.ok(!copy.includes('Draft 2 reminders'), 'the live draft button survived drafting');

  const control = html.match(/<button[^>]*>Reminders drafted<\/button>/)?.[0];
  assert.ok(control, 'no control carries the drafted label');
  assert.ok(control.includes('disabled'), `drafted control is still clickable: ${control}`);
  assert.ok(/class="btn[^"]*ghost/.test(control), `drafted control is still mint: ${control}`);
  assert.equal(mintCount(html), 0, 'a drafted list still shows a mint button');
  assert.ok(!html.includes('app.draftInvoices()'), 'a drafted list still calls the draft action');

  assert.equal((copy.match(/reminder drafted/g) ?? []).length, 2, 'drafted rows do not say so');
  assert.ok(copy.includes('Mark collected'), 'collecting is still offered after drafting');
});

test('drafting leaves raiseBy alone; collecting moves it', () => {
  const base = raiseBy(clone(fixture));

  const drafted = clone(fixture);
  drafted.invoices.forEach((i) => (i.drafted = true));
  assert.equal(raiseBy(drafted).getTime(), base.getTime(), 'drafted invoices moved the raise-by date');

  const collected = clone(fixture);
  collected.invoices.forEach((i) => (i.collected = true));
  const priced = priceOption(fixture, 'collect');
  assert.equal(raiseBy(collected).getTime(), priced.date.getTime(), 'collected invoices did not price as collect');
  assert.ok(raiseBy(collected) > base, 'collecting did not push the date later');

  const draftedCopy = text(renderInvoices(drafted));
  assert.equal((draftedCopy.match(/reminder drafted/g) ?? []).length, 2, 'drafted rows do not say so');
  assert.ok(draftedCopy.includes('Mark collected'), 'collecting is still offered after drafting');
});

// ---------------------------------------------------------------------------
// The app handlers persist the two states separately.

async function bootStubbed() {
  const store = new Map();
  const root = (globalThis.__rbRoot ??= { innerHTML: '' });
  root.innerHTML = '';
  globalThis.location = { search: '', hash: '#/invoices' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = { getElementById: () => root };
  globalThis.fetch = async () => ({ json: async () => clone(fixture) });
  return { store, root };
}

test('app.draftInvoices saves drafts, app.collectInvoice saves collections, and only the latter moves the date', async () => {
  const { store, root } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();
  app.state.scenario = clone(fixture);
  app.route = '/invoices';
  const base = raiseBy(app.state.scenario);

  app.draftInvoices();

  assert.ok(app.state.scenario.invoices.every((i) => i.drafted), 'draftInvoices did not draft every row');
  assert.ok(app.state.scenario.invoices.every((i) => !i.collected), 'drafting collected an invoice');
  assert.equal(app.state.collections.drafted, true, 'state.collections.drafted was not recorded');
  assert.equal(raiseBy(app.state.scenario).getTime(), base.getTime(), 'drafting moved the date');
  const savedDraft = JSON.parse(store.get('raise-by.scenario.v1'));
  assert.ok(savedDraft.invoices.every((i) => i.drafted), 'drafts were not saved');
  assert.ok(text(root.innerHTML).includes('reminder drafted'), 'screen did not re-render the draft state');

  app.collectInvoice('acme');

  const acme = app.state.scenario.invoices.find((i) => i.id === 'acme');
  assert.equal(acme.collected, true, 'collectInvoice did not collect the row');
  assert.equal(app.state.collections.collected[0], true, 'state.collections.collected was not recorded');
  assert.equal(raiseBy(app.state.scenario).getTime(), priceOption(clone(fixture), 'collect').date.getTime() - 86400000, 'one collected invoice did not price at +1 day');
  const savedCollect = JSON.parse(store.get('raise-by.scenario.v1'));
  assert.equal(savedCollect.invoices[0].collected, true, 'collection was not saved');
  assert.ok(text(root.innerHTML).includes('collected'), 'screen did not re-render the collected state');

  app.collectInvoice('brightline');
  assert.equal(raiseBy(app.state.scenario).getTime(), priceOption(clone(fixture), 'collect').date.getTime());
  assert.equal((root.innerHTML.match(/Mark collected/g) ?? []).length, 0, 'collected rows still offer the action');

  assert.doesNotThrow(() => app.collectInvoice('missing'), 'a missing id must not throw');
});

// ---------------------------------------------------------------------------
// Duplicate-charge alert.

test('alerts prints vendor, amount, and the gap from scenario.alerts[0]', () => {
  const html = renderAlerts(clone(fixture));
  const copy = text(html);

  assert.ok(copy.includes('Possible duplicate charge.'), 'headline missing');
  assert.ok(
    copy.includes('Northstar Office Supply, $840, two charges six days apart.'),
    `detail is not the derived scenario copy: ${copy}`
  );
  assert.ok(html.includes("app.resolveAlert('disputed')"), 'Dispute action missing');
  assert.ok(copy.includes('Dispute'), 'Dispute button label missing');
  assert.ok(copy.includes('Not a duplicate'), 'dismiss button label missing');
  assert.equal(mintCount(html), 1, 'the alert must show exactly one mint button');
});

test('alerts follows the scenario when the vendor, amount, or dates change', () => {
  const moved = clone(fixture);
  moved.alerts[0].vendor = 'Figma';
  moved.alerts[0].amount = 55500;
  moved.alerts[0].dates = ['2026-10-01', '2026-10-09'];
  const copy = text(renderAlerts(moved));

  assert.ok(copy.includes('Figma, $555, two charges eight days apart.'), `alert did not re-derive: ${copy}`);
  assert.ok(!copy.includes('Northstar'), 'the fixture vendor is still literal');
  assert.ok(!copy.includes('$840'), 'the fixture amount is still literal');
});

test('a resolved alert replaces both buttons with the saved verdict', () => {
  const disputed = renderAlerts(clone(fixture), 'disputed');
  const verdict = disputed.match(/<div class="card"><p class="mono"[^>]*>(.*?)<\/p><\/div>/)?.[1];
  assert.equal(verdict, 'Disputed.', 'the dispute verdict must claim nothing beyond the ruling');
  assert.ok(text(disputed).includes('Disputed.'));
  assert.ok(!text(disputed).includes('trust panel'), 'the dispute claims a trust-panel record that is never written');
  assert.equal(mintCount(disputed), 0, 'a resolved alert still has a mint button');
  assert.ok(!disputed.includes('app.resolveAlert('), 'a resolved alert still offers buttons');

  const dismissed = renderAlerts(clone(fixture), 'dismissed');
  assert.ok(text(dismissed).includes('Marked not a duplicate.'));
  assert.equal(mintCount(dismissed), 0);
  assert.ok(!dismissed.includes('app.resolveAlert('), 'a dismissed alert still offers buttons');
});

test('the alert screen never touches the engine', () => {
  const src = readFileSync(new URL('../public/js/screens/alerts.js', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"]\.\.\/engine\.js['"]/.test(src), 'alerts.js imports the engine');
});

// ---------------------------------------------------------------------------
// Trust panel.

test('trust prints 41 from suppression.count and the ruled copy', () => {
  const html = renderTrust(clone(fixture));
  const copy = text(html);

  assert.ok(copy.includes("What it knows, what it won't guess, and who's in control."), 'headline missing');
  assert.ok(copy.includes("Didn't bother you: 41 items"), 'suppression count missing');
  assert.ok(
    copy.includes('We only speak up when something moves your date 7 days or more.'),
    'rule line is not verbatim'
  );
  assert.ok(copy.includes('Payroll detail beyond Gusto totals.'), 'payroll gap missing');
  assert.ok(copy.includes('Stripe payouts before they land.'), 'Stripe gap missing');
  assert.ok(copy.includes('Accounts outside Rho.'), 'outside-accounts gap missing');
  assert.ok(
    copy.includes('This is wrong recalculates and is logged. Missing data widens the range.'),
    'when-it-is-wrong copy is not verbatim'
  );
  assert.ok(copy.includes('Share read-only with accountant'), 'share button missing');
  assert.ok(
    copy.includes('AI reads and explains. Math makes every number. You approve. Rho never moves money.'),
    'closing line is not verbatim'
  );
  assert.ok(html.includes('<button class="btn ghost">This is wrong</button>'), 'wrong action is not ghost');
  assert.ok(
    html.includes('<button class="btn ghost">Share read-only with accountant</button>'),
    'share action is not ghost'
  );
  assert.equal(mintCount(html), 0, 'the trust panel must not have a mint button');
});

test('the suppression count comes from the scenario, not the screen', () => {
  const fewer = clone(fixture);
  fewer.suppression.count = 17;
  assert.ok(text(renderTrust(fewer)).includes("Didn't bother you: 17 items"));
  assert.ok(!text(renderTrust(fewer)).includes('41 items'));

  const none = clone(fixture);
  none.suppression.count = 0;
  assert.ok(text(renderTrust(none)).includes("Didn't bother you: 0 items"));
});

test('a contract-less scenario lists the renewal terms as something it cannot see', () => {
  const noContract = clone(fixture);
  noContract.contracts = [];

  const html = renderTrust(noContract);
  const copy = text(html);
  assert.ok(copy.includes('the renewal terms'), 'missing the renewal-terms gap');
  assert.ok(copy.includes('net burn'), 'run rate should still render');
  for (const bad of badTokens) assert.ok(!copy.includes(bad), `contract-less trust contains ${bad}`);
});

// ---------------------------------------------------------------------------
// Ask-Rho.

test('claude answers with the raiseBy date, range words, and attribute months', () => {
  const d = raiseBy(clone(fixture));
  const a = attribute(clone(fixture));
  const [signed, uncertain] = displayTenths(a.segments.map((x) => x.months), a.totalMonths);
  const copy = text(renderClaude(clone(fixture)));

  assert.ok(copy.includes('When should we start raising?'), 'question missing');
  assert.ok(copy.includes('Apr 11, 2027'), 'date is not the raiseBy date');
  assert.ok(copy.includes('(early March to late April)'), 'range words do not match the Reveal band');
  assert.ok(copy.includes('when you would have 6 months of cash left'), 'cushion missing');
  assert.ok(
    copy.includes(`It moved ${a.totalMonths.toFixed(1)} months earlier mainly because of 3 new hires and the HubSpot renewal.`),
    'months or reasons are not derived'
  );
  assert.ok(
    copy.includes(
      `Sales is the uncertain part (${(uncertain / 10).toFixed(1)} of ${a.totalMonths.toFixed(1)} months).`
    ),
    'sales segment is not the displayTenths figure'
  );
  assert.equal(signed + uncertain, Math.round(a.totalMonths * 10), 'tenths must sum to the total');
  assert.equal(mintCount(renderClaude(clone(fixture))), 0, 'Ask-Rho must stay read-only (no mint button)');
  for (const chip of ['Rho raise-by', 'HubSpot order form p.2', 'Gusto debits']) {
    assert.ok(copy.includes(chip), `source chip missing: ${chip}`);
  }
  for (const chip of ['When should we start raising?', 'What changed this week?', "What's still uncertain?"]) {
    assert.ok(copy.includes(chip), `question chip missing: ${chip}`);
  }
});

test('claude names only the sources the scenario actually carries', () => {
  const bare = clone(fixture);
  bare.contracts = [];
  bare.payroll = [];
  const bareCopy = text(renderClaude(bare));
  assert.ok(bareCopy.includes('Rho raise-by'), 'the Rho chip must always stay');
  assert.ok(!bareCopy.includes('order form'), 'invented a contract source for a contract-less company');
  assert.ok(!bareCopy.includes('Gusto debits'), 'invented a payroll source for a payroll-less company');

  const noContract = clone(fixture);
  noContract.contracts = [];
  const noContractCopy = text(renderClaude(noContract));
  assert.ok(!noContractCopy.includes('order form'), 'contract chip without a contract');
  assert.ok(noContractCopy.includes('Gusto debits'), 'payroll chip should survive a missing contract');

  const noPayroll = clone(fixture);
  noPayroll.payroll = [];
  const noPayrollCopy = text(renderClaude(noPayroll));
  assert.ok(noPayrollCopy.includes('HubSpot order form p.2'), 'contract chip should survive missing payroll');
  assert.ok(!noPayrollCopy.includes('Gusto debits'), 'payroll chip without payroll');

  const fixtureCopy = text(renderClaude(clone(fixture)));
  assert.ok(fixtureCopy.includes('HubSpot order form p.2'), 'fixture contract chip changed');
  assert.ok(fixtureCopy.includes('Gusto debits'), 'fixture payroll chip changed');
});

test('claude reads the confirmed scenario, where sales is the uncertain part', () => {
  const confirmed = clone(fixture);
  confirmed.payroll.forEach((p) => (p.confirmed = true));
  const a = attribute(confirmed);
  const [, uncertain] = displayTenths(a.segments.map((x) => x.months), a.totalMonths);
  const copy = text(renderClaude(confirmed));

  assert.equal((uncertain / 10).toFixed(1), '0.6', 'confirmed sales segment should be 0.6');
  assert.ok(copy.includes('Sales is the uncertain part (0.6 of 3.0 months).'), `wrong confirmed answer: ${copy}`);
});

test('claude prints no date at all when raiseBy is null', () => {
  const never = clone(fixture);
  never.cash = 200000000000; // $2B: cash never crosses the buffer in the horizon
  assert.equal(raiseBy(never), null, 'scenario must have no raise-by date');

  const html = renderClaude(never);
  const copy = text(html);
  assert.ok(copy.includes('No raise-by date yet.'), 'missing the no-date answer');
  assert.ok(!copy.includes('Rho estimates'), 'the dated answer still printed');
  for (const bad of badTokens) assert.ok(!html.includes(bad), `null raiseBy output contains ${bad}`);
});

test('contract-less scenarios render on claude and invoices without inventing terms', () => {
  const noContract = clone(fixture);
  noContract.contracts = [];

  const answer = text(renderClaude(noContract));
  assert.ok(answer.includes('Rho estimates'), 'a crossing scenario should still answer');
  assert.ok(!answer.includes('the HubSpot renewal'), 'invented a renewal for a contract-less company');
  for (const bad of badTokens) assert.ok(!answer.includes(bad), `contract-less claude contains ${bad}`);

  const invoiceCopy = text(renderInvoices(noContract));
  assert.ok(invoiceCopy.includes('Draft 2 reminders'), 'invoices should still render');
  assert.ok(!invoiceCopy.includes('about null days'), 'invoices printed a null delta');
  for (const bad of badTokens) assert.ok(!invoiceCopy.includes(bad), `contract-less invoices contains ${bad}`);
});

test('the four new screens carry no em dash and no wall clock', () => {
  for (const name of ['invoices.js', 'alerts.js', 'trust.js', 'claude.js']) {
    const src = readFileSync(new URL(`../public/js/screens/${name}`, import.meta.url), 'utf8');
    assert.ok(!src.includes('—'), `${name} contains an em dash`);
    assert.ok(!/Date\.now\s*\(/.test(src), `${name} reads Date.now()`);
  }
});
