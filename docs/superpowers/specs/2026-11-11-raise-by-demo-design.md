# Pilot demo: design spec

NYU PMC x Rho case competition · team: Michael, Neha, Tyler, Regis
Status: approved for implementation (rev 2) · Nov 11, 2026
Deck due Nov 12, 11:59pm ET · pitch Fri Nov 13 (7 min + 3 min Q&A)

This spec covers **the demo only**. The pitch deck is owned separately by a teammate and is built
from `deck_master.md` and `BUILD_PROMPT.md`. Section 13 lists every copy string that changes on the
deck as a consequence, including a fixture fix the deck needs before it freezes.

Every number in this document was produced by a reference implementation of the rules in section 6,
not by hand. Where a number is display-rounded it is marked.

---

## 1. Goal

Build a working, hosted MVP of Pilot — the date a founder should start raising, derived from what
is already signed — that (a) carries a 75-second scripted pitch demo and (b) lets an audience member
open the same URL on their own phone and model their own company.

Success on the night:

1. The scripted path runs in 75 seconds with arrow keys only, no mouse.
2. Every number on screen is derived from one data object and is inspectable.
3. A judge can type `hire 2 more in March` and watch the date move.
4. A judge can enter their own six numbers and get their own date.
5. Nothing on stage requires the network, including a refresh.

## 2. Non-goals

- No real Rho account, no Rho credentials, no production API. Interaction with Rho's API is a
  pre-fetched snapshot, and it is used to *derive inputs*, never to fetch a runway number (section 11).
- No LLM anywhere in the product path. The what-if grammar is deterministic (section 9).
- No auth, no database, no server. Persistence is `localStorage` only.
- No PDF/contract parsing. Renewal terms in the fixture are authored, with a `source` string.
- Not a Rho rebrand. The UI imitates Rho's product chrome for authenticity; it never claims to be
  Rho's app, and every screen carries a "Synthetic data" marker.

## 3. Hard constraints

| Constraint | Reason |
|---|---|
| **No network at runtime.** Airplane mode must not change a single pixel, including on refresh. | Venue wifi; the Rho sandbox sends no CORS headers, so the browser cannot call it anyway. |
| **Static deploy** (`public/` → Vercel). No serverless function, no env vars at runtime. | Removes the one runtime dependency. |
| **Offline after first load, and offline-before-first-load.** A service worker caches the app so a refresh survives a dead network; `python3 -m http.server --directory public` is the belt-and-braces path. `file://` does **not** work — browsers block JSON and module loads from disk. | "A refresh is free" has to be true, which it is not without this. |
| **Zero dependencies.** No framework, no build step, no `node_modules`. | Nothing to install, nothing to fail. |
| **Self-hosted fonts.** Inter regular + a mono, bundled as woff2. | No CDN. Neue Montreal is commercial; a licensed swap later. |
| **Deck copy frozen except section 13.** Screen strings come from `BUILD_PROMPT.md`. | Deck ships the same night. |
| **Deterministic.** `asOf` is a scenario field; the engine never reads the wall clock, and the clock rules in §6 are fixed. | Same answer on every machine, in every run. |

## 4. Architecture

```
public/
  index.html                  # one page, hash routes
  sw.js                       # cache-first precache of the whole asset list (section 12)
  styles.css                  # Rho tokens: #151716, #6AF3D9, #EFF3F2, #D7E0DE, 6px radius
  data/fixture-seed.json      # the demo company (section 5)
  data/rho-sandbox.snapshot.json   # pre-fetched, token-free, carries fetchedAt
  js/calendar.js              # UTC dates, daysInMonth, monthKey, MONTH_DAYS
  js/money.js                 # integer cents in, formatted string out (the ONLY rounder)
  js/derived.js               # Derived records + provenance checker + largest-remainder display
  js/engine.js                # cashAt, bufferAt, raiseBy, attribute, priceOption, alertsFor, resolve
  js/intents.js               # bounded grammar (section 9)
  js/scenario.js              # schema, validation, load/save, reset
  js/screens/*.js             # one renderer per route
  js/app.js                   # state, router, keyboard, render loop, ?present handling
scripts/fetch-rho-sandbox.mjs # dev: writes the snapshot; reads RHO_API_TOKEN from env
tests/*.test.mjs              # node --test, zero deps
```

