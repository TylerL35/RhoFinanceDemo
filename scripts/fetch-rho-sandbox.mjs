// Pre-fetch the Rho sandbox so the demo never calls the network at runtime.
// Run before the pitch: RHO_API_TOKEN=demo node scripts/fetch-rho-sandbox.mjs
// Any non-empty token is accepted by the sandbox. The token is never written:
// the script refuses to write a snapshot whose JSON contains it.

import { writeFileSync } from 'node:fs';

const TOKEN = process.env.RHO_API_TOKEN ?? '';
if (!TOKEN) {
  console.error('RHO_API_TOKEN is required (any non-empty value works against the sandbox).');
  process.exit(1);
}

const BASE = 'https://rhoapi-sandbox.rho.co/api/v1';

async function call(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return { path, status: res.status, body: await res.json() };
}

const accounts = await call('/accounts');
const scheduled = await call('/scheduled-transactions?page_size=100');

const snapshot = {
  fetchedAt: new Date().toISOString().slice(0, 10),
  source: 'Rho API sandbox · fictional deterministic data',
  requests: [
    { path: accounts.path, status: accounts.status },
    { path: scheduled.path, status: scheduled.status },
  ],
  accounts: accounts.body.accounts,
  scheduled_transactions: scheduled.body.scheduled_transactions,
};

const out = `${JSON.stringify(snapshot, null, 2)}\n`;
if (out.includes(TOKEN)) {
  console.error('refusing to write: the snapshot contains the API token');
  process.exit(1);
}

writeFileSync(new URL('../public/data/rho-sandbox.snapshot.json', import.meta.url), out);
console.log(
  `wrote snapshot: ${snapshot.accounts.length} accounts, ${snapshot.scheduled_transactions.length} scheduled, fetchedAt ${snapshot.fetchedAt}`
);
