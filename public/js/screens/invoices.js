import { shell, eyebrow } from './common.js';
import { priceOption } from '../engine.js';
import { usd, shortUsd } from '../money.js';
import { parseDate, diffDays } from '../calendar.js';

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

export function invoices({ state }) {
  const sc = state.scenario;
  // priceOption assumes a contract exists to baseline against. Without one,
  // there is no date to price, so the caption states the cash fact only.
  const collect = sc.contracts?.length ? priceOption(sc, 'collect') : { deltaDays: null };
  const asOf = parseDate(sc.asOf);
  const behind = shortUsd(shortfall(sc));
  const count = sc.invoices.length;
  // Drafting is a one-way action on this screen: once every row is drafted, the
  // live mint button would do nothing on a second click, so it becomes a
  // disabled, non-mint receipt of what already happened.
  const allDrafted = count > 0 && sc.invoices.every((i) => i.drafted);

  const rows = sc.invoices.map((i) => {
    // Collected wins over drafted: it is the later, cash-moving fact.
    const status = i.collected ? 'collected' : i.drafted ? 'reminder drafted' : '';
    const action = i.collected
      ? ''
      : `<button class="btn ghost" onclick="app.collectInvoice('${i.id}')">Mark collected</button>`;
    return `
    <tr><td style="padding:8px 0">${i.customer}</td><td>${usd(i.amount)}</td>
        <td class="muted">${overdueLabel(i, asOf)}</td>
        <td class="mono">${status}</td>
        <td style="text-align:right">${action}</td></tr>`;
  }).join('');

  // priceOption returns a null delta for a company whose cash never crosses.
  // Ruling 6: print no null, no NaN, no invented date.
  const caption = collect.deltaDays === null
    ? 'If both pay, the cash arrives sooner.'
    : `If both pay, about ${daysPhrase(collect.deltaDays)}.`;

  const body = `
    ${eyebrow('INVOICING')}
    <h1>Sales are ${behind} a month behind your plan.</h1>
    <table class="mono" style="width:100%;border-collapse:collapse">${rows}</table>
    <div class="row" style="margin-top:18px">
      ${allDrafted
        ? `<button class="btn ghost" disabled>Reminders drafted</button>`
        : `<button class="btn" onclick="app.draftInvoices()">Draft ${count} reminder${count === 1 ? '' : 's'}</button>`}
      <span class="muted">${caption}</span>
    </div>
    <p class="muted" style="margin-top:14px">Collecting moves timing. Closing ${behind} a month more by Feb
      holds the date.</p>`;
  return shell({ route: '/invoices', body, footerRight: 'Invoicing' });
}