Dependencies run one way: `screens → app(state) → engine → scenario/calendar/money`. Screens never
compute a number; they render `Derived` records. `engine.js` imports nothing from `app.js` or
`screens/`, so it is testable alone.

## 5. Data model

The `Scenario` is the only mutable state. Nothing derived is stored.

```jsonc
{
  "id": "seed-saas",
  "label": "Synthetic data",
  "asOf": "2026-11-11",
  "cash": 210000000,                                  // cents, balance at start of asOf
  "plan": {
    "raisedOn": "2026-07-01",
    "amount": 270000000,
    "plannedGrossSpend": 55000000,                    // $550K/mo
    "plannedRevenue":    40000000                     // $400K/mo -> planned net burn $150K
  },
  "cushionMonths": 6,
  "revenue": {
    "current": 39100000,                              // $391K/mo, $9K behind plan
    "trailing": [
      { "month": "2026-07", "expected": 40000000, "actual": 40000000 },
      { "month": "2026-08", "expected": 40000000, "actual": 39200000 },
      { "month": "2026-09", "expected": 40000000, "actual": 38000000 },
      { "month": "2026-10", "expected": 40000000, "actual": 36000000 }
    ]
  },
  "payroll": [
    { "id": "hire-1", "label": "Eng hire 1", "monthlyCost": 900000, "startsOn": "2026-10-01", "confirmed": false },
    { "id": "hire-2", "label": "Eng hire 2", "monthlyCost": 900000, "startsOn": "2026-10-01", "confirmed": false },
    { "id": "hire-3", "label": "Eng hire 3", "monthlyCost": 900000, "startsOn": "2026-10-01", "confirmed": false }
  ],
  "contracts": [
    { "id": "hubspot", "vendor": "HubSpot", "amount": 6000000,
      "renewsOn": "2026-12-20", "noticeDays": 30, "term": "annual",
      "monthlyEquivalent": 500000,
      "source": "Order form p.2: \"renews automatically unless notice is given 30 days prior\"" }
  ],
  "invoices": [
    { "id": "acme", "customer": "Acme Corp",  "amount": 1200000, "dueOn": "2026-10-21" },
    { "id": "brightline", "customer": "Brightline", "amount": 600000, "dueOn": "2026-10-28" }
  ],
  "suppression": { "count": 41, "since": "2026-10-01", "rule": "date moved 7+ days" },
  "alerts": [                                          // engine MUST NOT read this array
    { "id": "dup-1", "kind": "possible-duplicate", "vendor": "Northstar Office Supply",
      "amount": 84000, "dates": ["2026-10-22", "2026-10-28"], "status": "open" }
  ]
}
```

Rules:

- **Money is integer cents** in the fixture and in `state`. The engine computes in float cents. The
  formatter rounds once, at render.
- **Nothing derived is stored.** No `grossSpend` field, no cached dates, no cached ranges. A test
  asserts the fixture has no `grossSpend` key.
- **`alerts` is a separate top-level key**, so the projection cannot depend on it structurally
  rather than by convention. `project()` reads an allowlisted key set and a test pins the allowlist.
- **`renewsOn: 2026-12-20`** gives a notice deadline of `2026-11-20` — **exactly 9 days after `asOf`**.
  With the previous `2026-12-01` the deadline was Nov 1, i.e. already passed, which made "9 days
  left" meaningless and the Cancel option legally impossible. Section 13 carries the deck fix.
- **`confirmed: false` on all three hires.** The fixture does not pre-confirm; §6.4 defines the
  confirmation mechanic and `state.confirmations` is the only thing that writes it.

## 6. Engine rules

### 6.1 Clock and money rules (pinned)

These four rules are the reason two implementations agree to the day:

1. `scenario.cash` is the balance at **00:00 on `asOf`**. The `asOf` day itself does not burn.
   Accrual starts the following day.
