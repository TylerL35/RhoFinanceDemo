import { shell, eyebrow, esc } from './common.js';
import { priceOption } from '../engine.js';
import { usd, shortUsd } from '../money.js';
import { parseDate, diffDays, fmtMonthDay } from '../calendar.js';

// The headline's shortfall is the same planned-minus-current gap the Reveal
// screen reports; formatting it with shortUsd prints the spec's "$9K".
const shortfall = (sc) => sc.plan.plannedRevenue - sc.revenue.current;

// Overdue days are read from each invoice's dueOn, not from the customer name.
// A forward-looking scenario (asOf before a due date) says "not overdue" rather
// than printing a negative day count.
function overdueLabel(invoice, asOf) {
  const days = diffDays(parseDate(invoice.dueOn), asOf);
  if (days <= 0) return 'not overdue';
  return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
}

const daysPhrase = (days) => (days === 1 ? '1 day' : `${days} days`);

// The reminder the founder sends. Rho drafts it; it never sends anything.
function reminder(i, asOf, open) {
  return `
    <details class="draft-details"${open ? ' open' : ''}>
      <summary>Reminder to ${esc(i.customer)} <span class="muted">· ${usd(i.amount)}</span></summary>
      <dl class="mail">
        <dt>To</dt><dd>${esc(i.customer)} accounts payable <span class="muted">(synthetic)</span></dd>
        <dt>Subject</dt><dd>Invoice due ${fmtMonthDay(parseDate(i.dueOn))}, ${usd(i.amount)}</dd>
      </dl>
      <div class="mail-body">
        <p>Hi ${esc(i.customer)} team,</p>
        <p>A quick reminder that our invoice for ${usd(i.amount)} was due on ${fmtMonthDay(parseDate(i.dueOn))}, ${overdueLabel(i, asOf).replace(' overdue', ' ago')}. Could you let us know when it is scheduled?</p>
        <p>Thanks.</p>
      </div>
      <div class="row"><button class="btn ghost" disabled title="Not part of this demo">Open in email</button></div>
    </details>`;
}

export function invoices({ state }) {
  const sc = state.scenario;
  const list = sc.invoices ?? [];
  // priceOption assumes a contract exists to baseline against. Without one,
  // there is no date to price, so the caption states the cash fact only.
  const collect = sc.contracts?.length ? priceOption(sc, 'collect') : { deltaDays: null };
  const asOf = parseDate(sc.asOf);
  const gap = shortfall(sc);
  const count = list.length;
  // Drafting is a one-way action on this screen: once every row is drafted, the
  // live mint button would do nothing on a second click, so it becomes a
  // disabled, non-mint receipt of what already happened.
  const allDrafted = count > 0 && list.every((i) => i.drafted);
  const headline = gap > 0 ? `Sales are ${shortUsd(gap)} a month behind your plan.` : 'Sales are on plan.';

  if (count === 0) {
    const body = `
      ${eyebrow('Invoicing')}
      <h1>${headline}</h1>
      <p class="lead">No invoices connected.</p>`;
    return shell({ route: '/invoices', body, footerRight: 'Invoicing', state });
  }

  const overdue = list.filter((i) => !i.collected && diffDays(parseDate(i.dueOn), asOf) > 0).length;

  const rows = list.map((i) => {
    // Collected wins over drafted: it is the later, cash-moving fact.
    const status = i.collected
      ? '<span class="status ok">collected</span>'
      : i.drafted
        ? '<span class="status">reminder drafted</span>'
        : '<span class="status warn">overdue</span>';
    const action = i.collected
      ? ''
      : `<button class="btn ghost btn-sm" onclick="app.collectInvoice('${i.id}')">Mark collected</button>`;
    return `
    <tr><td>${esc(i.customer)}</td><td class="num">${usd(i.amount)}</td>
        <td class="muted-cell">${overdueLabel(i, asOf)}</td>
        <td>${status}</td>
        <td class="act">${action}</td></tr>`;
  }).join('');

  // priceOption returns a null delta for a company whose cash never crosses.
  // Ruling 6: print no null, no NaN, no invented date.
  const caption = collect.deltaDays === null
    ? 'If both pay, the cash arrives sooner.'
    : `If both pay, about ${daysPhrase(collect.deltaDays)}.`;

  const drafts = list.filter((i) => i.drafted && !i.collected);

  const body = `
    ${eyebrow('Invoicing')}
    <h1>${headline}</h1>
    <p class="lead">${overdue} invoice${overdue === 1 ? ' is' : 's are'} overdue. Collecting moves timing. Closing the sales gap moves the date.</p>
    <table class="table invoices">
      <colgroup><col class="c-name"><col class="c-amt"><col class="c-due"><col class="c-status"><col class="c-act"></colgroup>
      <thead><tr><th>Customer</th><th class="num">Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="row actions">
      ${allDrafted
        ? '<button class="btn ghost" disabled>Reminders drafted</button>'
        : `<button class="btn" onclick="app.draftInvoices()">Draft ${count} reminder${count === 1 ? '' : 's'}</button>`}
      <span class="muted">${caption}</span>
    </div>
    ${drafts.length ? `<div class="drafts">${drafts.map((i, k) => reminder(i, asOf, k === 0)).join('')}</div>` : ''}`;
  return shell({ route: '/invoices', body, footerRight: 'Invoicing', state });
}
