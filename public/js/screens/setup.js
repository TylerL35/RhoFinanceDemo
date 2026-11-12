import { shell, eyebrow } from './common.js';
import { validate } from '../scenario.js';
import { raiseBy } from '../engine.js';
import { parseDate } from '../calendar.js';

// The engine assumes a contract exists (contracts[0] in contractMonthly and
// oneOffsBetween), and onboarding may build a contract-less company. The same
// zero-value stand-in that reveal.js, trust.js and claude.js use lets the date
// be computed without inventing renewal terms.
function calculable(sc) {
  if (sc.contracts?.length) return sc;
  return {
    ...sc,
    contracts: [{
      id: 'none', vendor: '', amount: 0, renewsOn: sc.asOf, noticeDays: 0,
      term: 'none', monthlyEquivalent: 0, choice: 'cancel', source: '',
    }],
  };
}

// Every figure is either a number or NaN; nothing is defaulted into a lie. The
// as-of date travels with the form so the projection never reads the wall clock.
export function buildScenario(f) {
  const cents = (s) => Math.round(Number(s) * 100);
  return {
    id: 'local', source: 'local', label: 'Your numbers',
    asOf: f.asOf || '2026-11-11',
    cash: cents(f.cash),
    plan: {
      raisedOn: f.asOf || '2026-11-11',
      amount: cents(f.cash),
      plannedGrossSpend: cents(f.spend),
      plannedRevenue: cents(f.revenue),
    },
    cushionMonths: Number(f.cushion) || 6,
    revenue: { current: cents(f.revenue), priceMultiplier: 1, trailing: [] },
    payroll: [], alerts: [],
    contracts: f.vendor ? [{
      id: 'main', vendor: f.vendor, amount: cents(f.amount), renewsOn: f.renewsOn,
      noticeDays: Number(f.noticeDays) || 30, term: 'annual',
      monthlyEquivalent: Math.round(cents(f.amount) / 12), choice: null,
      source: 'Entered by you',
    }] : [],
    invoices: [],
    suppression: { count: 0, since: null, rule: 'date moved 7+ days' },
  };
}

export function setup() {
  const body = `
    ${eyebrow('USE MY NUMBERS')}
    <h1>Six numbers and a date.</h1>
    <p class="lead">Nothing leaves this browser.</p>
    <div class="card white">
      <div class="form-grid">
        <label for="f-cash">Cash today<input id="f-cash" inputmode="decimal" placeholder="900000"></label>
        <label for="f-revenue">Monthly revenue<input id="f-revenue" inputmode="decimal" placeholder="60000"></label>
        <label for="f-spend">Monthly spend<input id="f-spend" inputmode="decimal" placeholder="90000"></label>
        <label for="f-cushion">Cushion months<input id="f-cushion" inputmode="numeric" placeholder="6"></label>
        <label for="f-asof">As of<input id="f-asof" value="2026-11-11" placeholder="2026-11-11"></label>
      </div>
      <div class="form-grid" style="margin-top:14px">
        <label for="f-vendor">Largest contract<input id="f-vendor" placeholder="Figma"></label>
        <label for="f-amount">Amount<input id="f-amount" inputmode="decimal" placeholder="12000"></label>
        <label for="f-renew">Renews on<input id="f-renew" placeholder="2027-02-15"></label>
        <label for="f-notice">Notice days<input id="f-notice" inputmode="numeric" placeholder="30"></label>
      </div>
      <div class="row" style="margin-top:18px">
        <button class="btn" onclick="app.saveSetup()">Show my date</button>
      </div>
      <p class="muted" id="setup-note" aria-live="polite" style="margin-top:12px"></p>
    </div>`;
  return shell({ route: '/setup', body, footerRight: 'Use my numbers' });
}

const NO_BURN = 'At this rate cash never runs out. Raise-By needs a positive burn.';
const MISSING = 'Some numbers are missing.';
const NO_DATE = 'No raise-by date within three years.';

// A vendor with no amount or no readable renewal date is a half-typed block,
// not a company with a contract. Refusing it by name is the only honest answer:
// the alternative is a projection, a bill and a reveal built on Invalid Date.
function incompleteContract(sc) {
  const c = sc.contracts?.[0];
  if (!c) return false;
  return !(c.amount > 0)
    || !(c.noticeDays >= 0)
    || Number.isNaN(parseDate(c.renewsOn).getTime());
}

// One sentence, and it is the truth for this input: a refusal, a date, or the
// horizon. ready is true only when there is a date worth leaving the form for.
// Computed once so the projection is not run twice per tap on a phone.
export function setupOutcome(sc) {
  const errs = validate(sc);
  if (errs.includes('NO_BURN')) return { note: NO_BURN, ready: false };
  if (errs.length || incompleteContract(sc)) return { note: MISSING, ready: false };
  const d = raiseBy(calculable(sc));
  if (d === null) return { note: NO_DATE, ready: false };
  return { note: `Raise by ${d.toISOString().slice(0, 10)}.`, ready: true };
}

export const setupResult = (sc) => setupOutcome(sc).note;

// A refusal and a no-date company both keep the judge on the page, with the
// reason underneath the button.
export const setupReady = (sc) => setupOutcome(sc).ready;
