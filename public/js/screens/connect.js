import { shell, eyebrow } from './common.js';
import { usd } from '../money.js';

// The sandbox snapshot carries two endpoints: balances and scheduled payments.
// Cash and committed outflows come straight out of those payloads. There is no
// cashflow payload in the snapshot, so trailingBurn is reported as null rather
// than invented; the screen says only what it derived.
export function deriveFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.accounts) || !Array.isArray(snapshot.scheduled_transactions)) {
    return null;
  }
  const cash = snapshot.accounts
    .filter((a) => a.account_type === 'checking')
    .reduce((sum, a) => sum + a.balance.amount, 0);
  // Derived, not typed: the sandbox payload's five scheduled amounts sum to
  // 1,895,050 cents, and usd() rounds half up to print $18,951 (the spec prose
  // says $18,950; the snapshot is the source of truth).
  const committed = snapshot.scheduled_transactions.reduce((sum, t) => sum + t.amount.amount, 0);
  const gaps = ['cushion', 'contract terms'];
  return {
    cash,
    committed,
    trailingBurn: null,
    accounts: snapshot.accounts.length,
    gaps,
    fetchedAt: snapshot.fetchedAt,
    requests: snapshot.requests ?? [],
  };
}

// "2026-11-12" (or a full ISO timestamp) prints as "Nov 12, 2026". Anything
// unreadable prints as given rather than as Invalid Date.
function fetchedOn(value) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function connect({ snapshot, state } = {}) {
  const d = deriveFromSnapshot(snapshot);
  const head = `
    ${eyebrow('CONNECTED DATA')}
    <h1>Rho has the inputs. Runway is what we compute.</h1>`;

  if (!d) {
    const body = `${head}
    <div class="card">
      <p class="lead">Sandbox snapshot unavailable. Run scripts/fetch-rho-sandbox.mjs before the demo.</p>
    </div>`;
    return shell({ route: '/connect', body, footerRight: 'Connected data', state });
  }

  const requests = d.requests
    .map((r) => `<div class="req"><code>GET ${r.path}</code> <span class="status ok">→ ${r.status}</span></div>`)
    .join('');
  const body = `${head}
    <p class="lead">Fictional company, not the one above. Sandbox data, fetched ${fetchedOn(d.fetchedAt)}. No network call happens on this screen.</p>
    <div class="grid2">
      <div class="card white">
        <h3 class="section-title">Rho gives us</h3>
        <p class="stat-line">${d.accounts} accounts · ${usd(d.cash)} cash · ${usd(d.committed)} committed</p>
        <p class="muted">Balances and scheduled payments, read from the snapshot.</p>
      </div>
      <div class="card white">
        <h3 class="section-title">Pilot adds</h3>
        <p class="muted">Could not derive: ${d.gaps.join(', ')}. That's the part Pilot adds.</p>
        <p class="muted">Plus the attribution: which part of the move is signed, and which is not certain yet.</p>
      </div>
    </div>
    <div class="card">
      <h3 class="section-title">The exact requests</h3>
      <div class="code">${requests}</div>
      <p class="muted">Fetched before the demo, committed as JSON. This screen reads the file.</p>
    </div>`;
  return shell({ route: '/connect', body, footerRight: 'Connected data', state });
}
