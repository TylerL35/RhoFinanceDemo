# Pilot Demo: UI Review and Improvement Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to run this plan task by task. Steps use checkbox (`- [ ]`) syntax. Every task ends with `node --test tests/*.test.mjs` green and a manual check at 1280×800 and 375×812.

**Written:** Thu Nov 12, 2026, ~3am ET, after a full walkthrough of `localhost:8021` (every route, desktop and 375px mobile, presenter keys, what-if, setup) and a read of every file in `public/`.

**Goal:** Turn a correct but bare demo into one that (1) never says anything wrong on stage, (2) makes the moment the date moves impossible to miss, and (3) looks like a real Rho screen rather than a wireframe.

**Ground rules (unchanged from the implementation plan):** zero dependencies, no runtime network, no wall clock, money in cents, every printed number from a `derived()` record, mint is the only accent, no em dashes or emoji in UI copy, BUILD_PROMPT "Demo screens to build" is the copy source.

---

## 0. Where things stand

**What is solid, so leave it alone.** The engine matches the deck exactly on the fixture:

| Number | Deck | Engine (`node`, fresh fixture, hires confirmed) |
|---|---|---|
| Base date | Apr 11, 2027 | 2027-04-11 |
| Range | Mar 1 – Apr 28 | 2027-03-01 – 2027-04-28 |
| Bar | 2.4 signed / 0.6 not certain | 2.37 / 0.66 → 2.4 / 0.6 after `displayTenths` |
| Options | Apr 11 / Apr 12 / Apr 20, +2 days collect | 0 / +1 / +9 / +2 days |

The test suite passes (194 of 195 in my copy; the one failure needs `scripts/`, which I did not copy over. Run it locally to confirm 195/195). The data model, the provenance layer and the notice-window logic are all good.

**What is wrong.** The problems are in what the screens *say* and how they *look*, not in the math. They fall into three groups.

### 0.1 Things that are factually wrong on screen (P0)

| # | Where | What happens | Evidence |
|---|---|---|---|
| B1 | What-if, bar, confirm card, Ask Rho | `hire 2 more in March` pushes payroll rows with `confirmed: true`. The bar then counts those imaginary hires as **Signed** (3.1 mo), the confirm card says **"Payroll confirmed by you: $45K a month"**, and Ask Rho says **"because of 5 new hires"**. If the presenter types the what-if *before* clicking "Yes, 3 hires", the card asks "rose $45K a month in Oct. Is that 5 new hires?" | `intents.js` HIRE mutation; reproduced in the browser |
| B2 | Reveal math line | Shows `$2.1M cash after the renewal ÷ $186K a month = 5.3 mo. Minus your 6-month cushion = start by 2027-04-11.` The division is false (2.04 ÷ 0.186 = 11), the cash is *before* the renewal, and the date is ISO. Deck copy is `$2.04M ... = 11 months. Minus your 6-month cushion = start by Apr 11.` | `reveal.js` `runwayMonths = (cash - buffer) / burn` |
| B3 | Ask Rho, before confirming | Says "Sales is the uncertain part (2.6 of 3.0 months)". 2.3 of that 2.6 is the unconfirmed hires, not sales. | `claude.js` labels segment 2 as Sales unconditionally |
| B4 | Use my numbers | Placeholders look like filled-in values. Pressing "Show my date" with empty fields says **"At this rate cash never runs out"** because `Number('') === 0`. | `setup.js` `cents()` |
| B5 | Reveal, for a judge's own numbers | "Estimated range late October to late October", "Range from your last 0 months", "Why it moved 0.4 months / Anchored to 2028-11-12", and fixture labels ("Gusto debits", "$0 a month behind plan", "revenue deposits") on the judge's company. | Ran setup with 900000 / 60000 / 90000 / Figma |
| B6 | Home note | "Raise-by holds at **Apr** 2027" (current date). Deck says **Jul** 2027, the plan-consistent date the card would have shown last week. | `home.js` uses `range().base` |
| B7 | Trust, Ask Rho | "This is wrong", "Share read-only with accountant" and all three Ask Rho chips do nothing when clicked. A judge will click them. | No `onclick` |
| B8 | Invoices footnote | "Closing $9K a month more by Feb holds the date" contains a literal `Feb` and a claim the engine never computes. | `invoices.js` |
| B9 | Bill chip | `$6,118/day burn` uses a local `DAYS_PER_MONTH = 30.4` (the global constraint says `MONTH_DAYS`), and the deck says `$6.3K a day`. One of them has to change. | `bill.js` |

### 0.2 The demo doesn't land as a demo (P0)

| # | Problem |
|---|---|
| X1 | **Arrow keys only change routes.** Guess, "Yes, 3 hires", the Bill option and "Draft 2 reminders" all need the mouse, so the spec's "arrow keys only, no mouse" isn't true yet. |
| X2 | **The date moving is invisible.** Every change re-renders the page with `innerHTML`, so nothing animates. After a what-if the headline changes *above the fold* while the presenter looks at the input, and the only feedback is a grey echo line. Confirming hires snaps the bar with no transition. |
| X3 | **The guess has no payoff.** `state.guesses` is written on Home and never read anywhere else. The reveal never says "You guessed July. It's mid-April." |
| X4 | **Enter doesn't submit the what-if.** There is no `<form>`, so a presenter typing live has to reach for the mouse. |
| X5 | **Two mint buttons on Reveal** ("Yes, 3 hires" and "Try it"); the deck rule is one per screen. |

