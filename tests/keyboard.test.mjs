import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

// The presenter path: ten steps, three of them beats on the same screen.
const STEP_ROUTES = ['/', '/reveal', '/reveal', '/bill/hubspot', '/bill/hubspot',
  '/invoices', '/invoices', '/alerts/duplicate', '/trust', '/claude'];

test('arrow keys walk the presenter steps, including the beats, and undo them going back', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.reset();
  const fresh = structuredClone(app.state.scenario);
  assert.equal(app.step, 0);
  assert.equal(app.stepCount, STEP_ROUTES.length);

  const seen = [];
  for (let i = 1; i < STEP_ROUTES.length; i += 1) {
    press(listeners, 'ArrowRight');
    seen.push(app.route);
    assert.equal(app.step, i);
  }
  assert.deepEqual(seen, STEP_ROUTES.slice(1), 'the routes visited are the script');

  // The beats happened without the mouse.
  assert.ok(app.state.scenario.payroll.every((p) => p.confirmed), 'the hires were not confirmed');
  assert.equal(app.state.scenario.contracts[0].choice, 'cancel', 'the renewal option was not chosen');
  assert.ok(app.state.scenario.invoices.every((i) => i.drafted), 'the reminders were not drafted');

  press(listeners, 'ArrowRight');
  assert.equal(app.route, '/claude', 'ArrowRight stops at the last step');

  for (let i = STEP_ROUTES.length - 2; i >= 0; i -= 1) {
    press(listeners, 'ArrowLeft');
    assert.equal(app.step, i);
    assert.equal(app.route, STEP_ROUTES[i]);
  }
  press(listeners, 'ArrowLeft');
  assert.equal(app.route, '/', 'ArrowLeft stops at the first step');
  assert.deepEqual(app.state.scenario, fresh, 'walking back undid every beat');

  app.go('/trust');
  press(listeners, 'Escape');
  assert.equal(app.route, '/', 'Escape returns to the first slide');
  assert.equal(app.step, 0);
});

test('a beat the presenter already clicked is skipped, and not undone going back', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.reset();
  press(listeners, 'ArrowRight'); // -> /reveal
  app.confirmPayroll('yes'); // clicked by hand
  press(listeners, 'ArrowRight'); // the confirm beat: already done
  assert.equal(app.step, 2);
  press(listeners, 'ArrowLeft');
  assert.ok(app.state.scenario.payroll.every((p) => p.confirmed), 'a hand click was undone by the keys');
});

test('keys 1-4 pick a guess on Home, and Shift+Escape starts over', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.reset();
  press(listeners, '3');
  assert.deepEqual(app.state.guesses, { made: true, value: 'Jul' });
  press(listeners, 'ArrowRight');
  press(listeners, 'ArrowRight');
  assert.ok(app.state.scenario.payroll.every((p) => p.confirmed));
  for (const fn of listeners.keydown) fn({ key: 'Escape', shiftKey: true, target: { tagName: 'BODY' }, preventDefault() {} });
  assert.equal(app.route, '/');
  assert.equal(app.step, 0);
  assert.deepEqual(app.state.guesses, { made: false, value: null });
  assert.ok(app.state.scenario.payroll.every((p) => !p.confirmed), 'Shift+Escape did not start over');
});

test('navigating by the sidebar moves the presenter step to that screen', async () => {
  const { app, listeners } = await bootWithKeyboard();
  app.reset();
  app.go('/invoices');
  assert.equal(app.step, 5);
  press(listeners, 'ArrowRight');
  assert.equal(app.route, '/invoices', 'the next step is the draft beat on the same screen');
  assert.ok(app.state.scenario.invoices.every((i) => i.drafted));
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
