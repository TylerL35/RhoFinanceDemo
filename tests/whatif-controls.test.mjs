import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseWhatIf, suggestionsFor, applyKnobs, defaultKnobs, knobsActive, tidy,
} from '../public/js/whatif-model.js';
import { parseIntent } from '../public/js/intents.js';
import { raiseBy } from '../public/js/engine.js';
import { whatifHtml } from '../public/js/screens/whatif.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8'));
const clone = (x) => structuredClone(x);
const iso = (d) => d.toISOString().slice(0, 10);
const base = defaultKnobs(fx);

// ---------------------------------------------------------------------------
// The forgiving parser: everyday phrasings land on the same knob change as
// the strict grammar. Each row: what a person types -> the knobs it sets.

const TABLE = [
  ['hire 2 more in March', { hires: 2, hireMonth: '2027-03-01' }],
  ['what if we hire two engineers in april', { hires: 2, hireMonth: '2027-04-01' }],
  ['add 3 people', { hires: 3, hireMonth: '2026-12-01' }],
  ['hire an engineer', { hires: 1, hireMonth: '2026-12-01' }],
  ['Hire a designer in June 2027', { hires: 1, hireMonth: '2027-06-01' }],
  ['bring on 2 devs next month', { hires: 2, hireMonth: '2026-12-01' }],
  ['two more hires in may', { hires: 2, hireMonth: '2027-05-01' }],
  ['what if we add 2 people starting march?', { hires: 2, hireMonth: '2027-03-01' }],
  ['hiring 3 in 2 months', { hires: 3, hireMonth: '2027-01-01' }],
  ['5 engineers in july', { hires: 5, hireMonth: '2027-07-01' }],
  ['cushion 9 months', { cushion: 9 }],
  ['9 month cushion', { cushion: 9 }],
  ['a 12-month buffer', { cushion: 12 }],
  ['set cushion to 8', { cushion: 8 }],
  ['raise takes 3 more months', { cushion: 9 }],
  ['fundraising takes 2 extra months', { cushion: 8 }],
  ['what if the round takes 4 months longer', { cushion: 10 }],
  ['prices up 10%', { price: 10 }],
  ['increase prices by 15 percent', { price: 15 }],
  ['10% price increase', { price: 10 }],
  ['bump pricing 5%', { price: 5 }],
  ['drop hubspot', { contract: 'cancel' }],
  ['kill the hubspot contract', { contract: 'cancel' }],
  ["don't renew HubSpot", { contract: 'cancel' }],
  ['cancel the renewal', { contract: 'cancel' }],
  ['move hubspot to monthly', { contract: 'monthly' }],
  ['pay hubspot monthly', { contract: 'monthly' }],
  ['hubspot month to month', { contract: 'monthly' }],
];

for (const [phrase, expected] of TABLE) {
  test(`"${phrase}" is understood`, () => {
    const r = parseWhatIf(phrase, fx);
    assert.equal(r.ok, true, `refused: ${r.reason}`);
    assert.deepEqual(r.knobs, { ...base, ...expected });
    assert.match(r.echo, /^I read that as: /, 'the echo still says what it understood');
  });
}

test('the strict grammar still has the last word on what is refused', () => {
  const delay = parseWhatIf('postpone the raise', fx);
  assert.equal(delay.ok, false);
  assert.match(delay.reason, /start later/, 'delay must explain itself, not map to the cushion');

  const late = clone(fx);
  late.asOf = '2026-11-25';
  const closed = parseWhatIf('drop hubspot', late);
  assert.equal(closed.ok, false);
  assert.equal(closed.reason, 'The notice window for HubSpot is closed, so it renews automatically.');

  for (const nonsense of ['fire everyone', 'what about revenue', 'cut costs', '']) {
    assert.equal(parseWhatIf(nonsense, fx).ok, false, `${nonsense} was accepted`);
  }
});

test('a refusal offers up to two sentences that do work, ranked by the words typed', () => {
  assert.deepEqual(suggestionsFor('what about revenue', fx), ['raise prices 10%']);
  assert.deepEqual(suggestionsFor('hubspot', fx), ['cancel hubspot', 'switch hubspot to monthly']);
  for (const s of suggestionsFor('blah', fx)) assert.equal(parseIntent(s, fx).ok, true, `${s} would be refused`);
  assert.ok(suggestionsFor('blah', fx).length <= 2);
});

test('tidy turns number words into digits and drops punctuation', () => {
  assert.equal(tidy('What if we hire TWO engineers?'), 'what if we hire 2 engineers?'.replace('?', ''));
  assert.equal(tidy('prices up 10 percent'), 'prices up 10%');
  assert.equal(tidy('hire a designer'), 'hire 1 designer');
});

// ---------------------------------------------------------------------------
// Controls and typing are one mechanism.

test('a control and the typed sentence land on the same date', () => {
  const typed = parseWhatIf('hire 2 more in March', fx).knobs;
  const tapped = { ...base, hires: 2, hireMonth: '2027-03-01' };
  assert.equal(iso(raiseBy(applyKnobs(fx, typed))), iso(raiseBy(applyKnobs(fx, tapped))));
  assert.equal(iso(raiseBy(applyKnobs(fx, tapped))), '2027-03-22');

  const monthly = applyKnobs(fx, { ...base, contract: 'monthly' });
  const viaGrammar = clone(fx);
  parseIntent('switch hubspot to monthly', fx).mutation(viaGrammar);
  assert.equal(iso(raiseBy(monthly)), iso(raiseBy(viaGrammar)));
});