### 0.3 It looks like a wireframe (P1)

- **No fonts are bundled.** There is no `@font-face` and no `assets/fonts`. Macs fall back to Helvetica, a Windows venue laptop to Arial, and there is only one weight (400) plus a 500 that is synthesized.
- **The sidebar is a demo nav, not Rho's.** The deck says the product screens must look like Rho's real app (Home, Transactions, Accounts, Cards, Vendors, Reporting; Workflows: Invoicing, Expenses, Reimbursements, Bill Pay, Accounting). There's no company name and no "Raise-by · New" placement.
- **Everything is the same grey card.** Reveal is five stacked `#EFF3F2` boxes of equal weight, so the date and the bar don't stand out.
- **The bar is a progress bar.** It's 18px tall, "not certain" is just empty track, and the labels sit at the far ends instead of under their segments.
- **Muted text fails contrast.** `#747D79` is 4.24:1 on white and 3.79:1 on the card fill. On a washed-out projector the receipts, captions and range line will disappear. Rho's own `#666E6A` is 5.25:1 / 4.69:1.
- **Bill options are three plain buttons.** The decision, which is the most product-like moment, reads like a form.
- **Invoices is a bare table.** No header, the columns jump when "reminder drafted" appears, and "Draft 2 reminders" never shows a draft.
- **Duplicate charge is one sentence and two buttons.** No transactions are shown, so there's nothing to "take a look" at.
- **Ask Rho isn't a conversation.** The question is the `<h1>` and the source "chips" are plain mono text.
- **Mobile.** At 375px the whole first screen is the sidebar (364px of nav before any content). That's what a judge sees after scanning the QR. "mid-April" breaks at the hyphen ("mid-" / "April").
- **Formatting.** ISO dates leak into copy (`2027-04-11`, "Anchored to 2027-07-12"), and money is unformatted in setup inputs.

---

## 1. Order of work and cut line

Pitch is Fri Nov 13. Budget about 10 focused hours.

| Block | Tasks | Est. | Why first |
|---|---|---|---|
| A. Stage-safe | 1, 2, 3, 4 | 2.5h | Wrong numbers and dead presenter beats are the only things that can actually hurt you in the room |
| B. The money shot | 5, 6, 7, 8 | 3h | Fonts, tokens, Reveal redesign, motion. This is the 20 seconds the judges remember |
| **Cut line** | | | **If time is short, ship A + B + task 9 (Bill) and stop** |
| C. Supporting screens | 9, 10, 11, 12 | 2.5h | Bill, Invoices, Duplicate, Ask Rho, Trust |
| D. Phone and self-serve | 13, 14 | 1.5h | Judges on the QR |
| E. Ship | 15 | 1h | Offline check in real Chrome, deploy, QR, recordings |

---

## Block A: stage-safe

### Task 1: Isolate what-if from reality (fixes B1)

**Idea:** a what-if is a hypothetical about the *real* company. The bar, confirm card, sources, Ask Rho and Trust describe the real company. Only the headline, math line, range and option prices show the hypothetical, and they label it.

**Files:** `public/js/intents.js`, `public/js/app.js`, `public/js/screens/common.js`, `reveal.js`, `bar.js`, `confirm.js`, `claude.js`, `trust.js`, `whatif.js`; new `tests/whatif-isolation.test.mjs`.

- [ ] `intents.js`, HIRE mutation: push rows with `confirmed: false, whatif: true` and a deterministic id `whatif-${startsOn}-${i + 1}` (the current `whatif-${v.payroll.length + 1}` collides after an undo and re-apply).
- [ ] `common.js`: add `export const realScenario = (state) => state.intentBase ?? state.scenario;`
- [ ] `app.js`: add a single helper so real-world actions land in every copy that Undo can restore:

```js
// Real decisions (confirm, choose, draft, collect) must survive Undo, so they
// are applied to the live scenario, the pre-what-if base, and every snapshot.
mutateReal(fn) {
  fn(this.state.scenario);
  if (this.state.intentBase) fn(this.state.intentBase);
  for (const it of this.state.appliedIntents ?? []) fn(it.before);
  saveLocal(this.state.scenario);
},
```

  Use it in `confirmPayroll`, `choose`, `draftInvoices`, `collectInvoice`. In `confirmPayroll`, touch only `p => !p.whatif` rows; `'one-time'` becomes `sc.payroll = sc.payroll.filter(p => p.whatif)`.
- [ ] `bar.js`, `confirm.js`, `claude.js`, `trust.js`, and the reveal "Where the numbers come from" table read `realScenario(state)` instead of `state.scenario`.
- [ ] `reveal.js`: when `state.appliedIntents.length > 0`:
  - Eyebrow becomes `RAISE-BY · WHAT-IF`.
  - Under the headline: `Without your what-if: mid-April (Apr 11). This is 20 days earlier.` Compute `diffDays(raiseBy(real), raiseBy(scenario))`, `earlier/later` by sign, and `no change` at 0.
