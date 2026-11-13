import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { usd } from '../public/js/money.js';
import { deriveFromSnapshot, connect } from '../public/js/screens/connect.js';

const fixture = JSON.parse(
  readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
);
const snapshot = JSON.parse(
  readFileSync(new URL('../public/data/rho-sandbox.snapshot.json', import.meta.url), 'utf8')
);

const clone = (x) => structuredClone(x);
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const mintCount = (html) => (html.match(/<button class="btn"(?![^>]*ghost)/g) ?? []).length;
const render = (snap) => connect({ state: {}, route: '/connect', snapshot: snap });

// ---------------------------------------------------------------------------
// The committed snapshot and the derivation.

test('the committed snapshot is the live sandbox: 14 accounts, 5 scheduled, two 200s', () => {
  assert.equal(snapshot.accounts.length, 14, 'the snapshot must carry 14 accounts');
  assert.equal(snapshot.scheduled_transactions.length, 5, 'the snapshot must carry 5 scheduled transactions');
  assert.deepEqual(snapshot.requests, [
    { path: '/accounts', status: 200 },
    { path: '/scheduled-transactions?page_size=100', status: 200 },
  ]);
  assert.match(snapshot.fetchedAt, /^\d{4}-\d{2}-\d{2}$/, 'fetchedAt must be a plain date');
  assert.equal(snapshot.source, 'Rho API sandbox · fictional deterministic data');
});

test('the snapshot holds no token and no auth header', () => {
  const raw = readFileSync(new URL('../public/data/rho-sandbox.snapshot.json', import.meta.url), 'utf8');
  assert.equal((raw.match(/Bearer/g) ?? []).length, 0, 'the snapshot contains a Bearer header');
  assert.ok(!/authorization/i.test(raw), 'the snapshot contains an authorization field');
});

test('deriveFromSnapshot reads the exact cent sums, not literals', () => {
  const d = deriveFromSnapshot(snapshot);
  assert.equal(d.accounts, 14);
  assert.equal(d.cash, 25861780, 'checking cash must be the sum of balance.amount');
  assert.equal(d.committed, 1895050, 'committed must be the sum of scheduled amounts');
  assert.deepEqual(d.gaps, ['cushion', 'contract terms']);
  assert.equal(d.fetchedAt, snapshot.fetchedAt);

  const cash = snapshot.accounts
    .filter((a) => a.account_type === 'checking')
    .reduce((s, a) => s + a.balance.amount, 0);
  const committed = snapshot.scheduled_transactions.reduce((s, t) => s + t.amount.amount, 0);
  assert.equal(d.cash, cash);
  assert.equal(d.committed, committed);
  assert.notEqual(d.cash, 25861800, 'cash was rounded before the sum');
});

test('deriveFromSnapshot follows the payload when an amount changes', () => {
  const moved = clone(snapshot);
  moved.accounts[0].balance.amount += 100000;
  moved.scheduled_transactions[0].amount.amount += 5000;
  const d = deriveFromSnapshot(moved);
  assert.equal(d.cash, 25861780 + 100000);
  assert.equal(d.committed, 1895050 + 5000);
});

test('the committed $18,951 is derived from 1,895,050 cents and rounded, not typed', () => {
  const payload = snapshot.scheduled_transactions.reduce((s, t) => s + t.amount.amount, 0);
  assert.equal(payload, 1895050, 'the payload must sum to 1,895,050 cents');
  assert.equal(usd(1895050), '$18,951', 'usd() rounds 1,895,050 cents half up to $18,951');
  assert.equal(deriveFromSnapshot(snapshot).committed, payload, 'committed is not the payload sum');
  assert.ok(text(render(snapshot)).includes('$18,951 committed'), 'the screen does not print the rounded derived figure');
});

test('deriveFromSnapshot does not invent a burn figure the snapshot cannot support', () => {
  const d = deriveFromSnapshot(snapshot);
  assert.equal(d.trailingBurn, null, 'no cashflow payload is committed, so no burn number may be claimed');
});

// ---------------------------------------------------------------------------
// The screen derives; it never prints a date.

test('the screen prints the derived figures and the two verbatim lines', () => {
  const html = render(snapshot);
  const copy = text(html);

  assert.ok(
    copy.includes(`14 accounts · ${usd(25861780)} cash · ${usd(1895050)} committed`),
    `figures are not the derived ones: ${copy}`
  );
  assert.ok(
    copy.includes('Sandbox data, fetched Nov 12, 2026. No network call happens on this screen.'),
    'the label line is not verbatim'
  );
  assert.ok(
    copy.includes("Could not derive: cushion, contract terms. That's the part Pilot adds."),
    'the gap list is not verbatim'
  );
  assert.ok(copy.includes('Fictional company, not the one above.'), 'the fictional-company line is missing');
  assert.ok(copy.includes('GET /accounts → 200'), 'the accounts request line is missing');
  assert.ok(
    copy.includes('GET /scheduled-transactions?page_size=100 → 200'),
    'the scheduled request line is missing'
  );
  assert.equal(mintCount(html), 0, 'the connected-data screen must not have a mint button');
});

