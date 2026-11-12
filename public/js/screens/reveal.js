import { shell, eyebrow, chip, realScenario, hasWhatIf } from './common.js';
import { confirmHtml } from './confirm.js';
import { barHtml } from './bar.js';
import { whatifHtml } from './whatif.js';
import { timelineHtml } from './timeline.js';
import { range, netBurn, raiseBy, attribute, activeContract } from '../engine.js';
import { parseDate, fmtDay, namedDate, periodOf, diffDays } from '../calendar.js';
import { fmt, derived } from '../derived.js';

// Every number in the copy below is a derived() object, formatted by fmt(), so the
// provenance is carried next to the value that the screen prints.
const at = (label, value, source) => ({ label, value, source });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GUESS_YEAR = 2027; // the home card offers May to Aug 2027 (BUILD_PROMPT screen 1)

// 10.97 prints as "11", 29.6 prints as "29.6": a whole number only when it is one.
const monthsText = (x) => (Math.abs(x - Math.round(x)) < 0.1 ? String(Math.round(x)) : x.toFixed(1));

const sameBurn = (a, b) => Math.abs(a - b) < 100; // within a dollar

// The math line. With a flat burn it is the deck's sentence: cash after the
// renewal, divided by burn, minus the cushion. When burn changes before the date
// (a hire in March, monthly billing) a single division would not land on the
// date, so the line says what changes and when instead of printing false math.
function mathLine(sc, projected) {
  const asOf = parseDate(sc.asOf);
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth() + 1;
  const c = activeContract(sc);
  const renews = c ? parseDate(c.renewsOn) : null;
  const hits = !!(c && !['cancel', 'monthly'].includes(c.choice) && renews > asOf && renews <= projected);
  const cashAfterValue = sc.cash - (hits ? c.amount : 0);
  const burn0Value = netBurn(sc, y, m);

  const cashAfter = derived(cashAfterValue, 'cents',
    [at('cash', sc.cash, 'scenario'), at('renewal', hits ? c.amount : 0, 'contract')],
    'cash - renewal when it lands before the date');
  const burn = derived(burn0Value, 'cents',
    [at('net burn this month', burn0Value, 'engine'), at('revenue', sc.revenue.current, 'scenario')],
    'grossSpend - revenue, as-of month');
  const cushion = derived(sc.cushionMonths, 'count',
    [at('cushion months', sc.cushionMonths, 'scenario')], 'scenario.cushionMonths');
  const day = fmtDay(projected, asOf);

  // First month (up to the date) whose burn differs from this month's.
  let change = null;
  for (let i = 1; i <= 36; i += 1) {
    const yy = y + Math.floor((m - 1 + i) / 12);
    const mm = ((m - 1 + i) % 12) + 1;
    if (Date.UTC(yy, mm - 1, 1) > projected.getTime()) break;
    const b = netBurn(sc, yy, mm);
    if (!sameBurn(b, burn0Value)) {
      const ny = yy + Math.floor(mm / 12);
      const nm = (mm % 12) + 1;
      const settled = netBurn(sc, ny, nm); // a mid-month start is prorated in its first month
      change = { label: `${MONTHS[mm - 1]} ${yy}`, value: sameBurn(settled, b) ? b : settled };
      break;
    }
  }

  const after = hits ? ' after the renewal' : '';
  if (!change) {
    const months = derived(monthsText(cashAfterValue / burn0Value), 'text',
      [at('cash after renewal', cashAfterValue, 'engine'), at('net burn', burn0Value, 'engine')],
      'cashAfter / netBurn');
    return `${fmt(cashAfter)} cash${after} ÷ ${fmt(burn)} a month = ${fmt(months)} months. Minus your ${fmt(cushion)}-month cushion = start by ${day}.`;
  }
  const later = derived(change.value, 'cents',
    [at(`net burn from ${change.label}`, change.value, 'engine')], 'netBurn at the first month that differs');
  return `${fmt(cashAfter)} cash${after}. Burn is ${fmt(burn)} a month now and ${fmt(later)} from ${change.label}. Keeping ${fmt(cushion)} months of burn in reserve, cash reaches that line on ${day}.`;
}