2. Cash accrues **daily** at `netBurn(month) / daysInMonth(month)`. Month = calendar month.
3. Monthly events (gross spend, revenue, payroll) land on the **1st**. A payroll entry starting
   mid-month is prorated by days employed in that month: `cost × (dim − startDay + 1) / dim`.
4. One-offs (the renewal) land on their **own date**, not the 1st.

`raiseBy` is a **daily scan** from `asOf`, not an interpolation between monthly buckets:

```
raiseBy(s, c) = first day d where cashAt(s, d) <= bufferAt(s, d, c)
```

Months displayed = `days / MONTH_DAYS`, where `MONTH_DAYS = 365.25 / 12 = 30.4375`, fixed and
exported from `calendar.js`. Never `30`, never per-month. Changing this constant changes every
displayed month figure, so it lives in one place and is asserted in a test.

### 6.2 Burn and the buffer

**Gross spend is derived, never stored.**
`grossSpend(month) = plan.plannedGrossSpend + payrollActive(month) + anyMonthlyContract(month)`.
There is **no `grossSpend` field** in the fixture: the plan figure is the base, and hires arrive only
through `payroll[]`. Two fields holding the same number is how a $27K double count happens, and this
spec's own rule is that nothing derived is stored.

**Burn is net of revenue.** `netBurn(month) = grossSpend(month) − revenue(month)`. There is no inflow
term anywhere. Identity the tests pin:
`150,000 planned + 27,000 hires + 9,000 revenue gap = 186,000`. Revenue is counted exactly once, as a
subtraction; payroll is counted exactly once, inside `grossSpend`.

**The buffer is the projected burn over the next `cushionMonths` months**, not a single month's burn
times a number:

```
bufferAt(s, d, c) = Σ over the c calendar months starting with d's month of netBurn(month)
```

For constant burn this is exactly `c × netBurn`, so every historical number holds; for varying burn —
a March hire, monthly HubSpot billing, a price change — it stays well-defined, which a single
`c × netBurn(branch)` does not. This is the "6 months of cash left" criterion, evaluated properly.

### 6.3 Why the buffer must be branch-local

A fixed `6 × current burn = $1,116,000` target applied to every attribution branch yields a
1.58-month total gap (signed 1.28 / uncertain 0.30): it under-explains the move by ~1.4 months,
because the buffer rising from $900K to $1,116K is itself a consequence of the hires. Recorded here
so nobody "simplifies" it back.

### 6.4 Attribution (the "signed vs not certain yet" bar)

Two factors: `signed` and `notCertain`. Attribution is **forward-looking from `asOf`**; payroll
already paid is not refunded, which keeps reported cash at the numbers sheet's `$2.1M`. That rule is
printed in the receipt.

**Confirmation moves hires between the two factors without changing the date.** Unconfirmed hires
are forecast (best estimate) but labeled *not certain yet*; clicking "Yes, 3 hires" moves them into
*signed* and the bar re-derives. This is the best moment in the demo.

Before the click — `signed = {renewal}`, `notCertain = {hires, revenue gap}`:

| Variant | netBurn (Nov) | buffer | cash at asOf | Date |
|---|---|---|---|---|
| current | 186,000 | 1,116,000 | 2,100,000 | **Apr 11, 2027** |
| `signed` removed (renewal) | 186,000 | 1,116,000 | 2,100,000 | Apr 20, 2027 |
| `notCertain` removed (hires + gap) | 150,000 | 900,000 | 2,100,000 | Jun 29, 2027 |
| all removed | 150,000 | 900,000 | 2,100,000 | **Jul 12, 2027** |

Shapley over the two removal orders: **signed 11 d = 0.36 mo, notCertain 81 d = 2.66 mo, total 92 d
= 3.02 mo**. Displayed (largest remainder, §6.6): **0.4 / 2.6 / 3.0**.

After the click — `signed = {hires, renewal}`, `notCertain = {revenue gap}`:

