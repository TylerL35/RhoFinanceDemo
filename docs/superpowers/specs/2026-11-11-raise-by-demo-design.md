# Raise-By demo: design spec

NYU PMC x Rho case competition · team: Michael, Neha, Tyler, Regis
Status: approved for implementation · Nov 11, 2026
Deck due Nov 12, 11:59pm ET · pitch Fri Nov 13 (7 min + 3 min Q&A)

This spec covers **the demo only**. The pitch deck is owned separately by a teammate and is
built from `deck_master.md` and `BUILD_PROMPT.md`. Section 13 lists the exact copy strings that
change on the deck as a consequence of this spec.

---

## 1. Goal

Build a working, hosted MVP of Raise-By — the date a founder should start raising, derived from
what is already signed — that (a) carries a 75-second scripted pitch demo and (b) lets an
audience member open the same URL on their own phone and model their own company.

Success on the night:

1. The scripted path runs in 75 seconds with arrow keys only, no mouse.
2. Every number on screen is derived from one data object and is inspectable.
3. A judge can type `hire 2 more in March` and watch the date move.
4. A judge can enter their own six numbers and get their own date.
5. Nothing on stage requires the network.

## 2. Non-goals

- No real Rho account, no Rho credentials, no production API. Interaction with Rho's API is a
  pre-fetched snapshot, labeled as such (section 11).
- No LLM anywhere in the product path. The what-if grammar is deterministic (section 9).
- No auth, no database, no server. Persistence is `localStorage` only.
- No PDF/contract parsing. Renewal terms in the fixture are authored, with a `source` string.
- Not a Rho rebrand. The UI imitates Rho's product chrome for authenticity; it never claims to be
  Rho's app, and every screen carries a "Synthetic data" marker.

## 3. Hard constraints

| Constraint | Reason |
|---|---|
| **No network at runtime.** Airplane mode must not change a single pixel. | Venue wifi; the Rho sandbox sends no CORS headers, so the browser cannot call it anyway. |
| **Static deploy** (`public/` → Vercel). No serverless function, no env vars at runtime. | Removes the one runtime dependency. GitHub Pages would also work. |
| **Zero dependencies.** No framework, no build step, no `node_modules`. | Nothing to install, nothing to fail. Same reason. |
| **Self-hosted fonts.** Inter regular + a mono, bundled as woff2. | No CDN. Neue Montreal is commercial; it is a licensed swap later. |
| **Deck copy is frozen.** Screen strings come from `BUILD_PROMPT.md` "Demo screens to build". | Deck ships the same night. Divergences are listed in section 13, not invented silently. |
| **Deterministic.** `asOf` is a scenario field. The engine never reads the wall clock. | Testable, and the demo can't change between rehearsal and pitch. |

## 4. Architecture

```
server.py                     # dev only: static serve (python3 -m http.server is enough)
public/
  index.html                  # one page, hash routes
  styles.css                  # Rho tokens: #151716, #6AF3D9, #EFF3F2, #D7E0DE, 6px radius
  data/
    fixture-seed.json         # the demo company (section 5)
    rho-sandbox.snapshot.json # pre-fetched, no token, has fetchedAt (section 11)
  js/
    calendar.js               # UTC date math: addMonths, daysBetween, monthKey
    money.js                  # integer cents in, formatted string out (the ONLY rounder)
    derived.js                # Derived records + provenance checker
    engine.js                 # project, raiseBy, attribute, priceOption, alertsFor, resolve
    intents.js                # bounded grammar (section 9)
    scenario.js               # schema, validation, defaults, load/save (localStorage)
    screens/*.js              # one renderer per route
    app.js                    # state, router, keyboard, render loop
  assets/fonts/*.woff2, qr-demo.png, qr-demo.svg
scripts/fetch-rho-sandbox.mjs # dev: writes the snapshot; reads RHO_API_TOKEN from env
tests/*.test.mjs              # node --test, zero deps
```