function guessLines(state, projected) {
  const g = state?.guesses;
  if (!g?.made || !g.value || !projected) return { above: '', below: '' };
  const gi = MONTHS.indexOf(g.value);
  if (gi === -1) return { above: '', below: '' };
  const diff = (GUESS_YEAR * 12 + gi) - (projected.getUTCFullYear() * 12 + projected.getUTCMonth());
  const n = Math.abs(diff);
  const below = diff === 0
    ? 'Right month.'
    : `About ${n} month${n === 1 ? '' : 's'} ${diff > 0 ? 'sooner' : 'later'} than you thought.`;
  return {
    above: `<div class="guess-line">You guessed ${g.value} ${GUESS_YEAR}</div>`,
    below: `<p class="guess-delta" data-flash="guessDelta">${below}</p>`,
  };
}

function sourcesHtml(sc, local) {
  const asOf = parseDate(sc.asOf);
  const contract = activeContract(sc);
  const rows = [];
  const row = (k, v, src) => `<tr><td>${k}</td><td class="num">${v}</td><td>${src}</td></tr>`;

  if (local) {
    const burn = netBurn(sc, asOf.getUTCFullYear(), asOf.getUTCMonth() + 1);
    rows.push(row('Cash', fmt(derived(sc.cash, 'cents', [at('cash', sc.cash, 'scenario')], 'scenario.cash')), chip('Entered by you')));
    rows.push(row('Revenue', `${fmt(derived(sc.revenue.current, 'cents', [at('revenue', sc.revenue.current, 'scenario')], 'revenue.current'))} a month`, chip('Entered by you')));
    rows.push(row('Net burn', `${fmt(derived(burn, 'cents', [at('net burn', burn, 'engine')], 'spend - revenue'))} a month`, chip('Spend minus revenue')));
  } else {
    const payroll = sc.payroll.filter((p) => !p.whatif);
    if (payroll.length) {
      const total = payroll.reduce((s, p) => s + p.monthlyCost, 0);
      const ok = payroll.every((p) => p.confirmed);
      const v = derived(total, 'cents',
        [at('payroll rows', payroll.length, 'payroll'), ...payroll.map((p) => at(p.label, p.monthlyCost, 'payroll'))],
        'sum of payroll.monthlyCost');
      rows.push(row('Payroll', `+${fmt(v)} a month`,
        `${chip('Gusto debits')} ${ok ? chip('confirmed by you', 'ok') : chip('not confirmed yet', 'pending')}`));
    }
  }

  if (contract) {
    const v = derived(contract.amount, 'cents',
      [at('contract amount', contract.amount, 'contract'), at('renews on', parseDate(contract.renewsOn).getTime(), 'contract')],
      'contracts[0].amount');
    rows.push(row(`${contract.vendor} renewal`, `${fmt(v)} on ${fmtDay(parseDate(contract.renewsOn), asOf)}`,
      chip(contract.source.split(':')[0])));
  } else {
    rows.push(row('Contract', 'No contract entered', '<span class="muted">Add one in Use my numbers</span>'));
  }

  if (!local) {
    const gap = sc.plan.plannedRevenue - sc.revenue.current;
    const v = derived(gap, 'cents',
      [at('planned revenue', sc.plan.plannedRevenue, 'fixture'), at('current revenue', sc.revenue.current, 'scenario')],
      'plannedRevenue - revenue.current');
    rows.push(gap > 0
      ? row('Sales', `${fmt(v)} a month behind plan`, chip('Revenue deposits'))
      : row('Sales', 'On plan', chip('Revenue deposits')));
  }

  return `
    <section class="section">
      <h3 class="section-title">Where the numbers come from</h3>
      <table class="sources">${rows.join('')}</table>
    </section>`;
}

