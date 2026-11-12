import { loadFixture, loadLocal, saveLocal, clearLocal, clone } from './scenario.js';
import { parseIntent } from './intents.js';
import * as home from './screens/home.js';
import * as reveal from './screens/reveal.js';
import * as bill from './screens/bill.js';
import * as invoices from './screens/invoices.js';
import * as alerts from './screens/alerts.js';
import * as trust from './screens/trust.js';
import * as claude from './screens/claude.js';
import * as setup from './screens/setup.js';
import * as connect from './screens/connect.js';

// The Rho snapshot is pre-fetched by scripts/fetch-rho-sandbox.mjs and committed
// with the demo. It is read once at boot; no screen ever calls the network.
async function loadSnapshot() {
  const res = await fetch('./data/rho-sandbox.snapshot.json');
  if (res.ok === false) throw new Error(`snapshot ${res.status}`);
  const snap = await res.json();
  if (!Array.isArray(snap.accounts) || !Array.isArray(snap.scheduled_transactions)) {
    throw new Error('snapshot is not a sandbox payload');
  }
  return snap;
}

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
    // What-if is a bounded stack: each applied intent carries the echo it showed
    // and the snapshot from before it, so Undo can put the scenario back.
    appliedIntents: [],
    intentBase: null,
    lastEcho: null,
    lastEchoOk: null,
  };
}

export const app = {
  state: initialState(),
  route: '/',
  snapshot: null,
  screens: {
    '/': home.home,
    '/reveal': reveal.reveal,
    '/bill/hubspot': bill.bill,
    '/invoices': invoices.invoices,
    '/alerts/duplicate': alerts.alerts,
    '/trust': trust.trust,
    '/claude': claude.claude,
    '/setup': setup.setup,
    '/connect': connect.connect,
  },
  go(route) {
    this.route = route;
    if (location.hash === `#${route}`) this.render();
    else location.hash = `#${route}`; // the hashchange listener performs the single render
  },
  guess(value) { this.state.guesses = { made: true, value }; this.render(); },
  // Onboarding builds the scenario from the form alone (no fixture history, no
  // wall clock), says what it found under the button, and only leaves the form
  // when there is a date to show. A new scenario resets the screen state that
  // described the old one, so no confirmed hire or renewal choice leaks across.
  saveSetup(form = null) {
    const val = (id) => document.getElementById(id)?.value ?? '';
    const get = (key, id) => (form && form[key] !== undefined ? form[key] : val(id));
    const sc = setup.buildScenario({
      cash: get('cash', 'f-cash'),
      revenue: get('revenue', 'f-revenue'),
      spend: get('spend', 'f-spend'),
      cushion: get('cushion', 'f-cushion'),
      asOf: get('asOf', 'f-asof'),
      vendor: get('vendor', 'f-vendor'),
      amount: get('amount', 'f-amount'),
      renewsOn: get('renewsOn', 'f-renew'),
      noticeDays: get('noticeDays', 'f-notice'),
    });
    const note = document.getElementById('setup-note');
    const { note: message, ready } = setup.setupOutcome(sc);
    if (note) note.textContent = message;
    if (!ready) return;
    this.state.scenario = sc;
    this.state.confirmations = { payroll: null };
    this.state.choice = { hubspot: null };
    this.state.collections = { drafted: false, collected: [false, false] };
    this.state.alerts = { duplicate: null };
    this.state.guesses = { made: false, value: null };
    // The what-if stack snapshots the old scenario, so carrying it over would
    // let Undo swap the judge's own numbers back for the fixture.
    this.state.appliedIntents = [];
    this.state.intentBase = null;
    this.state.lastEcho = null;
    this.state.lastEchoOk = null;
    saveLocal(sc);
    this.go('/reveal');
  },
  // The only writer of payroll[].confirmed. Confirming never moves the date; the
  // bar re-derives, and only "one-time" (which drops the payroll rows) moves it.
  confirmPayroll(kind) {
    if (kind === 'yes') this.state.scenario.payroll.forEach((p) => (p.confirmed = true));
    if (kind === 'one-time') this.state.scenario.payroll = [];
    this.state.confirmations.payroll = kind;
    saveLocal(this.state.scenario);
    this.render();
  },
  // The only writer of the renewal choice. The scenario carries it because the
  // engine prices the choice (and the reveal date moves); state.choice is the
  // screen's record of which button is mint. null reverts. Onboarding can produce
  // a contract-less scenario, where there is nothing to price.
  choose(kind) {
    if (!this.state.scenario?.contracts?.length) {
      this.render();
      return;
    }
    this.state.choice.hubspot = kind;
    this.state.scenario.contracts[0].choice = kind;
    saveLocal(this.state.scenario);
    this.render();
  },
  // Drafting reminders is not collecting: drafted rows are recorded and saved,
  // but only collected invoices feed the projection.
  draftInvoices() {
    const list = this.state.scenario?.invoices ?? [];
    list.forEach((i) => (i.drafted = true));
    this.state.collections.drafted = true;
    saveLocal(this.state.scenario);
    this.render();
  },
  collectInvoice(id) {
    const list = this.state.scenario?.invoices ?? [];
    const inv = list.find((i) => i.id === id);
    if (!inv) {
      this.render();
      return;
    }
    inv.collected = true;
    this.state.collections.collected[list.indexOf(inv)] = true;
    saveLocal(this.state.scenario);
    this.render();
  },
  // The alert outcome is screen state only; it is never written to the scenario
  // and never reaches the engine.
  resolveAlert(kind) { this.state.alerts.duplicate = kind; this.render(); },
  // What-if only accepts the ruled grammar. The echo is painted before the
  // scenario changes, then the re-render carries it into the rebuilt box, so the
  // acknowledgement is seen before the new date. A refusal mutates nothing.
  applyWhatIf() {
    const input = document.getElementById('whatif');
    const text = input?.value ?? '';
    const parsed = parseIntent(text, this.state.scenario);
    const paint = (message, ok) => {
      this.state.lastEcho = message;
      this.state.lastEchoOk = ok;
      const echo = document.getElementById('whatif-echo');
      if (echo) {
        echo.textContent = message;
        echo.style.color = ok ? '#747D79' : '#08A68A';
      }
    };

    if (!parsed.ok) {
      paint(parsed.reason, false);
      return;
    }

    paint(parsed.echo, true);
    this.state.appliedIntents ??= [];
    if (!this.state.intentBase) this.state.intentBase = clone(this.state.scenario);
    this.state.appliedIntents.push({
      text,
      echo: parsed.echo,
      before: clone(this.state.scenario),
    });
    parsed.mutation(this.state.scenario);
    saveLocal(this.state.scenario);
    this.render();
  },
  // Undo pops the last intent and restores the snapshot taken immediately before
  // it. The first intent's snapshot is also kept as intentBase for the stack.
  undoWhatIf() {
    const intents = this.state.appliedIntents ?? [];
    const last = intents.pop();
    if (!last) return;
    this.state.scenario = clone(last.before);
    if (intents.length === 0) this.state.intentBase = null;
    this.state.lastEcho = intents.at(-1)?.echo ?? null;
    this.state.lastEchoOk = intents.length ? true : null;
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
    const out = this.screens[route]({ state: this.state, route, snapshot: this.snapshot });
    const root = document.getElementById('app');
    root.innerHTML = typeof out === 'string' ? out : out.html;
    if (typeof out === 'object' && out.after) out.after();
  },
  async boot() {
    try {
      this.fixture = await loadFixture();
      try {
        this.snapshot = await loadSnapshot();
      } catch {
        this.snapshot = null; // the connected-data screen still renders, and says why
      }
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
