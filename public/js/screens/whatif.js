import { esc, realScenario } from './common.js';
import {
  defaultKnobs, knobsActive, hireMonths, monthLabel, hireCost, canCancel, PRICE_STEPS,
  HIRES_MAX, CUSHION_MIN, CUSHION_MAX,
} from '../whatif-model.js';
import { shortUsd } from '../money.js';

// Typing examples this company can actually run, phrased the way people talk.
// The parser is forgiving, so these are examples, not the only accepted form.
export function tipsFor(state) {
  const sc = realScenario(state);
  const tips = [];
  if (hireCost(sc) !== null) tips.push('hire two engineers in April');
  tips.push('prices up 10%');
  const c = sc?.contracts?.[0];
  if (c && !c.choice) {
    const name = /^[a-z0-9_-]+$/i.test(c.vendor) ? c.vendor.toLowerCase() : 'the contract';
    tips.push(canCancel(sc) ? `drop ${name}` : `move ${name} to monthly`);
  } else {
    tips.push('raise takes 3 more months');
  }
  return tips;
}

export const hintFor = (state) => `Or type it, in your own words: ${tipsFor(state).map((t) => `"${t}"`).join(' · ')}`;

const pressed = (on) => (on ? ' aria-pressed="true"' : ' aria-pressed="false"');

// The controls: what a founder asks most, one tap each. Every tap is a knob
// change (app.knob) on top of the real company, so the date pill and the
// timeline move at once and nothing compounds.
function controlsHtml(state) {
  const real = realScenario(state);
  if (!real) return '';
  const k = state.knobs ?? defaultKnobs(real);
  const rows = [];

  const cost = hireCost(real);
  if (cost !== null) {
    const months = hireMonths(real);
    rows.push(`
      <div class="knob">
        <span class="knob-k">Extra hires</span>
        <div class="knob-c">
          <div class="stepper">
            <button type="button" class="btn ghost step" id="knob-hires-down" aria-label="One fewer hire"
              onclick="app.knob('hires', -1, this)"${k.hires <= 0 ? ' disabled' : ''}>−</button>
            <span class="knob-v" data-flash="knobHires">${k.hires === 0 ? '0' : `+${k.hires}`}</span>
            <button type="button" class="btn ghost step" id="knob-hires-up" aria-label="One more hire"
              onclick="app.knob('hires', 1, this)"${k.hires >= HIRES_MAX ? ' disabled' : ''}>+</button>
          </div>
          <label class="knob-sub">starting
            <select id="knob-month" onchange="app.knob('month', this.value, this)">
              ${months.map((m) => `<option value="${m}"${m === k.hireMonth ? ' selected' : ''}>${monthLabel(m)}</option>`).join('')}
            </select>
          </label>
          <span class="knob-note">${shortUsd(cost)} a month each</span>
        </div>
      </div>`);
  }

  const cushion = k.cushion ?? real.cushionMonths;
  rows.push(`
      <div class="knob">
        <span class="knob-k">Cushion</span>
        <div class="knob-c">
          <div class="stepper">
            <button type="button" class="btn ghost step" id="knob-cushion-down" aria-label="One month less cushion"
              onclick="app.knob('cushion', -1, this)"${cushion <= CUSHION_MIN ? ' disabled' : ''}>−</button>
            <span class="knob-v" data-flash="knobCushion">${cushion} mo</span>
            <button type="button" class="btn ghost step" id="knob-cushion-up" aria-label="One month more cushion"
              onclick="app.knob('cushion', 1, this)"${cushion >= CUSHION_MAX ? ' disabled' : ''}>+</button>
          </div>
          <span class="knob-note">${k.cushion === null ? 'your plan' : `your plan is ${real.cushionMonths}`}; a slower raise needs more</span>
        </div>
      </div>`);

  rows.push(`
      <div class="knob">
        <span class="knob-k">Prices</span>
        <div class="knob-c seg" role="group" aria-label="Price change">
          ${PRICE_STEPS.map((p) => `<button type="button" class="btn ghost seg-btn" id="knob-price-${p}"${pressed(k.price === p)}
            onclick="app.knob('price', ${p}, this)">${p === 0 ? 'As is' : `+${p}%`}</button>`).join('')}
          ${!PRICE_STEPS.includes(k.price) ? `<span class="knob-note">+${k.price}% (typed)</span>` : ''}
        </div>
      </div>`);

  const c = real.contracts?.[0];
  if (c) {
    const open = canCancel(real);
    const asIs = c.choice ? `As chosen (${c.choice === 'cancel' ? 'cancel' : c.choice === 'monthly' ? 'monthly' : 'approve'})` : 'As is';
    rows.push(`
      <div class="knob">
        <span class="knob-k">${esc(c.vendor)}</span>
        <div class="knob-c seg" role="group" aria-label="${esc(c.vendor)} renewal">
          <button type="button" class="btn ghost seg-btn" id="knob-contract-asis"${pressed(k.contract === null)}
            onclick="app.knob('contract', 'asis', this)">${asIs}</button>
          <button type="button" class="btn ghost seg-btn" id="knob-contract-monthly"${pressed(k.contract === 'monthly')}
            onclick="app.knob('contract', 'monthly', this)">Monthly</button>
          <button type="button" class="btn ghost seg-btn" id="knob-contract-cancel"${pressed(k.contract === 'cancel')}
            onclick="app.knob('contract', 'cancel', this)"${open ? '' : ' disabled title="The notice window has closed"'}>Cancel</button>
        </div>
      </div>`);
  }

  return `<div class="knobs">${rows.join('')}</div>`;
}

