import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIntent } from '../public/js/intents.js';
import { attribute, raiseBy } from '../public/js/engine.js';
import { shortUsd, shortUsd1 } from '../public/js/money.js';
import { reveal } from '../public/js/screens/reveal.js';
import { home } from '../public/js/screens/home.js';
import { claude } from '../public/js/screens/claude.js';
import { trust } from '../public/js/screens/trust.js';
import { invoices } from '../public/js/screens/invoices.js';
import { confirmHtml } from '../public/js/screens/confirm.js';
import { barHtml } from '../public/js/screens/bar.js';
import { buildScenario } from '../public/js/screens/setup.js';

const fixture = JSON.parse(
  readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
);
const clone = (x) => structuredClone(x);
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const badTokens = ['Invalid Date', '1970', 'NaN', 'undefined'];

// A state as app.applyWhatIf leaves it: the real company kept as intentBase,
// the hypothetical applied to scenario.
function withWhatIf(base, phrase) {
  const real = clone(base);
  const sc = clone(base);
  parseIntent(phrase, sc).mutation(sc);
  return {
    scenario: sc,
    intentBase: real,
    appliedIntents: [{ text: phrase, echo: '', before: clone(real) }],
    confirmations: { payroll: null },
    choice: { hubspot: null },
    guesses: { made: false, value: null },
  };
}

// ---------------------------------------------------------------------------
// What-if never leaks into what the real company has signed.

test('a what-if hire is not asked about, not confirmed, and not counted as signed', () => {
  const state = withWhatIf(fixture, 'hire 2 more in March');
  const card = text(confirmHtml(state));
  assert.ok(card.includes('rose $27K a month in Oct. Is that 3 new hires?'), `confirm card: ${card}`);
  assert.ok(!card.includes('$45K') && !card.includes('5 new hires'), 'what-if hires reached the confirm card');

  const bar = text(barHtml(state));
  assert.ok(bar.includes("0.4 months from what you've signed"), `bar: ${bar}`);
  assert.ok(bar.includes('2.6 months not certain yet'));
  assert.deepEqual(
    attribute(state.intentBase).segments.map((s) => s.days),
    attribute(fixture).segments.map((s) => s.days),
    'the real company attribution changed under a what-if'
  );

  const ask = text(claude({ state: { ...state, ask: 'when' } }));
  assert.ok(ask.includes('mainly because of 3 new hires'), `ask: ${ask}`);
  assert.ok(ask.includes('Your what-if (hire 2 more in March) would move it to Mar 22.'));
});

test('confirmed hires plus a what-if: the bar still explains reality', () => {
  const confirmed = clone(fixture);
  confirmed.payroll.forEach((p) => (p.confirmed = true));
  const state = withWhatIf(confirmed, 'hire 2 more in March');
  state.confirmations.payroll = 'yes';
  const bar = text(barHtml(state));
  assert.ok(bar.includes("2.4 months from what you've signed"), `bar: ${bar}`);
  assert.ok(bar.includes('0.6 months not certain yet'));
  assert.ok(text(confirmHtml(state)).includes('Payroll confirmed by you: $27K a month'), 'confirmed line counted what-if rows');
});

test('the reveal names the what-if and the date without it', () => {
  const state = withWhatIf(fixture, 'hire 2 more in March');
  const copy = text(reveal({ state }));
  assert.ok(copy.includes('PILOT · WHAT-IF'), 'the eyebrow does not mark the what-if');
  assert.ok(copy.includes('Start raising by late March 2027.'), `headline: ${copy.slice(0, 400)}`);
  assert.ok(copy.includes('Without your what-if: mid-April (Apr 11). This is 20 days earlier.'));
  assert.ok(copy.includes('Before what-if'), 'the timeline does not show where the date was');
  for (const bad of badTokens) assert.ok(!copy.includes(bad), `what-if reveal contains ${bad}`);
});

// ---------------------------------------------------------------------------
// The guess pays off.

test('the reveal answers the guess', () => {
  const state = { scenario: clone(fixture), guesses: { made: true, value: 'Jul' } };
  const copy = text(reveal({ state }));
  assert.ok(copy.includes('You guessed Jul 2027'), 'the guess is not shown back');
  assert.ok(copy.includes('About 3 months sooner than you thought.'));

  const apr = text(reveal({ state: { scenario: clone(fixture), guesses: { made: true, value: 'May' } } }));
  assert.ok(apr.includes('About 1 month sooner than you thought.'));

  const none = text(reveal({ state: { scenario: clone(fixture) } }));
  assert.ok(!none.includes('You guessed'), 'no guess, no guess line');
});

