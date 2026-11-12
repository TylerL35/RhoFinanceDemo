import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SCRIPT = ['/', '/reveal', '/bill/hubspot', '/invoices', '/alerts/duplicate', '/trust', '/claude'];

// Boots public/js/app.js in Node with the browser bits it needs stubbed. The
// module caches after the first import, so the listeners are captured once and
// shared: a fresh keydown listener per test would not exist.
let booted = null;
function bootWithKeyboard() {
  if (booted) return booted;
  booted = (async () => {
    const fixture = JSON.parse(
      readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
    );
    const root = (globalThis.__rbRoot ??= { innerHTML: '' });
    root.innerHTML = '';
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    globalThis.window = globalThis;

    const listeners = {};
    globalThis.addEventListener = (type, fn) => {
      (listeners[type] ??= []).push(fn);
    };
    // A live hash router, like a browser: assigning hash fires hashchange.
    let hash = '#/';
    globalThis.location = { search: '' };
    Object.defineProperty(globalThis.location, 'hash', {
      configurable: true,
      get: () => hash,
      set: (value) => {
        hash = value;
        for (const fn of listeners.hashchange ?? []) fn();
      },
    });

    globalThis.document = { getElementById: () => root };
    globalThis.fetch = async (url) => ({
      ok: true,
      json: async () => (String(url).includes('snapshot')
        ? { accounts: [], scheduled_transactions: [], requests: [], fetchedAt: 'unavailable' }
        : structuredClone(fixture)),
    });

    const { app } = await import('../public/js/app.js');
    // The import already started one boot(); let it settle, then replace its
    // hashchange registration so the harness has one subscriber, like a page
    // loaded once.
    await new Promise((r) => setTimeout(r, 20));
    delete listeners.hashchange;
    await app.boot();
    return { app, listeners };
  })();
  return booted;
}

function press(listeners, key, target = { tagName: 'BODY' }) {
  const prevented = [];
  for (const fn of listeners.keydown ?? []) {
    fn({ key, target, preventDefault: () => prevented.push(key) });
  }
  return prevented.length;
}

test('app.js registers one keydown listener', async () => {
  const { listeners } = await bootWithKeyboard();
  assert.equal(listeners.keydown?.length, 1);
});

test('arrow keys walk the scripted order and Escape returns to the start', async () => {
  const { app, listeners } = await bootWithKeyboard();

  app.go('/');
  for (const expected of SCRIPT.slice(1)) {
    press(listeners, 'ArrowRight');
    assert.equal(app.route, expected);
  }

  press(listeners, 'ArrowRight');
  assert.equal(app.route, '/claude', 'ArrowRight stops at the last slide');

  for (const expected of [...SCRIPT].slice(0, -1).reverse()) {
    press(listeners, 'ArrowLeft');
    assert.equal(app.route, expected);
  }

  press(listeners, 'ArrowLeft');
  assert.equal(app.route, '/', 'ArrowLeft stops at the first slide');

  app.go('/trust');
  press(listeners, 'Escape');
  assert.equal(app.route, '/', 'Escape returns to the first slide');
});

test('keys are ignored while typing in the what-if box', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.go('/');
  press(listeners, 'ArrowRight', { tagName: 'INPUT' });
  assert.equal(app.route, '/', 'ArrowRight in an INPUT does not navigate');
  press(listeners, 'ArrowRight', { tagName: 'TEXTAREA' });
  assert.equal(app.route, '/', 'ArrowRight in a TEXTAREA does not navigate');
  press(listeners, 'Escape', { tagName: 'INPUT' });
  assert.equal(app.route, '/', 'Escape in an INPUT does not navigate');
});

test('a key press renders exactly once and only through app.go', async () => {
  const { app, listeners } = await bootWithKeyboard();

  let renders = 0;
  const originalScreen = app.screens['/reveal'];
  app.screens['/reveal'] = () => {
    renders += 1;
    return '<p>probe</p>';
  };
  const originalGo = app.go.bind(app);
  let goes = 0;
  app.go = (route) => {
    goes += 1;
    return originalGo(route);
  };

  try {
    app.go('/');
    renders = 0;
    goes = 0;
    press(listeners, 'ArrowRight');
    assert.equal(app.route, '/reveal');
    assert.equal(goes, 1, 'one app.go call per key press');
    assert.equal(renders, 1, 'one render per key press');
  } finally {
    app.go = originalGo;
    app.screens['/reveal'] = originalScreen;
  }
});

test('handled keys preventDefault so arrows do not also scroll the page', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.go('/');

  assert.equal(press(listeners, 'ArrowRight'), 1, 'ArrowRight is handled and prevents the scroll default');
  assert.equal(press(listeners, 'ArrowLeft'), 1, 'ArrowLeft is handled and prevents the scroll default');
  assert.equal(press(listeners, 'Escape'), 1, 'Escape is handled too');

  assert.equal(press(listeners, 'ArrowDown'), 0, 'an unhandled key is left to the browser');
  assert.equal(press(listeners, 'ArrowUp'), 0, 'an unhandled key is left to the browser');
  assert.equal(press(listeners, 'Tab'), 0, 'an unhandled key is left to the browser');
  assert.equal(press(listeners, 'a'), 0, 'an unhandled key is left to the browser');

  assert.equal(press(listeners, 'ArrowRight', { tagName: 'INPUT' }), 0, 'typing keeps the default');
  assert.equal(press(listeners, 'Escape', { tagName: 'TEXTAREA' }), 0, 'typing keeps the default');
});