export function reveal({ state }) {
  const sc = state.scenario;
  const real = realScenario(state) ?? sc;
  const local = sc.source === 'local';
  const whatIf = hasWhatIf(state);
  const asOf = parseDate(sc.asOf);

  const r = range(sc);
  const projected = r.base;
  const hasRange = !!(r.low && r.high && (sc.revenue.trailing?.length ?? 0) >= 2);

  if (projected === null) {
    const body = `
      ${eyebrow('RAISE-BY')}
      <h1>Raise-By cannot see a date yet.</h1>
      <p class="lead">Cash does not run out within three years at this rate.</p>
      ${local ? '<div class="row"><button class="btn ghost" onclick="app.reset()">Back to the demo company</button></div>' : ''}
      ${sourcesHtml(sc, local)}`;
    return shell({ route: '/reveal', body, footerRight: 'Reveal', state });
  }

  const year = projected.getUTCFullYear();
  const guess = guessLines(state, projected);
  const realDate = whatIf ? raiseBy(real) : projected;

  const lead = hasRange
    ? `<p class="lead">Estimated range ${periodOf(r.low)} to ${periodOf(r.high)}.</p>`
    : `<p class="lead">${local ? 'A single date, not a range: there is no revenue history yet.' : 'A single date, not a range.'}</p>`;

  const receipt = `<p class="receipt mono">Base case ${fmtDay(projected, asOf)}${hasRange ? ` · range ${fmtDay(r.low, asOf)} to ${fmtDay(r.high, asOf)}` : ''}${hasRange ? ` · from your last ${sc.revenue.trailing.length} months of sales` : ''}</p>`;

  let whatIfLine = '';
  if (whatIf && realDate) {
    const d = diffDays(realDate, projected);
    const moved = d === 0 ? 'No change.' : `This is ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'earlier' : 'later'}.`;
    whatIfLine = `<p class="whatif-line">Without your what-if: ${namedDate(realDate)} (${fmtDay(realDate, asOf)}). ${moved}</p>`;
  }

  // The choice is already inside the scenario, so the date above has moved.
  // This line is how a reader sees why.
  const included = { cancel: 'cancel requested', monthly: 'monthly requested', approve: 'renewal approved' };
  const contract = activeContract(sc);
  const choice = state.choice?.hubspot ?? contract?.choice ?? null;
  const includesLine = choice && included[choice]
    ? `<p class="receipt">Includes your ${contract?.vendor ?? 'renewal'} choice: ${included[choice]}.</p>`
    : '';

  // The plan-consistent anchor only exists for a company with a plan history.
  const a = local ? null : attribute(real);
  const anchor = a && a.anchor && a.totalMonths > 0 ? a.anchor : null;

  const timeline = timelineHtml({
    asOf, base: projected,
    low: hasRange ? r.low : null, high: hasRange ? r.high : null,
    anchor, before: whatIf ? realDate : null,
  });

  const math = `
    <div class="card white math">
      <div class="mono">${mathLine(sc, projected)}</div>
      <div class="row math-links">
        <button class="link" onclick="app.prefillWhatIf('the raise takes 3 months longer')">Change cushion</button>
      </div>
    </div>`;

  const body = `
    ${eyebrow(whatIf ? 'RAISE-BY · WHAT-IF' : 'RAISE-BY')}
    ${guess.above}
    <h1 class="hero" data-flash="headline">Start raising by <span class="nowrap">${namedDate(projected)} ${year}.</span></h1>
    ${lead}
    ${guess.below}
    ${whatIfLine}
    ${includesLine}
    ${timeline}
    ${receipt}
    ${math}
    ${local ? '' : confirmHtml(state)}
    ${local ? '' : barHtml(state)}
    ${sourcesHtml(real, local)}
    ${whatifHtml(state)}
    ${local ? '<div class="row"><button class="btn ghost" onclick="app.reset()">Back to the demo company</button></div>' : ''}`;
  return shell({ route: '/reveal', body, footerRight: 'Reveal', state, pill: true });
}