| Variant | netBurn (Nov) | buffer | cash at asOf | Date |
|---|---|---|---|---|
| current | 186,000 | 1,116,000 | 2,100,000 | **Apr 11, 2027** |
| `signed` removed (hires + renewal) | 159,000 | 954,000 | 2,100,000 | Jun 18, 2027 |
| `notCertain` removed (gap) | 177,000 | 1,062,000 | 2,100,000 | Apr 27, 2027 |
| all removed | 150,000 | 900,000 | 2,100,000 | **Jul 12, 2027** |

Shapley: **signed 72 d = 2.37 mo, notCertain 20 d = 0.66 mo, total 92 d = 3.02 mo**. Displayed:
**2.4 / 0.6 / 3.0**.

Note `159,000 = 150,000 + 9,000`: removing the hires leaves the revenue gap in place. Removing the
signed group also frees the $60K renewal. Cash is `$2.1M` at `asOf` in every branch — the renewal is
a future one-off, and sunk payroll is not refunded (§6.4). The dates differ only because burn and
buffer differ, which is the point: the run rate, not the past, moved the date.

The anchor is the *plan-consistent* date today (`Jul 12`), not the date promised in July (`Jul 1`).
The 11-day gap is the numbers sheet's own rounding of cash to `$2.1M`, and is invisible in a UI that
shows months.

### 6.5 Range

Revenue is projected at three levels, each rerun through the same engine:

```
base = revenue.current
low  = plannedRevenue × (mean(ratios) − s)
high = plannedRevenue × (mean(ratios) + s)
s    = SAMPLE standard deviation (n − 1) of the trailing ratios, clamped to [0.85, 1.05]
range = [raiseBy(low), raiseBy(high)]
```

**Sample deviation, not population** — we are estimating dispersion of an underlying process from
four observations. Ratios `[1.00, 0.98, 0.95, 0.90]`, mean `0.9575`, `s = 0.0435` →
revenue `$365,603`–`$400,397` → **Mar 1 – Apr 28, 2027**. (Population `σ = 0.0377` would give
Mar 4 – Apr 24; the choice is a documented one, not an accident.)

**`Apr 11` is the base case, not the midpoint.** The midpoint of Mar 1 – Apr 28 is about Mar 30, and
calling Apr 11 a midpoint would be wrong. The range is asymmetric because base revenue ($391K) sits
near the **top** of the band (band center $383K): base burn is $7K from the high-revenue case and
$23K from the low one. A lower revenue case is doubly punished, since it raises both the burn and
the buffer.

The trailing set deliberately includes a weak October ($360K actual vs $400K expected) while the
current run rate is $391K. The band asks "how wrong have we been recently", not "how wrong are we
this month". The receipt states the sample size: *"based on your last 4 months; a small sample."*

### 6.6 Display rounding

Segment months are display-rounded with **largest remainder** so the parts sum to the displayed
total. Naive rounding gives `2.4 + 0.7 = 3.1` next to a total of `3.0`, which looks like a bug.

```
totalTenths = round(totalMonths × 10)
each part floors; distribute the remaining tenths to the largest fractional remainders
(tie-break: larger part first)
```

Post-confirmation: 23.66 and 6.57 → `2.4 / 0.6`. Pre-confirmation: 3.6 and 26.6 → `0.4 / 2.6`.
Both sum to `3.0`. A test asserts `sum(parts) === total` for both states and for ±1 day perturbations.

### 6.7 Option pricing

Options are priced **against the current scenario with no HubSpot choice applied**, and each rerun
starts from that same baseline, so no compounding. The invoice lever is a separate thing (§6.8).

| Option | Effect | Date | Delta |
|---|---|---|---|
| Approve as is | — | Apr 11 | 0 |
| Ask for monthly | $60K freed, but $5K/mo from Dec 20 | Apr 12 | **+1 d** |
| Cancel | $60K never leaves | Apr 20 | **+9 d** |
| Collect overdue (one-off) | $18K lands | Apr 13 | **+2 d** |

