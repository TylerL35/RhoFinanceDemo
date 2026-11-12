import { parseDate, addDays, diffDays, daysInMonth, monthStart, MONTH_DAYS } from './calendar.js';
import { derived } from './derived.js';

const HORIZON_MONTHS = 36;

export function payrollFor(sc, y, m) {
  let total = 0;
  for (const p of sc.payroll) {
    const s = parseDate(p.startsOn);
    const monthIndex = y * 12 + (m - 1);
    const startIndex = s.getUTCFullYear() * 12 + (s.getUTCMonth());
    if (monthIndex > startIndex) total += p.monthlyCost;
    else if (monthIndex === startIndex) {
      const dim = daysInMonth(y, m);
      total += (p.monthlyCost * (dim - s.getUTCDate() + 1)) / dim;
    }
  }
  return total;
}

function contractMonthly(sc, y, m) {
  const c = sc.contracts[0];
  if (c.choice !== 'monthly') return 0;
  const start = parseDate(c.renewsOn);
  const monthIndex = y * 12 + (m - 1);
  const startIndex = start.getUTCFullYear() * 12 + start.getUTCMonth();
  return monthIndex >= startIndex ? c.monthlyEquivalent : 0;
}

export function grossSpend(sc, y, m) {
  return sc.plan.plannedGrossSpend + payrollFor(sc, y, m) + contractMonthly(sc, y, m);
}

export function netBurn(sc, y, m) {
  const revenue = sc.revenue.current * (sc.revenue.priceMultiplier ?? 1);
  return grossSpend(sc, y, m) - revenue;
}

function oneOffsBetween(sc, from, to) {
  let delta = 0;
  const c = sc.contracts[0];
  const renews = parseDate(c.renewsOn);
  if (c.choice !== 'cancel' && c.choice !== 'monthly' && renews > from && renews <= to) {
    delta -= c.amount;
  }
  for (const inv of sc.invoices) {
    if (inv.collected) {
      const when = addDays(from, 1);
      if (when > from && when <= to) delta += inv.amount;
    }
  }
  return delta;
}

export function cashAt(sc, d) {
  const asOf = parseDate(sc.asOf);
  if (diffDays(asOf, d) <= 0) return sc.cash;
  let cash = sc.cash;
  for (let cursor = addDays(asOf, 1); cursor <= d; cursor = addDays(cursor, 1)) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    cash -= netBurn(sc, y, m) / daysInMonth(y, m);
  }
  return cash + oneOffsBetween(sc, asOf, d);
}

export function bufferAt(sc, d) {
  let total = 0;
  let cursor = monthStart(d);
  for (let i = 0; i < sc.cushionMonths; i++) {
    total += netBurn(sc, cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return total;
}

export function raiseBy(sc) {
  const asOf = parseDate(sc.asOf);
  for (let i = 0; i <= HORIZON_MONTHS * 31; i++) {
    const d = addDays(asOf, i);
    if (cashAt(sc, d) <= bufferAt(sc, d)) return d;
  }
  return addDays(asOf, HORIZON_MONTHS * 31);
}

export function projectDate(sc) {
  const d = raiseBy(sc);
  return derived(d.getTime(), 'date', [
    { label: 'cash', value: sc.cash, source: 'scenario' },
    { label: 'net burn (Nov)', value: netBurn(sc, 2026, 11), source: 'engine' },
    { label: 'buffer', value: bufferAt(sc, parseDate(sc.asOf)), source: 'engine' },
    { label: 'cushion', value: sc.cushionMonths, source: 'scenario' },
  ], 'first day cash <= buffer; buffer = sum of next cushionMonths of netBurn');
}

export function revenueBand(sc) {
  const ratios = sc.revenue.trailing.map((t) => t.actual / t.expected);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const variance = ratios.reduce((a, r) => a + (r - mean) ** 2, 0) / (ratios.length - 1);
  const s = Math.sqrt(variance);
  const planned = sc.plan.plannedRevenue;
  return {
    mean, s,
    low: planned * Math.max(0.85, mean - s),
    high: planned * Math.min(1.05, mean + s),
  };
}

export function range(sc) {
  const band = revenueBand(sc);
  const at = (revenue) => {
    const c = structuredClone(sc);
    c.revenue.current = revenue;
    c.revenue.priceMultiplier = 1;
    return raiseBy(c);
  };
  return { low: at(band.low), base: raiseBy(sc), high: at(band.high), band };
}

export { MONTH_DAYS, diffDays, parseDate, addDays };
