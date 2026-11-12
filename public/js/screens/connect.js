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

export function connect({ snapshot } = {}) {
  const d = deriveFromSnapshot(snapshot);
  const head = `
    ${eyebrow('CONNECTED DATA')}
    <h1>Rho has the inputs. Runway is what we compute.</h1>`;

  if (!d) {
    const body = `${head}
    <div class="card">
      <p class="lead" style="margin:0">Sandbox snapshot unavailable. Run scripts/fetch-rho-sandbox.mjs before the demo.</p>
    </div>`;
    return shell({ route: '/connect', body, footerRight: 'Connected data' });
  }

  const requests = d.requests.map((r) => `GET ${r.path} → ${r.status}`).join('<br>');
  const body = `${head}
    <p class="lead" style="margin-bottom:8px">Fictional company, not the one above.</p>
    <p class="muted">Sandbox data, fetched ${d.fetchedAt}. No network call happens on this screen.</p>
    <div class="card white">
      <div class="mono">${d.accounts} accounts · ${usd(d.cash)} cash · ${usd(d.committed)} committed</div>
      <p class="muted" style="margin-top:12px">Could not derive: ${d.gaps.join(', ')}. That's the part Raise-By adds.</p>
    </div>
    <div class="card">
      <h2>The exact requests</h2>
      <div class="mono">${requests}</div>
      <p class="muted">Fetched before the demo, committed as JSON. This screen reads the file.</p>
    </div>`;
  return shell({ route: '/connect', body, footerRight: 'Connected data' });
}
