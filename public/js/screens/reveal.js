import { shell, eyebrow } from './common.js';
import { range, netBurn, grossSpend, bufferAt, revenueBand, projectDate } from '../engine.js';
import { parseDate, fmtMonthYear, fmtMonthDay } from '../calendar.js';
import { fmt, derived } from '../derived.js';

// Every number in the copy below is a derived() object, formatted by fmt(), so the
// provenance is carried next to the value that the screen prints.
const at = (label, value, source) => ({ label, value, source });

export function reveal({ state }) {
  const sc = state.scenario;
  const asOf = parseDate(sc.asOf);
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth() + 1;
  const contract = sc.contracts[0];
  const payrollTotal = sc.payroll.reduce((sum, p) => sum + p.monthlyCost, 0);

  const dateD = projectDate(sc);
  const when = dateD.value === null ? null : new Date(dateD.value);
  const r = range(sc);
  const band = revenueBand(sc);

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

  const lowDate = derived(r.low ? r.low.getTime() : null, 'date',
    [at('projected revenue', Math.round(band.low), 'engine'),
     at('cash', sc.cash, 'scenario'),
     at('cushion', sc.cushionMonths, 'scenario')],
    'raiseBy(plannedRevenue * max(0.85, mean - s))');
  const highDate = derived(r.high ? r.high.getTime() : null, 'date',
    [at('projected revenue', Math.round(band.high), 'engine'),
     at('cash', sc.cash, 'scenario'),
     at('cushion', sc.cushionMonths, 'scenario')],
    'raiseBy(plannedRevenue * min(1.05, mean + s))');
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
  const renewal = derived(contract.amount, 'cents',
    [at('contract amount', contract.amount, 'contract'),
     at('renews on', parseDate(contract.renewsOn).getTime(), 'contract')], 'contracts[0].amount');
  const shortfall = derived(sc.plan.plannedRevenue - sc.revenue.current, 'cents',
    [at('planned revenue', sc.plan.plannedRevenue, 'fixture'),
     at('current revenue', sc.revenue.current, 'scenario')], 'plannedRevenue - revenue.current');

  const lead = dateD.value === null
    ? `<p class="lead">Cash does not run out within three years at this rate.</p>`
    : `<p class="lead">${lowDate.value !== null && highDate.value !== null
        ? `Estimated range ${fmtMonthYear(new Date(lowDate.value))} to ${fmtMonthYear(new Date(highDate.value))}. `
        : ''}Base case ${fmt(dateD)}.</p>`;

  const math = dateD.value === null ? '' : `
    <div class="card white">
      <div class="mono">${fmt(cash)} cash after the renewal ÷ ${fmt(burn)} a month
        = ${fmt(runwayMonths)}. Minus your ${fmt(cushion)}-month cushion = start by
        ${fmt(dateD)}.</div>
      <p class="muted" style="margin-top:10px">Range from your last
        ${fmt(monthsSampled)} months: revenue
        ${fmt(bandLow)} to ${fmt(bandHigh)}, a sample this small.</p>
    </div>`;

  const sources = `
    <div class="card">
      <h2>Where the numbers come from</h2>
      <table class="mono" style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 0">Payroll</td><td>+${fmt(payrollMonthly)} a month</td><td class="muted">6 Gusto debits</td></tr>
        <tr><td style="padding:4px 0">HubSpot renewal</td><td>${fmt(renewal)} on ${fmtMonthDay(parseDate(contract.renewsOn))}</td><td class="muted">${contract.source.split(':')[0]}</td></tr>
        <tr><td style="padding:4px 0">Sales</td><td>${fmt(shortfall)} a month behind plan</td><td class="muted">12 deposits</td></tr>
      </table>
    </div>`;

  const headline = dateD.value === null
    ? `<h1>Raise-By cannot see a date yet.</h1>`
    : `<h1>Start raising by mid-${fmtMonthYear(when)}.</h1>`;

  const body = `
    ${eyebrow('RAISE-BY')}
    ${headline}
    ${lead}
    ${math}
    <div id="confirm-slot"></div>
    <div id="bar-slot"></div>
    ${sources}`;
  return shell({ route: '/reveal', body, footerRight: 'Reveal' });
}

// Task 9 mounts the confirm card and the bar into their slots; task 12 adds the what-if box.