- [ ] `whatif.js`: after the echo, a result line in abyss text: `Mid-April → late March, 20 days earlier.`
- [ ] Tests (`whatif-isolation.test.mjs`), on the unconfirmed fixture after `hire 2 more in March`:
  - The confirm card copy contains `$27K` and `3 new hires`, never `$45K` or `5`.
  - `attribute(realScenario(state))` equals `attribute(fixture)` to the day.
  - Ask Rho copy contains `3 new hires`.
  - Reveal copy contains `Without your what-if` and `Mar 22`.
  - What-if, then confirm, then Undo: payroll is still confirmed. Today this fails: Undo restores the pre-what-if snapshot, which predates the click, so the confirmation is lost.

### Task 2: Correct the math line and date formatting (fixes B2, B6, B9, nbsp)

**Files:** `reveal.js`, `home.js`, `bill.js`, `money.js`, `derived.js`; tests `calendar.test.mjs`, `reveal.test.mjs`, `bill.test.mjs`.

- [ ] `money.js`: `shortUsd` millions get two decimals with trailing zeros (and a bare dot) trimmed (`$2.04M`, `$2.1M`, `$3M`). Keep the existing `$2.1M` and `$60K` assertions and add `shortUsd(204000000) === '$2.04M'`.
- [ ] `reveal.js` math block, built from `derived()` records:

```js
// "after the renewal" only when an annual renewal actually leaves before the date.
const c = activeContract(sc);
const renewalHits = c && !['cancel', 'monthly'].includes(c.choice)
  && projected && parseDate(c.renewsOn) <= projected;
const cashAfter = sc.cash - (renewalHits ? c.amount : 0);
const months = Math.round(cashAfter / netBurn(sc, y, m));   // fixture: 10.97 -> 11
// copy:
// `${fmt(cashAfterD)} cash${renewalHits ? ' after the renewal' : ''} ÷ ${fmt(burn)} a month
//  = ${months} months. Minus your ${cushion}-month cushion = start by ${fmtMonthDay(projected)}.`
```

  Fixture output: `$2.04M cash after the renewal ÷ $186K a month = 11 months. Minus your 6-month cushion = start by Apr 11.`
- [ ] Add the deck's **"Change cushion"** link after the math line. It calls `app.prefillWhatIf('the raise takes 3 months longer')`, which fills and focuses the what-if input without applying it.
- [ ] Merge the duplicate receipt line. Headline: `Start raising by mid‑April 2027.`. Lead: `Estimated range early March to late April.`. Small mono line: `Base case Apr 11 · range Mar 1 to Apr 28`.
- [ ] `namedDate()`: use U+2011 (non-breaking hyphen) in `mid‑April`, so it never wraps as "mid-" / "April".
- [ ] `bar.js`: `Anchored to Jul 12, 2027` (use `fmtMonthDay` + year), never ISO.
- [ ] `home.js` note: `Raise-by holds at ${fmtMonthYear(attribute(real).anchor)}` → **Jul 2027**, matching the deck. Also derive "six months" in the lead from `cushionMonths` (spec section 7: no numeric literals in copy).
- [ ] `bill.js`: drop the local `DAYS_PER_MONTH`, use `MONTH_DAYS`. Print `$6.1K a day burn` (add `shortUsd1(cents)` with one decimal under $10K). **Tell the deck owner** that the deck's `$6.3K` should be `$6.1K`, or decide together to drop the chip.

### Task 3: Presenter path drives the beats, not just routes (fixes X1, X3)

**Files:** `app.js`, `home.js`, `reveal.js`, `common.js`; `tests/keyboard.test.mjs`.

- [ ] Replace `SCRIPT` with steps. ArrowRight enters the next step; ArrowLeft undoes the current step and goes back.

```js
const PRESENTER_CHOICE = 'cancel'; // the visible lever (+9 days); 'monthly' is ~1 day
const STEPS = [
  { route: '/' },
  { route: '/reveal' },
  { route: '/reveal', enter: () => app.confirmPayroll('yes'), exit: () => app.unconfirmPayroll() },
  { route: '/bill/hubspot' },
  { route: '/bill/hubspot', enter: () => app.choose(PRESENTER_CHOICE), exit: () => app.choose(null) },
  { route: '/invoices' },
  { route: '/invoices', enter: () => app.draftInvoices(), exit: () => app.undraftInvoices() },
  { route: '/alerts/duplicate' },
  { route: '/trust' },
  { route: '/claude' },
];
```

  - Add `app.step`, `unconfirmPayroll()` (rows back to `confirmed: false`, `confirmations.payroll = null`) and `undraftInvoices()`.
  - A sidebar click sets `app.step` to the first step with that route, so the keys never fight the mouse.
  - `enter` is skipped when the state is already there (for example, hires already confirmed by a click).
  - Esc stays "go to `#/`". Add **Shift+Esc = `app.reset()`** for a clean restart mid-rehearsal.