One-directional dependency: `screens → app(state) → engine → scenario/calendar/money`.
Screens never compute a number; they render `Derived` records. `engine.js` imports nothing from
`app.js` or `screens/`, so it is testable in isolation.

## 5. Data model

The `Scenario` is the only mutable state. Nothing derived is stored.

```jsonc
{
  "id": "seed-saas",
  "label": "Synthetic data",
  "asOf": "2026-11-11",
  "cash": 210000000,                                  // cents
  "plan": {
    "raisedOn": "2026-07-01",
    "amount": 270000000,
    "plannedGrossSpend": 55000000,                    // $550K/mo
    "plannedRevenue":    40000000                     // $400K/mo  -> planned net burn $150K
  },
  "cushionMonths": 6,
  "grossSpend": { "current": 57700000, "note": "plan + 3 hires" },   // $577K/mo
  "revenue": {
    "current": 39100000,                              // $391K/mo, $9K behind plan
    "trailing": [                                     // actual vs expected ratio
      { "month": "2026-07", "expected": 40000000, "actual": 40000000 },
      { "month": "2026-08", "expected": 40000000, "actual": 39200000 },
      { "month": "2026-09", "expected": 40000000, "actual": 38000000 },
      { "month": "2026-10", "expected": 40000000, "actual": 36000000 }
    ]
  },
  "payroll": [
    { "id": "hire-1", "label": "Eng hire 1", "monthlyCost": 900000,   "startsOn": "2026-10-01", "confirmed": true },
    { "id": "hire-2", "label": "Eng hire 2", "monthlyCost": 900000,   "startsOn": "2026-10-01", "confirmed": true },
    { "id": "hire-3", "label": "Eng hire 3", "monthlyCost": 900000,   "startsOn": "2026-10-01", "confirmed": true }
  ],
  "contracts": [
    { "id": "hubspot", "vendor": "HubSpot", "amount": 6000000, "renewsOn": "2026-12-01",
      "noticeDays": 30, "term": "annual", "monthlyEquivalent": 500000,
      "source": "Order form p.2: \"renews automatically unless notice is given 30 days prior\"" }
  ],
  "invoices": [
    { "id": "acme", "customer": "Acme Corp",  "amount": 1200000, "dueOn": "2026-10-21" },
    { "id": "brightline", "customer": "Brightline", "amount": 600000, "dueOn": "2026-10-28" }
  ],
  "alerts": [                                          // engine MUST NOT read this array
    { "id": "dup-1", "kind": "possible-duplicate", "vendor": "Northstar Office Supply",
      "amount": 84000, "dates": ["2026-10-22", "2026-10-28"], "status": "open" }
  ]
}
```

Rules:

- **Money is integer cents** in the fixture and in `state`. The engine computes in float cents.
  The formatter rounds once, at render.
- **`alerts` is a separate top-level key** so the projection cannot depend on it structurally, not
  by convention. `project()` reads an allowlisted key set and a test asserts the allowlist.
- **Any inferred item carries `confirmed`.** Unconfirmed payroll is still counted in the date (we
  forecast on best estimates) but is labeled "not certain yet" in the attribution bar.
- `payroll.startsOn` mid-month is prorated by days employed in the start month.

## 6. Engine rules

**Burn is net of revenue.** `netBurn = grossSpend − revenueForPeriod`. There is no inflow term
anywhere. Identity the tests pin: `150,000 planned + 27,000 hires + 9,000 revenue gap = 186,000`.
Revenue is counted exactly once, as a subtraction.

**Net burn for a branch** is `plannedGrossSpend + Σ(active payroll for that month) − revenue(month)`.
One-offs (the HubSpot renewal) are **not burn**; they are separate cash events in that month.

**Raise-by date.** For a given branch,

```
target(branch) = cushionMonths × netBurn(branch)
date(branch)   = first day where projected cash == target, linearly interpolated within the
                 bucket that crosses the line, using that calendar month's real day count
```