**Ask-for-monthly is nearly neutral: one day.** With a buffer of `c × burn`, the date is
approximately `cash / burn − c`. Monthly conversion keeps $60K in cash and raises burn by $5K/mo,
which raises the buffer by $30K, so over a horizon equal to the cushion, prepaying and paying
monthly very nearly cancel. The monthly charge starts on **Dec 20**, when the in-force annual term
ends — not on `asOf`, which would be charging for a period the annual already covers. Starting it at
`asOf` is what makes the answer 0; starting it at renewal is what makes it +1 day, and +1 is the
model that matches how the contract works. (An earlier draft of this spec claimed 0 days from a
reference model that started the charge at `asOf`; that was a shortcut, corrected here.)

Keep it in the demo rather than hiding it: **cancelling is the real lever (+9 days), monthly is
zero**, which is exactly what a founder needs told. The screen's caption already sets this up
("monthly plans can cost more, so the net shows once they quote").

**If the notice deadline has passed** (`renewsOn − noticeDays ≤ asOf`), Cancel is not offered and the
screen says *"notice window closed, renews automatically."* The fixture sits 9 days before its
deadline; a test asserts that this holds.

### 6.8 Invoices and collect

Drafting reminders **does not collect money**. `#/invoices` has two distinct facts:

- The primary action **drafts** two reminders. No cash effect, no date change.
- The button subtitle states the upside as a projection: *"if both pay, about +2 days"* — computed by
  rerunning with `cash + $18K`, but only applied when the user marks them **collected**.

Drafting and collecting are separate state, and only `collected` feeds the projection.

## 7. Provenance

Every rendered number is a `Derived`:

```js
{ value: 72, unit: 'days',
  inputs: [{ label: 'cash', valueCents, source: 'scenario' }, ...],
  formula: 'Shapley over [signed, notCertain]; buffer = 6 × netBurn(branch)' }
```

- `fmt(d)` throws under `--test` when `inputs` is empty; in production it renders `—` and
  `console.warn`s, so a missed number can never crash the demo in front of judges.
- Constants shown in on-screen text are inputs too. "6-month cushion" renders from
  `scenario.cushionMonths`.
- **Three numbers previously violated this rule and are now derived:**
  - *"Didn't bother you: 41"* → `scenario.suppression.count`, not a literal.
  - *"Fetched Nov 12, 2026"* → `snapshot.fetchedAt`.
  - *"9 days left"* → `(renewsOn − noticeDays) − asOf`, in days. Computing it is what catches a
    closed notice window.

## 8. Surfaces and state

Nine hash routes, all deep-linkable. `#/` is the QR target.

| # | Route | Purpose | Writes |
|---|---|---|---|
| 1 | `#/` | Home card: "Your raise-by date moved this week." Guess chips, `Reveal`, `Just show me` | guess |
| 2 | `#/reveal` | Date headline + range, math line, confirm-hires card, bar, source rows, what-if box | `confirmations.payroll`, applied intents |
| 3 | `#/bill/hubspot` | Renewal, 3 priced options, order-form quote, "9 days left" | `choice.hubspot` |
| 4 | `#/invoices` | Acme $12K/21d, Brightline $6K/14d; draft reminders; mark collected | `collections` |
| 5 | `#/alerts/duplicate` | "Not sure, take a look": possible duplicate charge | `alerts.duplicate` |
| 6 | `#/trust` | Knowing / not guessing / in control; "didn't bother you: 41" | — |
| 7 | `#/claude` | Read-only Q&A, 3 chips, source chips | — |
| 8 | `#/setup` | Onboarding: 6 fields + optional CSV paste → own date | new scenario |
| 9 | `#/connect` | Rho sandbox derivation + gap list, `fetchedAt`, exact request | — |

```js
state = {
  source: 'fixture' | 'local',
  scenario,
  confirmations: { payroll: null },    // 'yes' | 'one-time' | 'other'  ← only writer of payroll[].confirmed
  choice:        { hubspot: null },    // 'approve' | 'monthly' | 'cancel'
  collections:   { drafted: false, collected: [false, false] },
  alerts:        { duplicate: null },  // 'disputed' | 'dismissed'
  guesses:       { made: false, value: null },
}
```

**A chosen option does change the headline date.** Selecting "cancel" on `#/bill/hubspot` commits the
change; `#/reveal` then shows Apr 20 and the receipt reads *"Includes: HubSpot — cancel requested."*
Selecting a different option **replaces** the choice rather than stacking, and `Revert` clears it. So
after the renewal is handled the bar no longer reads 2.4/0.6 — the signed segment shrinks — which is
correct and is worth saying out loud if a judge notices.

