import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIntent, applyIntent } from '../public/js/intents.js';
import { priceOption, raiseBy, range, netBurn, grossSpend } from '../public/js/engine.js';
import { parseDate } from '../public/js/calendar.js';
import { shortUsd } from '../public/js/money.js';
import { clone } from '../public/js/scenario.js';

const fx = JSON.parse(readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url)));

const REFUSE = "I can model hires, contract changes, price changes, and the cushion. I can't model that yet.";

test('hire two more in March', () => {
  const p = parseIntent('hire 2 more in March', fx);
  assert.equal(p.ok, true);
  assert.equal(p.echo, 'I read that as: 2 more hires starting March 2027, +$18K/mo.');

  const sc = clone(fx);
  p.mutation(sc);
  assert.equal(sc.payroll.length, 5);
  assert.equal(sc.payroll[4].startsOn, '2027-03-01');
  assert.equal(sc.payroll[4].monthlyCost, 900000);
  assert.equal(sc.payroll[4].confirmed, false, 'a what-if hire is never confirmed');
  assert.equal(sc.payroll[4].whatif, true, 'a what-if hire is flagged as hypothetical');
  assert.equal(sc.payroll[4].id, 'whatif-2027-03-01-2');
});

test('"delay the raise" is rejected with an explanation, not mapped to cushion', () => {
  const p = parseIntent('delay the raise by 3 months', fx);
  assert.equal(p.ok, false);
  assert.equal(
    p.reason,
    'That reads as "start later", which moves the date later. Try: "the raise takes 3 months longer".'
  );
});

test('a longer raise raises the cushion and says it moves the date earlier', () => {
  const p = parseIntent('the raise takes 3 months longer', fx);
  assert.equal(p.ok, true);
  assert.equal(
    p.echo,
    'I read that as: your raise takes 3 months longer, so you need 9 months of cushion. That moves your date earlier.'
  );

  const sc = clone(fx);
  p.mutation(sc);
  assert.equal(sc.cushionMonths, 9);
});

test('cushion sets the cushion months', () => {
  const p = parseIntent('cushion 8 months', fx);
  assert.equal(p.ok, true);
  assert.match(p.echo, /8 months of cushion/);

  const sc = clone(fx);
  p.mutation(sc);
  assert.equal(sc.cushionMonths, 8);
});

test('unknown input refuses politely with the ruled sentence', () => {
  const p = parseIntent('fire everyone', fx);
  assert.equal(p.ok, false);
  assert.equal(p.reason, REFUSE);
});

test('grammar and control agree on monthly', () => {
  const viaText = clone(fx);
  const p = parseIntent('switch hubspot to monthly', fx);
  assert.equal(p.ok, true);
  p.mutation(viaText);

  const viaButton = clone(fx);
  viaButton.contracts[0].choice = 'monthly';

  // The text and the button must land on the same date, not merely the same
  // price delta. Also prove the comparison is not vacuous.
  assert.notEqual(raiseBy(viaText).getTime(), raiseBy(clone(fx)).getTime());
  assert.equal(raiseBy(viaText).getTime(), raiseBy(viaButton).getTime());
  assert.equal(priceOption(viaText, 'approve').deltaDays, priceOption(viaButton, 'approve').deltaDays);
});

test('cancel is refused when the notice window is closed', () => {
  const closed = clone(fx);
  closed.contracts[0].renewsOn = '2026-12-01';
  const p = parseIntent('cancel hubspot', closed);
  assert.equal(p.ok, false);
  assert.equal(p.reason, 'The notice window for HubSpot is closed, so it renews automatically.');
});

test('cancel names an unknown vendor instead of inventing a contract', () => {
  const p = parseIntent('cancel salesforce', fx);
  assert.equal(p.ok, false);
  assert.equal(p.reason, 'I can\'t find a contract for "salesforce".');
});

test('an open notice window lets cancel through', () => {
  const p = parseIntent('cancel hubspot', fx);
  assert.equal(p.ok, true);
  const sc = clone(fx);
  p.mutation(sc);
  assert.equal(sc.contracts[0].choice, 'cancel');
});

