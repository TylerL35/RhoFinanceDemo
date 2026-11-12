import { shell, eyebrow } from './common.js';
import { raiseBy, range, attribute, activeContract } from '../engine.js';
import { fmtMonthDay } from '../calendar.js';
import { displayTenths } from '../derived.js';

// The deck names a range endpoint by the part of the month it lands in:
// early 1-10, mid 11-20, late 21-end. This mirrors reveal.js so the Q&A answers
// with the same words the Reveal screen prints (early March to late April).
const fullMonth = (d) => d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

function periodOf(d) {
  const day = d.getUTCDate();
  const part = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
  return `${part} ${fullMonth(d)}`;
}

const tenthsText = (t) => `${Math.trunc(t / 10)}.${t % 10}`;

// The engine reads a missing contract as zero, so the projection runs on the
// real scenario and the answer simply has no renewal to name.
export function claude({ state }) {
  const sc = state.scenario;
  const d = raiseBy(sc);
  const r = range(sc);
  const a = attribute(sc);
  const parts = a.segments.map((x) => x.months);

  // A company whose cash never crosses has no date, no band and no segments.
  // Ruling 6: one plain sentence, and no null or epoch leaks into the copy.
  const known = d !== null
    && r.low !== null && r.high !== null
    && a.totalMonths !== null
    && parts.every((m) => typeof m === 'number');

  let answer;
  if (!known) {
    answer = `<p class="lead">No raise-by date yet.</p>`;
  } else {
    const [, uncertain] = displayTenths(parts, a.totalMonths);
    const hires = sc.payroll.length;
    const vendor = activeContract(sc)?.vendor ?? null;
    const reasons = [];
    if (hires > 0) reasons.push(`${hires} new hire${hires === 1 ? '' : 's'}`);
    if (vendor) reasons.push(`the ${vendor} renewal`);
    const because = reasons.length > 0 ? reasons.join(' and ') : 'signed commitments';
    const total = a.totalMonths.toFixed(1);
    const cushion = `${sc.cushionMonths} month${sc.cushionMonths === 1 ? '' : 's'}`;

    answer = `<p class="lead">Rho estimates ${fmtMonthDay(d)}, ${d.getUTCFullYear()}
      (${periodOf(r.low)} to ${periodOf(r.high)}), when you would have ${cushion} of cash left.
      It moved ${total} months earlier mainly because of ${because}.
      Sales is the uncertain part (${tenthsText(uncertain)} of ${total} months).</p>`;
  }

  const body = `
    ${eyebrow('ASK RHO · READ-ONLY')}
    <h1>When should we start raising?</h1>
    <div class="card white">
      ${answer}
      <div class="row">
        <span class="mono muted">Rho raise-by</span>
        <span class="mono muted">HubSpot order form p.2</span>
        <span class="mono muted">Gusto debits</span>
      </div>
    </div>
    <div class="row">
      <button class="btn ghost">When should we start raising?</button>
      <button class="btn ghost">What changed this week?</button>
      <button class="btn ghost">What's still uncertain?</button>
    </div>`;
  return shell({ route: '/claude', body, footerRight: 'Ask Rho' });
}