- [ ] Home: keys `1`–`4` pick a guess chip, so the guess can also be done from the keyboard.
- [ ] Reveal (fixes X3): if `state.guesses.made`, add a mono line above the headline, `YOU GUESSED JUL 2027`, and after the lead `About 3 months sooner than you thought.` The month difference is computed from the guess month to `projected`: `sooner` / `later` / `Right month.`
- [ ] With `?present`, the footer centre shows `Step 3 / 10 · → next` (presenter aid; otherwise the route name as now).
- [ ] Update `keyboard.test.mjs`. Nine ArrowRights from step 0 (`/`) reach the last step, visit the routes in order **and** leave `payroll.every(confirmed)`, `contracts[0].choice === 'cancel'` and every invoice drafted. Nine ArrowLefts restore the fresh fixture (deep-equal). Keys are still ignored inside INPUT/TEXTAREA.

### Task 4: What-if box behaves like an input, and small truth fixes (fixes X4, X5, B3, B7, B8)

- [ ] `whatif.js`: wrap the input in `<form onsubmit="event.preventDefault(); app.applyWhatIf()">`, so Enter submits. After render, re-focus the input and clear it (store `state.whatifFocus = true` and refocus in `mountWhatIf`).
- [ ] "Try it" becomes a ghost button (`.btn.ghost`), so Reveal has exactly one mint button: "Yes, 3 hires". Once that is answered, nothing on Reveal is mint, which is fine.
- [ ] Refusal styling: abyss text with a 2px abyss left border. Never `#08A68A`, which reads as success.
- [ ] Hint line comes from the scenario: `Try: hire 2 more in March · the raise takes 3 months longer · cancel ${vendor.toLowerCase()}`. Drop the hire suggestion when there is no payroll baseline (local scenarios refuse it). Drop the cancel suggestion when the vendor name has a space, since the CANCEL regex only takes one word.
- [ ] `claude.js` (B3): name what is actually in each segment. Unconfirmed: `The uncertain part is sales and the 3 hires you haven't confirmed (2.6 of 3.0 months).`. Confirmed: `Sales is the uncertain part (0.6 of 3.0 months).`. Add a test for both.
- [ ] Trust buttons (B7) get an inline, honest response:
  - "This is wrong" → `Logged. Recalculated from the same inputs: no change.`
  - "Share read-only with accountant" → `A read-only link would expire in 7 days. Not created in this demo.` (Derive the 7 from a fixture field or drop the number.)
- [ ] Invoices footnote (B8): replace it with `Collecting moves timing. Closing the sales gap moves the date.`. It has no number, so there's nothing to derive or get wrong. Tell the deck owner if the deck repeats "by Feb".

**Block A acceptance:** fresh `?present`, press → nine times without touching the mouse, and every beat happens. Type `hire 2 more in March` + Enter on Reveal: the bar, confirm card and Ask Rho still describe 3 hires. Run `node --test` green.

---

## Block B: the money shot

### Task 5: Fonts and design tokens

**Files:** `public/assets/fonts/*.woff2` (new), `public/styles.css`, `public/sw.js`, `tests/sw.test.mjs`.

- [ ] Download (OFL licensed) **Inter** 400 + 500 (`rsms.me/inter` or Google Fonts static) and **DM Mono** 400 (Google Fonts; Rho uses DM Mono for eyebrows). Put them in `public/assets/fonts/`. I couldn't fetch them from here (no network in my workspace), so this is a manual download.
- [ ] `@font-face` with `font-display: block` (they're local, so there's no reason to flash the fallback). Add the three files to `PRECACHE`; the existing `sw.test` will fail until you do, which is the point.
- [ ] Replace `:root` with roles, not raw colours:

```css
:root {
  /* Rho tokens (deck_master Part 1) */
  --abyss:#151716; --abyss-0:#0F0F10; --ink-2:#222524; --ink-muted:#666E6A; --ink-faint:#747D79;
  --moon:#FFFFFF; --moon-2:#F7F9F9; --card:#EFF3F2; --border:#D7E0DE; --border-2:#B4BDB7;
  --mint:#6AF3D9; --mint-deep:#08A68A; --mint-tint:#D9FFF3;
  /* roles */
  --text:var(--abyss); --text-muted:var(--ink-muted);     /* 5.25:1 on white, 4.69:1 on card */
  --surface:var(--moon); --surface-quiet:var(--moon-2); --surface-card:var(--card);
  --accent:var(--mint); --accent-text:var(--mint-deep); --accent-soft:var(--mint-tint);
  /* type: projector-first */
  --fs-hero:64px; --fs-h1:44px; --fs-h2:20px; --fs-body:16px; --fs-small:14px; --fs-micro:11px;
  --lh-tight:1.06; --lh-body:1.5;
  /* space and shape */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px; --s8:64px;
  --r:6px; --dur:600ms; --ease:cubic-bezier(.2,.7,.2,1);
  font-family:"Inter",Helvetica,Arial,sans-serif; font-size:var(--fs-body); color:var(--text);
  font-feature-settings:"tnum" 1;   /* tabular figures so numbers don't jiggle */
}
.mono, .eyebrow { font-family:"DM Mono",ui-monospace,monospace; }
```