test('applyKnobs never mutates the real company and never compounds', () => {
  const real = clone(fx);
  const k = { ...base, hires: 2, price: 10, cushion: 9, contract: 'cancel' };
  const once = applyKnobs(real, k);
  const twice = applyKnobs(real, k);
  assert.deepEqual(real, fx, 'the real company changed');
  assert.deepEqual(once, twice, 'applying the same knobs twice gave different scenarios');
  assert.equal(once.revenue.current, 43010000, 'prices +10% on $391K');
  assert.equal(knobsActive(base), false);
  assert.equal(knobsActive(k), true);
});

// ---------------------------------------------------------------------------
// The app: taps, typing, undo, reset, and real decisions underneath.

async function boot() {
  const store = new Map();
  const root = (globalThis.__rbKnobRoot ??= { innerHTML: '' });
  const echo = { textContent: '' };
  const input = { value: '' };
  globalThis.location = { search: '', hash: '#/reveal' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = {
    getElementById: (id) => (id === 'whatif' ? input : id === 'whatif-echo' ? echo : root),
  };
  globalThis.fetch = async () => ({ json: async () => clone(fx) });
  const { app } = await import('../public/js/app.js');
  await app.boot();
  app.reset();
  app.route = '/reveal';
  return { app, input, root };
}

test('tapping Hires + twice adds two hypothetical hires; Undo and Reset take them away', async () => {
  const { app } = await boot();
  app.knob('hires', 1);
  app.knob('hires', 1);
  assert.equal(app.state.scenario.payroll.filter((p) => p.whatif).length, 2);
  assert.equal(app.state.intentBase.payroll.length, 3, 'the real company gained a hire');
  assert.match(app.state.lastEcho, /^2 more hires from December 2026, \+\$18K\/mo\.$/);
  assert.ok(app.state.whatifResult.endsWith('earlier.'), app.state.whatifResult);

  app.undoWhatIf();
  assert.equal(app.state.scenario.payroll.filter((p) => p.whatif).length, 1);
  app.resetWhatIf();
  assert.equal(app.state.intentBase, null, 'Reset left a what-if on');
  assert.equal(app.state.scenario.payroll.length, 3);
  assert.deepEqual(app.state.appliedIntents, []);
});

test('typing in plain words goes through the same path, and a refusal offers suggestions', async () => {
  const { app, input } = await boot();
  input.value = 'what if we hire two engineers in march';
  app.applyWhatIf();
  assert.equal(iso(raiseBy(app.state.scenario)), '2027-03-22');

  input.value = 'what about revenue';
  app.applyWhatIf();
  assert.equal(app.state.lastEchoOk, false);
  assert.deepEqual(app.state.suggestions, ['raise prices 10%']);
  assert.equal(iso(raiseBy(app.state.scenario)), '2027-03-22', 'a refusal changed the date');

  app.applyWhatIf('raise prices 10%');
  assert.equal(app.state.knobs.price, 10);
  assert.equal(app.state.knobs.hires, 2, 'the second what-if replaced the first');
});

test('a real decision made during a what-if survives Reset', async () => {
  const { app } = await boot();
  app.knob('cushion', 3);
  app.confirmPayroll('yes');
  app.choose('cancel');
  app.resetWhatIf();
  assert.ok(app.state.scenario.payroll.every((p) => p.confirmed), 'the confirmation was lost');
  assert.equal(app.state.scenario.contracts[0].choice, 'cancel', 'the renewal choice was lost');
  assert.equal(app.state.scenario.cushionMonths, 6);
});

test('the controls render as ghost buttons with stable ids, Cancel disabled once the window closes', () => {
  const html = whatifHtml({ scenario: clone(fx), appliedIntents: [] });
  for (const id of ['knob-hires-up', 'knob-hires-down', 'knob-month', 'knob-cushion-up', 'knob-price-10', 'knob-contract-cancel']) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }
  assert.equal((html.match(/<button class="btn"(?![^>]*ghost)/g) ?? []).length, 0, 'what-if controls must not be mint');
  assert.ok(html.includes('$9K a month each'), 'hire cost is not shown');

  const late = clone(fx);
  late.asOf = '2026-11-25';
  const closed = whatifHtml({ scenario: late, appliedIntents: [] });
  assert.match(closed, /id="knob-contract-cancel"[^>]*disabled/);

  const local = clone(fx);
  local.payroll = [];
  assert.ok(!whatifHtml({ scenario: local }).includes('knob-hires-up'), 'no hire control without a payroll baseline');
});

test('a typed hire in a new month replaces the earlier what-if hires; the same month adds', () => {
  const k1 = parseWhatIf('hire 2 in March', fx).knobs;
  const same = parseWhatIf('hire 1 more in March', fx, k1).knobs;
  assert.deepEqual([same.hires, same.hireMonth], [3, '2027-03-01']);
  const moved = parseWhatIf('hire two engineers in april', fx, k1).knobs;
  assert.deepEqual([moved.hires, moved.hireMonth], [2, '2027-04-01'], 'the echo says 2 hires from April');
});

test('a refused sentence stays in the box so it can be fixed', async () => {
  const { app, input } = await boot();
  input.value = 'what about revenue';
  app.applyWhatIf();
  assert.equal(app.state.whatifDraft, 'what about revenue');
  assert.ok(whatifHtml(app.state).includes('value="what about revenue"'));
  app.applyWhatIf('raise prices 10%');
  assert.equal(app.state.whatifDraft, '');
});
