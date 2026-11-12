import { shell, eyebrow } from './common.js';
import { mountConfirm } from './confirm.js';
import { mountBar } from './bar.js';
import { mountWhatIf } from './whatif.js';
import { range, netBurn, grossSpend, bufferAt } from '../engine.js';
import { parseDate, fmtMonthDay } from '../calendar.js';
import { fmt, derived } from '../derived.js';

// Every number in the copy below is a derived() object, formatted by fmt(), so the
// provenance is carried next to the value that the screen prints.
const at = (label, value, source) => ({ label, value, source });

const fullMonth = (d) => d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

// The deck names a date by the part of the month it lands in:
// early 1-10, mid 11-20, late 21-end. Fixture: 2027-03-01 -> early March,
// 2027-04-11 -> mid April, 2027-04-28 -> late April. The headline and receipt
// use the same derivation on the projected date, so a judge's own landing day
// is named honestly.
const partOf = (d) => (d.getUTCDate() <= 10 ? 'early' : d.getUTCDate() <= 20 ? 'mid' : 'late');

function periodOf(d) {
  return `${partOf(d)} ${fullMonth(d)}`;
}

// The headline and receipt name a single date, where standard usage hyphenates
// only "mid-April"; "early April" and "late April" take no hyphen. periodOf()
// above stays space-only because it feeds the range sentence, where no part is
// ever hyphenated.
const namedDate = (d) => `${partOf(d)}${partOf(d) === 'mid' ? '-' : ' '}${fullMonth(d)}`;

// The engine reads a missing contract as zero (activeContract() in engine.js),
// so this screen hands it the real scenario, contract-less or not.