- [ ] Global rule: muted text is never smaller than 13px and always `--text-muted`. `--ink-faint` is only for disabled or inert items.
- [ ] Kill inline styles in screens (`style="margin:-16px 0 24px"`, `color:#747D79`, the what-if input's inline border) and move them into classes. This is also what makes Task 8's motion workable.

### Task 6: Rho-like chrome (sidebar, company, footer)

**Files:** `screens/common.js`, `styles.css`, fixture (`"company": "Demo Co."`).

- [ ] Sidebar matches the deck's list. Items that aren't in the demo are **inert**: `<span class="nav-inert">`, no hover, no pointer, `--ink-faint`, `title="Not part of this demo"`. They look real without dead clicks.

```
┌──────────────────────────┐
│ ▪ Demo Co.         ▾     │  company switcher look-alike, plain text, not Rho's logo
│ Synthetic data           │  micro mono
│                          │
│ Home                     │
│ Raise-by        [NEW]    │  → #/reveal   (mint-tint pill, accent-text)
│ Transactions             │  inert
│ Accounts                 │  inert
│ Cards                    │  inert
│ Vendors                  │  inert
│ Reporting                │  inert
│ WORKFLOWS                │
│ Invoicing          2     │  → #/invoices  (count = overdue invoices, derived)
│ Expenses                 │  inert
│ Reimbursements           │  inert
│ Bill Pay           1     │  → #/bill/hubspot (count = contracts awaiting approval)
│ Accounting               │  inert
│ ──────────────           │
│ NEEDS A LOOK       1     │  → #/alerts/duplicate (count = open alerts)
│                          │
│ (bottom-pinned)          │
│ ABOUT THIS DEMO          │
│ Trust · Ask Rho          │
│ Connected data           │
│ Use my numbers           │
└──────────────────────────┘
```

  Counts are derived from the scenario (`derived()` with inputs), so they obey the provenance rule.
- [ ] Footer per spec: `Synthetic data · Start over · Reveal` (left / centre presenter step or route / right), on `--surface-quiet`, at 12px.
- [ ] Keep the "never claims to be Rho's app" rule: no Rho logo file. "Demo Co." plus the "Synthetic data" marker on every screen.

### Task 7: Reveal redesign (the 20 seconds that matter)

**Files:** `reveal.js`, `bar.js`, `confirm.js`, new `screens/timeline.js`, `styles.css`.

Target layout, 760px content column, single column (better on a projector than two):

```
RAISE-BY                                            ┌──────────────────┐
YOU GUESSED JUL 2027                                │ Raise-by  Apr 11 │  sticky date pill
Start raising by mid‑April 2027.        (hero 64px) └──────────────────┘
Estimated range early March to late April.   About 3 months sooner than you thought.

 Nov 11        Mar 1 ░░░░░░░●░░░ Apr 28                ○ Jul 12
 today               range   Apr 11                     plan said      ← timeline strip
                              ◀━━━━━━━━━━━━━━━━━━━━━━━━━━━┘   moved 3.0 months

┌ white card, mono ────────────────────────────────────────────────────┐
│ $2.04M cash after the renewal ÷ $186K a month = 11 months.            │
│ Minus your 6-month cushion = start by Apr 11.        Change cushion → │
│ Base case Apr 11 · range Mar 1 to Apr 28 · from your last 4 months    │
└──────────────────────────────────────────────────────────────────────┘

┌ white card, attention (2px abyss left border) ───────────────────────┐
│ Payroll through Gusto rose $27K a month in Oct. Is that 3 new hires?  │
│ [ Yes, 3 hires ] ( One-time ) ( Other )                    ← only mint │
└──────────────────────────────────────────────────────────────────────┘

WHY IT MOVED 3.0 MONTHS
███████████████████████████████████████████▒▒▒▒▒▒▒▒▒▒   (28px bar)
Signed · 2.4 mo                              Not certain yet · 0.6 mo
hires + HubSpot renewal                      sales $9K/mo behind plan

WHERE THE NUMBERS COME FROM
Payroll          +$27K a month       [Gusto debits · confirmed by you]
HubSpot renewal  $60K on Dec 20      [Order form p.2]
Sales            $9K a month behind  [Revenue deposits]

What if… [ hire 2 more in March______________ ] ( Try it )
```

- [ ] **Timeline strip** (`timeline.js`, pure HTML/CSS). The axis runs from `asOf` to one month after the anchor; `left% = diffDays(asOf, d) / diffDays(asOf, end) * 100`. It shows a range band (`--accent-soft` fill, 1px `--accent-text` edges), a base dot (abyss, 12px) labelled `Apr 11`, an anchor ring (hollow) labelled `Plan said Jul 12`, a thin arrow from anchor to base, and the today tick. Every date comes from `range()` / `attribute()`. **This one visual tells the whole story without words.** On first render the base dot animates from the anchor position to Apr 11 (Task 8).
- [ ] **Sticky date pill** (`position: sticky; top: 16px`, top right of `.main`, on Reveal and Bill). Whatever the presenter is doing (typing a what-if, picking a Bill option) the current date stays in view and flashes when it changes. This fixes X2 for the what-if case.
- [ ] **Bar:** 28px. Signed is solid mint. Not certain is a `--card` fill with a 1px `--border-2` outline and a subtle 45° hatch (`repeating-linear-gradient` of `--card` / `--moon-2`, which is grey, not a colour accent). Labels sit **under their own segment** (flex with the same widths), with a second muted line saying what's inside each. `aria-label` carries the full sentence.
- [ ] Section headings become eyebrows (`WHY IT MOVED 3.0 MONTHS`, `WHERE THE NUMBERS COME FROM`), so cards stop competing with the hero.
- [ ] Source chips are bordered pills (`.chip`: 1px `--border`, 999px radius, 12px mono). The deck wants `6 Gusto debits, confirmed by you` and `12 deposits`. That needs evidence counts in the fixture (`payroll.evidence: { debits: 6 }`, `revenue.evidence: { deposits: 12 }`) and the `bar.test` assertion `!includes('6 Gusto debits')` to be inverted. Either add the fields or keep the count-free labels; don't print a count the scenario doesn't hold.
- [ ] The confirm card becomes a single mono line after answering (as now) with a small `Undo` link.

### Task 8: Motion that carries the story

**Files:** `app.js` (`render`), `styles.css`, `bar.js`, `timeline.js`, `reveal.js`.

The app re-renders with `innerHTML`, which is fine. Carry the *previous* values across the render and animate from them:

```js
// app.js
render() {
  const prev = this.view ?? {};                         // last painted values
  ...root.innerHTML = html...
  this.view = collectView(root);                        // { date: 'Apr 11', signedPct: 79, baseLeft: 41.2 }
  animateFrom(root, prev, this.view);                   // no-op when equal or reduced motion
}
```

```js
// animateFrom: set old geometry, force layout, set new; CSS does the rest
for (const el of root.querySelectorAll('[data-anim-width]')) {
  const key = el.dataset.animWidth;                     // e.g. 'signed'
  if (prev[key] == null || prev[key] === next[key]) continue;
  el.style.width = prev[key] + '%'; el.getBoundingClientRect(); el.style.width = next[key] + '%';
}
for (const el of root.querySelectorAll('[data-flash]')) {
  if (prev[el.dataset.flash] !== undefined && prev[el.dataset.flash] !== next[el.dataset.flash]) el.classList.add('changed');
}
```

```css
.bar > div, .tl-dot { transition: width var(--dur) var(--ease), left var(--dur) var(--ease); }
@keyframes changed { 0% { background: var(--accent-soft); } 100% { background: transparent; } }
.changed { animation: changed 1.4s var(--ease); border-radius: var(--r); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

- [ ] **First arrival on Reveal:** the timeline base dot starts at the anchor (Jul 12) and slides to Apr 11 over 900ms, then the headline fades in. That is "your date moved this week", shown rather than said.
- [ ] **Confirm hires:** the signed segment grows from 0.4 to 2.4, the labels cross-fade, and **the date pill does not flash**. That stillness is the trust thesis ("confirmation changes provenance, not the date"), so call it out in the script.
- [ ] **What-if, Bill option, collect:** the date pill and headline flash `.changed`, and the timeline dot slides.
- [ ] Restore focus after render (what-if input, last pressed option card) so the keyboard flow survives.
- [ ] Test: `collectView` is pure and unit-tested; motion itself is checked by eye.

**Block B acceptance:** at 1280×800, Reveal above the fold shows the hero, range, timeline and the top of the math card. From across a room the date is the first thing you read, and the moving dot is the second.

---

## Block C: supporting screens

### Task 9: Bill Pay as a decision

**Files:** `bill.js`, `styles.css`, fixture (optional `lastCharge`).

- [ ] Header block: `BILL PAY · AWAITING APPROVAL` eyebrow, headline as now, and a **countdown card** with an attention border: `9 days left to change it` (h2), `Cancel window closes Nov 20.`, and the order-form quote set as a real quote (curly quotes, larger regular weight, as the deck's quote style).
- [ ] Pills row: `Open order form` (opens an inline panel with the synthetic excerpt and source), `Last year's charge` (only if `lastCharge` exists in the fixture; otherwise omit it), `$6.1K a day burn`.
- [ ] **Option cards** instead of buttons (radio group, `role="radiogroup"`, arrow keys move between them):

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ Approve as is       │ │ Ask for monthly     │ │ Cancel              │
│ Apr 11              │ │ Apr 12              │ │ Apr 20              │  ← 28px
│ no change           │ │ about a day later   │ │ about 9 days later  │  ← mono chip
│ $60K leaves Dec 20  │ │ $5K a month instead │ │ $60K stays          │  ← what it does
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

  Selected card: 2px abyss border, `--accent-soft` fill, `Selected` micro label. No card is "recommended", to keep the user in control.
- [ ] After choosing, show a **draft email card** (the deck: "Draft opens in your email. You review and send."): To `HubSpot billing (synthetic)`, Subject, and a three-line body built from the contract fields. The button `Open in email` is visibly inert in the demo (`disabled`, `title`). Monthly copy: `Monthly plans can cost more, so the net shows once they quote.`
- [ ] Remove the separate "Recorded: …" grey box; the selected card is the record. `Revert` becomes a link on the selected card.

### Task 10: Invoices and the duplicate charge

**Files:** `invoices.js`, `alerts.js`, fixture (alert evidence), `styles.css`.

- [ ] Invoices headline stays (`Sales are $9K a month behind your plan.`). Lead: `2 invoices are overdue. Collecting them moves timing; closing the gap moves the date.`
- [ ] Real table: header row `Customer · Amount · Due · Overdue · Status`, fixed column widths (`table-layout: fixed`), amounts right-aligned with tabular figures, status as a pill (`Overdue`, then `Reminder drafted`, then `Collected`). No column jumps when status changes.
- [ ] `Draft 2 reminders (if both pay, about 2 days)` as the one mint button, per the deck copy. After drafting, show reminder previews (first expanded, second collapsed via `<details>`): To `Acme Corp AP (synthetic)`, Subject `Invoice due Oct 21, $12,000`, a two-line body, and inert `Open in email`. Deck rule: "Rho drafts a reminder the founder sends."
- [ ] Duplicate charge: show the evidence as two transaction rows (`Oct 22 · Northstar Office Supply · $840.00`, `Oct 28 · …`) with three chips: `Same vendor`, `Same amount`, `6 days apart`. Add one muted line: `Does not change your raise-by date.`. After Dispute: `Dispute drafted for you to review. Rho never moves money.`

### Task 11: Ask Rho as a conversation

**Files:** `claude.js`, `app.js` (`state.ask = 'when'`), `styles.css`.

- [ ] Layout: eyebrow `ASK RHO · READ-ONLY`, h1 `Ask about your raise-by date.`, then a chat column with a user bubble on the right (`--card` fill) and the Rho answer on the left (white, 1px border, `Rho` micro label). Source pills go under the answer (`Rho raise-by`, `HubSpot order form p.2`, `Gusto debits`).
- [ ] The three suggestion chips switch `state.ask` and re-render. All three answers are derived from the engine, with no free-text input (the spec has no LLM):
  - **When should we start raising?** `Rho estimates Apr 11, 2027 (range Mar 1 to Apr 28), when you'd have 6 months of cash left. It moved 3 months earlier mainly because of 3 new hires and the HubSpot renewal. Sales is the uncertain part.` (deck copy, exact range dates, plus the Task 4 confirmation-aware sentence)
  - **What changed this week?** `Payroll rose $27K a month (3 hires, from Gusto debits) and the $60K HubSpot renewal on Dec 20 is now inside your window. With sales $9K a month behind plan, the date moved from Jul 12 to Apr 11.`
  - **What's still uncertain?** `Sales. Revenue has run at 96% of plan over your last 4 months ($366K to $400K a month). That is why the range runs from Mar 1 to Apr 28.`
- [ ] The answer fades in over 400ms (no fake typing). With an active what-if, add one line: `Your what-if (2 more hires from March) would move it to Mar 22.`
- [ ] Naming: the deck slide says "Claude, connected to Rho"; the screen says "Ask Rho". Pick one with the deck owner.

### Task 12: Trust and Connected data

**Files:** `trust.js`, `connect.js`, fixture (`suppression.examples`).

- [ ] Trust leads with the deck's line, derived from the bar: `About three quarters is already signed.` Map `signed / total` to words: <0.4 `Less than half`, <0.6 `About half`, <0.7 `About two thirds`, <0.85 `About three quarters`, else `Almost all`. The fixture after confirm is 0.78, so it says "About three quarters".
- [ ] 2×2 grid: **Didn't bother you: 41** (the rule plus `<details>` listing 3–5 `suppression.examples` from the fixture, each `moved your date 2 days`), **What we can't see**, **When it's wrong** (buttons from Task 4), **Who sees it** (deck slide 9: admins only, payroll as one total, read-only expiring accountant share). Put the closing sentence `AI reads and explains. Math makes every number. You approve. Rho never moves money.` large and regular weight, as the deck's quote style.
- [ ] Remove the "Today's run rate" card (not in the deck) or fold it into the math receipt.
- [ ] Connected data: requests as a code block with status pills (`200`), a two-column "Rho gives us / Pilot adds" table (cash, committed vs cushion, contract terms, attribution), and `fetchedAt` formatted as `Nov 12, 2026`.

---

## Block D: phone and self-serve

### Task 13: Mobile (judges on the QR)

**Files:** `common.js`, `styles.css`.

- [ ] ≤760px: hide the sidebar and show a 56px top bar with `Demo Co.` and `Menu` (a `<details class="mobile-nav">` drawer, no JS). The content starts in the first 100px, not after 364px of links.
- [ ] Hero 40px, h1 30px. Bill option cards and invoice rows stack (invoice rows become cards: customer + amount on line one, overdue + status on line two). The timeline strip keeps the range, base and anchor but hides the today label.
- [ ] Check at 375×812 and 390×844: no horizontal scroll (`scrollWidth === innerWidth`), tap targets ≥ 44px, inputs 16px.

### Task 14: Use my numbers (fixes B4, B5)

**Files:** `setup.js`, `reveal.js`, `bar.js`, `invoices.js`, `app.js`; `tests/setup.test.mjs`.

- [ ] `cents('')` returns `NaN`, not `0`. A per-field message names the first missing field: `Add your cash today.`, `Add your monthly spend.`. `NO_BURN` only fires when both numbers are present.
- [ ] Prefill a believable example as real values, with a note `Example company. Replace with your numbers.`. A judge can press the button immediately and see a date, then edit.
- [ ] Inputs: `$` adornment, thousands separators on blur (stored raw), `type="date"` for As of and Renews on (native pickers on phones).
- [ ] Copy: h1 `Your numbers. Nothing leaves this browser.`. Lead names what's needed.
- [ ] Reveal for `source === 'local'`:
  - No "Why it moved" (there's no plan to move from). Show `What your date is made of` instead: cash, monthly burn, cushion, contract, as derived rows.
  - No range sentence when `trailing.length < 2`. Say `No revenue history yet, so this is a single date, not a range.`
  - Sources rows are labelled `Entered by you`.
  - The hint drops `hire 2 more` (refused without payroll) and uses their vendor.
- [ ] Invoices for local: `No invoices connected.` empty state instead of `Sales are $0 a month behind`.
- [ ] Button on the local Reveal: `Back to the demo company` (`app.reset()`).
- [ ] Tests: an empty form never shows the never-runs-out sentence; a local reveal contains no `Gusto`, `0 months`, `late October to late October`, or `Why it moved`.

---

## Block E: ship

### Task 15: Offline check, deploy, rehearse

- [ ] **Service worker.** Registration failed in the Claude desktop app's built-in browser ("unknown error when fetching the script"). That pane may not support service workers at all, so **verify in real Chrome**: DevTools → Application → Service workers shows `raise-by-v1` activated, then DevTools → Network → Offline and reload `/` and `/#/reveal`.
- [ ] **Stale code while developing.** The worker is cache-first, so once it's installed on `localhost`, your edits won't show until the cache name changes. Register it only off localhost (`if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) …`) or behind `?offline`. Bump `CACHE` on every deploy, as the README says.
- [ ] Projector check: Chrome at 1280×720 and 1024×768, zoom 100% and 125%. Nothing important below the fold on Reveal at 1280×720.
- [ ] One-mint audit, screen by screen: Home `Reveal`, Reveal `Yes, 3 hires`, Bill (none until chosen; the selected card is accent-soft, not mint), Invoices `Draft 2 reminders`, Duplicate `Dispute`, Trust none, Ask Rho none, Setup `Show my date`.
- [ ] Deploy (`npx vercel --prod`, output `public`), QR from the final URL, test on two phones (iOS Safari, Android Chrome) including airplane mode after the first load.
- [ ] Rehearsal hygiene: always open `/?present` (clears saved state). Shift+Esc resets mid-run.
- [ ] Record the 75s take and the full walkthrough as fallbacks.

---

## Appendix A: copy diffs (app vs BUILD_PROMPT)

| Screen | App says now | BUILD_PROMPT / deck | Action |
|---|---|---|---|
| Home note | holds at Apr 2027 | holds at Jul 2027 | Task 2 |
| Reveal math | $2.1M … = 5.3 mo … 2027-04-11 | $2.04M … = 11 months … Apr 11 | Task 2 |
| Reveal | no "Change cushion" | Link "Change cushion" | Task 2 |
| Reveal rows | Gusto debits / Order form p.2 / revenue deposits | 6 Gusto debits, confirmed by you / quoted from order form / 12 deposits | Task 7 (needs fixture evidence) |
| Bill chips | $6,118/day burn | Open order form · Last year's charge · $6.3K a day burn | Task 2 + 9, **deck owner to change $6.3K → $6.1K** |
| Bill options | Approve as is, Apr 11 (no change) / … | Approve as is (Apr 11), Ask for monthly (about a day, Apr 12), Cancel (about 9 days, Apr 20) | Task 9 cards carry the same facts |
| Invoices button | Draft 2 reminders + "If both pay, about 2 days." | Draft 2 reminders (if both pay, about 2 days) | Task 10 |
| Invoices note | Closing $9K a month more by Feb holds the date | closing $9K more a month by Feb holds Apr 11 | Task 4 removes the unsourced claim; **tell the deck owner** |
| Trust | (missing) | About three quarters is already signed. | Task 12 |
| Ask Rho | (early March to late April) | (range Mar 1 to Apr 28) | Task 11 |

## Appendix B: how I checked

- Walked `#/`, `#/reveal` (before and after confirm, after `hire 2 more in March`), `#/bill/hubspot` (chose monthly), `#/invoices` (drafted), `#/alerts/duplicate`, `#/trust`, `#/claude`, `#/setup` (empty submit, then example numbers), `#/connect` at 1280×800, plus `#/` and `#/reveal` at 375×812.
- Pressed ArrowRight ×7 and Esc from a fresh state: routes `/reveal → /bill/hubspot → /invoices → /alerts/duplicate → /trust → /claude → /claude`, then `/`. No state changed.
- Ran the engine and screens in Node against `fixture-seed.json` for the numbers in section 0 and the Ask Rho, Invoices and Home copy. Computed WCAG contrast for `#747D79`, `#666E6A` and `#08A68A` on `#FFFFFF` and `#EFF3F2`.
- Not verified: service worker in real Chrome, and the font downloads (no network from my workspace).
