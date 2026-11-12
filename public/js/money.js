export function usd(cents) {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function shortUsd(cents) {
  const d = cents / 100;
  if (Math.abs(d) >= 1e6) return `$${(d / 1e6).toFixed(1)}M`;
  if (Math.abs(d) >= 1e3) return `$${Math.round(d / 1e3)}K`;
  return `$${Math.round(d)}`;
}

export function shortUsdSigned(cents) {
  const s = shortUsd(Math.abs(cents));
  return cents < 0 ? `-${s}` : `+${s}`;
}
