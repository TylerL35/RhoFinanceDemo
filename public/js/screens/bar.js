import { attribute, activeContract } from '../engine.js';
import { displayTenths } from '../derived.js';
import { shortUsd } from '../money.js';
import { parseDate, fmtDay } from '../calendar.js';
import { realScenario } from './common.js';

// The labels print the integer tenths that displayTenths() chose, so the two
// parts always add up to the heading total. Nothing is re-rounded locally.
const tenths = (t) => `${Math.trunc(t / 10)}.${t % 10}`;

const appState = () => (globalThis.app ?? globalThis.window?.app)?.state;

const join = (parts) => (parts.length < 2 ? parts.join('')
  : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`);

// What sits inside each segment, in words, from the same groups attribute()
// removes: signed = confirmed hires + the renewal; not certain = the sales gap
// plus any hires the founder has not confirmed yet.
export function segmentWords(sc) {
  const rows = (sc.payroll ?? []).filter((p) => !p.whatif);
  const n = rows.length;
  const hiresConfirmed = n > 0 && rows.every((p) => p.confirmed);
  const c = activeContract(sc);
  const gap = sc.plan.plannedRevenue - sc.revenue.current * (sc.revenue.priceMultiplier ?? 1);
  const hires = `${n} hire${n === 1 ? '' : 's'}`;

  const signed = [];
  if (n > 0 && hiresConfirmed) signed.push(hires);
  if (c && c.choice !== 'cancel') signed.push(`the ${c.vendor} renewal`);

  const uncertain = [];
  if (gap > 0) uncertain.push(`sales ${shortUsd(gap)} a month behind plan`);
  if (n > 0 && !hiresConfirmed) uncertain.push(`${hires} you haven't confirmed`);

  return { signed: join(signed), uncertain: join(uncertain), hiresConfirmed, hires: n };
}

export function barHtml(state) {
  // The bar explains the real company. A what-if is shown by the headline and
  // the what-if box, never folded into "signed".
  const sc = realScenario(state);
  const a = sc ? attribute(sc) : null;
  const parts = a ? a.segments.map((x) => x.months) : [];

  // No crossing means no attribution: say so, print no graphic, and never let a
  // null or NaN reach the copy.
  if (!a || a.totalMonths === null || parts.some((m) => m === null || m === undefined)) {
    return `
      <section class="section">
        <p class="muted">No date to explain yet.</p>
      </section>`;
  }

  const [s, u] = displayTenths(parts, a.totalMonths);
  const total = s + u;
  const anchor = fmtDay(a.anchor, parseDate(sc.asOf));
  const anchorLine = `Anchored to ${anchor}, ${a.anchor.getUTCFullYear()}, the date your plan pointed to. Forward-looking from today: payroll already paid is not undone.`;

  // A total of 0.0 is not a small move: it is no move. "Why it moved 0.0
  // months" over an empty bar reads like a bug, so say what is true instead.
  if (total === 0) {
    return `
      <section class="section">
        <h2>Nothing has moved your date yet.</h2>
        <p class="muted">${anchorLine}</p>
      </section>`;
  }

  const signPct = Math.round((s / total) * 1000) / 10;
  const words = segmentWords(sc);

  return `
    <section class="section" aria-label="Why it moved ${tenths(total)} months">
      <h3 class="section-title">Why it moved ${tenths(total)} months</h3>
      <div class="bar" role="img" aria-label="Signed about ${tenths(s)} months, not certain yet about ${tenths(u)} months">
        <div class="signed" data-anim="barSigned" style="width:${signPct}%"></div>
        <div class="uncertain"></div>
      </div>
      <div class="bar-legend">
        <div>
          <div class="bar-k"><span class="swatch signed"></span>Signed about ${tenths(s)} mo</div>
          <div class="muted">${words.signed || 'Nothing signed yet'}</div>
        </div>
        <div class="right">
          <div class="bar-k"><span class="swatch uncertain"></span>Not certain yet about ${tenths(u)} mo</div>
          <div class="muted">${words.uncertain || 'Nothing uncertain'}</div>
        </div>
      </div>
      <p class="muted small-gap">${anchorLine}</p>
    </section>`;
}

export function mountBar(el) {
  if (!el) return;
  el.innerHTML = barHtml(appState());
}
