import { attribute } from '../engine.js';
import { displayTenths } from '../derived.js';

// The labels print the integer tenths that displayTenths() chose, so the two
// parts always add up to the heading total. Nothing is re-rounded locally.
const tenths = (t) => `${Math.trunc(t / 10)}.${t % 10}`;

const appState = () => (globalThis.app ?? globalThis.window?.app)?.state;

// The engine assumes a contract exists (contracts[0] in contractMonthly and
// oneOffsBetween). Onboarding can produce a contract-less scenario, so the
// attribution gets the same zero-value stand-in that reveal.js and trust.js use.
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

export function mountBar(el) {
  if (!el) return;

  const sc = appState()?.scenario;
  const a = sc ? attribute(calculable(sc)) : null;
  const parts = a ? a.segments.map((x) => x.months) : [];

  // No crossing means no attribution: say so, print no graphic, and never let a
  // null or NaN reach the copy.
  if (!a || a.totalMonths === null || parts.some((m) => m === null || m === undefined)) {
    el.innerHTML = `
      <div class="card">
        <p class="muted" style="margin:0">No date to explain yet.</p>
      </div>`;
    return;
  }

  const [s, u] = displayTenths(parts, a.totalMonths);
  const total = s + u;
  const signPct = total === 0 ? 0 : Math.round((s / total) * 1000) / 10;
  const anchor = a.anchor.toISOString().slice(0, 10);

  el.innerHTML = `
    <div class="card">
      <h2>Why it moved ${tenths(total)} months</h2>
      <div class="bar">
        <div class="signed" style="width:${signPct}%"></div>
        <div class="uncertain" style="width:${100 - signPct}%"></div>
      </div>
      <div class="row" style="margin-top:8px;justify-content:space-between">
        <span class="mono">Signed about ${tenths(s)} mo</span>
        <span class="mono muted">Not certain yet about ${tenths(u)} mo</span>
      </div>
      <p class="muted" style="margin-top:10px">Anchored to ${anchor}. Forward-looking from today: payroll already paid is not undone.</p>
    </div>`;
}
