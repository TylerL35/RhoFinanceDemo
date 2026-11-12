import { shell, eyebrow } from './common.js';
import { raiseBy, range } from '../engine.js';
import { fmtMonthYear } from '../calendar.js';

export function home({ state }) {
  const d = raiseBy(state.scenario);
  const r = range(state.scenario);
  const guess = state.guesses.value;
  const chips = ['May', 'Jun', 'Jul', 'Aug']
    .map((m) => `<button class="btn ghost" ${guess === m ? 'aria-pressed="true" style="border-color:#08A68A"' : ''}
        onclick="app.guess('${m}')">${m} 2027</button>`).join('');
  const ask = d === null
    ? `<p class="lead">Raise-By can't see a date yet: at this rate cash never runs out.</p>`
    : `<div class="row">${chips}</div>
      <p class="muted" style="margin-top:14px">On a normal week this card says
        "Raise-by holds at ${fmtMonthYear(r.base)}. Next check Monday."</p>`;
  const body = `
    ${eyebrow('NYU PMC × RHO · DEMO')}
    <h1>Your raise-by date moved this week.</h1>
    <p class="lead">Raise-by is the day you should start raising: when six months of cash remain.
      It is built from what you have already signed.</p>
    <div class="card white">
      <h2>When do you think it is?</h2>
      ${ask}
      <div class="row" style="margin-top:16px">
        <button class="btn" onclick="app.go('/reveal')">Reveal</button>
        <button class="btn ghost" onclick="app.go('/reveal')">Just show me</button>
      </div>
    </div>`;
  return shell({ route: '/', body, footerRight: 'Home' });
}
