import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('no wall-clock reads anywhere in public/js', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = new URL(e.name, dir);
      if (e.isDirectory()) walk(new URL(`${e.name}/`, dir));
      else if (e.name.endsWith('.js')) files.push(p);
    }
  };
  walk(new URL('../public/js/', import.meta.url));
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/Date\.now\s*\(/.test(src), `${f.pathname} reads Date.now()`);
    // Zero-argument Date calls (bare `Date()` and `new Date()`).
    assert.ok(!/\bDate\s*\(\s*\)/.test(src), `${f.pathname} calls Date() with no argument`);
    // `new Date` used without a call, e.g. `const d = new Date;`.
    assert.ok(!/new\s+Date\b(?!\s*\()/.test(src), `${f.pathname} uses new Date with no argument`);
  }
});

test('index.html loads app.js as a module', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('type="module"'));
  assert.ok(html.includes('id="app"'));
});

test('home renders a date when cash crosses, and a sentence when it never does', async () => {
  const fixture = JSON.parse(
    readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
  );
  const { home } = await import('../public/js/screens/home.js');

  const normal = home({ state: { scenario: fixture, guesses: { made: false, value: null } } });
  assert.ok(normal.includes('Apr 2027'), 'fixture home names the raise-by month');
  assert.ok(!normal.includes('Invalid Date'));
  assert.ok(!normal.includes('1970'));

  const never = structuredClone(fixture);
  never.plan.plannedGrossSpend = 1000000;
  never.payroll = [];
  never.revenue.current = 200000000;
  const html = home({ state: { scenario: never, guesses: { made: false, value: null } } });
  assert.ok(
    html.includes(
      'Raise-by cannot see a date yet: cash does not run out within three years at this rate.'
    )
  );
  assert.ok(!html.includes('Invalid Date'));
  assert.ok(!html.includes('1970'));
  assert.ok(!html.includes('app.guess('), 'no guess chips when there is no date');
});


// Boots public/js/app.js in Node with the browser bits it needs stubbed. The module
// clears rehearsal state at import time, so this helper must seed the store first and
// the ?present test must be the one that triggers the import.
async function bootStubbed() {
  const fixture = JSON.parse(
    readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
  );
  const store = new Map([['raise-by.scenario.v1', JSON.stringify({ ...fixture, cash: 123 })]]);
  const root = (globalThis.__rbRoot ??= { innerHTML: '' });
  root.innerHTML = '';
  globalThis.location = { search: '?present', hash: '#/' };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.document = { getElementById: () => root };
  globalThis.fetch = async () => ({ json: async () => structuredClone(fixture) });
  return { fixture, store };
}

test('?present clears rehearsal state and flags it before boot renders', async () => {
  const { fixture, store } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot(); // the import already booted; await a second call so it has settled

  assert.equal(globalThis.__RAISE_BY_PRESENT__, true);
  assert.equal(store.has('raise-by.scenario.v1'), false, 'rehearsal scenario is cleared');
  assert.equal(app.state.scenario.cash, fixture.cash, 'boot used the fixture, not rehearsal state');
  assert.ok(globalThis.document.getElementById().innerHTML.includes('Your raise-by date moved this week.'));
  assert.ok(globalThis.document.getElementById().innerHTML.includes('Apr 2027'));
});

test('render accepts a string or { html, after } and runs after()', async () => {
  await bootStubbed();
  const { app } = await import('../public/js/app.js');
  let ran = false;
  const root = globalThis.document.getElementById();
  const original = app.screens['/'];
  try {
    app.route = '/';
    app.screens['/'] = () => ({ html: '<p>object shape</p>', after: () => { ran = true; } });
    app.render();
    assert.equal(root.innerHTML, '<p>object shape</p>');
    assert.equal(ran, true, 'after() runs post-mount');

    ran = false;
    app.screens['/'] = () => '<p>string shape</p>';
    app.render();
    assert.equal(root.innerHTML, '<p>string shape</p>');
    assert.equal(ran, false, 'a string screen has no after()');
  } finally {
    app.screens['/'] = original;
  }
});

test('go() renders exactly once per navigation', async () => {
  await bootStubbed();
  const { app } = await import('../public/js/app.js');

  // A live hash router: assigning location.hash fires the registered hashchange listener.
  const listeners = [];
  globalThis.addEventListener = (type, fn) => { if (type === 'hashchange') listeners.push(fn); };
  let hash = '#/';
  Object.defineProperty(globalThis.location, 'hash', {
    configurable: true,
    get: () => hash,
    set: (value) => { hash = value; for (const fn of listeners) fn(); },
  });
  await app.boot();
  assert.equal(listeners.length, 1, 'boot registers one hashchange listener');

  let renders = 0;
  app.screens['/probe'] = () => { renders += 1; return '<p>probe</p>'; };
  app.screens['/probe2'] = () => { renders += 1; return '<p>probe two</p>'; };
  try {
    renders = 0;
    app.go('/probe');
    assert.equal(hash, '#/probe');
    assert.equal(renders, 1, 'a hash change renders once, via the listener');

    renders = 0;
    app.go('/probe');
    assert.equal(renders, 1, 'navigating to the current hash renders once, directly');

    renders = 0;
    app.go('/probe2');
    assert.equal(hash, '#/probe2');
    assert.equal(renders, 1, 'navigating away also renders once');
  } finally {
    delete app.screens['/probe'];
    delete app.screens['/probe2'];
  }
});

test('reset() restores the whole state and re-clones the scenario', async () => {
  const { fixture } = await bootStubbed();
  const { app } = await import('../public/js/app.js');
  await app.boot();

  app.state.confirmations = { payroll: 'cancel' };
  app.state.choice = { hubspot: 'monthly' };
  app.state.collections = { drafted: true, collected: [true, true] };
  app.state.alerts = { duplicate: 'merged' };
  app.state.guesses = { made: true, value: 'Jul' };
  app.state.scenario.cash = 1;

  app.reset();

  const s = app.state;
  assert.equal(s.source, 'fixture');
  assert.deepEqual(s.confirmations, { payroll: null });
  assert.deepEqual(s.choice, { hubspot: null });
  assert.deepEqual(s.collections, { drafted: false, collected: [false, false] });
  assert.deepEqual(s.alerts, { duplicate: null });
  assert.deepEqual(s.guesses, { made: false, value: null });
  assert.equal(s.scenario.cash, fixture.cash, 'scenario is re-read from the fixture');
  assert.notEqual(s.scenario, app.fixture, 'scenario is a fresh clone');
});

test('reset() is safe before boot has landed the fixture', async () => {
  await bootStubbed();
  const { app } = await import('../public/js/app.js');
  const saved = app.fixture;
  try {
    delete app.fixture;
    assert.doesNotThrow(() => app.reset());
    assert.deepEqual(app.state.confirmations, { payroll: null });
  } finally {
    app.fixture = saved;
    await app.boot();
  }
});

test('boot renders a plain error line when the fixture cannot load', async () => {
  await bootStubbed();
  const { app } = await import('../public/js/app.js');
  const root = globalThis.document.getElementById();
  root.innerHTML = '';
  globalThis.fetch = async () => { throw new Error('offline'); };
  await app.boot();
  assert.equal(root.innerHTML, '<p>Could not load the demo data. Reload the page.</p>');
});
