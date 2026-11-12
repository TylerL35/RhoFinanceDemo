import { parseIntent } from './intents.js';
import { parseDate } from './calendar.js';
import { terms } from './scenario.js';
import { shortUsdSigned } from './money.js';

// What-if as four knobs on top of the real company. The controls set them
// directly; a typed sentence is parsed into the same knob change. Either way
// the scenario is rebuilt from the real company, so nothing compounds and a
// typed "switch hubspot to monthly" lands on the same date as tapping Monthly.

const FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PRICE_STEPS = [0, 5, 10, 20];
export const HIRES_MAX = 10;
export const CUSHION_MIN = 1;
export const CUSHION_MAX = 24;

const monthIso = (y, m0) => `${y + Math.floor(m0 / 12)}-${String((m0 % 12) + 1).padStart(2, '0')}-01`;

// The first of each of the next 12 months after asOf: the months a hire can start.
export function hireMonths(sc) {
  const d = parseDate(sc.asOf);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return Array.from({ length: 12 }, (_, i) => monthIso(y, m + 1 + i));
}

export const monthLabel = (iso) => {
  const d = parseDate(iso);
  return `${SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const monthLong = (iso) => {
  const d = parseDate(iso);
  return `${FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export function defaultKnobs(sc) {
  return { hires: 0, hireMonth: hireMonths(sc)[0], cushion: null, price: 0, contract: null };
}

export function knobsActive(k) {
  return !!k && (k.hires > 0 || k.cushion !== null || k.price > 0 || k.contract !== null);
}

// The cost of one more hire: the company's own latest payroll row. With no
// payroll there is no honest number, so the hire control is not offered.
export function hireCost(sc) {
  const rows = (sc?.payroll ?? []).filter((p) => !p.whatif);
  const cost = rows.at(-1)?.monthlyCost;
  return Number.isFinite(cost) ? cost : null;
}

export function canCancel(sc) {
  const c = sc?.contracts?.[0];
  if (!c) return false;
  return terms(sc, c.id).canCancel;
}

// The real company plus the knobs. Pure: the input is never mutated.
export function applyKnobs(real, k) {
  const v = structuredClone(real);
  if (!knobsActive(k)) return v;
  if (k.hires > 0) {
    const cost = hireCost(real);
    if (cost !== null) {
      for (let i = 0; i < k.hires; i += 1) {
        v.payroll.push({
          id: `whatif-${k.hireMonth}-${i + 1}`,
          label: `What-if hire ${i + 1}`,
          monthlyCost: cost,
          startsOn: k.hireMonth,
          confirmed: false,
          whatif: true,
        });
      }
    }
  }
  if (k.cushion !== null) v.cushionMonths = k.cushion;
  if (k.price > 0) {
    const factor = 1 + k.price / 100;
    const effective = Number(real.revenue.current) * (real.revenue.priceMultiplier ?? 1);
    v.revenue.current = Math.round(effective * factor);
    v.revenue.priceMultiplier = 1;
    v.plan.plannedRevenue = Math.round(real.plan.plannedRevenue * factor);
  }
  if (k.contract !== null && v.contracts?.[0]) v.contracts[0].choice = k.contract;
  return v;
}

// One line naming every active knob, for Ask Rho and the result line.
export function knobSummary(k, real) {
  if (!knobsActive(k)) return '';
  const parts = [];
  if (k.hires > 0) parts.push(`${k.hires} more hire${k.hires === 1 ? '' : 's'} from ${monthLabel(k.hireMonth)}`);
  if (k.cushion !== null) parts.push(`a ${k.cushion}-month cushion`);
  if (k.price > 0) parts.push(`prices up ${k.price}%`);
  if (k.contract !== null) {
    const vendor = real?.contracts?.[0]?.vendor ?? 'the contract';
    parts.push(k.contract === 'cancel' ? `${vendor} cancelled` : k.contract === 'monthly' ? `${vendor} on monthly billing` : `${vendor} approved`);
  }
  return parts.join(', ');
}

// What a control change says, in the same voice as a typed what-if.
export function knobEcho(k, real, kind) {
  const cost = hireCost(real);
  switch (kind) {
    case 'hires':
      return k.hires === 0
        ? 'No extra hires.'
        : `${k.hires} more hire${k.hires === 1 ? '' : 's'} from ${monthLong(k.hireMonth)}, ${shortUsdSigned(k.hires * (cost ?? 0))}/mo.`;
    case 'cushion':
      return `A ${k.cushion ?? real.cushionMonths}-month cushion.${(k.cushion ?? real.cushionMonths) > real.cushionMonths ? ' A longer cushion moves the date earlier.' : ''}`;
    case 'price':
      return k.price === 0 ? 'Prices as they are.' : `Prices ${k.price}% higher from next month, on both ends of the range.`;
    case 'contract': {
      const vendor = real.contracts?.[0]?.vendor ?? 'The contract';
      return k.contract === null ? `${vendor} as it is.` : k.contract === 'cancel' ? `Cancel the ${vendor} renewal.` : `${vendor} on monthly billing.`;
    }
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Typing, forgiving: tidy the sentence, pick out the action, number, month and
// vendor, then hand a canonical sentence to the strict grammar. Still
// deterministic and offline; the strict grammar has the last word.

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, few: 3, dozen: 12,
};
const PEOPLE = /\b(engineers?|people|persons?|employees?|devs?|developers?|folks|staff|heads?|headcount|salespeople|sales ?reps?|reps?|designers?|pms?|marketers?|ops|hires?)\b/;
const HIRE_VERB = /\b(hire|hires|hiring|recruit|recruiting|onboard|onboarding|bring on|bringing on|add|adding|grow|growing)\b/;
const CANCEL = /\b(cancel|cancelling|canceling|drop|dropping|kill|end|stop|cut|terminate|ditch|dont renew|not renew|no longer renew|skip)\b/;
const MONTHLY = /\b(monthly|month to month|per month billing|pay monthly|billed monthly)\b/;
const PRICE = /\b(price|prices|pricing|charge|charges|arpu|acv)\b/;
const PRICE_UP = /\b(up|raise|raising|increase|increasing|hike|bump|lift|higher|more)\b|\+/;
const CUSHION = /\b(cushion|buffer|reserve|safety)\b/;
const RAISE = /\b(raise|fundraise|fundraising|round|raising)\b/;
const LONGER = /\b(longer|more|extra|additional|slower)\b/;
const DELAY = /\b(delay|postpone|push back|push out|start later)\b/;
const MONTH_RE = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:\s+(20\d\d))?/;

export function tidy(text) {
  let t = String(text ?? '').toLowerCase()
    .replace(/[’']/g, '')
    .replace(/(\d+(?:\.\d+)?)\s*(percent|pct)\b/g, '$1%')
    .replace(/[^a-z0-9%+.\s-]/g, ' ')
    .replace(/\b(\d+)-(month|months)\b/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\b(a|an)\s+(?=(new\s+)?(engineer|person|employee|dev|developer|designer|rep|hire|marketer|pm)\b)/g, '1 ');
  t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|dozen)\b/g,
    (w) => String(NUMBER_WORDS[w]));
  t = t.replace(/\.$/, '');
  return t;
}

function slots(t, real) {
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? null;
  const asOf = parseDate(real.asOf);
  let month = null;
  const mm = t.match(MONTH_RE);
  if (mm) {
    const key = mm[1].slice(0, 3);
    const idx = SHORT.findIndex((s) => s.toLowerCase() === key);
    const explicit = mm[2] ? Number(mm[2]) : null;
    const year = explicit ?? (idx + 1 <= asOf.getUTCMonth() + 1 ? asOf.getUTCFullYear() + 1 : asOf.getUTCFullYear());
    month = { name: FULL[idx], year };
  } else if (/\bnext month\b/.test(t)) {
    const iso = hireMonths(real)[0];
    const d = parseDate(iso);
    month = { name: FULL[d.getUTCMonth()], year: d.getUTCFullYear() };
  } else {
    const inN = t.match(/\bin (\d+) months?\b/);
    if (inN) {
      const iso = hireMonths(real)[Math.min(11, Math.max(0, Number(inN[1]) - 1))];
      const d = parseDate(iso);
      month = { name: FULL[d.getUTCMonth()], year: d.getUTCFullYear() };
    }
  }
  // Counts: integers that are not the percentage, not a year, not "in N months".
  const scrubbed = t.replace(/(\d+(?:\.\d+)?)\s*%/g, ' ').replace(/\b20\d\d\b/g, ' ').replace(/\bin \d+ months?\b/g, ' ');
  const n = scrubbed.match(/\b(\d+)\b/)?.[1];
  const c = real.contracts?.[0] ?? null;
  const vendorHit = c && (t.includes(String(c.vendor).toLowerCase()) || t.includes(String(c.id).toLowerCase())
    || /\b(contract|renewal|subscription|vendor|software|tool)\b/.test(t));
  return { pct, month, n: n === undefined ? null : Number(n), contract: vendorHit ? c : null };
}

// A canonical sentence the strict grammar accepts, or null.
export function canonical(text, real) {
  const t = tidy(text);
  if (!t) return null;
  const s = slots(t, real);
  if (DELAY.test(t) && RAISE.test(t)) return 'delay the raise';
  if (HIRE_VERB.test(t) && (PEOPLE.test(t) || /\bhir/.test(t) || /\b(recruit|onboard)/.test(t) || (s.n !== null && !s.pct && !PRICE.test(t)))) {
    const m = s.month ?? (() => {
      const d = parseDate(hireMonths(real)[0]);
      return { name: FULL[d.getUTCMonth()], year: d.getUTCFullYear() };
    })();
    return `hire ${s.n ?? 1} in ${m.name} ${m.year}`;
  }
  if (PEOPLE.test(t) && s.n !== null && !s.pct && !CUSHION.test(t)) {
    const m = s.month ?? (() => {
      const d = parseDate(hireMonths(real)[0]);
      return { name: FULL[d.getUTCMonth()], year: d.getUTCFullYear() };
    })();
    return `hire ${s.n} in ${m.name} ${m.year}`;
  }
  if (s.contract && MONTHLY.test(t)) return `switch ${s.contract.id} to monthly`;
  if (s.contract && CANCEL.test(t)) return `cancel ${s.contract.id}`;
  if (PRICE.test(t) && s.pct && (PRICE_UP.test(t) || /^\d/.test(t))) return `raise prices ${s.pct}%`;
  if (s.pct && PRICE_UP.test(t) && !CUSHION.test(t)) return `raise prices ${s.pct}%`;
  if (RAISE.test(t) && LONGER.test(t) && s.n !== null && !PRICE.test(t)) return `the raise takes ${s.n} months longer`;
  if (CUSHION.test(t) && s.n !== null) return `cushion ${s.n} months`;
  return null;
}

// The knob change a parsed sentence makes. Mirrors each grammar rule.
function knobFor(canonicalText, parsed, real, k) {
  const t = canonicalText.toLowerCase();
  let m = t.match(/^hire\s+(\d+)\s+(?:more\s+)?(?:(?:engineers?|people|employees?)\s+)?in\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (m) {
    // "2 more" adds to what-if hires that start the same month. A different
    // month replaces them, so the result is exactly what the echo says.
    const month = parsed.knobPeek?.startsOn ?? k.hireMonth;
    const sameMonth = month === k.hireMonth;
    return { ...k, hires: Math.min(24, (sameMonth ? k.hires : 0) + Number(m[1])), hireMonth: month };
  }
  m = t.match(/^(?:the\s+)?raise\s+takes\s+(\d+)\s+months?\s+longer$/);
  if (m) return { ...k, cushion: Math.min(36, (k.cushion ?? real.cushionMonths) + Number(m[1])) };
  m = t.match(/^cushion\s+(\d+)\s+months?$/);
  if (m) return { ...k, cushion: Number(m[1]) };
  m = t.match(/^(?:raise\s+prices|price\s+increase)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%$/);
  if (m) return { ...k, price: Number(m[1]) };
  if (/^cancel\s/.test(t)) return { ...k, contract: 'cancel' };
  if (/^switch\s.+\sto\s+monthly$/.test(t)) return { ...k, contract: 'monthly' };
  return null;
}

// Parse a typed what-if against the real company. Strict grammar first, then
// the tidied, canonical form. Returns { ok, echo, knobs } or { ok:false, reason }.
export function parseWhatIf(text, real, k = defaultKnobs(real)) {
  const tries = [String(text ?? '').trim()];
  const canon = canonical(text, real);
  if (canon && canon !== tries[0]) tries.push(canon);
  let firstRefusal = null;
  for (const attempt of tries) {
    const parsed = parseIntent(attempt, real);
    if (!parsed.ok) {
      // A specific refusal (a closed notice window, an unknown vendor, a cap)
      // beats the generic one, so it is what the user sees.
      if (firstRefusal === null || /can model hires, contract changes/.test(firstRefusal)) firstRefusal = parsed.reason;
      continue;
    }
    // Peek at the hire month the grammar chose, without touching the scenario.
    const probe = structuredClone(real);
    parsed.mutation(probe);
    parsed.knobPeek = probe.payroll.filter((p) => p.whatif).at(-1) ?? null;
    const next = knobFor(attempt, parsed, real, k);
    if (next) return { ok: true, echo: parsed.echo, knobs: next, canonical: attempt };
  }
  return { ok: false, reason: firstRefusal ?? parseIntent('', real).reason };
}

// Up to two sentences worth tapping when a typed what-if is not understood,
// ranked by the words they share with what was typed.
export function suggestionsFor(text, real) {
  const t = tidy(text);
  const c = real?.contracts?.[0];
  const vendor = c && /^[a-z0-9_-]+$/i.test(c.vendor) ? c.vendor.toLowerCase() : c?.id;
  const pool = [];
  if (hireCost(real) !== null) pool.push({ s: 'hire 2 more in March', keys: /hir|people|engineer|team|staff|head|add|grow|recruit|person|employee/ });
  pool.push({ s: 'the raise takes 3 months longer', keys: /raise|round|fundrais|longer|slow|investor|close|time/ });
  pool.push({ s: 'cushion 9 months', keys: /cushion|buffer|runway|safe|reserve|month/ });
  pool.push({ s: 'raise prices 10%', keys: /price|charge|revenue|sales|%|percent|arpu|more money/ });
  if (c && canCancel(real)) pool.push({ s: `cancel ${vendor}`, keys: new RegExp(`cancel|drop|cut|stop|contract|renew|subscription|${String(c.vendor).toLowerCase()}`) });
  if (c) pool.push({ s: `switch ${vendor} to monthly`, keys: new RegExp(`monthly|month to month|contract|renew|subscription|annual|${String(c.vendor).toLowerCase()}`) });
  const valid = pool.filter((p) => parseIntent(p.s, real).ok);
  const scored = valid.map((p, i) => ({ ...p, score: p.keys.test(t) ? 1 : 0, i }));
  const hits = scored.filter((p) => p.score > 0);
  return (hits.length ? hits : scored).slice(0, 2).map((p) => p.s);
}
