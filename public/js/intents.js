import { clone, terms } from './scenario.js';
import { parseDate } from './calendar.js';
import { shortUsdSigned } from './money.js';

const FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Only the ruled intents have a pattern. Anything that misses every pattern
// falls through to the single refusal sentence at the bottom of parseIntent().
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const HIRE = new RegExp(
  `^hire\\s+(\\d+)\\s+(?:more\\s+)?(?:(?:engineers?|people|employees?)\\s+)?in\\s+${MONTH}(?:\\s+(\\d{4}))?$`,
  'i'
);
const LONGER = /^(?:the\s+)?raise\s+takes\s+(\d+)\s+months?\s+longer$/i;
const CUSHION = /^cushion\s+(\d+)\s+months?$/i;
const PRICES = /^(?:raise\s+prices|price\s+increase)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%$/i;
const CANCEL = /^cancel\s+([a-z0-9][a-z0-9_-]*)$/i;
const MONTHLY = /^switch\s+([a-z0-9][a-z0-9_-]*)\s+to\s+monthly$/i;

const REFUSE = "I can model hires, contract changes, price changes, and the cushion. I can't model that yet.";

const refuse = (reason) => ({ ok: false, reason });

// Every numeric capture is bounded before any echo or mutation is built. A
// four-hundred-digit string becomes Infinity, and a billion hires would push a
// billion payroll rows, so "finite and inside the ruled range" is checked first.
const bounded = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

// The contract may be named by id or by vendor, in any case. The index travels
// with it so the mutation edits the contract it found, not blindly contracts[0].
function contractFor(sc, name) {
  const key = name.toLowerCase();
  const index = (sc.contracts ?? []).findIndex(
    (c) => String(c.id).toLowerCase() === key || String(c.vendor).toLowerCase() === key
  );
  return index === -1 ? null : { contract: sc.contracts[index], index };
}

function yearFor(monthIndex, explicitYear, asOfIso) {
  if (explicitYear) return Number(explicitYear);
  const asOf = parseDate(asOfIso);
  const year = asOf.getUTCFullYear();
  return monthIndex + 1 < asOf.getUTCMonth() + 1 ? year + 1 : year;
}

