import { parseDate, addDays, diffDays } from './calendar.js';

const KEY = 'raise-by.scenario.v1';

export async function loadFixture() {
  const res = await fetch('./data/fixture-seed.json');
  return res.json();
}

export function clone(sc) { return structuredClone(sc); }

export function validate(sc) {
  const errs = [];
  if (!(sc.cash > 0)) errs.push('NO_CASH');
  if (!(sc.plan.plannedGrossSpend >= 0)) errs.push('NO_SPEND');
  // Zero revenue is a real company (pre-revenue); a missing or negative number is not.
  if (!(sc.revenue.current >= 0)) errs.push('NO_REVENUE');
  const payroll = (sc.payroll ?? []).reduce((sum, p) => sum + p.monthlyCost, 0);
  if (sc.plan.plannedGrossSpend + payroll - sc.revenue.current <= 0) errs.push('NO_BURN');
  if (!(sc.cushionMonths >= 1)) errs.push('NO_CUSHION');
  return errs;
}

export function terms(sc, contractId, asOf = parseDate(sc.asOf)) {
  const c = sc.contracts.find((x) => x.id === contractId);
  const deadline = addDays(parseDate(c.renewsOn), -c.noticeDays);
  const daysLeft = diffDays(asOf, deadline);
  return { deadline, daysLeft, canCancel: daysLeft >= 0 };
}

export function saveLocal(sc) {
  if (globalThis.__RAISE_BY_PRESENT__) return;
  try { localStorage.setItem(KEY, JSON.stringify(sc)); } catch { /* storage full or blocked */ }
}

// Storage can be unavailable (private mode, a sandboxed frame) or hold a
// half-written value; neither may stop the demo from rendering.
export function loadLocal() {
  if (globalThis.__RAISE_BY_PRESENT__) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch { /* nothing saved to clear */ }
}
