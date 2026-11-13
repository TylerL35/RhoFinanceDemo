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

// Rho's page header: the page name, then its status as a grey badge
// ("Bill Pay · Awaiting approval"). The dot stays in the text for readers.
export const eyebrow = (t) => {
  const [title, ...rest] = String(t).split(' · ');
  const sub = rest.length ? `<span class="eb-sub"><span class="eb-sep"> · </span>${rest.join(' · ')}</span>` : '';
  return `<div class="eyebrow page-head"><span class="eb-title">${title}</span>${sub}</div>`;
};

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

// Line icons in the style of Rho's sidebar (1.5px stroke, 18px).
const I = (d) => `<svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  Home: I('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  'Pilot Agent': I('<path d="M3 20h18"/><path d="M5 16l4-5 3.5 3L19 6"/><path d="M15 6h4v4"/>'),
  Transactions: I('<path d="M4 8h15l-3-3"/><path d="M20 16H5l3 3"/>'),
  Accounts: I('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7"/><path d="M3 20h18"/>'),
  Cards: I('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>'),
  Vendors: I('<path d="M4 9h16l-1.5-4h-13z"/><path d="M5 9v10h14V9"/><path d="M10 19v-5h4v5"/>'),
  Reporting: I('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  Invoicing: I('<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/>'),
  Expenses: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'),
  Reimbursements: I('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
  'Bill Pay': I('<path d="M4 4h16v16l-3-2-3 2-2-2-2 2-3-2-3 2z"/><path d="M8 9h8M8 13h5"/>'),
  Accounting: I('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h2M14 12h2M8 16h2M14 16h2"/>'),
  'Needs a look': I('<path d="M4 13l2.5-7h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>'),
};
const ico = (label) => ICONS[label] ?? '';

const INERT_TOP = ['Transactions', 'Accounts', 'Cards', 'Vendors', 'Reporting'];

function navLinks(route, c) {
  const link = (href, label, extra = '') =>
    `<a href="#${href}"${route === href ? ' aria-current="page"' : ''}>${ico(label)}<span>${label}</span>${extra}</a>`;
  const count = (n) => (n > 0 ? `<span class="count">${n}</span>` : '');
  const inert = (label) => `<span class="nav-inert" title="Not part of this demo">${ico(label)}<span>${label}</span></span>`;
  return `
      ${link('/', 'Home')}
      ${link('/reveal', 'Pilot Agent', '<span class="tag-new">New</span>')}
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
      <span class="pill-k">Pilot Agent</span>
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
      <div class="brand">
        <img class="rho-logo" src="./assets/rho-logo.png" alt="Rho" width="83" height="38">
        <span class="bell" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></span>
      </div>
      ${sc && !(route === '/' && !state?.guesses?.value) ? datePill(state) : ''}
      <div class="nav-list">${navLinks(route, c)}</div>
      <div class="nav-demo">${demoLinks(route)}</div>
      <div class="co">
        <span class="co-mark" aria-hidden="true">${company.charAt(0)}</span>
        <div><div class="co-name">${company}</div><div class="co-sub">${sc?.source === 'local' ? 'Your numbers' : 'Synthetic data'}</div></div>
      </div>
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
