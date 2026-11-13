import { shell, eyebrow, realScenario } from './common.js';
import { raiseBy, attribute } from '../engine.js';
import { fmtMonthYear } from '../calendar.js';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] ?? String(n);

export const GUESSES = ['May', 'Jun', 'Jul', 'Aug'];

export function home({ state }) {
  const sc = realScenario(state) ?? state.scenario;
  const local = sc.source === 'local';
  const d = raiseBy(sc);
  const guess = state.guesses?.value ?? null;
  const cushion = `${word(sc.cushionMonths)} month${sc.cushionMonths === 1 ? '' : 's'}`;

  let ask;
  if (d === null) {
    ask = `<p class="lead">Pilot cannot see a date yet: cash does not run out within three years at this rate.</p>`;
  } else {
    // On a normal week the card would say where the date holds. For the demo
    // company that is the date its plan pointed to before this week (the
    // attribution anchor); a judge's own company has no history, so its own date.
    const a = local ? null : attribute(sc);
    const holds = a?.anchor && a.totalMonths > 0 ? a.anchor : d;
    const chips = local ? '' : `
      <div class="row guess-row" role="group" aria-label="Your guess">
        ${GUESSES.map((m, i) => `<button class="btn ghost chip-btn"${guess === m ? ' aria-pressed="true"' : ''}
          onclick="app.guess('${m}')"><span class="key">${i + 1}</span>${m} 2027</button>`).join('')}
      </div>`;
    ask = `${chips}
      <p class="muted note">On a normal week this card says
        "Your raise-by date holds at ${fmtMonthYear(holds)}. Next check Monday."</p>`;
  }

  const body = `
    ${eyebrow(local ? 'YOUR NUMBERS' : 'NYU PMC × RHO · DEMO')}
    <h1>${local ? 'Your numbers are in.' : 'Your raise-by date moved this week.'}</h1>
    <p class="lead">Pilot gives you one date, the day you should start raising: when ${cushion} of cash remain.
      It is built from what you have already signed.</p>
    <div class="card white home-card">
      <h2>${local ? 'Your date is ready.' : 'When do you think it is?'}</h2>
      ${ask}
      <div class="row actions">
        <button class="btn" onclick="app.go('/reveal')">Reveal</button>
        ${local ? '' : `<button class="btn ghost" onclick="app.go('/reveal')">Just show me</button>`}
      </div>
    </div>`;
  return shell({ route: '/', body, footerRight: 'Home', state });
}
