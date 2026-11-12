import { shell, eyebrow } from './common.js';
import { priceOption, noticeState, raiseBy, netBurn } from '../engine.js';
import { parseDate, addDays, diffDays, fmtMonthDay } from '../calendar.js';
import { usd, shortUsd } from '../money.js';

// Burn is quoted per calendar month in the engine; a day rate is the as-of
// month's net burn spread over the average month length (365.25 / 12).
const DAYS_PER_MONTH = 30.4;

const LABEL = { approve: 'Approve as is', monthly: 'Ask for monthly', cancel: 'Cancel' };

// A delta phrase, never a signed day count: 0 is "no change" and 1 is "a day",
// because "(+1 days)" reads like a bug on a projector.
function deltaPhrase(days) {
  if (days === 0) return '(no change)';
  if (days === 1) return '(about a day later)';
  if (days > 1) return `(about ${days} days later)`;
  return `(about ${-days} days earlier)`;
}

// noticeState() only knows the fixture's 'hubspot' contract; it dereferences
// undefined for any other id. Use my numbers writes its contract as id 'main',
// so for every other id compute the same window from that contract's own
// terms. No catch-all: an engine error on the hubspot path stays visible.
function windowFor(sc, c) {
  if (c.id === 'hubspot') return noticeState(sc);
  const deadline = addDays(parseDate(c.renewsOn), -c.noticeDays);
  const daysLeft = diffDays(parseDate(sc.asOf), deadline);
  return { deadline, daysLeft, canCancel: daysLeft >= 0 };
}

// The screen prices three options, in this order, off priceOption(). The notice
// window decides whether Cancel is even offered.
export function bill({ state }) {
  const sc = state.scenario;
  const c = sc.contracts?.[0] ?? null;
  const chosen = state.choice?.hubspot ?? null;

  if (!c) {
    return shell({
      route: '/bill/hubspot',
      body: `
        ${eyebrow('BILL PAY')}
        <h1>No contract entered.</h1>
        <p class="lead">Add one in Use my numbers to price the renewal.</p>`,
      footerRight: 'Bill Pay',
    });
  }

  const n = windowFor(sc, c);
  const renews = parseDate(c.renewsOn);
  const base = raiseBy(sc);
  const inRaiseBy = base !== null && renews <= base;
  const asOf = parseDate(sc.asOf);
  const burnPerDay = netBurn(sc, asOf.getUTCFullYear(), asOf.getUTCMonth() + 1) / DAYS_PER_MONTH;

  // Without a raise-by date there is nothing to compare the renewal to, so the
  // claim is dropped rather than guessed, and one muted line says why.
  const raiseByLine = base === null
    ? `<p class="lead">Auto-renews ${fmtMonthDay(renews)}.</p>
       <p class="muted" style="margin:0">There is no raise-by date yet for this company.</p>`
    : `<p class="lead">Auto-renews ${fmtMonthDay(renews)}. ${inRaiseBy ? 'Already in your raise-by date.' : 'Ahead of your raise-by date.'}</p>`;
  const kinds = n.canCancel ? ['approve', 'monthly', 'cancel'] : ['approve', 'monthly'];
  const opts = kinds.map((k) => priceOption(sc, k));

  // priceOption() returns a null date when raiseBy() is null, so the label
  // falls back to the option name alone instead of "Invalid Date".
  const buttons = opts.map((o) => `
      <button class="btn${chosen === o.kind ? '' : ' ghost'}"
        onclick="app.choose('${o.kind}')">
        ${o.date === null ? LABEL[o.kind] : `${LABEL[o.kind]}, ${fmtMonthDay(o.date)} ${deltaPhrase(o.deltaDays)}`}
      </button>`).join(' ');

  const body = `
    ${eyebrow('BILL PAY · AWAITING APPROVAL')}
    <h1>${c.vendor}, ${c.term} renewal, ${usd(c.amount)}.</h1>
    ${raiseByLine}
    <div class="card white">
      <h2>${n.canCancel
        ? `${n.daysLeft} ${n.daysLeft === 1 ? 'day' : 'days'} left to change it`
        : 'Notice window closed'}</h2>
      <p class="lead">${n.canCancel
        ? `Cancel window closes ${fmtMonthDay(n.deadline)}.`
        : 'This one renews automatically.'}</p>
      <div class="mono">${c.source}</div>
      <div class="row" style="margin-top:14px">
        <span class="mono muted">${shortUsd(burnPerDay)}/day burn</span>
      </div>
      <div class="row" style="margin-top:18px">${buttons}</div>
      <p class="muted" style="margin-top:14px">Draft opens in your email. You review and send.
        Monthly plans can cost more, so the net shows once they quote.</p>
    </div>
    ${chosen ? `<div class="card"><p class="mono" style="margin:0">Recorded: ${LABEL[chosen]}.
      <button class="btn ghost" style="padding:2px 8px;font-size:11px" onclick="app.choose(null)">Revert</button></p></div>` : ''}`;
  return shell({ route: '/bill/hubspot', body, footerRight: 'Bill Pay' });
}
