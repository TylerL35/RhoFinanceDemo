import { shortUsd } from '../money.js';

const appState = () => (globalThis.app ?? globalThis.window?.app)?.state;

const card = (body) => `<div class="card white">${body}</div>`;

// "in Oct" names the month the payroll change started, read from the rows. A
// row without a readable date simply drops the month rather than printing
// Invalid Date.
function startedMonth(payroll) {
  const d = payroll[0]?.startsOn ? new Date(`${payroll[0].startsOn}T00:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function mountConfirm(el) {
  if (!el) return;

  const state = appState();
  const sc = state?.scenario;
  const kind = state?.confirmations?.payroll ?? null;
  const payroll = sc?.payroll ?? [];

  // Onboarding builds a company with no payroll rows. There is nothing to
  // confirm, and the fixture's Gusto question would be invented data on the
  // judge's own numbers, so the slot stays empty.
  if (payroll.length === 0) {
    el.innerHTML = '';
    return;
  }

  const confirmed = kind === 'yes'
    || payroll.every((p) => p.confirmed);

  // The question is about this company's payroll: the sum of its rows and the
  // number of rows. The fixture sums to $27K over 3 rows, so its copy is
  // unchanged, but a different company reads its own figures.
  const monthly = payroll.reduce((sum, p) => sum + p.monthlyCost, 0);
  const hires = payroll.length;
  const amount = shortUsd(monthly);
  const month = startedMonth(payroll);
  const rose = `rose ${amount} a month${month ? ` in ${month}` : ''}`;

  if (confirmed) {
    // The scenario holds no debit records, so the count is never stated.
    el.innerHTML = card(`<p class="mono" style="margin:0">Payroll confirmed by you: ${amount} a month, from Gusto debits.</p>`);
    return;
  }

  if (kind === 'one-time') {
    el.innerHTML = card(`<p class="mono" style="margin:0">Payroll treated as one-time, so it is not counted as hires.</p>`);
    return;
  }

  if (kind === 'other') {
    el.innerHTML = card(`<p class="mono" style="margin:0">Payroll left as other, so it is not counted as hires.</p>`);
    return;
  }

  el.innerHTML = card(`
      <h2>Payroll through Gusto ${rose}. Is that ${hires} new hire${hires === 1 ? '' : 's'}?</h2>
      <div class="row">
        <button class="btn" onclick="app.confirmPayroll('yes')">Yes, ${hires} hire${hires === 1 ? '' : 's'}</button>
        <button class="btn ghost" onclick="app.confirmPayroll('one-time')">One-time</button>
        <button class="btn ghost" onclick="app.confirmPayroll('other')">Other</button>
      </div>`);
}
