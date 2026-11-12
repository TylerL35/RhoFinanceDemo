import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
);

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const render = async (scenario, choice = null) => {
  const { bill } = await import('../public/js/screens/bill.js');
  return bill({ state: { scenario, choice: { hubspot: choice } } });
};

const mintCount = (html) => (html.match(/<button class="btn"(?![^>]*ghost)/g) ?? []).length;

test('bill prints the derived header and notice window for the fixture', async () => {
  const html = await render(structuredClone(fixture));
  const copy = text(html);

  assert.ok(copy.includes('HubSpot, annual renewal, $60,000.'), 'renewal header missing');
  assert.ok(
    copy.includes('Auto-renews Dec 20. Already in your raise-by date.'),
    'renewal date sentence missing'
  );
  assert.ok(copy.includes('9 days left to change it'), 'days left missing');
  assert.ok(copy.includes('Cancel window closes Nov 20.'), 'deadline sentence missing');
  assert.ok(copy.includes('Order form p.2'), 'order form quote missing');
  assert.ok(
    copy.includes(
      'Draft opens in your email. You review and send. Monthly plans can cost more, so the net shows once they quote.'
    ),
    'closing note is not verbatim'
  );
});

test('bill prices all three options from priceOption, in order, with derived dates', async () => {
  const html = await render(structuredClone(fixture));
  const copy = text(html);

  const approve = copy.indexOf('Approve as is Apr 11 no change');
  const monthly = copy.indexOf('Ask for monthly Apr 12 about a day later');
  const cancel = copy.indexOf('Cancel Apr 20 about 9 days later');
  assert.ok(approve >= 0, `approve label missing: ${copy.slice(0, 400)}`);
  assert.ok(monthly >= 0, 'monthly label missing');
  assert.ok(cancel >= 0, 'cancel label missing');
  assert.ok(approve < monthly && monthly < cancel, 'options are out of order');

  const { priceOption } = await import('../public/js/engine.js');
  const { fmtMonthDay } = await import('../public/js/calendar.js');
  for (const kind of ['approve', 'monthly', 'cancel']) {
    const o = priceOption(fixture, kind);
    assert.ok(copy.includes(fmtMonthDay(o.date)), `${kind} date is not the priced date`);
  }
});

test('bill derives the notice window instead of hardcoding it', async () => {
  const moved = structuredClone(fixture);
  moved.contracts[0].renewsOn = '2026-12-05';
  moved.contracts[0].noticeDays = 20;

  const copy = text(await render(moved));
  assert.ok(copy.includes('Auto-renews Dec 5.'), 'renewal date did not follow the contract');
  assert.ok(copy.includes('4 days left to change it'), 'days left did not follow noticeState');
  assert.ok(copy.includes('Cancel window closes Nov 15.'), 'deadline did not follow noticeState');
});

test('bill reads the notice window for a use-my-numbers contract', async () => {
  const local = structuredClone(fixture);
  local.contracts = [{
    id: 'main', vendor: 'Figma', amount: 2400000, renewsOn: '2026-12-20',
    noticeDays: 30, term: 'annual', monthlyEquivalent: 200000, choice: null,
    source: 'Entered by you',
  }];

  const copy = text(await render(local));
  assert.ok(copy.includes('Figma, annual renewal, $24,000.'), 'local contract header missing');
  assert.ok(copy.includes('9 days left to change it'), 'notice window not derived for id main');
  assert.ok(copy.includes('Cancel window closes Nov 20.'), 'deadline not derived for id main');
});

test('bill reads the notice window for whichever contract it shows, not the known id', async () => {
  // contracts[0] is the contract the screen renders; a 'hubspot' contract still
  // sits in the array, so a window borrowed from noticeState() would be wrong.
  const mixed = structuredClone(fixture);
  mixed.contracts = [
    {
      id: 'main', vendor: 'Figma', amount: 2400000, renewsOn: '2026-12-05',
      noticeDays: 20, term: 'annual', monthlyEquivalent: 200000, choice: null,
      source: 'Entered by you',
    },
    structuredClone(fixture.contracts[0]),
  ];

  const copy = text(await render(mixed));
  assert.ok(copy.includes('Figma, annual renewal, $24,000.'), 'local contract header missing');
  assert.ok(copy.includes('4 days left to change it'), 'window did not follow contracts[0]');
  assert.ok(copy.includes('Cancel window closes Nov 15.'), 'deadline came from the hubspot contract');
});