export function reveal({ state }) {
  const sc = state.scenario;
  const asOf = parseDate(sc.asOf);
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth() + 1;
  const contract = sc.contracts?.[0] ?? null;
  const payrollTotal = sc.payroll.reduce((sum, p) => sum + p.monthlyCost, 0);

  const r = range(sc);
  const band = r.band;
  const projected = r.base;

  const cash = derived(sc.cash, 'cents',
    [at('cash', sc.cash, 'scenario')], 'scenario.cash');
  const burn = derived(netBurn(sc, y, m), 'cents',
    [at('gross spend', grossSpend(sc, y, m), 'engine'),
     at('revenue', sc.revenue.current, 'scenario'),
     at('payroll inside gross', payrollTotal, 'payroll')], 'grossSpend - revenue');
  const buffer = derived(bufferAt(sc, asOf), 'cents',
    [at('cushion', sc.cushionMonths, 'scenario'),
     at('net burn', netBurn(sc, y, m), 'engine')], 'sum of next cushionMonths of netBurn');
  const runwayMonths = derived((sc.cash - bufferAt(sc, asOf)) / netBurn(sc, y, m), 'months',
    [at('cash', sc.cash, 'scenario'),
     at('buffer', bufferAt(sc, asOf), 'engine'),
     at('burn', netBurn(sc, y, m), 'engine')], '(cash - buffer) / netBurn');
  const cushion = derived(sc.cushionMonths, 'count',
    [at('cushion months', sc.cushionMonths, 'scenario')], 'scenario.cushionMonths');
  const monthsSampled = derived(sc.revenue.trailing.length, 'count',
    [at('trailing months', sc.revenue.trailing.length, 'scenario'),
     ...sc.revenue.trailing.map((t) => at(`ratio ${t.month}`, t.actual / t.expected, 'revenue.trailing'))],
    'revenue.trailing.length');

  const dateD = derived(projected ? projected.getTime() : null, 'date',
    [at('cash', sc.cash, 'scenario'),
     at('net burn', netBurn(sc, y, m), 'engine'),
     at('buffer', bufferAt(sc, projected ?? asOf), 'engine'),
     at('cushion', sc.cushionMonths, 'scenario')],
    'first day cash <= buffer; buffer = sum of next cushionMonths of netBurn');
  const lowWhen = derived(r.low ? periodOf(r.low) : null, 'text',
    [at('range low date', r.low ? r.low.getTime() : null, 'engine'),
     at('projected revenue', Math.round(band.low), 'engine'),
     at('cash', sc.cash, 'scenario')],
    'early / mid / late from range().low day, full month name');
  const highWhen = derived(r.high ? periodOf(r.high) : null, 'text',
    [at('range high date', r.high ? r.high.getTime() : null, 'engine'),
     at('projected revenue', Math.round(band.high), 'engine'),
     at('cash', sc.cash, 'scenario')],
    'early / mid / late from range().high day, full month name');
  const bandLow = derived(Math.round(band.low), 'cents',
    [at('planned revenue', sc.plan.plannedRevenue, 'fixture'),
     at('mean trailing ratio', Math.round(band.mean * 10000) / 10000, 'engine'),
     at('sample deviation', Math.round(band.s * 10000) / 10000, 'engine')],
    'plannedRevenue * max(0.85, mean - s)');
  const bandHigh = derived(Math.round(band.high), 'cents',
    [at('planned revenue', sc.plan.plannedRevenue, 'fixture'),
     at('mean trailing ratio', Math.round(band.mean * 10000) / 10000, 'engine'),
     at('sample deviation', Math.round(band.s * 10000) / 10000, 'engine')],
    'plannedRevenue * min(1.05, mean + s)');

  const payrollMonthly = derived(payrollTotal, 'cents',
    [at('payroll rows', sc.payroll.length, 'payroll'),
     ...sc.payroll.map((p) => at(p.label, p.monthlyCost, 'payroll'))], 'sum of payroll.monthlyCost');
  const renewal = contract ? derived(contract.amount, 'cents',
    [at('contract amount', contract.amount, 'contract'),
     at('renews on', parseDate(contract.renewsOn).getTime(), 'contract')], 'contracts[0].amount') : null;
  const shortfall = derived(sc.plan.plannedRevenue - sc.revenue.current, 'cents',
    [at('planned revenue', sc.plan.plannedRevenue, 'fixture'),
     at('current revenue', sc.revenue.current, 'scenario')], 'plannedRevenue - revenue.current');

  const rangeSentence = r.low && r.high
    ? `Estimated range ${fmt(lowWhen)} to ${fmt(highWhen)}.`
    : '';
  const lead = projected === null
    ? `<p class="lead">Cash does not run out within three years at this rate.</p>`
    : (rangeSentence ? `<p class="lead">${rangeSentence}</p>` : '');
  const receipt = projected === null
    ? ''
    : `<p class="muted" style="margin:-16px 0 24px">Start raising by ${namedDate(projected)} ${projected.getUTCFullYear()} (base case ${fmtMonthDay(projected)})</p>`;

  // The choice is already inside the scenario, so the receipt above has moved.
  // This line is how a reader sees why it moved.
  const included = { cancel: 'cancel requested', monthly: 'monthly requested', approve: 'renewal approved' };
  const choice = state.choice?.hubspot;
  const includesLine = choice && included[choice]
    ? `<p class="muted" style="margin:-16px 0 24px">Includes: ${contract?.vendor ?? 'HubSpot'} — ${included[choice]}.</p>`
    : '';

  const math = projected === null ? '' : `
    <div class="card white">
      <div class="mono">${fmt(cash)} cash after the renewal ÷ ${fmt(burn)} a month
        = ${fmt(runwayMonths)}. Minus your ${fmt(cushion)}-month cushion = start by
        ${fmt(dateD)}.</div>
      <p class="muted" style="margin-top:10px">Range from your last
        ${fmt(monthsSampled)} months: revenue
        ${fmt(bandLow)} to ${fmt(bandHigh)}, a sample this small.</p>
    </div>`;

  const contractRow = contract
    ? `<tr><td style="padding:4px 0">${contract.vendor} renewal</td><td>${fmt(renewal)} on ${fmtMonthDay(parseDate(contract.renewsOn))}</td><td class="muted">${contract.source.split(':')[0]}</td></tr>`
    : `<tr><td style="padding:4px 0">HubSpot renewal</td><td>No contract entered</td><td class="muted">Add one in Use my numbers</td></tr>`;

  const sources = `
    <div class="card">
      <h2>Where the numbers come from</h2>
      <table class="mono" style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 0">Payroll</td><td>+${fmt(payrollMonthly)} a month</td><td class="muted">Gusto debits</td></tr>
        ${contractRow}
        <tr><td style="padding:4px 0">Sales</td><td>${fmt(shortfall)} a month behind plan</td><td class="muted">revenue deposits</td></tr>
      </table>
    </div>`;

  const headline = projected === null
    ? `<h1>Raise-By cannot see a date yet.</h1>`
    : `<h1>Start raising by ${namedDate(projected)} ${projected.getUTCFullYear()}.</h1>`;

  const body = `
    ${eyebrow('RAISE-BY')}
    ${headline}
    ${lead}
    ${receipt}
    ${includesLine}
    ${math}
    <div id="confirm-slot"></div>
    <div id="bar-slot"></div>
    <div id="whatif-slot"></div>
    ${sources}`;
  const html = shell({ route: '/reveal', body, footerRight: 'Reveal' });
  // The slots only exist once shell() is in the document, so the mount waits one
  // microtask. Guarded for Node, where reveal() is rendered without a DOM.
  queueMicrotask(() => {
    if (typeof document === 'undefined') return;
    mountConfirm(document.getElementById('confirm-slot'));
    mountBar(document.getElementById('bar-slot'));
    mountWhatIf(document.getElementById('whatif-slot'), state);
  });
  return html;
}
