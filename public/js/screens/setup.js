import { shell, eyebrow } from './common.js';
import { validate } from '../scenario.js';
import { raiseBy } from '../engine.js';
import { parseDate, fmtDay } from '../calendar.js';

const DEFAULT_AS_OF = '2026-11-11';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// The example company the form opens with: real values, not placeholders, so a
// judge can press the button at once, see a date, then change what they like.
export const EXAMPLE = {
  cash: '900,000', revenue: '60,000', spend: '90,000', cushion: '6', asOf: DEFAULT_AS_OF,
  vendor: 'Figma', amount: '12,000', renewsOn: '2027-02-15', noticeDays: '30',
};

// A date the engine can actually start from: the exact YYYY-MM-DD shape the
// field promises, and a day that exists on the calendar (2026-02-30 is not).
// Anything else is null, so the caller can refuse it instead of projecting it.
function validAsOf(value) {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return null;
  const d = parseDate(value);
  // Date rolls 2026-02-30 over to March, so compare the round trip too.
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return value;
}

// "$900,000", "900000" and " 900 000 " all read as 900000. An empty field is
// missing (NaN), never zero: Number('') is 0, which used to turn an empty form
// into "cash never runs out".
const amountOf = (s) => {
  const t = String(s ?? '').replace(/[$,\s]/g, '');
  return t === '' ? NaN : Number(t);
};

// Every figure is either a number or NaN; nothing is defaulted into a lie. The
// as-of date travels with the form so the projection never reads the wall clock.
// A missing field keeps the form's documented default; a date that is present
// but unreadable builds no scenario at all, so raiseBy never sees an
// Invalid Date.
export function buildScenario(f) {
  const asOf = f.asOf === '' || f.asOf == null ? DEFAULT_AS_OF : validAsOf(f.asOf);
  if (asOf === null) return null;
  const cents = (s) => Math.round(amountOf(s) * 100);
  const vendor = String(f.vendor ?? '').trim();
  return {
    id: 'local', source: 'local', label: 'Your numbers', company: 'Your company',
    asOf,
    cash: cents(f.cash),
    plan: {
      raisedOn: asOf,
      amount: cents(f.cash),
      plannedGrossSpend: cents(f.spend),
      plannedRevenue: cents(f.revenue),
    },
    // A blank cushion takes the form's default. A typed 0 (or anything else
    // below 1) is out of range, not a reason to silently use 6: validate()
    // reports NO_CUSHION and setupOutcome names the field.
    cushionMonths: f.cushion === '' || f.cushion == null ? 6 : Number(f.cushion),
    revenue: { current: cents(f.revenue), priceMultiplier: 1, trailing: [] },
    payroll: [], alerts: [],
    contracts: vendor ? [{
      id: 'main', vendor, amount: cents(f.amount), renewsOn: f.renewsOn,
      noticeDays: Number(f.noticeDays) || 30, term: 'annual',
      monthlyEquivalent: Math.round(cents(f.amount) / 12), choice: null,
      source: 'Entered by you',
    }] : [],
    invoices: [],
    suppression: { count: 0, since: null, rule: 'date moved 7+ days' },
  };
}

const field = (id, label, value, opts = '') =>
  `<label for="${id}">${label}<input id="${id}" value="${value}" ${opts}></label>`;
const money = (id, label, value) =>
  `<label for="${id}">${label}<span class="money"><input id="${id}" value="${value}" inputmode="decimal" autocomplete="off"></span></label>`;

export function setup({ state } = {}) {
  const e = EXAMPLE;
  const body = `
    ${eyebrow('USE MY NUMBERS')}
    <h1>Your numbers, your date.</h1>
    <p class="lead">Nothing leaves this browser. An example company is filled in: press the button to
      see its date, then replace the numbers with yours.</p>
    <div class="card white">
      <h3 class="section-title">Your company</h3>
      <div class="form-grid">
        ${money('f-cash', 'Cash today', e.cash)}
        ${money('f-revenue', 'Monthly revenue', e.revenue)}
        ${money('f-spend', 'Monthly spend', e.spend)}
        ${field('f-cushion', 'Cushion months', e.cushion, 'inputmode="numeric" autocomplete="off"')}
        ${field('f-asof', 'As of', e.asOf, 'type="date"')}
      </div>
      <h3 class="section-title gap">Largest contract <span class="muted">(optional: clear the name to skip)</span></h3>
      <div class="form-grid">
        ${field('f-vendor', 'Largest contract', e.vendor, 'autocomplete="off"')}
        ${money('f-amount', 'Amount', e.amount)}
        ${field('f-renew', 'Renews on', e.renewsOn, 'type="date"')}
        ${field('f-notice', 'Notice days', e.noticeDays, 'inputmode="numeric" autocomplete="off"')}
      </div>
      <div class="row actions">
        <button class="btn" onclick="app.saveSetup()">Show my date</button>
        ${state?.scenario?.source === 'local' ? '<button class="btn ghost" onclick="app.reset()">Back to the demo company</button>' : ''}
      </div>
      <p class="note-line" id="setup-note" aria-live="polite"></p>
    </div>`;
  return shell({ route: '/setup', body, footerRight: 'Use my numbers', state });
}

const NO_BURN = 'At this rate cash never runs out. Pilot needs a positive burn.';
const MISSING = 'Some numbers are missing.';
const NO_DATE = 'No raise-by date within three years.';

// The first field a judge needs to fix, named, so the note is something to act on.
function missingField(sc) {
  if (!(sc.cash > 0)) return 'Add your cash today.';
  if (!(sc.revenue.current >= 0)) return 'Add your monthly revenue (0 is fine).';
  if (!(sc.plan.plannedGrossSpend >= 0)) return 'Add your monthly spend.';
  if (!(sc.cushionMonths >= 1)) return 'Cushion months must be 1 or more.';
  return null;
}

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

// One sentence, and it is the truth for this input: what to fix, a refusal, a
// date, or the horizon. ready is true only when there is a date worth leaving
// the form for. Computed once so the projection is not run twice per tap.
export function setupOutcome(sc) {
  if (!sc || !validAsOf(sc.asOf)) return { note: 'Check the As of date.', ready: false };
  const missing = missingField(sc);
  if (missing) return { note: missing, ready: false };
  const errs = validate(sc);
  if (errs.includes('NO_BURN')) return { note: NO_BURN, ready: false };
  if (errs.length) return { note: MISSING, ready: false };
  if (incompleteContract(sc)) {
    return { note: 'Finish the contract: add its amount and renewal date, or clear its name.', ready: false };
  }
  const d = raiseBy(sc);
  if (d === null) return { note: NO_DATE, ready: false };
  return { note: `Raise by ${fmtDay(d, parseDate(sc.asOf))}.`, ready: true };
}

export const setupResult = (sc) => setupOutcome(sc).note;

// A refusal and a no-date company both keep the judge on the page, with the
// reason underneath the button.
export const setupReady = (sc) => setupOutcome(sc).ready;
