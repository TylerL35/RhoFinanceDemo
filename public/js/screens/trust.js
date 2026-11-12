import { shell, eyebrow } from './common.js';
import { netBurn, grossSpend } from '../engine.js';
import { parseDate } from '../calendar.js';
import { derived, fmt } from '../derived.js';

// The engine assumes a contract exists (contracts[0] in contractMonthly and
// oneOffsBetween). Onboarding can produce a contract-less scenario, so the run
// rate gets a zero-value stand-in, exactly as reveal.js does. The card below
// still names the missing terms as something it cannot see.
function engineScenario(sc) {
  if (sc.contracts?.length) return sc;
  return {
    ...sc,
    contracts: [{
      id: 'none', vendor: '', amount: 0, renewsOn: sc.asOf, noticeDays: 0,
      term: 'none', monthlyEquivalent: 0, choice: 'cancel', source: '',
    }],
  };
}

export function trust({ state }) {
  const calc = engineScenario(state.scenario);
  const sc = state.scenario;
  const asOf = parseDate(sc.asOf);
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth() + 1;
  const contract = sc.contracts?.[0] ?? null;

  // 41 on the fixture comes from the scenario's suppression record, never from
  // the screen. The rule travels as an input so the count carries its why.
  const suppressed = derived(sc.suppression?.count ?? 0, 'count',
    [{ label: 'suppression count', value: sc.suppression?.count ?? 0, source: 'scenario' },
     { label: 'rule', value: sc.suppression?.rule ?? '', source: 'scenario' }],
    'scenario.suppression.count');

  const burn = derived(netBurn(calc, y, m), 'cents',
    [{ label: 'gross', value: grossSpend(calc, y, m), source: 'engine' },
     { label: 'revenue', value: sc.revenue.current, source: 'scenario' }],
    'grossSpend - revenue');

  // The contract is what makes renewal terms visible. Without one, the screen
  // names that gap rather than pretending the terms were read.
  const cannotSee = `Payroll detail beyond Gusto totals. Stripe payouts before they land.
    Accounts outside Rho.${contract ? '' : ' We cannot see the renewal terms until a contract is connected.'}`;

  const body = `
    ${eyebrow('TRUST')}
    <h1>What it knows, what it won't guess, and who's in control.</h1>
    <div class="card">
      <h2>Didn't bother you: ${fmt(suppressed)} items</h2>
      <p class="muted">We only speak up when something moves your date 7 days or more.</p>
    </div>
    <div class="card">
      <h2>What we can't see</h2>
      <p class="muted">${cannotSee}</p>
    </div>
    <div class="card">
      <h2>When it's wrong</h2>
      <p class="muted">This is wrong recalculates and is logged. Missing data widens the range.</p>
      <div class="row"><button class="btn ghost">This is wrong</button>
        <button class="btn ghost">Share read-only with accountant</button></div>
    </div>
    <div class="card">
      <h2>Today's run rate</h2>
      <p class="mono">net burn ${fmt(burn)} a month</p>
    </div>
    <div class="card">
      <p class="lead" style="margin:0">AI reads and explains. Math makes every number. You approve.
        Rho never moves money.</p>
    </div>`;
  return shell({ route: '/trust', body, footerRight: 'Trust' });
}
