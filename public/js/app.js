import { loadFixture, loadLocal, saveLocal, clearLocal } from './scenario.js';
import * as home from './screens/home.js';

const params = new URLSearchParams(location.search);
if (params.has('present')) {
  globalThis.__RAISE_BY_PRESENT__ = true;
  clearLocal();
}

export const app = {
  state: { source: 'fixture', scenario: null, confirmations: { payroll: null },
           choice: { hubspot: null }, collections: { drafted: false, collected: [false, false] },
           alerts: { duplicate: null }, guesses: { made: false, value: null } },
  route: '/',
  screens: { '/': home.home },
  go(route) { this.route = route; location.hash = `#${route}`; this.render(); },
  guess(value) { this.state.guesses = { made: true, value }; this.render(); },
  reset() { clearLocal(); this.state.scenario = structuredClone(this.fixture); this.go('/'); },
  render() {
    const route = this.screens[this.route] ? this.route : '/';
    const out = this.screens[route]({ state: this.state, route });
    const root = document.getElementById('app');
    root.innerHTML = typeof out === 'string' ? out : out.html;
    if (typeof out === 'object' && out.after) out.after();
  },
  async boot() {
    this.fixture = await loadFixture();
    this.state.scenario = loadLocal() ?? structuredClone(this.fixture);
    this.route = location.hash.replace('#', '') || '/';
    this.render();
    window.addEventListener('hashchange', () => {
      this.route = location.hash.replace('#', '') || '/';
      this.render();
    });
  },
};

window.app = app;
app.boot();
