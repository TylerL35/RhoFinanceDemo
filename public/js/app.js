import { loadFixture, loadLocal, saveLocal, clearLocal, clone, terms } from './scenario.js';
import { parseIntent } from './intents.js';
import { raiseBy } from './engine.js';
import { diffDays, namedDate } from './calendar.js';
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
    // intentBase is the real company before the first what-if.
    appliedIntents: [],
    intentBase: null,
    lastEcho: null,
    lastEchoOk: null,
    whatifResult: null,
    focusWhatIf: false,
    payrollBackup: null,
    ask: 'when',
    trust: null,
  };
}

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The presenter path. Arrow keys walk these steps; a step with `enter` is a beat
// on the same screen (confirm the hires, pick the renewal option, draft the
// reminders) and ArrowLeft undoes it with `exit`. `done` skips a beat the
// presenter already clicked, so the keys never fight the mouse.
const PRESENTER_CHOICE = 'cancel'; // the visible lever (~9 days); monthly is ~1 day

function hubspotChoiceFor(app) {
  const sc = app.state.scenario;
  const c = sc?.contracts?.[0];
  if (!c) return null;
  // Cancel is only offered while the notice window is open.
  if (PRESENTER_CHOICE === 'cancel' && !terms(sc, c.id).canCancel) return 'monthly';
  return PRESENTER_CHOICE;
}

export const STEPS = [
  { route: '/' },
  { route: '/reveal' },
  {
    route: '/reveal',
    done: (app) => {
      const rows = (app.realScenario()?.payroll ?? []).filter((p) => !p.whatif);
      return rows.length === 0 || app.state.confirmations.payroll !== null || rows.every((p) => p.confirmed);
    },
    enter: (app) => app.confirmPayroll('yes'),
    exit: (app) => app.unconfirmPayroll(),
  },
  { route: '/bill/hubspot' },
  {
    route: '/bill/hubspot',
    done: (app) => !app.state.scenario?.contracts?.[0] || !!app.state.scenario.contracts[0].choice,
    enter: (app) => app.choose(hubspotChoiceFor(app)),
    exit: (app) => app.choose(null),
  },
  { route: '/invoices' },
  {
    route: '/invoices',
    done: (app) => {
      const list = app.state.scenario?.invoices ?? [];
      return list.length === 0 || list.every((i) => i.drafted);
    },
    enter: (app) => app.draftInvoices(),
    exit: (app) => app.undraftInvoices(),
  },
  { route: '/alerts/duplicate' },
  { route: '/trust' },
  { route: '/claude' },
];

// Animation: the page is re-rendered with innerHTML, so motion is carried
// across renders. Elements marked data-anim keep their last painted size; the
// new render starts from it and CSS transitions to the new value. data-from
// gives a first-arrival start (the timeline dot slides in from the plan date).
// data-flash elements briefly highlight when their text changed.
function animateFrom(root, prev) {
  const next = {};
  if (!root || typeof root.querySelectorAll !== 'function') return next;
  const reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const frame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 16));
  for (const el of root.querySelectorAll('[data-anim]')) {
    const key = el.dataset.anim;
    const prop = el.dataset.animProp || 'width';
    const target = el.style[prop];
    next[key] = target;
    let from = prev[key];
    if (from === undefined && el.dataset.from !== undefined) from = `${el.dataset.from}%`;
    if (reduce || from === undefined || from === target) continue;
    el.style.transition = 'none';
    el.style[prop] = from;
    void el.offsetWidth; // commit the start value before transitioning
    el.style.transition = '';
    frame(() => frame(() => { el.style[prop] = target; }));
  }
  for (const el of root.querySelectorAll('[data-flash]')) {
    const key = el.dataset.flash;
    const v = el.textContent.trim();
    next[key] = v;
    if (!reduce && prev[key] !== undefined && prev[key] !== v) el.classList.add('changed');
  }
  return next;
}