test('the label line uses a comma and no em dash', () => {
  const src = readFileSync(new URL('../public/js/screens/connect.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('—'), 'connect.js contains an em dash');
  assert.ok(!text(render(snapshot)).includes('—'), 'the screen contains an em dash');
});

test('the screen never prints a raise-by date or the word Apr', () => {
  const html = render(snapshot);
  const copy = text(html);
  assert.ok(!copy.includes('Apr'), 'the connected-data screen prints a raise-by month');
  assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(copy.replace(snapshot.fetchedAt, '')), 'the screen prints a date other than fetchedAt');
  assert.ok(!/raise-by date/i.test(copy), 'the screen claims a raise-by date');
});

test('the screen never claims the sandbox company is the demo company', () => {
  const copy = text(render(snapshot));
  assert.ok(!copy.includes('your company'), 'the screen calls the sandbox company yours');
  assert.ok(!/the company above/.test(copy.replace('not the one above', '')), 'the screen equates the companies');
  assert.ok(copy.includes('not the one above'), 'the disclaimer is missing');
});

test('the screen makes no network call and reads no clock', () => {
  const src = readFileSync(new URL('../public/js/screens/connect.js', import.meta.url), 'utf8');
  assert.ok(!/\bfetch\s*\(/.test(src), 'connect.js fetches at runtime');
  assert.ok(!/Date\.now\s*\(/.test(src), 'connect.js reads Date.now()');
  assert.ok(!/\bDate\s*\(\s*\)/.test(src), 'connect.js calls Date() with no argument');
  assert.ok(!/XMLHttpRequest|WebSocket/.test(src), 'connect.js opens a socket');
});

// ---------------------------------------------------------------------------
// Missing or broken snapshots degrade to one honest line.

const UNAVAILABLE = 'Sandbox snapshot unavailable. Run scripts/fetch-rho-sandbox.mjs before the demo.';

for (const [label, snap] of [
  ['null', null],
  ['undefined', undefined],
  ['an empty object', {}],
  ['a payload with no accounts', { accounts: null, scheduled_transactions: [] }],
  ['the scenario fixture', clone(fixture)],
]) {
  test(`a ${label} snapshot renders the unavailable line without throwing`, () => {
    assert.equal(deriveFromSnapshot(snap), null, 'an unusable snapshot must derive nothing');
    let html;
    assert.doesNotThrow(() => { html = render(snap); });
    const copy = text(html);
    assert.ok(copy.includes(UNAVAILABLE), `unavailable line missing: ${copy}`);
    assert.ok(!copy.includes('accounts ·'), 'a broken snapshot printed figures');
    assert.ok(!copy.includes('Apr'), 'a broken snapshot printed a date');
    assert.equal(mintCount(html), 0);
  });
}

// ---------------------------------------------------------------------------
// The route and the boot-time load.

async function bootStubbed(handler) {
  const store = new Map();
  const root = (globalThis.__rbRoot ??= { innerHTML: '' });
  root.innerHTML = '';
  globalThis.location = { search: '', hash: '#/connect' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = { getElementById: () => root };
  globalThis.fetch = handler;
  return { store, root };
}

test('app boots the snapshot and the /connect route renders the derived screen', async () => {
  const { root } = await bootStubbed(async (url) => {
    if (String(url).includes('rho-sandbox.snapshot.json')) return { ok: true, json: async () => clone(snapshot) };
    return { ok: true, json: async () => clone(fixture) };
  });
  const { app } = await import('../public/js/app.js');
  await app.boot();

  assert.equal(typeof app.screens['/connect'], 'function', '/connect is not routed');
  assert.equal(app.snapshot?.accounts?.length, 14, 'boot did not load the snapshot');

  app.route = '/connect';
  assert.doesNotThrow(() => app.render());
  const copy = text(root.innerHTML);
  assert.ok(copy.includes('14 accounts · $258,618 cash · $18,951 committed'), `render missed the figures: ${copy}`);
  assert.ok(copy.includes(UNAVAILABLE) === false, 'the loaded screen shows the unavailable line');
});

test('a snapshot that fails to load falls back to null and the screen still renders', async () => {
  const { root } = await bootStubbed(async (url) => {
    if (String(url).includes('rho-sandbox.snapshot.json')) throw new Error('offline');
    return { ok: true, json: async () => clone(fixture) };
  });
  const { app } = await import('../public/js/app.js');
  await app.boot();

  assert.equal(app.snapshot, null, 'a failed snapshot load must fall back to null');
  app.route = '/connect';
  assert.doesNotThrow(() => app.render());
  assert.ok(text(root.innerHTML).includes(UNAVAILABLE), 'the unavailable line is missing');
});

test('the fetch script refuses to write a snapshot that contains the token', () => {
  const src = readFileSync(new URL('../scripts/fetch-rho-sandbox.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes('process.env.RHO_API_TOKEN'), 'the token must come from the environment');
  assert.ok(/out\.includes\(TOKEN\)/.test(src), 'the token leak guard is missing');
  assert.ok(/process\.exit\(1\)/.test(src), 'the guard must abort the write');
  assert.ok(!/Bearer\s+\$\{?['"]?demo/.test(src), 'a token literal is embedded in the script');
});