**Confirmation changes provenance, not the date** (§6.4).

**Three flows, one engine.** (1) Presenter: `→` walks Home → guess → Reveal → confirm → bar → Bill →
monthly → Invoices → draft → Duplicate → Trust → Claude; `←` back; Esc to `#/`. (2) Self-serve:
sidebar always visible, "Just show me" skips the guess, `#/setup` for own numbers. (3) Q&A: any route
cold, because every screen re-derives from `scenario`.

Outside the app chrome, a thin footer: `Synthetic data · Start over · Reveal`.

**Rehearsal state must not leak into the pitch.** `?present` clears `localStorage`, resets to the
fixture, and disables persistence for that session. The pre-show checklist runs
`…vercel.app/?present`.

## 9. What-if grammar

Deterministic, no model. Five intents, each echoed before it applies, each undoable.

| Input | Mutation |
|---|---|
| `hire 2 more in March`, `hire 2 engineers in Mar` | payroll entries from Mar 1, **at the last hire's `monthlyCost` ($9K)**, stated in the echo |
| `the raise takes 3 months longer` | `cushionMonths += 3` (**earlier** date — a longer raise needs more cushion) |
| `cushion 9 months` | sets `cushionMonths` absolutely |
| `raise prices 10%` | multiplies revenue **from the first day of next month**, applied to base **and** both band edges |
| `cancel hubspot` | one-off removal, only if the notice window is open |
| `switch hubspot to monthly` | renewal → $5K/mo |

- `delay the raise by 3 months` is **rejected** as ambiguous: it reads as "start later", which moves
  the date later, the opposite of what a longer raise means. The echo for the accepted form is
  *"I read that as: your raise takes 3 months longer, so you need 9 months of cushion. That moves
  your date earlier."*
- Echo line before applying: *"I read that as: 2 more hires starting March, +$18K/mo."*
- Unrecognized input refuses, and the refusal is content: *"I can model hires, contract changes,
  price changes, and the cushion. I can't model that yet."*
- The grammar and the presentation controls share one mutation path, so `switch hubspot to monthly`
  and clicking the button yield an identical date (test 12).

## 10. Onboarding (`#/setup`)

Six required fields: cash today, monthly revenue, monthly gross spend, cushion months, the largest
contract (amount + renewal date + notice days), and optional CSV paste of transactions (used only to
prefill gross spend and revenue; no PDF parsing).

- Builds a `Scenario` with `source: 'local'`, persists to `localStorage`, runs the same engine.
- Validation: `cash ≤ 0`, `spend ≤ 0`, or `netBurn ≤ 0` → no date; instead
  *"At this rate cash never runs out. Pilot needs a positive burn."*
- If the contract's notice deadline is already past, the reveal says so and does not offer cancel.
- Missing optional contract → the bar shows only what it knows, and `#/trust` lists it under "what we
  can't see". Honest degradation is the feature.
- Mobile: single column, 16px inputs, no horizontal scroll at 375px.

## 11. Rho API: inputs, not answers

Rho's API **has no runway or forecast endpoint** — Rho's own API page lists burn and runway
dashboards as something customers build. Runway is what our engine computes, so the API question is
which *inputs* come from Rho. Verified against the live sandbox on Nov 11, 2026:

| Engine input | Endpoint | Sandbox evidence |
|---|---|---|
| Cash today | `GET /accounts` | 14 accounts, $258,618 checking |
| Trailing net burn | `GET /insights/cashflow?group=month`, `GET /transactions` | in/out/net buckets, 72 transactions |
| Committed outflows ("signed") | `GET /scheduled-transactions` | 5 scheduled, $18,950.50 (renders $18,951 via `usd`), `next_release_date`, `frequency` |
| Bills due, counterparties | `GET /ap/bills`, `GET /ap/counterparties` | amount, due_date, counterparty |
| **Renewal / notice terms** | **not exposed** | — needs contract reading, a Rho extension |
| Cushion | not a Rho concept | user setting |