test('bill has no catch-all around noticeState, so engine errors surface', async () => {
  const src = readFileSync(new URL('../public/js/screens/bill.js', import.meta.url), 'utf8');
  assert.ok(!/\bcatch\s*\(/.test(src), 'bill.js swallows errors again');
});

test('the burn chip is the as-of month net burn per day, not a literal', async () => {
  const { netBurn, parseDate } = await import('../public/js/engine.js');
  const { MONTH_DAYS } = await import('../public/js/calendar.js');
  const { shortUsd1 } = await import('../public/js/money.js');

  // One month length everywhere: MONTH_DAYS (365.25 / 12), never a local 30.4.
  const asOf = parseDate(fixture.asOf);
  const perDay = netBurn(fixture, asOf.getUTCFullYear(), asOf.getUTCMonth() + 1) / MONTH_DAYS;
  assert.equal(shortUsd1(perDay), '$6.1K', 'fixture day burn should print as $6.1K');

  const copy = text(await render(structuredClone(fixture)));
  assert.ok(copy.includes('$6.1K a day burn'), `fixture chip must read "$6.1K a day burn": ${copy}`);
  assert.ok(!copy.includes('$6K a day burn'), 'chip fell back to the coarser shortUsd figure');

  // Double the burn (gross 763,000 - revenue 391,000 = 372,000/mo vs 186,000)
  // and the chip must move.
  const hotter = structuredClone(fixture);
  hotter.plan.plannedGrossSpend = 73600000;
  const hotterPerDay = netBurn(hotter, asOf.getUTCFullYear(), asOf.getUTCMonth() + 1) / MONTH_DAYS;
  const hotterCopy = text(await render(hotter));
  assert.equal(shortUsd1(hotterPerDay), '$12K');
  assert.ok(hotterCopy.includes('$12K a day burn'), `double-burn chip missing: ${hotterCopy}`);

  const src = readFileSync(new URL('../public/js/screens/bill.js', import.meta.url), 'utf8');
  assert.ok(!/30\.4\b/.test(src), 'bill.js uses a local month length instead of MONTH_DAYS');
});

test('unused chips are gone', async () => {
  const copy = text(await render(structuredClone(fixture)));
  assert.ok(!copy.includes('Open order form'), 'unbacked "Open order form" chip is still there');
  assert.ok(!copy.includes("Last year's charge"), "unbacked \"Last year's charge\" chip is still there");
  assert.ok(!copy.includes('$6.3K'), 'hardcoded $6.3K burn is still there');
});

test('a null raiseBy drops the raise-by claim and says there is no date yet', async () => {
  const rich = structuredClone(fixture);
  rich.cash = 200000000000; // $2B: cash never crosses the buffer in the horizon

  const { raiseBy } = await import('../public/js/engine.js');
  assert.equal(raiseBy(rich), null, 'scenario must have no raise-by date');

  const html = await render(rich);
  const copy = text(html);
  assert.ok(!copy.includes('Already in your raise-by date.'), 'stale "already in" sentence');
  assert.ok(!copy.includes('Ahead of your raise-by date.'), 'stale "ahead of" sentence');
  assert.ok(
    copy.includes('There is no raise-by date yet for this company.'),
    'missing the no-raise-by line'
  );
  assert.ok(html.includes('class="muted"'), 'the no-raise-by line is not muted');
  assert.ok(copy.includes('Auto-renews Dec 20.'), 'renewal date should still print');
  assert.ok(copy.includes('a day burn'), 'burn chip should still print');
  assert.ok(!copy.includes('Invalid Date'), 'options rendered an invalid date');
});

test('bill hides Cancel and says so when the notice window is closed', async () => {
  const late = structuredClone(fixture);
  late.asOf = '2026-11-25';

  const html = await render(late);
  const copy = text(html);

  assert.ok(copy.includes('Notice window closed'), 'closed-window heading missing');
  assert.ok(copy.includes('This one renews automatically.'), 'closed-window lead missing');
  assert.ok(!copy.includes('days left to change it'), 'open-window copy leaked into a closed window');
  assert.ok(!copy.includes("app.choose('cancel')"), 'Cancel option is offered after the deadline');
  assert.ok(copy.includes('Approve as is'), 'approve option still offered');
  assert.ok(copy.includes('Ask for monthly'), 'monthly option still offered');
});

test('bill has no mint button; the chosen option card is the selection', async () => {
  const none = await render(structuredClone(fixture));
  assert.equal(mintCount(none), 0, 'option cards are not mint buttons');
  assert.equal((none.match(/aria-pressed="true"/g) ?? []).length, 0, 'nothing is selected before a choice');
  assert.ok(text(none).includes('Draft opens in your email.'), 'the draft note shows before a choice');

  const chosen = await render(structuredClone(fixture), 'cancel');
  assert.equal(mintCount(chosen), 0);
  assert.equal((chosen.match(/aria-pressed="true"/g) ?? []).length, 1, 'exactly one selected card');
  const copy = text(chosen);
  assert.ok(copy.includes('Selected'), 'selected label missing');
  assert.ok(copy.includes('Notice of non-renewal: HubSpot annual plan'), 'cancel draft subject missing');
  assert.ok(copy.includes('Draft · you review and send'), 'the draft does not say the founder sends it');
  assert.ok(chosen.includes('app.choose(null)'), 'clicking the selected card must clear the choice');

  const monthly = text(await render(structuredClone(fixture), 'monthly'));
  assert.ok(monthly.includes('Moving our HubSpot annual plan to monthly billing'), 'monthly draft subject missing');
  assert.ok(monthly.includes('Monthly plans can cost more, so the net shows once they quote.'));

  const approve = text(await render(structuredClone(fixture), 'approve'));
  assert.ok(approve.includes('$60,000 to HubSpot on Dec 20. Already counted in your date.'));
});

test('reveal states the included choice under the receipt line', async () => {
  const { reveal } = await import('../public/js/screens/reveal.js');
  const cases = [
    ['cancel', 'Includes your HubSpot choice: cancel requested.', 'Apr 20'],
    ['monthly', 'Includes your HubSpot choice: monthly requested.', 'Apr 12'],
    ['approve', 'Includes your HubSpot choice: renewal approved.', 'Apr 11'],
  ];
  for (const [choice, line, date] of cases) {
    const sc = structuredClone(fixture);
    sc.contracts[0].choice = choice;
    const copy = text(reveal({ state: { scenario: sc, choice: { hubspot: choice } } }));
    assert.ok(copy.includes(line), `${choice}: includes line missing`);
    assert.ok(copy.includes(`Base case ${date}`), `${choice}: receipt date did not move`);
  }

  const plain = text(reveal({ state: { scenario: structuredClone(fixture) } }));
  assert.ok(!plain.includes('Includes your HubSpot choice'), 'no choice should print no includes line');
  assert.ok(!plain.includes('—'), 'reveal copy carries no em dash');
});

// Boots app.js with the browser bits stubbed. No ?present, so saveLocal() persists.
async function bootStubbed() {
  const store = new Map();
  const root = (globalThis.__rbRoot ??= { innerHTML: '' });
  root.innerHTML = '';
  globalThis.location = { search: '', hash: '#/' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = { getElementById: () => root };
  globalThis.fetch = async () => ({ json: async () => structuredClone(fixture) });
  return { store, root };
}

test('app.choose records the choice, saves it, and re-renders', async () => {
  const { store, root } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();
  app.state.scenario = structuredClone(fixture);
  app.route = '/bill/hubspot';

  app.choose('cancel');
  assert.equal(app.state.choice.hubspot, 'cancel');
  assert.equal(app.state.scenario.contracts[0].choice, 'cancel');
  assert.equal(JSON.parse(store.get('raise-by.scenario.v1')).contracts[0].choice, 'cancel');
  assert.ok(text(root.innerHTML).includes('9 days left to change it'), 'bill did not re-render');

  app.choose('monthly');
  assert.equal(app.state.choice.hubspot, 'monthly');
  assert.equal(app.state.scenario.contracts[0].choice, 'monthly');

  app.choose(null);
  assert.equal(app.state.choice.hubspot, null);
  assert.equal(app.state.scenario.contracts[0].choice, null);
});

test('app.choose tolerates a contract-less scenario', async () => {
  const { root } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();
  app.state.scenario = structuredClone(fixture);
  app.state.scenario.contracts = [];
  app.route = '/bill/hubspot';

  assert.doesNotThrow(() => app.choose('cancel'));
  assert.equal(app.state.scenario.contracts.length, 0, 'no contract was invented');
  assert.equal(app.state.choice.hubspot, null, 'no choice was recorded');
  assert.ok(root.innerHTML.includes('No contract entered.'), 'bill still renders');
});
