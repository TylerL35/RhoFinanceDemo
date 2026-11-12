export function usd(cents) {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

// Millions keep two decimals so $2.04M is not flattened to $2.0M; trailing
// zeros are trimmed, so $2.10M prints as $2.1M and $3.00M as $3M.
export function shortUsd(cents) {
  const d = cents / 100;
  if (Math.abs(d) >= 1e6) return `$${(d / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (Math.abs(d) >= 1e3) return `$${Math.round(d / 1e3)}K`;
  return `$${Math.round(d)}`;
}

// One decimal between $1K and $10K, for small rates such as burn per day ($6.1K).
export function shortUsd1(cents) {
  const d = cents / 100;
  if (Math.abs(d) >= 1e4 || Math.abs(d) < 1e3) return shortUsd(cents);
  return `$${(d / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
}

export function shortUsdSigned(cents) {
  const s = shortUsd(Math.abs(cents));
  return cents < 0 ? `-${s}` : `+${s}`;
}