Sandbox mechanics: `https://rhoapi-sandbox.rho.co/api/v1`, any non-empty bearer token, deterministic
fictional data, amounts in **integer minor units**, **no CORS headers** (so a browser cannot call
it), rate limits ~60/min per token and ~600/min per source IP.

`scripts/fetch-rho-sandbox.mjs` runs **before** the pitch, reads `RHO_API_TOKEN` from the
environment, and writes `public/data/rho-sandbox.snapshot.json` with `fetchedAt`, the exact request,
HTTP status, and the payload for `/accounts` and `/scheduled-transactions`. No token in the JSON, no
network at runtime.

`#/connect` **derives, it does not display a date.** It runs the same engine functions over the
snapshot — `cashFromAccounts()`, `netBurnFromCashflow()`, `committedFromScheduled()` — and prints
*"14 accounts · $258,618 cash · $18,951 committed"*, then the gap list:
*"could not derive: cushion, contract terms. That's the part Pilot adds."* It is labeled
**"Sandbox data · fetched <fetchedAt>."**

It must never print a raise-by date for the sandbox company: 72 transactions across three years and
5 scheduled payments support no coherent date, and printing one converts an honest prop into a lie.

## 12. Tests (`node --test tests/`)

Every test is expressed against the pinned rules of §6.1, so a rule change breaks a test rather than
silently moving a number.

1. `raiseBy(fixture) === 2027-04-11` exactly (daily scan, no tolerance needed).
2. Range `2027-03-01 .. 2027-04-28` with `s = stdev(ratios)` (sample).
3. Post-confirmation attribution: total `3.02` mo, `signed 2.37`, `notCertain 0.66`, each ±0.01, and
   `signed + notCertain === total` to the day.
4. Pre-confirmation attribution: `0.36 / 2.66 / 3.02`, same exactness.
5. Shapley order-independence: swapping factor order gives identical segments.
6. Confirming hires leaves `raiseBy` unchanged (`Apr 11` before and after) and moves the segment
   totals as specified.
7. Option deltas in **fractional days**, tolerance ±0.5, plus the ordering assertion
   `cancel (+9) > collect (+2) > monthly (0) >= approve (0)`. A ±5-day tolerance cannot distinguish
   these and would pass a broken engine.
8. Collecting is a one-off: `cash + 18,000` moves the date +2 days and leaves `netBurn` unchanged.
   Drafting alone moves nothing.
9. `netBurn(baseline) === 186000`; `150000 + 27000 + 9000 === 186000`; `netBurn === grossSpend − revenue`;
   and the fixture has **no `grossSpend` key** (`assert.ok(!('grossSpend' in fixture))`), so the value
   can only ever be derived.
10. Proration: a hire starting **Jun 16** costs `15/30` of June (a 30-day month, so the expected
    value is exact). A Mar 15 start is 17/31 and is *not* used as a test fixture for that reason.
11. Notice window: `(renewsOn − noticeDays) − asOf === 9` days for the fixture, and a fixture with a
    closed window offers no Cancel option.
12. Grammar/control equivalence: `switch hubspot to monthly` === clicking "Ask for monthly".
13. Largest remainder: `sum(displayed parts) === displayed total` for both confirmation states and
    for ±1-day perturbations of the segments.
14. `cushionMonths` 6 → 9 moves the date ~90 days earlier.
15. Provenance: every `Derived` has non-empty `inputs`; an intentionally input-less number throws.
16. `project()` reads only allowlisted scenario keys (so `alerts` cannot leak in).
17. `#/setup` with `netBurn ≤ 0` shows the no-date message and never `NaN`.
18. `MONTH_DAYS === 365.25/12`, and the displayed-month conversion is used from one place only.
19. Service worker precache list covers every file the app fetches (walk `public/`, compare).

## 13. Copy changes owed to the deck

These are the only intended divergences. Everything else in `BUILD_PROMPT.md` is used verbatim.
**Rows 1–2 are fixture bugs and should be applied before the deck freezes tonight.**

