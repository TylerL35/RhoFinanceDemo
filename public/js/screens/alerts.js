import { shell, eyebrow, chip, esc } from './common.js';
import { usd } from '../money.js';
import { parseDate, diffDays, fmtMonthDay } from '../calendar.js';

// This screen reads scenario.alerts[0] and nothing else. It never imports the
// engine: a duplicate charge is an observation, not an input to the raise-by
// projection.

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] ?? String(n);

export function alerts({ state }) {
  const a = state.scenario.alerts?.[0];
  const resolved = state.alerts?.duplicate ?? null;

  // Onboarding can produce a scenario with no alerts. Say so without inventing
  // a vendor, an amount, or a date.
  if (!a) {
    const empty = `
      ${eyebrow('Not sure · Take a look')}
      <h1>Nothing unusual right now.</h1>
      <p class="lead">Rho will flag a duplicate charge when it sees one.</p>`;
    return shell({ route: '/alerts/duplicate', body: empty, footerRight: 'Needs a look', state });
  }

  const gap = Math.abs(diffDays(parseDate(a.dates[0]), parseDate(a.dates[1])));
  const charges = word(a.dates.length);
  const apart = word(gap);
  const detail = `${a.vendor}, ${usd(a.amount)}, ${charges} charges ${apart} days apart.`;
  const cents = (n) => `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = a.dates.map((d) => `
      <tr><td class="muted-cell">${fmtMonthDay(parseDate(d))}</td><td>${esc(a.vendor)}</td><td class="num">${cents(a.amount)}</td></tr>`).join('');

  const verdict = resolved === 'disputed'
    ? 'Disputed.'
    : resolved === 'dismissed'
      ? 'Marked not a duplicate.'
      : null;
  const after = resolved === 'disputed'
    ? 'Rho drafted the dispute for you to review. Rho never moves money.'
    : 'Rho will not ask about this pair again.';

  const body = `
    ${eyebrow('Not sure · Take a look')}
    <h1>Possible duplicate charge.</h1>
    <p class="lead">${detail}</p>
    <div class="card white">
      <table class="table evidence">
        <thead><tr><th>Date</th><th>Vendor</th><th class="num">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="row chips">${chip('Same vendor')}${chip('Same amount')}${chip(`${gap} days apart`)}</div>
      <p class="muted">Does not change your raise-by date. Rho is not sure, so it asks instead of acting.</p>
    </div>
    ${verdict
      ? `<div class="card"><p class="mono">${verdict}</p><p class="muted">${after}</p></div>`
      : `<div class="row"><button class="btn" onclick="app.resolveAlert('disputed')">Dispute</button>
         <button class="btn ghost" onclick="app.resolveAlert('dismissed')">Not a duplicate</button></div>`}`;
  return shell({ route: '/alerts/duplicate', body, footerRight: 'Needs a look', state });
}