// Stateless markup: app.knob() and app.applyWhatIf() own the parse, the echo,
// the result and the stack. This only prints what the app already decided. The
// form makes Enter submit, so typing live never needs the mouse.
export function whatifHtml(state) {
  const s = state ?? {};
  const intents = s.appliedIntents ?? [];
  const refused = s.lastEchoOk === false;
  const echo = s.lastEcho ?? hintFor(s);
  const active = knobsActive(s.knobs) || (!s.knobs && intents.length > 0);
  const undo = intents.length
    ? '<button type="button" class="btn ghost" onclick="app.undoWhatIf()">Undo</button>'
    : '';
  const result = active && s.whatifResult
    ? `<div class="whatif-foot">
        <p class="whatif-result" data-flash="whatifResult">${esc(s.whatifResult)}</p>
        <button type="button" class="link" onclick="app.resetWhatIf()">Reset what-ifs</button>
      </div>`
    : '';
  const suggestions = refused && s.suggestions?.length
    ? `<div class="row suggest">
        <span class="muted">Did you mean</span>
        ${s.suggestions.map((t) => `<button type="button" class="btn ghost btn-sm" data-try="${esc(t)}" onclick="app.applyWhatIf(this.dataset.try)">${esc(t)}</button>`).join('')}
      </div>`
    : '';

  return `
    <section class="section whatif" id="whatif-box">
      <h3 class="section-title">What if…</h3>
      ${s.scenario ? controlsHtml(s) : ''}
      ${result}
      <form class="row type-row" onsubmit="event.preventDefault(); app.applyWhatIf()">
        <input id="whatif" autocomplete="off" spellcheck="false" aria-label="Type a what-if"
          placeholder="e.g. ${esc(tipsFor(s)[0])}" value="${esc(s.whatifDraft ?? '')}" />
        <button type="submit" class="btn ghost">Try it</button>
        ${undo}
      </form>
      <p class="${refused ? 'echo refused' : 'muted echo'}" id="whatif-echo" aria-live="polite">${esc(echo)}</p>
      ${suggestions}
    </section>`;
}

export function mountWhatIf(el, state = globalThis.app?.state) {
  if (!el) return;
  el.innerHTML = whatifHtml(state);
}
