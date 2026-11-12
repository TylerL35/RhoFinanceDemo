import { shortUsd } from '../money.js';
import { realScenario } from './common.js';

const appState = () => (globalThis.app ?? globalThis.window?.app)?.state;

const card = (body, extra = '') => `<div class="card white${extra}">${body}</div>`;

// "in Oct" names the month the payroll change started, read from the rows. A
// row without a readable date simply drops the month rather than printing
// Invalid Date.
function startedMonth(payroll) {
  const d = payroll[0]?.startsOn ? new Date(`${payroll[0].startsOn}T00:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

const undo = '<button class="link" onclick="app.unconfirmPayroll()">Undo</button>';

// The question is about the real company's payroll: what-if rows are a
// hypothetical and are never offered for confirmation.
export function confirmHtml(state) {
  const sc = realScenario(state);
  const kind = state?.confirmations?.payroll ?? null;
  const payroll = (sc?.payroll ?? []).filter((p) => !p.whatif);

  // "One-time" drops the rows, so this answer is shown before the empty check.
  if (kind === 'one-time') {
    return card(`<p class="mono line">Payroll treated as one-time, so it is not counted as hires. ${undo}</p>`);
  }

  // Onboarding builds a company with no payroll rows. There is nothing to
  // confirm, and the fixture's Gusto question would be invented data on the
  // judge's own numbers, so the slot stays empty.
  if (payroll.length === 0) return '';

  const confirmed = kind === 'yes' || payroll.every((p) => p.confirmed);
  const monthly = payroll.reduce((sum, p) => sum + p.monthlyCost, 0);
  const hires = payroll.length;
  const amount = shortUsd(monthly);
  const month = startedMonth(payroll);
  const rose = `rose ${amount} a month${month ? ` in ${month}` : ''}`;

  if (confirmed) {
    // The scenario holds no debit records, so the count is never stated.
    return card(`<p class="mono line">Payroll confirmed by you: ${amount} a month, from Gusto debits. ${undo}</p>`);
  }
  if (kind === 'other') {
    return card(`<p class="mono line">Payroll left as other, so it is not counted as hires. ${undo}</p>`);
  }

  return card(`
      <div class="card-kicker">Needs your yes</div>
      <h2>Payroll through Gusto ${rose}. Is that ${hires} new hire${hires === 1 ? '' : 's'}?</h2>
      <p class="muted">Until you answer, these count as not certain yet. Your answer changes the explanation, not the date.</p>
      <div class="row">
        <button class="btn" id="confirm-yes" onclick="app.confirmPayroll('yes')">Yes, ${hires} hire${hires === 1 ? '' : 's'}</button>
        <button class="btn ghost" onclick="app.confirmPayroll('one-time')">One-time</button>
        <button class="btn ghost" onclick="app.confirmPayroll('other')">Other</button>
      </div>`, ' attention');
}

export function mountConfirm(el) {
  if (!el) return;
  el.innerHTML = confirmHtml(appState());
}
