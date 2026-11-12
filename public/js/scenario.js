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
  if (!(sc.revenue.current > 0)) errs.push('NO_REVENUE');
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
  localStorage.setItem(KEY, JSON.stringify(sc));
}

export function loadLocal() {
  if (globalThis.__RAISE_BY_PRESENT__) return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearLocal() { localStorage.removeItem(KEY); }