| Where | From | To |
|---|---|---|
| Numbers sheet | `HubSpot annual renewal $60K, auto-renews Dec 1, cancel window closes Nov 20` | `auto-renews Dec 20, cancel window closes Nov 20` — **Dec 1 with 30 days' notice puts the deadline on Nov 1, before `asOf`, so "9 days left" and Cancel were both impossible** |
| Screen 3 | `Item 2. Auto-renews Dec 1` | `Auto-renews Dec 20` |
| Numbers sheet | `now April 14, 2027 (range March to May)` | `now Apr 11, 2027 (base case; range Mar 1 – Apr 28)` |
| Screen 2 headline | `Start raising by Apr 14, 2027. Estimated range Mar to May.` | `Start raising by mid-April 2027. Estimated range early March to late April.` |
| Screen 2 receipt | `Start raising by Apr 14, 2027` | `Start raising by mid-April 2027 (base case Apr 11)` — **base case, not midpoint** |
| Screen 2 bar labels | `Signed 2.3 mo / Not certain yet 0.7 mo` | `Signed 2.4 mo / Not certain yet 0.6 mo` (engine: 2.37 / 0.66; largest-remainder so it sums to 3.0) |
| Screen 3 options | `Ask for monthly (about +5 days, Apr 19)` | `Ask for monthly — frees $55K now, about a day (Apr 12)` |
| Screen 3 options | `Cancel (+10 days, Apr 24)` | `Cancel — about 9 days later (Apr 20)` |
| Screen 4 button | `Draft 2 reminders, about +3 days` | `Draft 2 reminders (if both pay, about +2 days)` — drafting ≠ collecting |

If the deck prefers `2.3 / 0.7`, the engine's `2.37 / 0.66` has to move, which means changing the
fixture, not the label. Read the number off the app.

## 14. Build order

1. `calendar.js`, `money.js`, `derived.js` + tests 13, 15, 18.
2. `engine.js` + tests 1–11, 14, 16. **Stop and report the numbers** before any UI exists.
3. `scenario.js`, `app.js` router, shell chrome (sidebar, footer), `?present`.
4. `#/` and `#/reveal` (style check), then `#/bill/hubspot`.
5. `#/invoices`, `#/alerts/duplicate`, `#/trust`, `#/claude`.
6. `intents.js`, the what-if box, tests 12 and 17.
7. `#/setup` + mobile pass.
8. `scripts/fetch-rho-sandbox.mjs`, snapshot, `#/connect` derivation.
9. `sw.js` + test 19, deploy to Vercel, generate QR, scan it on a phone.
10. Airplane-mode test — load, go offline, refresh. Record the 1:15 take and a full walkthrough.

Steps 1–2 are the only ones that can invalidate the deck, so they come first and are reported before
anything visual is built.

## 15. Risks

| Risk | Mitigation |
|---|---|
| Venue wifi dies | Service worker caches the app so a refresh works offline; `python3 -m http.server --directory public` is the local fallback; mp4 recording is the last resort. A hosted URL alone is *not* offline-safe, and this table should not claim otherwise. |
| Rehearsal state leaks into the pitch | `?present` clears storage; pre-show checklist includes it. |
| Presenter fumbles | Arrow keys only; Esc returns to `#/`. |
| A judge clicks to a dead state | Every route re-derives from `scenario`; `Start over` in the footer. |
| A number renders as `NaN` or blank | Provenance throws in test, `—` + warn in prod; tests 15, 17. |
| Deck and demo disagree | Section 13 is the closed list. |
| Rounding makes the bar look broken | Largest-remainder rounding, test 13. |
| Attribution gets "simplified" to a fixed buffer | §6.3 records the numbers showing it breaks. |
| Scope creep into real ingestion | Non-goals: no credentials, no PDF parsing, no auth. |

## 16. Open items (owner: Tyler)

- Vercel account and repo visibility (public vs private) — needed before step 9.
- Whether the presenter arrow-key script ships always-on or behind `?present`. **Default: always on**,
  because it is harmless and it is how the demo is driven.
- Inter as the licensed-font placeholder; Neue Montreal swap if a license exists by Friday.