test('a price change scales the base case and both band edges', () => {
  const baseRange = range(fx);
  const p = parseIntent('raise prices 10%', fx);
  assert.equal(p.ok, true);
  assert.match(p.echo, /10% higher from next month/);

  const sc = clone(fx);
  p.mutation(sc);
  assert.equal(sc.revenue.current, 43010000);
  assert.equal(sc.plan.plannedRevenue, 44000000);
  assert.equal(sc.revenue.priceMultiplier, 1);
  assert.equal(
    (sc.revenue.current * sc.revenue.priceMultiplier)
      / (fx.revenue.current * (fx.revenue.priceMultiplier ?? 1)),
    1.1
  );

  const moved = range(sc);
  assert.ok(moved.band.low > baseRange.band.low, 'low band edge did not scale');
  assert.ok(moved.band.high > baseRange.band.high, 'high band edge did not scale');
  assert.ok(moved.low > baseRange.low, 'low band date did not move with the scaled revenue');
  assert.ok(moved.high > baseRange.high, 'high band date did not move with the scaled revenue');
  assert.ok(moved.base > baseRange.base, 'base date did not move with the price change');
});

test('one price intent cannot apply its factor twice', () => {
  const p = parseIntent('raise prices 10%', fx);
  const sc = clone(fx);
  p.mutation(sc);
  const once = clone(sc);
  p.mutation(sc);
  assert.deepEqual(sc, once);
  assert.equal(sc.revenue.current, 43010000);
});

test('a price change keeps the reveal burn provenance equal to the revenue the burn uses', async () => {
  const { reveal } = await import('../public/js/screens/reveal.js');

  const p = parseIntent('raise prices 10%', fx);
  const sc = clone(fx);
  p.mutation(sc);

  const asOf = parseDate(sc.asOf);
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth() + 1;
  const burn = netBurn(sc, y, m);
  const burnRevenue = grossSpend(sc, y, m) - burn;

  // reveal.js prints sc.revenue.current as the burn's provenance revenue, and
  // netBurn() takes the revenue from the same place after the mutation.
  assert.equal(burnRevenue, sc.revenue.current);
  assert.equal(burnRevenue / fx.revenue.current, 1.1);
  assert.ok(reveal({ state: { scenario: sc, choice: {} } }).includes(shortUsd(burn)));
});

test('hire counts above the cap are refused and leave the scenario unchanged', () => {
  for (const text of ['hire 25 more in March', 'hire 999999999 more in March', 'hire 0 more in March']) {
    const p = parseIntent(text, fx);
    assert.equal(p.ok, false, `${text} was accepted`);
    assert.equal(p.reason, 'I can model up to 24 hires in one go.');
    assert.equal(p.mutation, undefined);

    const out = applyIntent(fx, text);
    assert.equal(out.ok, false);
    assert.deepEqual(out.scenario, fx);
  }
});

test('price changes outside 1..100 are refused without touching the scenario', () => {
  for (const text of [
    'raise prices 0%',
    'raise prices 101%',
    `raise prices ${'9'.repeat(30)}%`,
  ]) {
    const p = parseIntent(text, fx);
    assert.equal(p.ok, false);
    assert.equal(p.reason, 'I can model price changes between 1% and 100%.');
    assert.equal(p.mutation, undefined);
    assert.deepEqual(applyIntent(fx, text).scenario, fx);
  }
});

test('the other numeric intents enforce their own bounds', () => {
  const longer = 'I can model up to 24 months longer in one go.';
  const cushion = 'I can model up to 36 months of cushion.';

  assert.equal(parseIntent('the raise takes 25 months longer', fx).reason, longer);
  assert.equal(parseIntent('the raise takes 0 months longer', fx).reason, longer);
  assert.equal(parseIntent('cushion 37 months', fx).reason, cushion);
  assert.equal(parseIntent('cushion 0 months', fx).reason, cushion);

  // The edges of each range still work.
  assert.equal(parseIntent('hire 24 more in March', fx).ok, true);
  assert.equal(parseIntent('the raise takes 24 months longer', fx).ok, true);
  assert.equal(parseIntent('cushion 36 months', fx).ok, true);
  assert.equal(parseIntent('raise prices 100%', fx).ok, true);
});

