const appState = () => (globalThis.app ?? globalThis.window?.app)?.state;

const card = (body) => `<div class="card white">${body}</div>`;

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

  if (confirmed) {
    // The scenario holds no debit records, so the count is never stated.
    el.innerHTML = card(`<p class="mono" style="margin:0">Payroll confirmed by you: $27K a month, from Gusto debits.</p>`);
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
      <h2>Payroll through Gusto rose $27K a month in Oct. Is that 3 new hires?</h2>
      <div class="row">
        <button class="btn" onclick="app.confirmPayroll('yes')">Yes, 3 hires</button>
        <button class="btn ghost" onclick="app.confirmPayroll('one-time')">One-time</button>
        <button class="btn ghost" onclick="app.confirmPayroll('other')">Other</button>
      </div>`);
}
