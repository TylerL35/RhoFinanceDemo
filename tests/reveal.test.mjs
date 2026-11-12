import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../public/data/fixture-seed.json', import.meta.url), 'utf8')
);

// The headline and range sentence are separate elements for typography, so the
// sentence a reader sees spans them. Strip tags and collapse whitespace to assert
// the rendered copy the deck shows, not the markup around it.
const text = (html) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const render = async (scenario) => {
  const { reveal } = await import('../public/js/screens/reveal.js');
  return reveal({ state: { scenario } });
};

const assertNoBrokenDates = (html, label) => {
  for (const bad of ['Invalid Date', '1970', 'NaN']) {
    assert.ok(!html.includes(bad), `${label} output contains ${bad}`);
  }
};

test('reveal prints the spec headline and range sentence in full month names', async () => {
  const html = await render(structuredClone(fixture));
  const copy = text(html);

  assert.ok(
    copy.includes('Start raising by mid-April 2027. Estimated range early March to late April.'),
    `headline and range sentence mismatch: ${copy.slice(0, 220)}`
  );
  assert.ok(!copy.includes('mid-Apr 2027'), 'headline must not abbreviate the month');
  assert.ok(!copy.includes('Mar 2027 to Apr 2027'), 'range must not print abbreviated month-years');
  assertNoBrokenDates(html, 'fixture');
});

test('reveal prints the receipt line with the base case month and day', async () => {
  const html = await render(structuredClone(fixture));
  assert.ok(
    text(html).includes('Start raising by mid-April 2027 (base case Apr 11)'),
    'receipt line is missing or not formatted as month-day'
  );
});

test('reveal source table names its sources without invented counts', async () => {
  const html = await render(structuredClone(fixture));
  const copy = text(html);

  assert.ok(copy.includes('Gusto debits'), 'payroll source label missing');
  assert.ok(copy.includes('revenue deposits'), 'sales source label missing');
  assert.ok(copy.includes('HubSpot renewal'), 'contract row missing the vendor name');
  assert.ok(copy.includes('$60K on Dec 20'), 'contract amount and renewal date missing');
  assert.ok(copy.includes('Order form p.2'), 'contract source label missing');
  assert.ok(!copy.includes('6 Gusto debits'), 'literal debit count should be dropped');
  assert.ok(!copy.includes('12 deposits'), 'literal deposit count should be dropped');
});

test('reveal names the projected month part from the projected day, not a literal mid-', async () => {
  const { raiseBy } = await import('../public/js/engine.js');
  const { fmtMonthDay } = await import('../public/js/calendar.js');
  const partOf = (d) => (d.getUTCDate() <= 10 ? 'early' : d.getUTCDate() <= 20 ? 'mid' : 'late');
  const fullMonth = (d) => d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

  // Walk cash far enough to land a projected date in each part of a month.
  const found = new Map();
  for (let delta = -40000000; delta <= 40000000 && found.size < 3; delta += 50000) {
    const sc = structuredClone(fixture);
    sc.cash += delta;
    const d = raiseBy(sc);
    if (!d) continue;
    const part = partOf(d);
    if (!found.has(part)) found.set(part, { sc, d, part });
  }
  assert.deepEqual([...found.keys()].sort(), ['early', 'late', 'mid'], 'cash walk did not reach all three parts');

  for (const { sc, d, part } of found.values()) {
    const copy = text(await render(sc));
    const monthYear = `${fullMonth(d)} ${d.getUTCFullYear()}`;
    // Standard usage hyphenates only "mid-April"; "early April" and "late April"
    // take no hyphen. Both spellings are asserted explicitly, so the test cannot
    // pass by deriving its expectation from the code under test.
    const label = part === 'mid' ? `mid-${monthYear}` : `${part} ${monthYear}`;
    const wrong = part === 'mid' ? `mid ${monthYear}` : `${part}-${monthYear}`;
    assert.ok(copy.includes(`Start raising by ${label}.`), `headline is not ${label}: ${copy.slice(0, 200)}`);
    assert.ok(
      copy.includes(`Start raising by ${label} (base case ${fmtMonthDay(d)})`),
      `receipt is not ${label}: ${copy.slice(0, 260)}`
    );
    assert.ok(!copy.includes(wrong), `headline or receipt used ${wrong} instead of ${label}`);
  }
});

test('reveal renders a contract-less scenario and says no contract was entered', async () => {
  const noContract = structuredClone(fixture);
  noContract.contracts = [];

  const html = await render(noContract);
  const copy = text(html);

  assert.ok(copy.includes('No contract entered'), 'missing no-contract row');
  assert.ok(copy.includes('Add one in Use my numbers'), 'missing no-contract caption');
  assert.ok(copy.includes('Raise-by'), 'screen chrome should still render');
  assertNoBrokenDates(html, 'contract-less');
});