Buckets start on the 1st of each month. Interpolating with real month lengths (not a 30.4-day
average) matters: with an average, dates that land exactly on a half-day flip by one day depending
on floating-point rounding, which is how the same fixture produced both Jul 12 and Jul 13. All
dates in this spec are therefore **indicative to ±1 day**; the tests assert to a 5-day tolerance
and the UI only ever shows a month or a rounded "about a week".

The target is a *branch-local* quantity: it moves when burn moves, because a higher burn requires
a bigger safety buffer. This is what makes the cushion change attributable to the factors that
caused it, and it is the difference between a 3.0-month gap and a 1.6-month gap (see 6.2).

**Range.** Revenue is projected at three levels, each rerun through the same engine:

```
base = revenue.current
low  = plannedRevenue × (mean(trailing ratios) − 1σ)
high = plannedRevenue × (mean(trailing ratios) + 1σ)
ratios floored to [0.85, 1.05]
range = [date(low), date(high)]
```

With the fixture: ratios `[1.00, 0.98, 0.95, 0.90]`, mean `0.9575`, σ `0.0377` →
revenue `$367,933`–`$398,067` → **Mar 5, 2027 – Apr 24, 2027**.

The trailing set deliberately includes a weak October ($360K actual vs $400K expected) while the
current run rate is $391K (the "$9K behind plan" in the deck). The band asks "how wrong have we been
recently", not "how wrong are we this month", so it keeps both bad months. That is why the low end
reaches early March despite a healthy November. The range is asymmetric around the
base date (`Apr 11`) because a lower revenue raises *both* the burn and the target. The receipt
prints the rule and the sample size ("based on your last 4 months; a small sample").

`min/max` of the trailing ratios was the alternative: it produces `Feb 23 – Apr 28`, driven
entirely by one bad October. **Decision: mean ± 1σ**, less outlier-sensitive with four samples.

### 6.1 Attribution (the "signed vs not certain yet" bar)

Two factors: `signed` (3 hires + HubSpot renewal) and `notCertain` (the $9K/mo revenue shortfall).
Attribution is **forward-looking from `asOf`**; payroll already paid is not refunded, which keeps
the reported cash at the numbers sheet's `$2.1M`. This rule is printed in the receipt.

Four reruns, each with its own branch-local target. Reading down: what is removed from the
current state, and where the date lands.

| Variant | Net burn | Cash | Target | Date |
|---|---|---|---|---|
| nothing removed (current state) | 186,000 | 2,040,000 | 1,116,000 | **Apr 11, 2027** |
| `signed` removed (hires + renewal) | 159,000 | 2,100,000 | 954,000 | Jun 18, 2027 |
| `notCertain` removed (revenue shortfall) | 177,000 | 2,040,000 | 1,062,000 | Apr 28, 2027 |
| both removed (plan-consistent) | 150,000 | 2,100,000 | 900,000 | **Jul 12, 2027** |

Note `159,000 = 150,000 + 9,000`: removing the hires leaves the revenue gap in place. Removing the
signed group also frees the $60K renewal from cash, though payroll already paid is not refunded.

