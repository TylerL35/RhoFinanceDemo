import { shell, eyebrow, esc, realScenario } from './common.js';
import { attribute } from '../engine.js';
import { derived, fmt, displayTenths } from '../derived.js';
import { segmentWords } from './bar.js';

const tenths = (t) => `${Math.trunc(t / 10)}.${t % 10}`;

// Signed share of the move, in words (BUILD_PROMPT screen 6: "About three
// quarters is already signed"). The bands are fixed; the share comes from the
// same displayTenths split the bar prints.
function shareWords(share) {
  if (share < 0.25) return 'Little of it is signed yet.';
  if (share < 0.45) return 'Less than half is signed so far.';
  if (share < 0.6) return 'About half is already signed.';
  if (share < 0.7) return 'About two thirds is already signed.';
  if (share < 0.85) return 'About three quarters is already signed.';
  return 'Almost all of it is already signed.';
}

const RESPONSES = {
  wrong: 'Logged. Recalculated from the same inputs: no change. Tell us which number looks off and it widens the range until it is fixed.',
  share: 'A read-only link for your accountant: it shows the date and its sources, never balances by account. Not created in this demo.',
};

export function trust({ state }) {
  const sc = realScenario(state) ?? state.scenario;
  const local = sc.source === 'local';
  const contract = sc.contracts?.[0] ?? null;

  // 41 on the fixture comes from the scenario's suppression record, never from
  // the screen. The rule travels as an input so the count carries its why.
  const suppressed = derived(sc.suppression?.count ?? 0, 'count',
    [{ label: 'suppression count', value: sc.suppression?.count ?? 0, source: 'scenario' },
     { label: 'rule', value: sc.suppression?.rule ?? '', source: 'scenario' }],
    'scenario.suppression.count');
  const examples = sc.suppression?.examples ?? [];

  // The lead: how much of the move is already signed.
  let lead = '';
  if (!local) {
    const a = attribute(sc);
    if (a.totalMonths !== null && a.totalMonths > 0) {
      const [s, u] = displayTenths(a.segments.map((x) => x.months), a.totalMonths);
      const words = segmentWords(sc);
      lead = `
        <div class="trust-lead">
          <p class="big-line">${shareWords(s / (s + u))}</p>
          <p class="muted">${tenths(s)} of the ${tenths(s + u)} months your date moved come from things you have signed${words.signed ? `: ${words.signed}` : ''}. The rest is ${words.uncertain || 'not certain yet'}.</p>
        </div>`;
    }
  } else {
    lead = `
      <div class="trust-lead">
        <p class="big-line">Built only from the numbers you entered.</p>
        <p class="muted">Nothing is inferred, so there is nothing for you to confirm.</p>
      </div>`;
  }

  // The contract is what makes renewal terms visible. Without one, the screen
  // names that gap rather than pretending the terms were read.
  const cannotSee = `Payroll detail beyond Gusto totals. Stripe payouts before they land.
    Accounts outside Rho.${contract ? '' : ' We cannot see the renewal terms until a contract is connected.'}`;

  const response = state.trust && RESPONSES[state.trust]
    ? `<p class="response" role="status">${RESPONSES[state.trust]}</p>`
    : '';

  const body = `
    ${eyebrow('TRUST')}
    <h1>What it knows, what it won't guess, and who's in control.</h1>
    ${lead}
    <div class="grid2">
      <div class="card">
        <h2>Didn't bother you: ${fmt(suppressed)} items</h2>
        <p class="muted">We only speak up when something moves your date 7 days or more.</p>
        ${examples.length ? `
        <details class="mini">
          <summary>See a few</summary>
          <ul class="plain">${examples.map((x) => `<li>${esc(x.what)} <span class="muted">· moved your date ${esc(x.moved)}</span></li>`).join('')}</ul>
        </details>` : ''}
      </div>
      <div class="card">
        <h2>What we can't see</h2>
        <p class="muted">${cannotSee}</p>
      </div>
      <div class="card">
        <h2>When it's wrong</h2>
        <p class="muted">This is wrong recalculates and is logged. Missing data widens the range.</p>
        <div class="row"><button class="btn ghost" onclick="app.trustAction('wrong')">This is wrong</button>
          <button class="btn ghost" onclick="app.trustAction('share')">Share read-only with accountant</button></div>
        ${response}
      </div>
      <div class="card">
        <h2>Who sees it</h2>
        <p class="muted">Admins only. Payroll shows as one total, never by person. Anything inferred waits for your yes. A range, never a fake-exact date.</p>
      </div>
    </div>
    <p class="closing">AI reads and explains. Math makes every number. You approve. Rho never moves money.</p>`;
  return shell({ route: '/trust', body, footerRight: 'Trust', state });
}