test('a 400-digit number is refused quickly instead of hanging', () => {
  const huge = '9'.repeat(400);
  const started = performance.now();
  const p = parseIntent(`hire ${huge} more in March`, fx);
  const elapsed = performance.now() - started;

  assert.equal(p.ok, false);
  assert.equal(p.reason, 'I can model up to 24 hires in one go.');
  assert.ok(elapsed < 250, `refusal took ${elapsed}ms`);
});

test('applyIntent returns a new scenario and never mutates its input', () => {
  const before = clone(fx);
  const out = applyIntent(before, 'cancel hubspot');

  assert.equal(out.ok, true);
  assert.equal(out.echo, 'I read that as: cancel the HubSpot renewal before the notice window closes.');
  assert.equal(before.contracts[0].choice, null, 'applyIntent mutated the caller scenario');
  assert.equal(out.scenario.contracts[0].choice, 'cancel');

  const refused = applyIntent(before, 'fire everyone');
  assert.equal(refused.ok, false);
  assert.equal(refused.echo, REFUSE);
  assert.equal(before.contracts[0].choice, null);
  assert.equal(refused.scenario.contracts[0].choice, null);
});

// ---------------------------------------------------------------------------
// The app handlers: the echo precedes the mutation, and Undo restores the
// snapshot taken before the intent.

async function bootStubbed() {
  const store = new Map();
  const root = (globalThis.__rbWhatIfRoot ??= { innerHTML: '' });
  root.innerHTML = '';
  const echo = { textContent: '', style: {} };
  const input = { value: '' };
  globalThis.location = { search: '', hash: '#/' };
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
  return { store, root, echo, input };
}

test('app.applyWhatIf saves the intent, and undo restores the pre-intent snapshot', async () => {
  const { store, echo, input } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();

  app.state.scenario = clone(fx);
  app.route = '/';
  input.value = 'hire 2 more in March';
  app.applyWhatIf();

  assert.equal(app.state.scenario.payroll.length, 5, 'mutation was not applied');
  assert.equal(app.state.appliedIntents.length, 1, 'applied intent was not recorded');
  assert.equal(app.state.appliedIntents[0].echo, 'I read that as: 2 more hires starting March 2027, +$18K/mo.');
  assert.equal(echo.textContent, 'I read that as: 2 more hires starting March 2027, +$18K/mo.');
  assert.equal(JSON.parse(store.get('raise-by.scenario.v1')).payroll.length, 3, 'a what-if was saved as if it were real');

  app.undoWhatIf();

  assert.equal(app.state.scenario.payroll.length, 3, 'undo did not restore the snapshot');
  assert.equal(app.state.appliedIntents.length, 0, 'undo did not pop the recorded intent');
  assert.equal(JSON.parse(store.get('raise-by.scenario.v1')).payroll.length, 3, 'the real company changed on undo');
});

test('app.applyWhatIf refuses without touching the scenario', async () => {
  const { echo, input } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();

  app.state.scenario = clone(fx);
  app.route = '/';
  input.value = 'fire everyone';
  app.applyWhatIf();

  assert.equal(app.state.scenario.payroll.length, 3);
  assert.equal(app.state.appliedIntents.length, 0);
  assert.equal(echo.textContent, REFUSE);
});

test('the what-if box shows the last echo and an Undo only after an intent', async () => {
  const { mountWhatIf } = await import('../public/js/screens/whatif.js');

  const empty = { innerHTML: '' };
  mountWhatIf(empty, { lastEcho: null, appliedIntents: [] });
  assert.ok(empty.innerHTML.includes('What if'));
  assert.ok(empty.innerHTML.includes('id="whatif"'));
  assert.ok(empty.innerHTML.includes('app.applyWhatIf()'), 'the box has no Try it action');
  assert.ok(!empty.innerHTML.includes('app.undoWhatIf()'), 'Undo is shown with no intent');

  const applied = { innerHTML: '' };
  mountWhatIf(applied, {
    lastEcho: 'I read that as: 2 more hires starting March 2027, +$18K/mo.',
    lastEchoOk: true,
    appliedIntents: [{ echo: 'x' }],
  });
  assert.ok(applied.innerHTML.includes('I read that as: 2 more hires starting March 2027, +$18K/mo.'));
  assert.ok(applied.innerHTML.includes('app.undoWhatIf()'), 'Undo is missing after an intent');
});
