import { shell, eyebrow } from './common.js';
import { usd } from '../money.js';
import { parseDate, diffDays } from '../calendar.js';

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
      ${eyebrow('NOT SURE · TAKE A LOOK')}
      <h1>Nothing unusual right now.</h1>
      <p class="lead">Rho will flag a duplicate charge when it sees one.</p>`;
    return shell({ route: '/alerts/duplicate', body: empty, footerRight: 'Needs a look' });
  }

  const charges = word(a.dates.length);
  const apart = word(Math.abs(diffDays(parseDate(a.dates[0]), parseDate(a.dates[1]))));
  const detail = `${a.vendor}, ${usd(a.amount)}, ${charges} charges ${apart} days apart.`;

  const verdict = resolved === 'disputed'
    ? 'Disputed. Logged to the trust panel.'
    : resolved === 'dismissed'
      ? 'Marked not a duplicate.'
      : null;

  const body = `
    ${eyebrow('NOT SURE · TAKE A LOOK')}
    <h1>Possible duplicate charge.</h1>
    <p class="lead">${detail}</p>
    ${verdict
      ? `<div class="card"><p class="mono" style="margin:0">${verdict}</p></div>`
      : `<div class="row"><button class="btn" onclick="app.resolveAlert('disputed')">Dispute</button>
         <button class="btn ghost" onclick="app.resolveAlert('dismissed')">Not a duplicate</button></div>`}`;
  return shell({ route: '/alerts/duplicate', body, footerRight: 'Needs a look' });
}
