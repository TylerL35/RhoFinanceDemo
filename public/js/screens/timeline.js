import { diffDays, addDays, fmtDay } from '../calendar.js';

// One strip that tells the story without words: today on the left, the date the
// plan pointed to on the right, and the dot that moved. Every position is a
// share of days between `asOf` and the end of the strip, computed from dates the
// engine returned. On arrival the base dot slides in from the anchor (see
// animateFrom in app.js, via data-from).
export function timelineHtml({ asOf, base, low = null, high = null, anchor = null, before = null }) {
  if (!asOf || !base) return '';
  const last = [base, high, anchor, before].filter(Boolean).reduce((a, b) => (b > a ? b : a));
  const end = addDays(last, Math.max(30, Math.round(diffDays(asOf, last) * 0.12)));
  const span = Math.max(1, diffDays(asOf, end));
  const pos = (d) => Math.max(0, Math.min(100, Math.round((diffDays(asOf, d) / span) * 1000) / 10));
  const day = (d) => fmtDay(d, asOf);

  const b = pos(base);
  const parts = [];

  parts.push('<div class="tl-axis"></div>');
  parts.push(`<div class="tl-tick tl-today" style="left:0%"><span class="tl-lab down">Today · ${day(asOf)}</span></div>`);

  if (low && high && diffDays(low, high) > 0) {
    const l = pos(low);
    const h = pos(high);
    parts.push(`<div class="tl-band" style="left:${l}%;width:${Math.max(0.5, h - l)}%">
      <span class="tl-lab down edge-l">${day(low)}</span>
      <span class="tl-lab down edge-r">${day(high)}</span>
    </div>`);
  }

  if (anchor && diffDays(base, anchor) > 0) {
    const a = pos(anchor);
    parts.push(`<div class="tl-arrow" data-anim="tlArrow" data-from="0" style="right:${Math.round((100 - a) * 10) / 10}%;width:${Math.round((a - b) * 10) / 10}%"></div>`);
    parts.push(`<div class="tl-ring" style="left:${a}%"><span class="tl-lab up muted-lab">Plan said<br><b>${day(anchor)}</b></span></div>`);
  }

  if (before && diffDays(before, base) !== 0) {
    parts.push(`<div class="tl-ghost" style="left:${pos(before)}%"><span class="tl-lab up muted-lab">Before what-if<br>${day(before)}</span></div>`);
  }

  const from = anchor && diffDays(base, anchor) > 0 ? pos(anchor) : b;
  parts.push(`<div class="tl-dot" data-anim="tlBase" data-anim-prop="left" data-from="${from}" style="left:${b}%"><span class="tl-lab up"><b data-flash="tlBaseLabel">${day(base)}</b></span></div>`);

  const label = `Timeline: today ${day(asOf)}; raise-by ${day(base)}`
    + (low && high ? `; range ${day(low)} to ${day(high)}` : '')
    + (anchor ? `; your plan pointed to ${day(anchor)}` : '');
  return `<div class="tl" role="img" aria-label="${label}">${parts.join('')}</div>`;
}
