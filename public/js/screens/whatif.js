import { esc, realScenario } from './common.js';
import { noticeState } from '../engine.js';

// The hint only suggests what this company can actually model: no hires
// without a payroll baseline, no cancel once the notice window has closed or
// when the vendor name is more than one word (the grammar takes one word).
export function tipsFor(state) {
  const sc = realScenario(state);
  const tips = [];
  if ((sc?.payroll ?? []).some((p) => !p.whatif)) tips.push('hire 2 more in March');
  tips.push('the raise takes 3 months longer');
  const c = sc?.contracts?.[0];
  if (c && !c.choice && /^[a-z0-9_-]+$/i.test(c.vendor)) {
    const open = c.id === 'hubspot' ? noticeState(sc).canCancel : true;
    tips.push(open ? `cancel ${c.vendor.toLowerCase()}` : `switch ${c.vendor.toLowerCase()} to monthly`);
  } else {
    tips.push('raise prices 10%');
  }
  return tips;
}

export const hintFor = (state) => `Try: ${tipsFor(state).join(' · ')}`;

// Stateless markup: app.applyWhatIf() owns the parse, the echo, the result and
// the snapshot. This only prints what the app already decided. The form makes
// Enter submit, so a presenter typing live never needs the mouse.
export function whatifHtml(state) {
  const s = state ?? {};
  const intents = s.appliedIntents ?? [];
  const refused = s.lastEchoOk === false;
  const echo = s.lastEcho ?? hintFor(s);
  const undo = intents.length
    ? '<button type="button" class="btn ghost" onclick="app.undoWhatIf()">Undo</button>'
    : '';
  const result = intents.length && s.whatifResult && !refused
    ? `<p class="whatif-result" data-flash="whatifResult">${esc(s.whatifResult)}</p>`
    : '';

  return `
    <section class="section whatif" id="whatif-box">
      <h3 class="section-title">What if…</h3>
      <form class="row" onsubmit="event.preventDefault(); app.applyWhatIf()">
        <input id="whatif" autocomplete="off" spellcheck="false" aria-label="What if"
          placeholder="${esc(tipsFor(s)[0])}" />
        <button type="submit" class="btn ghost">Try it</button>
        ${undo}
      </form>
      <p class="${refused ? 'echo refused' : 'muted echo'}" id="whatif-echo" aria-live="polite">${esc(echo)}</p>
      ${result}
    </section>`;
}

export function mountWhatIf(el, state = globalThis.app?.state) {
  if (!el) return;
  el.innerHTML = whatifHtml(state);
}
