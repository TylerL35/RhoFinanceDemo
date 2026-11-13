# Pilot

A working demo of **Pilot**, a proposed Rho feature that answers one question for a
first-time founder: *when should we start raising?*

It is a static site. No build step, no dependencies, no external network calls at runtime, and
it runs offline after the first load. Every dollar amount is either fixture data or arithmetic
on fixture data. There is no model and no backend.

**The pitch in one line:** every finance tool shows founders what they already spent. Pilot
shows the date they can still act on, built from what they have already signed.

- Live: the Vercel project is `adonis`; production today is https://adonis-umber.vercel.app
- Run it: open `public/index.html` through any static server (see [Run](#9-run))
- Present it: open `/?present` and drive it with the arrow keys (see [Presenter mode](#7-presenter-mode))

---

## 1. The idea

Founders learn their runway shrank when the money leaves, which is weeks after they signed the
commitments that shrank it: a hire that starts in January, an annual renewal that auto-renews in
December, a sales plan that is quietly running 2% light.

**Insight: runway is lost when it is signed, not when it is spent.** The platform that pays the
bills sees the signature first. So the warning belongs on the bill, at the moment the founder can
still change it, not on a dashboard afterwards.

Pilot therefore computes one date, the first day the founder should start raising, defined as
the day cash first falls to the cushion they want to keep (6 months by default). Around it:

| Objective | What the demo does |
|---|---|
| **See** | burn, the raise-by date as a range, upcoming obligations (payroll, renewals, cancel windows), and unusual items that move the date 7+ days |
| **Act** | ready-to-approve actions: price a renewal three ways, draft a cancel or switch-to-monthly email, draft invoice reminders, dispute a duplicate. Rho drafts, the founder sends. Nothing moves money |
| **Plan** | what-if controls and typed sentences: hires, start month, cushion, prices, the contract. Every option is priced in days of runway |
| **Not built** | Close (Rho Close already does bookkeeping) and Delegate (this user has no finance person; the read-only accountant share is one button on the Trust screen) |

Quiet by default is part of the pitch, not a styling choice: 41 items have been suppressed since
Oct 1 because they moved the date less than 7 days (`scenario.suppression`), and the Trust screen
shows that number and the rule behind it.

---

## 2. The demo company

Synthetic, deterministic, in `public/data/fixture-seed.json`. As of **Nov 11, 2026**: a seed SaaS
company, team of 4, 4 months into an 18-month plan.

| Fact | Value |
|---|---|
| Raised | $2.7M in July 2026 on a plan of $550K gross spend and $400K revenue, so $150K a month of net burn |
| Cash on hand | $2.1M |
| Gross spend | $577K a month ($550K plan + $27K payroll) |
| Revenue | $391K a month, against a $400K plan |
| Net burn | $186K a month, about $6.1K a day |
| New commitments | 3 engineers, $27K a month, started Oct 1, **not yet confirmed** |
| Renewal | HubSpot annual, $60K, auto-renews Dec 20, 30 days' notice, so the window closes Nov 20 |
| Overdue | Acme $12,000 (21 days), Brightline $6,000 (14 days) |
| Unusual | a $840 charge from Northstar Office Supply on Oct 22 and again Oct 28 |

What the engine makes of it (all recomputed by `engine.js`, never typed into the screens):

| Output | Value |
|---|---|
| Raise-by date | **Apr 11, 2027** |
| Range | Mar 1 to Apr 28, 2027, from the spread of the last 4 months of sales |
| What the plan pointed to | Jul 12, 2027 (the plan-consistent date, not July 1) |
| The move | 3.0 months earlier: 2.4 months signed, 0.6 not certain |
| Before confirmation | the same 3.0 months, split 0.4 signed and 2.6 not certain |
| Cash at the date | $1.11M, against a $1.12M cushion (6 x $186K) |

Three behaviors the demo is built to prove, and the tests pin:

1. **Confirming the hires does not move the date.** It moves the split from 0.4 signed / 2.6 not
   certain to 2.4 / 0.6. Confirmation changes provenance, not the projection.
2. **Choosing Cancel moves the date 9 days later** (Apr 11 → Apr 20), "Ask for monthly" moves it
   1 day (Apr 12), and collecting both overdue invoices moves it 2 days earlier (Apr 13).
3. **A what-if never touches the real company.** The bar, the confirm card, Ask Rho and Trust keep
   describing the signed reality while the headline shows the hypothetical.

---

## 3. The screens

Hash-routed (`#/reveal`), nine routes, one shell: the Rho sidebar with inert items for anything
not in the demo, a mobile top bar under 760px, and a footer that always says "Synthetic data".

| Route | Screen | What it shows | What you can do |
|---|---|---|---|
| `/` | Home | "Your raise-by date moved this week", with an optional guess (May to Aug 2027) | Guess, reveal, or skip |
| `/reveal` | **Pilot** | the date, the range, the timeline strip (plan said Jul 12, base case Apr 11), the math line, the confirm card, the signed / not-certain bar, the source table, the what-if controls | answer the payroll question (yes / one-time / other), open the what-if, change the cushion |
| `/bill/hubspot` | Bill Pay | the renewal with 9 days left on the cancel window, the quoted order-form line, the burn per day, and three options priced in days | pick an option, read the draft email |
| `/invoices` | Invoicing | the $9K sales gap, two overdue invoices, days overdue | draft both reminders, mark one collected |
| `/alerts/duplicate` | Needs a look | the two charges as rows, with "same vendor / same amount / 6 days apart" | dispute or dismiss |
| `/trust` | Trust | how much of the move is signed, 41 suppressed items, what it cannot see, what happens when it is wrong, who sees it | "This is wrong", share read-only |
| `/claude` | Ask Rho | a read-only conversation with Rho, source chips under the answer | three fixed questions |
| `/connect` | Connected data | the real Rho sandbox snapshot: 14 accounts, cash, committed outflows, the exact GETs | read only |
| `/setup` | Use my numbers | a form for a company of your own, with a date check before it leaves the form | build a scenario, then jump to Reveal |

Notes on two of them:

- **`/connect`** exists to draw the boundary honestly. It reads
  `public/data/rho-sandbox.snapshot.json` (pre-fetched from `rhoapi-sandbox.rho.co`), derives cash
  and committed outflows from the payload, and then reports that cushion and contract terms are
  *not* derivable from it. That gap is what Pilot adds. It never calls the network.
- **`/setup`** builds a scenario from the form alone: no fixture history, no plan, no alerts, and
  no trailing revenue, so the date comes back as a single date rather than a range. The example
  values (cash $900K, revenue $60K, spend $90K) put the date about two years out, so a judge can
  press the button and then change one field.

---

## 4. How the date is made

`public/js/engine.js`. Pure functions over a scenario object, no state, no clock (a test asserts
that nothing in `public/js` reads the wall clock).

- **`cashAt(sc, d)`** walks day by day from `asOf`, subtracting that month's net burn prorated by
  days in the month, then adds one-offs before `d`: the renewal if it lands and has not been
  cancelled, and any collected invoice.
- **`bufferAt(sc, d)`** is the cushion in dollars: the next `cushionMonths` months of net burn from
  `d`, using the same monthly figures.
- **`raiseBy(sc)`** is the first day where `cashAt <= bufferAt`, searched over 36 months. That
  single definition is why confirming hires cannot move the date: it changes no input to either
  side of the comparison.
- **`range(sc)`** re-runs `raiseBy` at the low and high ends of a revenue band. The band is the
  mean and standard deviation of `actual / expected` over the trailing months, clamped to 0.85 to
  1.05 of plan. With fewer than two trailing months there is no band and the screen says "a single
  date" instead.
- **`attribute(sc)`** answers "how much of the move is signed". It prices four variants: the real
  company, everything signed removed, everything uncertain removed, and the plan-consistent
  company (all of it). The signed and not-certain days are the average of the two ways of
  measuring each. That is why the split survives confirmation: only which variant the hires sit
  in changes, not the total.
- **`priceOption(sc, kind)`** prices a decision by re-running `raiseBy` with exactly one thing
  changed and returning the date and the delta in days.

**Provenance is enforced, not documented.** Every printed number is a `derived(value, unit, inputs,
formula)` record (`public/js/derived.js`), and `fmt()` refuses to print one with no inputs: in
tests it throws, in the browser it warns and prints an em dash. `displayTenths()` hands out tenths
by largest remainder so the two bar segments always add up to the total that the heading prints,
instead of each rounding on its own.

---

## 5. Trust rules the UI has to keep

These are constraints on the demo, and most have a test behind them in `tests/`:

- **Nothing moves money.** Actions are drafts and records. "Open in email" is `disabled`.
- **Inferred items wait for a yes.** The 3 hires are inferred from Gusto debits and stay
  unconfirmed until the founder says so.
- **A range, never a fake-exact date.** When revenue history exists, the headline is a date and the
  lead is a range. When it does not, the screen says so.
- **Say what it cannot see.** Payroll detail beyond totals, Stripe payouts before they land,
  accounts outside Rho, and (with no contract) the renewal terms themselves.
- **Never print a number the math did not produce.** Missing data removes the claim rather than
  filling it in: no contract means no renewal rows, no invoice caption, no cancel option, and no
  invented burn on `/connect`.
- **A what-if is hypothetical.** `state.intentBase` holds the real company. Screens that describe
  reality read it through `realScenario()`; only the headline, the range and the math read the live
  scenario.

---

## 6. What-if: controls and typing

`public/js/whatif-model.js`. A what-if is four knobs applied to the real company, and the typed box
parses into the same four knobs, so a tap and a sentence land on the same date.

| Knob | Control | Typed example | Limits |
|---|---|---|---|
| `hires` + `hireMonth` | +/- stepper, start month (next 12) | `hire two engineers in April` | 0 to 10 by control, 24 by sentence |
| `cushion` | +/- stepper | `the raise takes 3 months longer`, `cushion 9 months` | 1 to 24 by control, 36 by sentence |
| `price` | 0 / 5 / 10 / 20% segments | `prices up 10%`, `10% price increase` | 1 to 100% by sentence |
| `contract` | Approve / Monthly / Cancel | `drop hubspot`, `switch hubspot to monthly` | Cancel hidden once the notice window closes |

How it stays honest:

- **It never compounds.** `applyKnobs(real, knobs)` clones the real company and applies the whole
  knob set, so "3 hires, then 2 more" is five hires from the base, not two applications of cost on
  top of each other. A typed hire in a new month replaces the earlier what-if hires rather than
  adding to them.
- **Undo is a stack of knob sets**, not a stack of scenarios: each change pushes the knobs from
  before it, so Undo steps back exactly one tap, and "Reset what-ifs" clears to the real company.
- **Typing is forgiving before it is strict.** `tidy()` lowercases, spells out number words, turns
  "10 percent" into "10%", and strips punctuation; `canonical()` picks out the verb, count, month
  and vendor; then the strict grammar in `public/js/intents.js` has the last word. A miss returns a
  refusal plus up to two tappable sentences chosen by the words you used.
- **Every refusal teaches.** "delay the raise" is refused with the sentence that means what you
  meant ("the raise takes 3 months longer"), because a delay moves the date the other way.
- **The echo comes before the date.** The acknowledgement is painted, then the scenario is
  rebuilt, so a presenter sees "I read that as: 2 more hires starting April 2027, +$18K/mo" before
  the headline changes.

---

## 7. Presenter mode

Open `/?present`. It clears the saved scenario before the first render, ignores `localStorage`
from then on, and shows `Step n / 10` in the footer. No mouse needed:

| Key | Does |
|---|---|
| `→` | next step. Steps 3, 5 and 7 are beats on the same screen: confirm the 3 hires, choose Cancel on the renewal, draft the 2 reminders |
| `←` | back one step, undoing a beat the keys performed (never one you clicked) |
| `1` to `4` | on Home, guess May / Jun / Jul / Aug 2027 |
| `Esc` | back to Home |
| `Shift` + `Esc` | start over, clearing every choice and what-if |

Order: Home → Pilot (the dot slides from Jul 12 to Apr 11) → confirm hires (the bar re-splits,
the date does not move) → Bill Pay → Cancel (+9 days, the pill flashes, the draft appears) →
Invoicing → draft reminders → Needs a look → Trust → Ask Rho.

The renewal beat picks Cancel (`PRESENTER_CHOICE` at the top of `public/js/app.js`). Set it to
`'monthly'` to show the near-neutral option instead. After Cancel, Trust and Ask Rho describe the
company with the renewal cancelled (Apr 20, 2.7 months from the plan date), because every screen
re-derives from the same scenario rather than replaying a script.

Keys are ignored while typing in the what-if box or the setup form, so `→` never navigates away
mid-sentence.

---

## 8. Data and offline

- `public/data/fixture-seed.json` is the demo company. Hand-written, no clock, no randomness.
- `public/data/rho-sandbox.snapshot.json` is a real payload from Rho's API sandbox, fetched before
  the demo and committed. `scripts/fetch-rho-sandbox.mjs` rewrites it (`RHO_API_TOKEN=demo node
  scripts/fetch-rho-sandbox.mjs`); the script refuses to write a file that contains the token, and
  a test checks the committed file holds neither a token nor an auth header.
- The app makes two requests at boot, both same-origin. Once it installs, the service worker
  additionally prefetches the shipped files. Nothing calls the network at any other point, on any
  screen.
- `public/sw.js` precaches every shipped file (a test walks `public/` and fails if one is missing)
  and serves cache-first, so the demo works in airplane mode after one load. It is not registered
  on `localhost`, because cache-first would keep serving old code after every edit. Add `?offline`
  to test the worker locally.

---

## 9. Run

    npm run serve          # python3 -m http.server 8000 --directory public

Then open http://localhost:8000. Use `?present` to rehearse, `?offline` to test the worker.

Any static file server works. There is no build step, no bundler, no `node_modules`.

## 10. Test

    npm test               # node --test, 253 tests, no dependencies

Nineteen test files, all on Node's built-in runner. They cover the engine (`raiseBy`, attribution,
options, contract-less companies), the parser and knob model, the screens' rendered HTML, the
service worker and its precache list, keyboard navigation, onboarding, and the invariants above:
confirmation does not move the date, a what-if never mutates the real company, labels sum to their
totals, and no number is printed without provenance.

The app-booting tests (setup, what-if controls, keyboard) take most of the suite's ~7 seconds;
the rest are milliseconds.

## 11. Deploy

    npx vercel --prod

`vercel.json` sets the output directory to `public` and pins `no-cache` on `sw.js` and `/data/*`.
Then regenerate the QR from the deployed URL: `assets/QR-INSTRUCTIONS.md` explains how, and
`assets/qr-demo.svg` / `.png` are the committed assets.

**Bump the cache version on every deploy.** `public/sw.js` precaches the whole app under a
versioned cache name (`CACHE = 'pilot-v4'`). The fetch handler is cache-first, so a browser that
has already installed the worker answers navigations from its cached `index.html` and JS and never
asks the network. The only thing that tells it to re-install is a byte change in `sw.js`, and the
only thing that drops the old entries is the new cache name in `activate`. So on each deploy, edit
the constant to the next number (`pilot-v4` to `pilot-v5` to `pilot-v6`), commit it with
the rest of the change, and deploy. Skipping the bump serves the previous build to anyone who has
visited before, which is why a "fixed" screen can still look broken on the demo machine.

`tests/sw.test.mjs` reads `CACHE` out of `sw.js`, so a bump cannot break the suite.

## 12. Fonts

Inter (400, 500) and DM Mono (400), SIL OFL 1.1, subset to Latin, bundled in
`public/assets/fonts` with their licences. No CDN. Neue Montreal is the licensed swap if a licence
ever exists.

## 13. Repo map

    public/
      index.html            shell, service-worker registration (off by default on localhost)
      styles.css            Rho tokens, then roles; projector-first type, phone overrides at 760px
      sw.js                 precache list + cache-first fetch handler
      data/                 fixture-seed.json (the demo company), rho-sandbox.snapshot.json
      assets/               fonts + licences, QR assets
      js/
        app.js              state, render loop, presenter steps, key handling, animation carry-over
        engine.js           cashAt, bufferAt, raiseBy, range, attribute, priceOption
        calendar.js         UTC day/month math, date phrasing ("mid-April", "early March")
        money.js            usd, shortUsd, shortUsd1, signed
        derived.js          provenance records, fmt(), largest-remainder tenths
        scenario.js         fixture load, localStorage, validation, notice-window terms
        intents.js          the strict what-if grammar
        whatif-model.js     knobs, apply, echo, forgiving parser, suggestions
        screens/            one module per route; each returns HTML, plus bar.js/confirm.js parts
    scripts/fetch-rho-sandbox.mjs
    tests/                  19 node --test files
    docs/superpowers/       the design spec and the UI plan this demo was built from

## 14. What is not real

Worth saying plainly, because the demo is convincing on purpose:

- **No AI runs.** Ask Rho answers three fixed questions from engine output. The what-if parser is
  regexes, not a model. The demo's claim is about where AI would sit, not that this is it.
- **No Rho connection.** The snapshot is a point-in-time copy of the sandbox, read from disk.
- **One contract, one alert, two invoices.** The scenario shapes the product's ambition, not its
  MVP surface.
- **The company is synthetic.** Every screen says so in the footer, the sidebar and the page copy.
  No real balances, no real vendor relationships.
- **`/setup` is a calculator, not onboarding.** It builds a scenario in `localStorage` and nothing
  leaves the browser.