export function parseIntent(text, sc) {
  const t = String(text ?? '').trim().toLowerCase().replace(/[.?!]+$/, '');
  const asOfIso = sc?.asOf ?? '2026-01-01';

  let m = t.match(HIRE);
  if (m) {
    const n = Number(m[1]);
    if (!bounded(n, 1, 24)) return refuse('I can model up to 24 hires in one go.');
    const token = m[2].slice(0, 3);
    const monthIndex = MONTHS.indexOf(token);
    const year = yearFor(monthIndex, m[3], asOfIso);
    const startsOn = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;

    // Per-month cost comes from the last payroll row. With no payroll baseline
    // there is no honest number to repeat, so this intent is refused rather
    // than priced from a made-up figure.
    const real = (sc.payroll ?? []).filter((p) => !p.whatif);
    const cost = (real.length ? real : sc.payroll ?? []).at(-1)?.monthlyCost;
    if (!Number.isFinite(cost)) return refuse(REFUSE);

    const noun = n === 1 ? 'hire' : 'hires';
    return {
      ok: true,
      echo: `I read that as: ${n} more ${noun} starting ${FULL[monthIndex]} ${year}, ${shortUsdSigned(n * cost)}/mo.`,
      // What-if rows are hypothetical: never confirmed, and flagged so the
      // screens that describe the real company (bar, confirm card, Ask Rho)
      // leave them out. Ids come from the request, not the row count, so an
      // undo and re-apply gives the same ids.
      mutation: (v) => {
        const taken = new Set(v.payroll.map((p) => p.id));
        for (let i = 0; i < n; i += 1) {
          let k = i + 1;
          while (taken.has(`whatif-${startsOn}-${k}`)) k += 1;
          const id = `whatif-${startsOn}-${k}`;
          taken.add(id);
          v.payroll.push({
            id,
            label: `What-if hire ${i + 1}`,
            monthlyCost: cost,
            startsOn,
            confirmed: false,
            whatif: true,
          });
        }
      },
    };
  }

  // A longer raise needs more cushion, which moves the date earlier. This is
  // deliberately checked before the delay rejection below, but the two patterns
  // cannot collide: "delay the raise" never matches "raise takes".
  m = t.match(LONGER);
  if (m) {
    const n = Number(m[1]);
    if (!bounded(n, 1, 24)) return refuse('I can model up to 24 months longer in one go.');
    return {
      ok: true,
      echo: `I read that as: your raise takes ${n} months longer, so you need ${sc.cushionMonths + n} months of cushion. That moves your date earlier.`,
      mutation: (v) => { v.cushionMonths += n; },
    };
  }

  // "Delay" reads as starting later, which is the opposite of a longer raise.
  // Refuse and teach the phrasing that means what the user meant.
  if (/^delay\s+the\s+raise\b/.test(t)) {
    return refuse('That reads as "start later", which moves the date later. Try: "the raise takes 3 months longer".');
  }

  m = t.match(CUSHION);
  if (m) {
    const n = Number(m[1]);
    if (!bounded(n, 1, 36)) return refuse('I can model up to 36 months of cushion.');
    return {
      ok: true,
      echo: `I read that as: ${n} months of cushion.`,
      mutation: (v) => { v.cushionMonths = n; },
    };
  }

  m = t.match(PRICES);
  if (m) {
    const pct = Number(m[1]);
    if (!bounded(pct, 1, 100)) return refuse('I can model price changes between 1% and 100%.');
    const factor = 1 + pct / 100;

    // The target is captured from the scenario parsed against, not recomputed
    // from whatever the mutation is handed. Applying this mutation twice in one
    // intent therefore lands on the same numbers instead of compounding.
    const effective = Number(sc.revenue.current) * (sc.revenue.priceMultiplier ?? 1);
    const currentAfter = Math.round(effective * factor);
    const plannedAfter = Math.round(sc.plan.plannedRevenue * factor);

    return {
      ok: true,
      echo: `I read that as: prices ${m[1]}% higher from next month, and on both ends of the range.`,
      mutation: (v) => {
        // netBurn() reads current * priceMultiplier. Scaling both would count the
        // raise twice, so fold the factor into current once and hold the
        // multiplier at 1. The band is computed from plan.plannedRevenue, so it
        // must scale too or only the middle moves.
        v.revenue.current = currentAfter;
        v.revenue.priceMultiplier = 1;
        v.plan.plannedRevenue = plannedAfter;
      },
    };
  }

  m = t.match(CANCEL);
  if (m) {
    const found = contractFor(sc, m[1]);
    if (!found) return refuse(`I can't find a contract for "${m[1]}".`);
    const { contract, index } = found;
    if (!terms(sc, contract.id).canCancel) {
      return refuse(`The notice window for ${contract.vendor} is closed, so it renews automatically.`);
    }
    return {
      ok: true,
      echo: `I read that as: cancel the ${contract.vendor} renewal before the notice window closes.`,
      mutation: (v) => { v.contracts[index].choice = 'cancel'; },
    };
  }

  m = t.match(MONTHLY);
  if (m) {
    const found = contractFor(sc, m[1]);
    if (!found) return refuse(`I can't find a contract for "${m[1]}".`);
    const { contract, index } = found;
    return {
      ok: true,
      echo: `I read that as: switch ${contract.vendor} to monthly billing.`,
      mutation: (v) => { v.contracts[index].choice = 'monthly'; },
    };
  }

  return refuse(REFUSE);
}

export function applyIntent(sc, text) {
  const parsed = parseIntent(text, sc);
  const scenario = clone(sc);
  if (!parsed.ok) return { ok: false, scenario, echo: parsed.reason };
  parsed.mutation(scenario);
  return { ok: true, scenario, echo: parsed.echo };
}