export const app = {
  state: initialState(),
  route: '/',
  snapshot: null,
  step: 0,
  stepCount: STEPS.length,
  stepDid: {},
  view: {},
  lastRendered: null,
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
  realScenario() { return this.state.intentBase ?? this.state.scenario; },
  go(route) {
    this.route = route;
    if (location.hash === `#${route}`) this.render();
    else location.hash = `#${route}`; // the hashchange listener performs the single render
  },
  syncStep() {
    if (STEPS[this.step]?.route === this.route) return;
    const i = STEPS.findIndex((s) => s.route === this.route);
    if (i >= 0) this.step = i;
  },
  guess(value) { this.state.guesses = { made: true, value }; this.render(); },
  ask(kind) { this.state.ask = kind; this.render(); },
  trustAction(kind) { this.state.trust = kind; this.render(); },
  // Real decisions (confirm, choose, draft, collect) must survive Undo of a
  // what-if, so they are applied to the live scenario, the pre-what-if base,
  // and every snapshot on the stack.
  mutateReal(fn) {
    fn(this.state.scenario);
    if (this.state.intentBase) fn(this.state.intentBase);
    for (const it of this.state.appliedIntents ?? []) fn(it.before);
    saveLocal(this.state.scenario);
  },
  // Onboarding builds the scenario from the form alone (no fixture history, no
  // wall clock), says what it found under the button, and only leaves the form
  // when there is a date to show. A new scenario resets the screen state that
  // described the old one, so no confirmed hire or renewal choice leaks across.
  saveSetup(form = null) {
    const val = (id) => document.getElementById(id)?.value ?? '';
    const get = (key, id) => (form && form[key] !== undefined ? form[key] : val(id));
    const fields = {
      cash: get('cash', 'f-cash'),
      revenue: get('revenue', 'f-revenue'),
      spend: get('spend', 'f-spend'),
      cushion: get('cushion', 'f-cushion'),
      asOf: get('asOf', 'f-asof'),
      vendor: get('vendor', 'f-vendor'),
      amount: get('amount', 'f-amount'),
      renewsOn: get('renewsOn', 'f-renew'),
      noticeDays: get('noticeDays', 'f-notice'),
    };
    const sc = setup.buildScenario(fields);
    const note = document.getElementById('setup-note');
    const { note: message, ready } = setup.setupOutcome(sc, fields);
    if (note) note.textContent = message;
    if (!ready) return;
    const keep = { ask: 'when' };
    this.state = { ...initialState(this.fixture), ...keep, scenario: sc, source: 'local' };
    saveLocal(sc);
    this.step = 0;
    this.go('/reveal');
  },
  // The only writer of payroll[].confirmed. Confirming never moves the date; the
  // bar re-derives, and only "one-time" (which drops the payroll rows) moves it.
  // What-if rows are hypothetical and are never confirmed.
  confirmPayroll(kind) {
    if (kind === 'yes') {
      this.mutateReal((sc) => sc.payroll.forEach((p) => { if (!p.whatif) p.confirmed = true; }));
    }
    if (kind === 'one-time') {
      this.state.payrollBackup = clone(this.realScenario().payroll.filter((p) => !p.whatif));
      this.mutateReal((sc) => { sc.payroll = sc.payroll.filter((p) => p.whatif); });
    }
    this.state.confirmations.payroll = kind;
    saveLocal(this.state.scenario);
    this.render();
    if (kind === 'yes') this.bringIntoView('.bar', 'center');
  },
  // After a click, the thing it changed comes into view: the bar after a
  // confirmation, the draft after a choice. Smooth, and only if it is off-screen.
  bringIntoView(selector, block = 'nearest') {
    const el = globalThis.document?.querySelector?.(selector);
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    const h = globalThis.innerHeight ?? 0;
    if (r.top >= 0 && r.bottom <= h - 48) return;
    el.scrollIntoView?.({ behavior: 'smooth', block });
  },
  unconfirmPayroll() {
    const kind = this.state.confirmations.payroll;
    if (kind === 'one-time' && this.state.payrollBackup) {
      const rows = this.state.payrollBackup;
      this.mutateReal((sc) => { sc.payroll = [...clone(rows), ...sc.payroll.filter((p) => p.whatif)]; });
      this.state.payrollBackup = null;
    } else {
      this.mutateReal((sc) => sc.payroll.forEach((p) => { if (!p.whatif) p.confirmed = false; }));
    }
    this.state.confirmations.payroll = null;
    this.render();
  },
  // The only writer of the renewal choice. The scenario carries it because the
  // engine prices the choice (and the reveal date moves); state.choice is the
  // screen's record of which option is selected. null reverts. Onboarding can
  // produce a contract-less scenario, where there is nothing to price.
  choose(kind) {
    if (!this.state.scenario?.contracts?.length) {
      this.render();
      return;
    }
    this.state.choice.hubspot = kind;
    this.mutateReal((sc) => { if (sc.contracts?.[0]) sc.contracts[0].choice = kind; });
    this.render();
    if (kind) this.bringIntoView('.draft');
  },
  // Drafting reminders is not collecting: drafted rows are recorded and saved,
  // but only collected invoices feed the projection.
  draftInvoices() {
    this.mutateReal((sc) => (sc.invoices ?? []).forEach((i) => (i.drafted = true)));
    this.state.collections.drafted = true;
    this.render();
    this.bringIntoView('.drafts');
  },
  undraftInvoices() {
    this.mutateReal((sc) => (sc.invoices ?? []).forEach((i) => (i.drafted = false)));
    this.state.collections.drafted = false;
    this.render();
  },
  collectInvoice(id) {
    const list = this.state.scenario?.invoices ?? [];
    const inv = list.find((i) => i.id === id);
    if (!inv) {
      this.render();
      return;
    }
    const index = list.indexOf(inv);
    this.mutateReal((sc) => { const row = (sc.invoices ?? []).find((i) => i.id === id); if (row) row.collected = true; });
    this.state.collections.collected[index] = true;
    this.render();
  },
  // The alert outcome is screen state only; it is never written to the scenario
  // and never reaches the engine.
  resolveAlert(kind) { this.state.alerts.duplicate = kind; this.render(); },
  // The what-if sentence for the whole stack: from the real company's date to
  // the date with every applied what-if.
  whatIfSummary() {
    const from = raiseBy(this.realScenario());
    const to = raiseBy(this.state.scenario);
    if (!from || !to) return null;
    const d = diffDays(from, to);
    const moved = d === 0 ? 'no change' : `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'earlier' : 'later'}`;
    return `${capital(namedDate(from))} → ${namedDate(to)}, ${moved}.`;
  },
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
      if (echo) echo.textContent = message;
    };
    this.state.focusWhatIf = true;

    if (!parsed.ok) {
      paint(parsed.reason, false);
      this.render();
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
    this.state.whatifResult = this.whatIfSummary();
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
    this.state.whatifResult = intents.length ? this.whatIfSummary() : null;
    this.state.focusWhatIf = true;
    saveLocal(this.state.scenario);
    this.render();
  },
  // "Change cushion" fills the what-if box without applying it, so the
  // presenter (or a judge) sees the sentence and presses Enter.
  prefillWhatIf(text) {
    const input = document.getElementById('whatif');
    if (!input) return;
    input.value = text;
    input.focus?.();
    input.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  },
  reset() {
    clearLocal();
    this.state = initialState(this.fixture);
    this.step = 0;
    this.stepDid = {};
    this.view = {};
    if (!this.fixture) return; // boot() has not landed yet; it renders the initial state itself
    this.go('/');
  },
  // On a screen whose headline is the date, the sticky pill would repeat it, so
  // it shows only once the headline has scrolled out of view.
  watchPill(root) {
    this.pillObserver?.disconnect?.();
    this.pillObserver = null;
    if (typeof root?.querySelector !== 'function') return;
    const rail = root.querySelector('.pill-rail');
    const hero = root.querySelector('h1.hero');
    if (!rail || !hero || typeof globalThis.IntersectionObserver !== 'function') return;
    // Decide now, so a re-render while scrolled down does not blink the pill.
    rail.classList.toggle('hide', hero.getBoundingClientRect().bottom > 20);
    this.pillObserver = new IntersectionObserver(
      ([entry]) => rail.classList.toggle('hide', entry.isIntersecting),
      { rootMargin: '-20px 0px 0px 0px' }
    );
    this.pillObserver.observe(hero);
  },
  render() {
    const route = this.screens[this.route] ? this.route : '/';
    const doc = globalThis.document;
    const activeId = doc?.activeElement?.id || null;
    const out = this.screens[route]({ state: this.state, route, snapshot: this.snapshot });
    const root = doc.getElementById('app');
    root.innerHTML = typeof out === 'string' ? out : out.html;
    if (typeof out === 'object' && out.after) out.after();

    // Arrival animations (headline fade, timeline slide) only on a new screen,
    // never on a click within one: confirming hires must leave the date still.
    const arriving = this.lastRendered !== route;
    this.lastRendered = route;
    root.classList?.toggle('arrive', arriving);
    const prev = arriving ? { pill: this.view.pill } : this.view;
    this.view = animateFrom(root, prev);
    this.watchPill(root);

    // Keep the keyboard where it was: the what-if input after a what-if, or
    // whichever control had focus if it still exists.
    const focusId = this.state.focusWhatIf ? 'whatif' : activeId;
    this.state.focusWhatIf = false;
    if (focusId && doc.getElementById) {
      const el = doc.getElementById(focusId);
      if (el && el !== root && typeof el.focus === 'function') el.focus({ preventScroll: focusId !== 'whatif' });
    }
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
      let saved = null;
      try { saved = loadLocal(); } catch { saved = null; }
      if (saved) {
        this.state.scenario = saved;
        this.state.source = saved.source === 'local' ? 'local' : 'fixture';
        this.state.choice.hubspot = saved.contracts?.[0]?.choice ?? null;
      }
      this.route = location.hash.replace('#', '') || '/';
      this.syncStep();
      this.render();
      window.addEventListener('hashchange', () => {
        this.route = location.hash.replace('#', '') || '/';
        this.syncStep();
        this.render();
      });
    } catch {
      const root = document.getElementById('app');
      if (root) root.innerHTML = '<p>Could not load the demo data. Reload the page.</p>';
    }
  },
};

