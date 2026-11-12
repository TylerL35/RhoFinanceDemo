import { shell, eyebrow, chip, esc } from './common.js';
import { priceOption, noticeState, raiseBy, netBurn } from '../engine.js';
import { parseDate, addDays, diffDays, fmtMonthDay, fmtDay, MONTH_DAYS } from '../calendar.js';
import { usd, shortUsd, shortUsd1 } from '../money.js';

const LABEL = { approve: 'Approve as is', monthly: 'Ask for monthly', cancel: 'Cancel' };

// A delta phrase, never a signed day count: 0 is "no change" and 1 is "a day",
// because "(+1 days)" reads like a bug on a projector.
function deltaPhrase(days) {
  if (days === 0) return 'no change';
  if (days === 1) return 'about a day later';
  if (days > 1) return `about ${days} days later`;
  if (days === -1) return 'about a day earlier';
  return `about ${-days} days earlier`;
}

// noticeState() only knows the fixture's 'hubspot' contract. Use my numbers
// writes its contract as id 'main', so for every other id compute the same
// window from that contract's own terms. No catch-all: an engine error on the
// hubspot path stays visible.
function windowFor(sc, c) {
  if (c.id === 'hubspot') return noticeState(sc);
  const deadline = addDays(parseDate(c.renewsOn), -c.noticeDays);
  const daysLeft = diffDays(parseDate(sc.asOf), deadline);
  return { deadline, daysLeft, canCancel: daysLeft >= 0 };
}

// What each option does to the money, in words, from the contract's fields.
function effectOf(kind, c, renews, asOf) {
  if (kind === 'approve') return `${shortUsd(c.amount)} leaves ${fmtDay(renews, asOf)}`;
  if (kind === 'monthly') return `${shortUsd(c.monthlyEquivalent)} a month instead`;
  return `${shortUsd(c.amount)} stays in the bank`;
}

// The draft the founder sends. Rho drafts; it never sends and never moves money.
function draftEmail(kind, c, renews, asOf) {
  if (kind === 'approve') {
    return `
      <div class="card white draft">
        <div class="card-kicker">Approved</div>
        <p class="line">${usd(c.amount)} to ${esc(c.vendor)} on ${fmtDay(renews, asOf)}. Already counted in your date.</p>
      </div>`;
  }
  const subject = kind === 'cancel'
    ? `Notice of non-renewal: ${c.vendor} ${c.term} plan`
    : `Moving our ${c.vendor} ${c.term} plan to monthly billing`;
  const bodyLines = kind === 'cancel'
    ? [
      `Hi ${c.vendor} team,`,
      `We will not renew our ${c.term} plan that renews on ${fmtDay(renews, asOf)}. Please take this as our notice under the order form.`,
      'Could you confirm by reply?',
    ]
    : [
      `Hi ${c.vendor} team,`,
      `Before our ${c.term} plan renews on ${fmtDay(renews, asOf)}, could you quote it as monthly billing instead?`,
      'Thanks.',
    ];
  return `
    <div class="card white draft">
      <div class="card-kicker">Draft · you review and send</div>
      <dl class="mail">
        <dt>To</dt><dd>${esc(c.vendor)} billing <span class="muted">(synthetic)</span></dd>
        <dt>Subject</dt><dd>${esc(subject)}</dd>
      </dl>
      <div class="mail-body">${bodyLines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
      <div class="row">
        <button class="btn ghost" disabled title="Not part of this demo">Open in email</button>
        ${kind === 'monthly' ? '<span class="muted">Monthly plans can cost more, so the net shows once they quote.</span>' : ''}
      </div>
    </div>`;
}

// The screen prices three options, in this order, off priceOption(). The notice
// window decides whether Cancel is even offered.
export function bill({ state }) {
  const sc = state.scenario;
  const c = sc.contracts?.[0] ?? null;
  const chosen = state.choice?.hubspot ?? c?.choice ?? null;

  if (!c) {
    return shell({
      route: '/bill/hubspot',
      body: `
        ${eyebrow('BILL PAY')}
        <h1>No contract entered.</h1>
        <p class="lead">Add one in Use my numbers to price the renewal.</p>`,
      footerRight: 'Bill Pay',
      state,
    });
  }

  const n = windowFor(sc, c);
  const asOf = parseDate(sc.asOf);
  const renews = parseDate(c.renewsOn);
  const base = raiseBy(sc);
  const inRaiseBy = base !== null && renews <= base;
  const burnPerDay = netBurn(sc, asOf.getUTCFullYear(), asOf.getUTCMonth() + 1) / MONTH_DAYS;

  // Without a raise-by date there is nothing to compare the renewal to, so the
  // claim is dropped rather than guessed, and one muted line says why.
  const raiseByLine = base === null
    ? `<p class="lead">Auto-renews ${fmtMonthDay(renews)}.</p>
       <p class="muted">There is no raise-by date yet for this company.</p>`
    : `<p class="lead">Auto-renews ${fmtMonthDay(renews)}. ${inRaiseBy ? 'Already in your raise-by date.' : 'Ahead of your raise-by date.'}</p>`;
  const kinds = n.canCancel ? ['approve', 'monthly', 'cancel'] : ['approve', 'monthly'];
  const opts = kinds.map((k) => priceOption(sc, k));

  // priceOption() returns a null date when raiseBy() is null, so the card
  // falls back to the option name alone instead of "Invalid Date".
  const cards = opts.map((o) => {
    const on = chosen === o.kind;
    const date = o.date === null ? '' : `<div class="opt-date">${fmtDay(o.date, asOf)}</div>`;
    const delta = o.date === null ? '' : `<div class="opt-delta">${deltaPhrase(o.deltaDays)}</div>`;
    return `
      <button class="option${on ? ' on' : ''}" id="opt-${o.kind}" aria-pressed="${on}"
        onclick="app.choose(${on ? 'null' : `'${o.kind}'`})">
        <span class="opt-name">${LABEL[o.kind]}${on ? '<span class="opt-on">Selected</span>' : ''}</span>
        ${date}${delta}
        <span class="opt-effect">${effectOf(o.kind, c, renews, asOf)}</span>
      </button>`;
  }).join('');

  const quote = String(c.source);
  const [where, ...rest] = quote.split(':');
  const said = rest.join(':').trim().replace(/^"|"$/g, '');

  const body = `
    ${eyebrow('BILL PAY · AWAITING APPROVAL')}
    <h1>${c.vendor}, ${c.term} renewal, ${usd(c.amount)}.</h1>
    ${raiseByLine}
    <div class="card white attention countdown">
      <h2>${n.canCancel
        ? `${n.daysLeft} ${n.daysLeft === 1 ? 'day' : 'days'} left to change it`
        : 'Notice window closed'}</h2>
      <p class="muted">${n.canCancel
        ? `Cancel window closes ${fmtMonthDay(n.deadline)}.`
        : 'This one renews automatically.'}</p>
      ${said
        ? `<blockquote class="quote">“${esc(said)}”<cite>${esc(where)}</cite></blockquote>`
        : `<p class="mono">${esc(quote)}</p>`}
      <div class="row">${chip(`${shortUsd1(burnPerDay)} a day burn`)}</div>
    </div>
    <h3 class="section-title">Your options, priced in days</h3>
    <div class="options" role="group" aria-label="Renewal options">${cards}</div>
    ${chosen
      ? draftEmail(chosen, c, renews, asOf)
      : '<p class="muted">Draft opens in your email. You review and send. Monthly plans can cost more, so the net shows once they quote.</p>'}`;
  return shell({ route: '/bill/hubspot', body, footerRight: 'Bill Pay', state, pill: true });
}
