import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONTH_DAYS, parseDate, addDays, diffDays, daysInMonth, addMonths, monthKey } from '../public/js/calendar.js';
import { usd, shortUsd } from '../public/js/money.js';

test('MONTH_DAYS is the pinned constant', () => {
  assert.equal(MONTH_DAYS, 365.25 / 12);
  assert.equal(MONTH_DAYS, 30.4375);
});

test('daysInMonth handles February in a leap year', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 6), 30);
  assert.equal(daysInMonth(2026, 7), 31);
});

test('addDays and diffDays are UTC and exact', () => {
  const asOf = parseDate('2026-11-11');
  assert.equal(diffDays(asOf, parseDate('2027-04-11')), 151);
  assert.equal(addDays(asOf, 9).toISOString().slice(0, 10), '2026-11-20');
});

test('addMonths clamps the day', () => {
  assert.equal(addMonths(parseDate('2026-01-31'), 1).toISOString().slice(0, 10), '2026-02-28');
});

test('monthKey is zero padded', () => {
  assert.equal(monthKey(parseDate('2026-11-11')), '2026-11');
});

test('money formats cents', () => {
  assert.equal(usd(6000000), '$60,000');
  assert.equal(shortUsd(210000000), '$2.1M');
  assert.equal(shortUsd(6000000), '$60K');
});
