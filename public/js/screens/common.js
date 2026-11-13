import { raiseBy } from '../engine.js';
import { parseDate, fmtDay } from '../calendar.js';

// The company the user is looking at. A what-if is a hypothetical about this
// company, so the screens that describe reality (bar, confirm card, sources,
// Ask Rho, Trust) read this, and only the date and prices read the live
// scenario that carries the what-if.
export const realScenario = (state) => state?.intentBase ?? state?.scenario;

// A what-if is on when the live scenario is built on top of a real base.
export const hasWhatIf = (state) => !!state?.intentBase;

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

export const eyebrow = (t) => `<div class="eyebrow">${t}</div>`;

export const chip = (t, extra = '') => `<span class="chip${extra ? ` ${extra}` : ''}">${t}</span>`;

// Sidebar counts come from the scenario, never from the markup.
function counts(sc, state) {
  if (!sc) return {};
  const asOf = parseDate(sc.asOf);
  const overdue = (sc.invoices ?? []).filter((i) => !i.collected && parseDate(i.dueOn) < asOf).length;
  const bills = (sc.contracts ?? []).filter((c) => !c.choice).length;
  const looks = (sc.alerts ?? []).filter((a) => a.status === 'open').length
    - (state?.alerts?.duplicate ? 1 : 0);
  return { overdue, bills, looks: Math.max(0, looks) };
}

const INERT_TOP = ['Transactions', 'Accounts', 'Cards', 'Vendors', 'Reporting'];

function navLinks(route, c) {
  const link = (href, label, extra = '') =>
    `<a href="#${href}"${route === href ? ' aria-current="page"' : ''}><span>${label}</span>${extra}</a>`;
  const count = (n) => (n > 0 ? `<span class="count">${n}</span>` : '');
  const inert = (label) => `<span class="nav-inert" title="Not part of this demo">${label}</span>`;
  return `
      ${link('/', 'Home')}
      ${link('/reveal', 'Raise-by', '<span class="tag-new">New</span>')}
      ${INERT_TOP.map(inert).join('')}
      <div class="group">Workflows</div>
      ${link('/invoices', 'Invoicing', count(c.overdue))}
      ${inert('Expenses')}
      ${inert('Reimbursements')}
      ${link('/bill/hubspot', 'Bill Pay', count(c.bills))}
      ${inert('Accounting')}
      <div class="group">Inbox</div>
      ${link('/alerts/duplicate', 'Needs a look', count(c.looks))}`;
}

function demoLinks(route) {
  const link = (href, label) =>
    `<a href="#${href}"${route === href ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
      <div class="group">About this demo</div>
      ${link('/trust', 'Trust')}
      ${link('/claude', 'Ask Rho')}
      ${link('/connect', 'Connected data')}
      ${link('/setup', 'Use my numbers')}`;
}

// The date that every money decision moves. It sits in the sidebar under the
// company name, so it is always in view, never covers the page, and flashes
// when a click on any screen moves it.
function datePill(state) {
  const sc = state?.scenario;
  if (!sc) return '';
  const d = raiseBy(sc);
  const label = d ? fmtDay(d, parseDate(sc.asOf)) : 'no date';
  const tag = hasWhatIf(state) ? '<span class="pill-tag">what-if</span>' : '';
  return `
    <a class="date-pill side-pill" href="#/reveal" aria-live="polite">
      <span class="pill-k">Raise-by</span>
      <b data-flash="pill">${label}</b>${tag}
    </a>`;
}

export function shell({ route, body, footerRight = '', state = null }) {
  const sc = state?.scenario;
  const company = esc(sc?.company ?? (sc?.source === 'local' ? 'Your company' : 'Demo Co.'));
  const c = counts(sc, state);
  const app = globalThis.app;
  const presenting = !!globalThis.__RAISE_BY_PRESENT__ && app && typeof app.step === 'number';
  const centre = presenting && app.stepCount
    ? `Step ${app.step + 1} / ${app.stepCount} · <kbd>→</kbd> next`
    : footerRight;
  return `
  <div class="layout">
    <header class="topbar">
      <span class="co-mark" aria-hidden="true">${company.charAt(0)}</span>
      <span class="co-name">${company}</span>
      <details class="mnav">
        <summary>Menu</summary>
        <nav class="mnav-list" aria-label="Main">${navLinks(route, c)}${demoLinks(route)}</nav>
      </details>
    </header>
    <nav class="sidebar" aria-label="Main">
      <div class="co">
        <span class="co-mark" aria-hidden="true">${company.charAt(0)}</span>
        <div><div class="co-name">${company}</div><div class="co-sub">${sc?.source === 'local' ? 'Your numbers' : 'Synthetic data'}</div></div>
      </div>
      ${sc ? datePill(state) : ''}
      <div class="nav-list">${navLinks(route, c)}</div>
      <div class="nav-demo">${demoLinks(route)}</div>
    </nav>
    <main class="main"><div class="page">${body}</div></main>
  </div>
  <div class="footer">
    <span>Synthetic data</span>
    <span class="footer-centre">${centre}</span>
    <span class="footer-right">
      <a href="#/reveal">Reveal</a>
      <button class="btn ghost btn-xs" onclick="app.reset()">Start over</button>
    </span>
  </div>`;
}