Shapley over the two removal orders (each factor's marginal contribution averaged across orders):

```
signed     = −71.5 days  = −2.35 months
notCertain = −20.5 days  = −0.67 months
total      = −92.0 days  = −3.02 months      signed + notCertain === total, exactly
```

Rendered as **Signed 2.3 mo / Not certain yet 0.7 mo**, matching the deck. Because the segments
are Shapley values they are order-independent and sum exactly; a test pins both.

Note the anchor is the *plan-consistent* date today (`Jul 12`), not the date promised in July
(`Jul 1`). The 11-day gap is the deck's own rounding of cash to `$2.1M` and is invisible in the UI,
which shows months.

### 6.2 Why not a fixed dollar target

A fixed `6 × current burn = $1,116,000` target applied to every branch yields a 1.58-month total
gap (signed 1.28 / uncertain 0.30) — it under-explains the move by about 1.4 months, because the
cushion rising from `$900K` to `$1,116K` is itself a consequence of the hires. Recorded here so
nobody "simplifies" it back.

### 6.3 Option pricing

Every option reruns the projection from baseline and reports the delta against `Apr 11`:

| Option | Effect | Date | Delta |
|---|---|---|---|
| Approve as is | — | Apr 11 | 0 |
| Ask for monthly | $60K freed, net burn +$5K/mo | Apr 12 | **~+1 d** |
| Cancel | $60K never leaves | Apr 21 | ~+10 d |
| Collect overdue | $18K lands | Apr 14 | ~+3 d |

**Ask-for-monthly is nearly neutral, and that is not a bug.** Converting a $60K annual to $5K/mo
keeps $55K in the bank but raises net burn by $5K/mo, which raises the target by 6 × $5K = $30K.
Over a horizon roughly equal to the cushion, prepaying versus paying monthly is a wash. The deck's
`+5 days` assumed a cushion that does not move with burn; under branch-local targets it comes out
at about a day. Section 13 carries the copy change.

This is worth keeping in the demo rather than hiding: cancelling is the real lever (+10 days) and
monthly is a rounding error, which is exactly what a founder needs to be told. The screen's own
caption already sets this up ("monthly plans can cost more, so the net shows once they quote").

Options are **mutually exclusive** and each is priced from baseline, never from the previously
selected option, so no compounding.

## 7. Provenance

Every rendered number is a `Derived`:

```js
{ value: 92, unit: 'days', inputs: [{ label: 'cash', valueCents, source: 'scenario' }, ...],
  formula: 'Shapley over [signed, notCertain]; target = 6 × netBurn(branch)' }
```

- `derived.js` exposes `fmt(d)`. If `inputs` is empty: **throw under `--test`**, render `—` and
  `console.warn` in production, so a missed number can never crash the demo in front of judges.
- Constants shown in on-screen text are inputs too. "6-month cushion" renders from
  `scenario.cushionMonths`; it is never a string literal. A test greps the renderers for numeric
  literals in string templates and fails on a hit.

## 8. Surfaces and state

Nine hash routes, all deep-linkable. `#/` is the QR target.

| # | Route | Purpose | Writes |
|---|---|---|---|
| 1 | `#/` | Home card: "Your raise-by date moved this week." Guess chips May/Jun/Jul/Aug, `Reveal`, `Just show me` | guess |
| 2 | `#/reveal` | Date headline + range, math line, confirm-hires card, attribution bar, source rows, what-if box | payroll confirmation, applied intents |
| 3 | `#/bill/hubspot` | Renewal, 3 priced options, order-form quote, "9 days left" | chosen option |
| 4 | `#/invoices` | Acme $12K/21d, Brightline $6K/14d, draft 2 reminders | collected |
| 5 | `#/alerts/duplicate` | "Not sure, take a look": possible duplicate charge | disputed / dismissed |
| 6 | `#/trust` | Knowing / not guessing / in control; "didn't bother you: 41" | — |
| 7 | `#/claude` | Read-only Q&A, 3 chips, source chips | — |
| 8 | `#/setup` | Onboarding: 6 fields + optional CSV paste → own date | new scenario |
| 9 | `#/connect` | Rho sandbox snapshot, `fetchedAt`, exact request | — |

```js
state = {
  source: 'fixture' | 'local',
  scenario,
  confirmations: { payroll: null },    // 'yes' | 'one-time' | 'other'
  choices:       { hubspot: null },    // 'approve' | 'monthly' | 'cancel'
  collections:   { sent: false },
  alerts:        { duplicate: null },  // 'disputed' | 'dismissed'
  guesses:       { made: false, value: null },
}
```

**Confirmation changes provenance, not the date.** Unconfirmed payroll sits in "not certain yet";
clicking "Yes, 3 hires" moves it to "signed" and the bar re-derives while the date stays put. That
one click is the trust thesis.

**Three flows, one engine.** (1) Presenter: `→` walks Home → guess → Reveal → confirm → bar → Bill
→ monthly → Invoices → draft → Duplicate → Trust → Claude; `←` goes back; Esc returns to `#/`.
(2) Self-serve: sidebar always visible, "Just show me" skips the guess, `#/setup` for own numbers.
(3) Q&A: any route cold, because every screen re-derives from `scenario`.

Outside the app chrome, a thin footer: `Synthetic data · Start over · Reveal`. `Start over` clears
storage and reloads the fixture.

## 9. What-if grammar

Deterministic, no model. Five intents, each echoed before it applies, each undoable.

| Input | Mutation |
|---|---|
| `hire 2 more in March`, `hire 2 engineers in Mar` | payroll entries from Mar 1 |
| `delay the raise by 3 months`, `cushion 9 months` | `cushionMonths` |
| `raise prices 10%` | shifts the revenue band |
| `cancel hubspot` | removes the renewal from the month after the notice window |
| `switch hubspot to monthly` | renewal → $5K/mo |

- Echo line before applying: *"I read that as: 2 more hires starting March, +$18K/mo."*
- Unrecognized input refuses, and the refusal is content: *"I can model hires, contract changes,
  price changes, and the cushion. I can't model that yet."*
- Ambiguous vendor → a disambiguation question, never a guess.
- The grammar and the presentation controls share one mutation path, so typing
  `switch hubspot to monthly` and clicking the button yield an identical date. That equivalence is
  a test.

## 10. Onboarding (`#/setup`)

Six required fields: cash today, monthly revenue, monthly gross spend, cushion months, the largest
contract (amount + renewal date + notice days), and optional CSV paste of transactions (used only
to prefill gross spend and revenue; no parsing of PDFs).

- Builds a `Scenario` with `source: 'local'`, persists to `localStorage`, runs the same engine.
- Validation: cash ≤ 0, spend ≤ 0, or `netBurn ≤ 0` → no date is shown; instead
  *"At this rate cash never runs out. Raise-By needs a positive burn."*
- Missing optional contract → the bar shows only what it knows, and the trust panel lists the
  contract under "what we can't see". Honest degradation is the feature.
- Mobile: single column, 16px inputs, no horizontal scroll at 375px.

## 11. Rho API connection (snapshot, not live)

`scripts/fetch-rho-sandbox.mjs` runs **before** the pitch, reads `RHO_API_TOKEN` from the
environment (any non-empty value works), and writes `public/data/rho-sandbox.snapshot.json`
containing `fetchedAt`, the exact request, HTTP status, and the payload for
`/accounts` and `/scheduled-transactions`.

- The token never appears in the JSON or in the repo.
- The app only ever reads the JSON; no network at runtime.
- `#/connect` renders a summary plus the raw payload, labeled **"Sandbox data · fetched Nov 12, 2026."**
- Endpoints verified reachable and shaped as expected on Nov 11, 2026 (accounts, transactions,
  scheduled-transactions, users, insights/cashflow). Amounts are **integer minor units**.
- The sandbox's fixture company is a generic business with 72 transactions. It is **not** the demo
  company and is never presented as such.

## 12. Tests (`node --test tests/`)

1. `raiseBy(fixture).midpoint === 2027-04-11` (±5 days tolerance), month label `Apr`.
2. Range `2027-03-05 .. 2027-04-24`.
3. `attribute`: total `3.02` mo, `signed 2.35`, `notCertain 0.67`, each ±0.15, **and
   `signed + notCertain === total` to the day**.
4. Shapley order-independence: swapping factor order gives identical segments.
5. `netBurn(baseline) === 186000`; `150000 + 27000 + 9000 === 186000`.
6. Revenue counted once: no inflow term; `netBurn === grossSpend − revenue`.
7. Option deltas: `0 / ~+1 / ~+10 / ~+3` days; cancel recomputed independently equals the cancel
   delta.
8. `cushionMonths` 6 → 9 moves the date ~3 months earlier.
9. Mid-month hire prorates (a Mar 15 start costs half of March).
10. Provenance: every `Derived` has non-empty `inputs`; an intentionally input-less number throws.
11. `project()` reads only allowlisted scenario keys (so `alerts` cannot leak in).
12. Grammar/control equivalence: `switch hubspot to monthly` === clicking "Ask for monthly".
13. `#/setup` with `netBurn ≤ 0` shows the no-date message and never `NaN`.

## 13. Copy changes owed to the deck

These are the only intended divergences. Everything else in `BUILD_PROMPT.md` is used verbatim.

| Where | From | To |
|---|---|---|
| Numbers sheet | `now April 14, 2027 (range March to May)` | `now Apr 11, 2027 (midpoint; range Mar 5 – Apr 24)` |
| Screen 2 headline | `Start raising by Apr 14, 2027. Estimated range Mar to May.` | `Start raising by mid-April 2027. Estimated range early March to late April.` |
| Screen 2 receipt | `Start raising by Apr 14, 2027` | `Start raising by mid-April 2027 (midpoint Apr 11)` |
| Screen 3 options | `Ask for monthly (about +5 days, Apr 19)` | `Ask for monthly — frees $55K now, about a day (Apr 12)` |
| Screen 3 options | `Cancel (+10 days, Apr 24)` | `Cancel — about two weeks later (Apr 21)` |
| Screen 2 bar labels | `Signed 2.3 mo / Not certain yet 0.7 mo` | `Signed about 2.4 mo / Not certain yet about 0.7 mo` — the engine lands 2.35–2.37, so it may render `2.3` or `2.4`; **the app prints exactly what the engine computes, so read the number off the app on the day** |

## 14. Build order

1. `calendar.js`, `money.js`, `derived.js` + their tests (no UI, no fixture tuning).
2. `engine.js` + tests 1–11. **Stop and report the numbers** before any screen exists.
3. `scenario.js`, `app.js` router, shell chrome (sidebar, footer).
4. `#/` and `#/reveal` (style check screens), then `#/bill/hubspot`.
5. `#/invoices`, `#/alerts/duplicate`, `#/trust`, `#/claude`.
6. `intents.js` + the reveal-side what-if box + test 12.
7. `#/setup` + test 13, mobile pass.
8. `scripts/fetch-rho-sandbox.mjs`, snapshot, `#/connect`.
9. Deploy to Vercel, generate QR, test it on a phone.
10. Airplane-mode test. Record the 1:15 take and the full-walkthrough take.

Each step ends with a working app. Steps 1–2 are the only ones that can invalidate the deck, so
they come first and are reported before anything visual is built.

## 15. Risks

| Risk | Mitigation |
|---|---|
| Venue wifi | Static app, no runtime network; mp4 fallback recorded. |
| Presenter fumbles | Arrow keys only; `#/` is the open route so a refresh is free. |
| A judge clicks to a dead state | Every route re-derives from `scenario`; `Start over` in footer. |
| A number renders as `NaN` or blank | Provenance throws in test, `—` + warn in prod; test 13 covers setup. |
| Deck and demo disagree | Section 13 is the closed list; anything new is a conversation, not a silent edit. |
| Four samples is a thin range | Receipt states the sample size; labeled an estimate everywhere. |
| Attribution gets "simplified" to a fixed target | Section 6.2 records the numbers showing it breaks. |
| Scope creep into real ingestion | Non-goals: no Rho credentials, no PDF parsing, no auth. |

## 16. Open items (owner: Tyler)

- Vercel account and repo visibility (public vs private) — needed before step 9.
- Whether to keep the presenter-path keyboard script in the shipped build or gate it behind `?present`.
  **Default: always on**, because it is harmless and it is how the demo is driven.
- Inter as the licensed-font placeholder; Neue Montreal swap if a license exists by Friday.
