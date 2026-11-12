export const MONTH_DAYS = 365.25 / 12;

export function parseDate(iso) { return new Date(`${iso}T00:00:00Z`); }

export function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

export function diffDays(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

export function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

export function monthStart(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }

export function addMonths(d, n) {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), daysInMonth(y, m + 1))));
}

export function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function fmtMonthYear(d) {
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function fmtMonthDay(d) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// "Apr 11" when the date is within about a year of `from`, "Oct 30, 2028" when
// it is further out, so a far-off date never reads as next spring.
export function fmtDay(d, from) {
  const far = from && Math.abs(diffDays(from, d)) > 300;
  return far
    ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : fmtMonthDay(d);
}

export function fullMonth(d) {
  return d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
}

// The deck names a date by the part of the month it lands in:
// early 1-10, mid 11-20, late 21-end.
export function partOf(d) {
  const day = d.getUTCDate();
  return day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
}

// "early March", used inside range sentences, never hyphenated.
export function periodOf(d) {
  return `${partOf(d)} ${fullMonth(d)}`;
}

// "mid-April" / "early April": standard usage hyphenates only "mid-".
export function namedDate(d) {
  return `${partOf(d)}${partOf(d) === 'mid' ? '-' : ' '}${fullMonth(d)}`;
}
