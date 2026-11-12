import { shortUsd } from './money.js';

const STRICT = typeof process !== 'undefined' && !!process.env.NODE_TEST_CONTEXT;

export function derived(value, unit, inputs, formula) {
  if (STRICT && (!inputs || inputs.length === 0)) {
    throw new Error(`no inputs for derived number: ${formula}`);
  }
  return { value, unit, inputs, formula };
}

export function fmt(d) {
  if (!d) return '—';
  if (!d.inputs || d.inputs.length === 0) {
    console.warn('[provenance] number without inputs:', d.formula);
    return '—';
  }
  switch (d.unit) {
    case 'cents': return shortUsd(d.value);
    case 'days': return `${Math.round(d.value)} days`;
    case 'months': return `${d.value.toFixed(1)} mo`;
    case 'count': return String(Math.round(d.value));
    default: return String(d.value);
  }
}

export function displayTenths(parts, totalMonths) {
  const target = Math.round(totalMonths * 10);
  const raw = parts.map((p) => p * 10);
  const out = raw.map((v) => Math.floor(v));
  let remaining = target - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v), v }))
    .sort((a, b) => b.frac - a.frac || b.v - a.v);
  let k = 0;
  while (remaining > 0) {
    out[order[k % order.length].i] += 1;
    remaining -= 1;
    k += 1;
  }
  return out;
}