// The presenter path: arrows walk STEPS, Escape returns to the start and
// Shift+Escape starts over, so the demo can be driven without touching the
// mouse. Keys 1-4 pick a guess on Home. Keys are ignored while typing, or the
// what-if box would navigate away mid-sentence.
function onKey(e) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (app.step >= STEPS.length - 1) return;
    app.step += 1;
    const s = STEPS[app.step];
    if (s.enter) {
      if (app.route !== s.route) app.go(s.route);
      if (!s.done?.(app)) { app.stepDid[app.step] = true; s.enter(app); }
    } else {
      app.go(s.route);
    }
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (app.step <= 0) return;
    const s = STEPS[app.step];
    if (s.exit && app.stepDid[app.step]) {
      delete app.stepDid[app.step];
      s.exit(app);
    }
    app.step -= 1;
    const back = STEPS[app.step];
    if (app.route !== back.route) app.go(back.route);
    else if (!s.exit) app.render();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (e.shiftKey) { app.reset(); return; }
    app.step = 0;
    app.go('/');
    return;
  }
  if (app.route === '/' && /^[1-4]$/.test(e.key)) {
    e.preventDefault();
    app.guess(home.GUESSES[Number(e.key) - 1]);
  }
}
window.addEventListener('keydown', onKey);

window.app = app;
app.boot();