test('home offers the four guess chips with their keys and derives the cushion words', () => {
  const html = home({ state: { scenario: clone(fixture), guesses: { made: true, value: 'Jun' } } });
  const copy = text(html);
  assert.ok(copy.includes('1 May 2027') && copy.includes('4 Aug 2027'), 'chips do not show their keys');
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1, 'the picked guess is not marked');
  assert.ok(copy.includes('when six months of cash remain'));
  const nine = clone(fixture);
  nine.cushionMonths = 9;
  assert.ok(text(home({ state: { scenario: nine } })).includes('when nine months of cash remain'), 'cushion words are literal');
});

// ---------------------------------------------------------------------------
// A judge's own numbers never borrow the demo company's story.

test('a local company reveal has no plan story and no fixture labels', () => {
  const sc = buildScenario({
    cash: '900,000', revenue: '60000', spend: '$90,000', cushion: '6', asOf: '2026-11-11',
    vendor: 'Figma', amount: '12000', renewsOn: '2027-02-15', noticeDays: '30',
  });
  const html = reveal({ state: { scenario: sc } });
  const copy = text(html);
  assert.ok(copy.includes('Start raising by late October 2028.'), `headline: ${copy.slice(0, 300)}`);
  assert.ok(copy.includes('A single date, not a range: there is no revenue history yet.'));
  for (const leak of ['Gusto', 'Why your date moved', 'late October to late October', 'last 0 months', 'Revenue deposits', 'behind plan']) {
    assert.ok(!copy.includes(leak), `local reveal printed "${leak}"`);
  }
  assert.ok(copy.includes('Entered by you'), 'local sources are not labelled as entered');
  assert.ok(copy.includes('Back to the demo company'), 'no way back to the demo');
  assert.ok(!copy.includes('hire 2 more'), 'the hint suggests a hire the grammar will refuse');
  for (const bad of badTokens) assert.ok(!html.includes(bad), `local reveal contains ${bad}`);
});

test('a local company with no invoices says so instead of "$0 behind plan"', () => {
  const sc = buildScenario({
    cash: '900000', revenue: '60000', spend: '90000', cushion: '6', asOf: '',
    vendor: '', amount: '', renewsOn: '', noticeDays: '',
  });
  const copy = text(invoices({ state: { scenario: sc } }));
  assert.ok(copy.includes('Sales are on plan.'));
  assert.ok(copy.includes('No invoices connected.'));
  assert.ok(!copy.includes('$0 a month behind'));
});

// ---------------------------------------------------------------------------
// Ask Rho: three questions, three derived answers.

test('Ask Rho chips switch between three derived answers', () => {
  const confirmed = clone(fixture);
  confirmed.payroll.forEach((p) => (p.confirmed = true));
  const ask = (q) => text(claude({ state: { scenario: clone(confirmed), ask: q } }));

  assert.ok(ask('when').includes('Rho estimates Apr 11, 2027 (range Mar 1 to Apr 28)'));
  assert.ok(ask('when').includes('Sales is the uncertain part (0.6 of 3.0 months).'));
  assert.ok(
    ask('changed').includes('This week payroll rose $27K a month (3 hires, from Gusto debits), and the $60K HubSpot renewal on Dec 20 now lands before your date. With sales $9K a month behind plan, the date moved from Jul 12 to Apr 11.'),
    ask('changed')
  );
  assert.ok(
    ask('uncertain').includes('Sales. Over your last 4 months revenue ran at 96% of plan, so the range runs from Mar 1 to Apr 28 ($366K to $400K a month).'),
    ask('uncertain')
  );
  const html = claude({ state: { scenario: clone(confirmed), ask: 'changed' } });
  assert.ok(html.includes(`onclick="app.ask('uncertain')"`), 'chips are not live');
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
});

// ---------------------------------------------------------------------------
// Trust leads with how much is signed.

