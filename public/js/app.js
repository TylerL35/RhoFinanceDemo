import { loadFixture, loadLocal, saveLocal, clearLocal } from './scenario.js';
import * as home from './screens/home.js';
import * as reveal from './screens/reveal.js';

const params = new URLSearchParams(location.search);
if (params.has('present')) {
  globalThis.__RAISE_BY_PRESENT__ = true;
  clearLocal();
}

// One factory for the whole demo state, so "Start over" cannot leave a screen
// half-advanced. The scenario is always a fresh clone of the fixture; callers
// may mutate it freely.
function initialState(fixture) {
  return {
    source: 'fixture',
    scenario: fixture ? structuredClone(fixture) : null,
    confirmations: { payroll: null },
    choice: { hubspot: null },
    collections: { drafted: false, collected: [false, false] },
    alerts: { duplicate: null },
    guesses: { made: false, value: null },
  };
}

export const app = {
  state: initialState(),
  route: '/',
  screens: { '/': home.home, '/reveal': reveal.reveal },
  go(route) {
    this.route = route;
    if (location.hash === `#${route}`) this.render();
    else location.hash = `#${route}`; // the hashchange listener performs the single render
  },
  guess(value) { this.state.guesses = { made: true, value }; this.render(); },
  // The only writer of payroll[].confirmed. Confirming never moves the date; the
  // bar re-derives, and only "one-time" (which drops the payroll rows) moves it.
  confirmPayroll(kind) {
    if (kind === 'yes') this.state.scenario.payroll.forEach((p) => (p.confirmed = true));
    if (kind === 'one-time') this.state.scenario.payroll = [];
    this.state.confirmations.payroll = kind;
    saveLocal(this.state.scenario);
    this.render();
  },
  reset() {
    clearLocal();
    this.state = initialState(this.fixture);
    if (!this.fixture) return; // boot() has not landed yet; it renders the initial state itself
    this.go('/');
  },
  render() {
    const route = this.screens[this.route] ? this.route : '/';
    const out = this.screens[route]({ state: this.state, route });
    const root = document.getElementById('app');
    root.innerHTML = typeof out === 'string' ? out : out.html;
    if (typeof out === 'object' && out.after) out.after();
  },
  async boot() {
    try {
      this.fixture = await loadFixture();
      this.state = initialState(this.fixture);
      this.state.scenario = loadLocal() ?? this.state.scenario;
      this.route = location.hash.replace('#', '') || '/';
      this.render();
      window.addEventListener('hashchange', () => {
        this.route = location.hash.replace('#', '') || '/';
        this.render();
      });
    } catch {
      const root = document.getElementById('app');
      if (root) root.innerHTML = '<p>Could not load the demo data. Reload the page.</p>';
    }
  },
};

window.app = app;
app.boot();
