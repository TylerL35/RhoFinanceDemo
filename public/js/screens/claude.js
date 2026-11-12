import { shell, eyebrow, chip, realScenario, hasWhatIf } from './common.js';
import { raiseBy, range, attribute, activeContract, revenueBand } from '../engine.js';
import { parseDate, fmtDay, fmtMonthDay } from '../calendar.js';
import { displayTenths } from '../derived.js';
import { shortUsd } from '../money.js';
import { segmentWords } from './bar.js';

const tenthsText = (t) => `${Math.trunc(t / 10)}.${t % 10}`;

export const QUESTIONS = {
  when: 'When should we start raising?',
  changed: 'What changed this week?',
  uncertain: "What's still uncertain?",
};

// Read-only answers, each assembled from engine output. There is no model and
// no free text: the three questions are the whole surface.
function answers(sc, state) {
  const d = raiseBy(sc);
  const r = range(sc);
  const local = sc.source === 'local';
  const asOf = parseDate(sc.asOf);
  if (d === null) return null;

  const a = local ? null : attribute(sc);
  const parts = a ? a.segments.map((x) => x.months) : [];
  const known = a && a.totalMonths !== null && parts.every((m) => typeof m === 'number');
  const hasRange = r.low && r.high && (sc.revenue.trailing?.length ?? 0) >= 2;
  const rangeText = hasRange ? ` (range ${fmtMonthDay(r.low)} to ${fmtMonthDay(r.high)})` : '';
  const cushion = `${sc.cushionMonths} month${sc.cushionMonths === 1 ? '' : 's'}`;
  const words = segmentWords(sc);
  const contract = activeContract(sc);
  const realHires = (sc.payroll ?? []).filter((p) => !p.whatif).length;

  const out = {};
  let when = `Rho estimates ${fmtDay(d, asOf)}, ${d.getUTCFullYear()}${rangeText}, when you would have ${cushion} of cash left.`;
  if (known && a.totalMonths > 0) {
    const [, uncertain] = displayTenths(parts, a.totalMonths);
    const total = a.totalMonths.toFixed(1);
    const reasons = [];
    if (realHires > 0) reasons.push(`${realHires} new hire${realHires === 1 ? '' : 's'}`);
    if (contract && contract.choice !== 'cancel') reasons.push(`the ${contract.vendor} renewal`);
    const because = reasons.length > 0 ? reasons.join(' and ') : 'signed commitments';
    when += ` It moved ${total} months earlier mainly because of ${because}.`;
    when += words.hiresConfirmed || realHires === 0
      ? ` Sales is the uncertain part (${tenthsText(uncertain)} of ${total} months).`
      : ` The uncertain part is ${words.uncertain} (${tenthsText(uncertain)} of ${total} months).`;
  } else if (local) {
    when += ' It is built only from the numbers you entered.';
  }
  out.when = when;

  if (known && a.totalMonths > 0) {
    const bits = [];
    const rows = (sc.payroll ?? []).filter((p) => !p.whatif);
    if (rows.length) {
      const total = rows.reduce((s, p) => s + p.monthlyCost, 0);
      bits.push(`payroll rose ${shortUsd(total)} a month (${rows.length} hire${rows.length === 1 ? '' : 's'}, from Gusto debits)`);
    }
    if (contract && contract.choice !== 'cancel') {
      bits.push(`the ${shortUsd(contract.amount)} ${contract.vendor} renewal on ${fmtMonthDay(parseDate(contract.renewsOn))} now lands before your date`);
    }
    const gap = sc.plan.plannedRevenue - sc.revenue.current;
    const sales = gap > 0 ? ` With sales ${shortUsd(gap)} a month behind plan,` : '';
    const lead = bits.length ? `This week ${bits.join(', and ')}.` : 'Nothing new was signed this week.';
    out.changed = `${lead}${sales}${sales ? ' the' : ' The'} date moved from ${fmtMonthDay(a.anchor)} to ${fmtMonthDay(d)}.`;
  } else {
    out.changed = local ? 'Nothing has changed since you entered your numbers.' : 'Nothing has moved your date this week.';
  }

  if (hasRange) {
    const band = revenueBand(sc);
    out.uncertain = `Sales. Over your last ${sc.revenue.trailing.length} months revenue ran at ${Math.round(band.mean * 100)}% of plan, so the range runs from ${fmtMonthDay(r.low)} to ${fmtMonthDay(r.high)} (${shortUsd(band.low)} to ${shortUsd(band.high)} a month).`;
    if (!words.hiresConfirmed && realHires > 0) out.uncertain += ` Also ${realHires} hire${realHires === 1 ? '' : 's'} you haven't confirmed.`;
  } else {
    out.uncertain = 'Revenue. You entered one number with no history, so this is a single date, not a range.';
  }

  if (hasWhatIf(state)) {
    const wd = raiseBy(state.scenario);
    const intents = state.appliedIntents.map((x) => x.text).join(', then ');
    if (wd) out.whatif = `Your what-if (${intents}) would move it to ${fmtMonthDay(wd)}.`;
  }
  return out;
}

export function claude({ state }) {
  const sc = realScenario(state) ?? state.scenario;
  const contract = activeContract(sc);
  const hasPayroll = (sc.payroll ?? []).some((p) => !p.whatif);
  const q = QUESTIONS[state.ask] ? state.ask : 'when';
  const a = answers(sc, state);

  const text = a === null ? 'No raise-by date yet.' : a[q];
  const extra = a?.whatif ? `<p class="muted">${a.whatif}</p>` : '';
  const sources = `
      <div class="row chips">
        ${chip('Rho raise-by')}
        ${contract ? chip(`${contract.vendor} order form p.2`) : ''}
        ${hasPayroll ? chip('Gusto debits') : ''}
      </div>`;

  const body = `
    ${eyebrow('ASK RHO · READ-ONLY')}
    <h1>Ask about your raise-by date.</h1>
    <div class="chat">
      <div class="msg user"><span>${QUESTIONS[q]}</span></div>
      <div class="msg rho" data-key="${q}">
        <div class="who">Rho</div>
        <p class="answer" data-flash="answer">${a === null ? 'No raise-by date yet.' : text}</p>
        ${extra}
        ${a === null ? '' : sources}
      </div>
    </div>
    <div class="row suggestions">
      ${Object.entries(QUESTIONS).map(([k, label]) => `<button class="btn ghost${k === q ? ' current' : ''}"${k === q ? ' aria-pressed="true"' : ''} onclick="app.ask('${k}')">${label}</button>`).join('')}
    </div>
    <p class="muted">Read-only. Answers come from the same math as the Raise-by screen; nothing here can move money.</p>`;
  return shell({ route: '/claude', body, footerRight: 'Ask Rho', state });
}