test('trust leads with the signed share, from the same split as the bar', () => {
  const confirmed = clone(fixture);
  confirmed.payroll.forEach((p) => (p.confirmed = true));
  const copy = text(trust({ state: { scenario: confirmed } }));
  assert.ok(copy.includes('About three quarters is already signed.'), copy.slice(0, 600));
  assert.ok(copy.includes('2.4 of the 3.0 months your date moved come from things you have signed: 3 hires and the HubSpot renewal.'));

  const before = text(trust({ state: { scenario: clone(fixture) } }));
  assert.ok(before.includes('Little of it is signed yet.'), 'before confirming, little is signed');

  const answered = text(trust({ state: { scenario: confirmed, trust: 'share' } }));
  assert.ok(answered.includes('Not created in this demo.'), 'the share button has no response');
});

// ---------------------------------------------------------------------------
// Formatting.

test('money prints two decimals for millions and one for small rates', () => {
  assert.equal(shortUsd(204000000), '$2.04M');
  assert.equal(shortUsd(210000000), '$2.1M');
  assert.equal(shortUsd(300000000), '$3M');
  assert.equal(shortUsd1(611100), '$6.1K');
  assert.equal(shortUsd1(600000), '$6K');
  assert.equal(shortUsd1(1222200), '$12K');
});

test('the sidebar is Rho-shaped: real items inert, demo items live, counts derived', () => {
  const html = home({ state: { scenario: clone(fixture) } });
  for (const inert of ['Transactions', 'Accounts', 'Cards', 'Vendors', 'Reporting', 'Expenses', 'Reimbursements', 'Accounting']) {
    assert.ok(new RegExp(`<span class="nav-inert" title="Not part of this demo"><svg class="nav-ico"(?:(?!</svg>)[^])*</svg><span>${inert}</span></span>`).test(html), `${inert} is not inert`);
  }
  assert.ok(html.includes('Demo Co.'), 'company name missing');
  assert.ok(/Invoicing<\/span><span class="count">2<\/span>/.test(html), 'overdue invoice count is not derived');
  const paid = clone(fixture);
  paid.invoices.forEach((i) => (i.collected = true));
  assert.ok(!/Invoicing<\/span><span class="count">/.test(home({ state: { scenario: paid } })), 'count survives collection');
});

test('no screen source carries an em dash or a raw ISO date in its copy', () => {
  for (const name of ['reveal', 'bill', 'invoices', 'alerts', 'trust', 'claude', 'home', 'setup', 'bar', 'confirm', 'whatif', 'timeline', 'common']) {
    const src = readFileSync(new URL(`../public/js/screens/${name}.js`, import.meta.url), 'utf8');
    assert.ok(!src.includes('—'), `${name}.js contains an em dash`);
  }
  const copy = text(reveal({ state: { scenario: clone(fixture) } }));
  assert.ok(!/20\d\d-\d\d-\d\d/.test(copy), 'an ISO date leaked into the reveal');
  assert.ok(raiseBy(fixture), 'fixture still crosses');
});

test('after cancelling the renewal, nothing calls it a reason the date moved', () => {
  const sc = clone(fixture);
  sc.payroll.forEach((p) => (p.confirmed = true));
  sc.contracts[0].choice = 'cancel';
  const when = text(claude({ state: { scenario: sc, ask: 'when' } }));
  assert.ok(when.includes('Rho estimates Apr 20, 2027'), when);
  assert.ok(when.includes('mainly because of 3 new hires.'), when);
  assert.ok(!when.includes('and the HubSpot renewal'), 'a cancelled renewal is still named as a reason');
  const bar = text(barHtml({ scenario: sc }));
  assert.ok(bar.includes('3 hires') && !bar.includes('HubSpot renewal'), bar);
});

test('a date more than a year out prints its year exactly once', () => {
  const sc = clone(fixture);
  sc.revenue.current = sc.plan.plannedRevenue + 3000000; // ahead of plan: the anchor lands late 2027
  sc.cushionMonths = 3;
  for (const html of [barHtml({ scenario: sc }), claude({ state: { scenario: sc, ask: 'when' } })]) {
    const copy = text(html);
    assert.ok(!/\b(20\d\d), \1\b/.test(copy), `year printed twice: ${copy.match(/\w+ \d+, 20\d\d, 20\d\d/)?.[0]}`);
  }
  const anchor = text(barHtml({ scenario: clone(fixture) }));
  assert.ok(anchor.includes('Compared with Jul 12, 2027, the date'), anchor);
});
