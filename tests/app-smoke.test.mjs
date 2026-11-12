import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const js = (f) => readFileSync(new URL(`../public/js/${f}`, import.meta.url), 'utf8');

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
    assert.ok(!/Date\.now\(/.test(src), `${f.pathname} uses Date.now()`);
    assert.ok(!/new Date\(\s*\)/.test(src), `${f.pathname} uses new Date()`);
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
  assert.ok(html.includes("Raise-By can't see a date yet: at this rate cash never runs out."));
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
