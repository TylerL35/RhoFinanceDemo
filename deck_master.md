# Raise-By deck master (NYU PMC x Rho)

Everything for the deck in one place: slide flow, what goes on each slide, the facts with sources, Rho's design system, the numbers sheet, and what not to say.
Deck due Thu Nov 12, 11:59pm ET. Pitch Fri Nov 13, 7 min + 3 min Q&A. Target 6:15.

---

## Part 1. Rho design system (pulled from rho.co on Nov 11)

Typography
- Headlines: Neue Montreal, regular weight (400), very large, normal tracking. Rho's startup hero is 80px regular, not bold. Fallback if you don't have it: Inter or Helvetica Neue, regular.
- Body: Neue Montreal or Basier, regular 400, medium 500 for buttons and labels.
- Eyebrow labels: monospace, uppercase, small, wide letter spacing (Rho uses DM Mono / Apercu Mono). Example on rho.co: a small mint square, then "NEW: START YOUR LLC WITH RHO INCORPORATION". Use only for small labels above headlines, never for body text.
- Sentence case for headlines.

Colors (Rho's own CSS tokens)
- Abyss (near-black): #151716. Dark hero backgrounds on rho.co run about #0F0F10.
- Abyss gray text: #747D79 (muted), #666E6A, #222524.
- Moon (whites and light grays): #FFFFFF, #F7F9F9, #EFF3F2; borders #D7E0DE; #B4BDB7.
- Caribbean (Rho's mint): button fill #6AF3D9; brand tokens #6BFBD5 (bright), #04ECC1, #08A68A (deep mint, use for mint text on white), #D9FFF3 (mint tint background).
- Mint is the only accent. No other brand colors.

Shapes and style
- Buttons: mint fill, near-black text, 6px corner radius, medium weight.
- Inputs and cards: light gray fill (#EFF3F2) with a 1px #D7E0DE border, 6px radius.
- Dark sections use a subtle scattered white-dot texture (Rho's hero). Use sparingly, title and close only.
- Customer quotes: big regular-weight type with curly quotes.
- Logos and proof in a single row on dark.

How to apply it to the deck
- Alternate dark and light slides. Dark (Abyss): title, problem, insight, close. Light (Moon white): data, research, product UI, metrics.
- One big number per slide in Neue Montreal regular, everything else small and gray (#747D79).
- The recurring visual: the "signed vs not certain yet" bar. Signed = solid mint (#6AF3D9). Not certain yet = outline or light gray (#D7E0DE). Never red/green.
- Product screens must look like the real Rho app: white background, black text, left sidebar (Home, Transactions, Accounts, Cards, Vendors, Reporting; Workflows: Invoicing, Expenses, Reimbursements, Bill Pay, Accounting), one mint button per screen.
- Sources in a small gray footer on every stat. Demo screens labeled "Synthetic data."
- No AI-looking graphics: no sparkles, glows, gradients, emoji, robot icons, stock photos, floating tilted phones.

---

## Part 2. Slide flow (11 slides, about 6:15)

| # | Slide | Time | Background |
|---|---|---|---|
| 1 | Title | 0:05 | Dark |
| 2 | The problem | 0:35 | Dark |
| 3 | Why now, and why tools fall short | 0:30 | Light |
| 4 | Research, user and insight | 0:45 | Light, ends on dark insight line |
| 5 | How we got here | 0:25 | Light |
| 6 | The solution (See, Act, Plan) | 0:35 | Light |
| 7 | Built on what Rho already has | 0:30 | Light |
| 8 | Demo | 1:15 | Product UI |
| 9 | Trust | 0:30 | Light |
| 10 | MVP and scale | 0:30 | Light |
| 11 | Metrics and close | 0:35 | Light, then dark close |

If rehearsal runs long: cut the demo to 1:00, fold slide 7 into 6, shorten slide 5 to 15 seconds.

---

## Part 3. Slide by slide, with facts

### 1. Title
- Eyebrow: NYU PMC x RHO CASE COMPETITION
- Headline: Raise-By. Know when to raise, from what you've already signed.
- Team: Michael, Neha, Tyler, Regis.

### 2. The problem
- Headline: Founders learn their runway shrank after it's too late to act.
- Point: hires and annual contracts are signed weeks before the money leaves, so founders find out late, from an investor, an accountant or their balance.
- Facts (pick 3):
  - "Half the founders I talk to don't know whether they're default alive or default dead." Paul Graham, Default Alive or Default Dead?, Oct 2015.
  - 70% of startup shutdowns ran out of cash, the symptom, not the root cause; median shutdown 22 months after the last raise. CB Insights, Mar 5, 2026.
  - Only 24% of startups that raised a $1M+ seed in 2023 made it past seed, down from 55%+ historically. SimpleClosure, State of Shutdowns H1 2026, Aug 20, 2026.
  - Startup shutdowns rose 26% in 2024: 966 vs 769. Carta via TechCrunch, Jan 26, 2025.
  - "This led to a $300k shortfall from where I thought I was vs reality." Founder on Hacker News (pplante), Bench shutdown thread, Dec 27, 2024.

### 3. Why now, and why tools fall short
- Headline: AI can now read what founders sign, but every tool still looks backward.
- Tools (3 columns):
  - Mercury: runway = balance divided by average burn over the last 3 months; hidden when cash flow is positive. Mercury Help Center, Insights page.
  - Ramp Budgets (Jan 22, 2026): real-time budgets, built for finance teams.
  - Spreadsheet or ChatGPT: manual and stale.
  - Rho today: no live runway or forecast in the app; Rho's API page lists "burn and runway dashboards" as something customers build themselves.
- Why now:
  - AI reads documents: Rho already reads invoices with OCR and has a read-only Claude connector.
  - Founders already build this: a Rho customer (Wayve Payments) built burn/runway tracking and an AI CFO on Rho's API "in about five hours"; another (Arbor Management) automated bookkeeping that "previously took his team and a fractional CFO 3-5 hours a week." Rho, Introducing the Rho API, Jul 29, 2026.
  - More first-time founders: a record 8,625 US startups raised their first VC round in Q1-Q3 2026. PitchBook-NVCA Venture Monitor Q3 2026.

### 4. Research, user and insight
- Headline: Founders find out from their balance, not their bills.
- Research strip (use honest counts): founder interviews | founder threads on Reddit, Hacker News, Indie Hackers | studies and data | competitor products reviewed.
- Our user: first-time founder at pre-seed or seed, 6-12 months after the first raise, team of about 4 (Carta median seed team, May 2026), no finance hire, too busy.
- Founder voice:
  - Interview: Sarah Chou ran the books herself for about 3 years with a box of receipts, hired help on trust, had no check between monthly accountant visits.
  - A seed founder asked Pilot for a dashboard of "how many days left until we die?" Pilot blog, Mar 27, 2026.
  - Add Tyler's new interview quotes here.
- Behavior:
  - Budgets got users opening the app more often but didn't change what they spent. Clarity Money x Duke Common Cents Lab, 9,035 users, 13 weeks.
  - Alerts sent before a fee hits cut charges 13-18%; generic low-balance warnings barely helped. UK FCA Occasional Paper 40, Jul 2018, 1M+ customers.
  - AI-timed, loss-framed alerts cut overdrafts 9% the next week. Mint trial, 39,000+ users (run 2018, published Management Science, May 2025).
  - Admin takes about 36% of an entrepreneur's 45-hour week. Time etc/Censuswide, n=251, 2023 (vendor survey).
- Insight (dark band): Runway is lost when it's signed, not when it's spent.

### 5. How we got here
- Headline: From 30 ideas to one.
- Funnel: about 30 ideas from 10 angles, 4 finalists, 1 winner.
- Criteria: case fit, trust, built on Rho, originality, evidence it changes behavior.
- Why the finalists lost:
  - Flight Plan (budgets): budgets don't change behavior; Ramp and Digits already do it.
  - Investor-update prep: runs on the investor's calendar, not the founder's decision moment.
  - Approval co-sign: misses slow sales; kept as one screen inside Raise-By.
  - AI CFO chatbot: founders don't know what to ask.
- Pivot line: We started with a smarter dashboard. Research showed dashboards don't change behavior, alerts at the moment of decision do. So we moved the warning onto the bill.

### 6. The solution
- Headline: Raise-By: one date, built from what's already signed.
- One line: Rho tells a founder when to start raising (when 6 months of cash remain), stays quiet until that date moves, then shows why and hands them a ready-to-approve fix.
- See: burn, runway, upcoming obligations (payroll, bills, renewals and cancel windows) and anything unusual (duplicate charges, new vendors, spending jumps).
- Act: ready-to-approve actions: approve or change a bill, a drafted cancel or switch-to-monthly email, invoice reminders, dispute a duplicate. Founder approves everything.
- Plan: see the effect before committing: a new hire's start date, a raise that takes 9 months instead of 6, a price change. Every option priced in days of runway.
- Cut: Close (Rho Close already does AI bookkeeping); Delegate (team of about 4, no finance person yet; read-only accountant share only).

### 7. Built on what Rho already has
- Headline: Rho already holds every input. We connect them into a date.
- Reuses (all on rho.co / docs.rho.co):
  - Cash and every transaction across accounts.
  - Scheduled payments, which Rho's API calls money "committed but has not gone out yet."
  - Bill Pay with OCR reading vendor, amount and due date, with a confidence flag.
  - Vendor cards: one card per subscription, so software spend is visible by vendor.
  - Invoicing: unpaid and overdue customer invoices.
  - Payroll debits from Gusto, Rippling, Justworks, Deel (Rho doesn't run payroll).
  - Accounting sync: QuickBooks Online, NetSuite, Sage Intacct, Xero, Puzzle.
  - Roles, including Bookkeeper, External Accountant and an Investor role.
  - Rho for Slack and a read-only Claude connector.
- Adds: a forward-looking forecast; reading renewal and cancel terms from contracts; spotting recurring payroll and subscriptions; speak only when the date moves; options priced in days; drafted fixes.

### 8. Demo
- Setup line (synthetic): a seed SaaS company raised $2.7M in July 2026, planning 18 months. By November it should have 14 months. It has 11.
- Flow: date moved (guess first, optional) > reveal mid-April 2027 (base case Apr 11; range Mar 1 - Apr 28) with the math > "Payroll rose $27K a month. 3 new hires?" confirm > signed vs not certain bar > HubSpot renewal $60K, 9 days left on the cancel window, options priced in days > 2 overdue invoices, drafted reminders > one "not sure" item (a duplicate charge) > Claude answering "when should we raise?" with the same date.
- End line: Before, she finds out in January from her balance. After, she finds out this week from the bill.

### 9. Trust
- Headline: What it knows, what it won't guess, and who's in control.
- AI reads and explains. Math makes every number. A checker blocks any number the math didn't produce.
- Anything inferred waits for the founder's yes.
- A range, not a fake-exact date. Shows what it can't see.
- Speaks only when the date moves 7+ days; "didn't bother you" list.
- When it's wrong: "This is wrong" recalculates and is logged. Missing data widens the range.
- Who sees it: admins only; payroll as one total; read-only, expiring accountant share.
- Never moves money. Never gives investment or tax advice. "Estimated range," never "you must."

### 10. MVP and scale
- MVP (Q1 beta, about 50 design partners): home card, reveal with receipts, bill price tag, drafted vendor and invoice emails, unusual-item flags, "This is wrong," admin-only, cancel-window alert.
- Later: forecast track record, Slack, Claude answers, more what-ifs, co-founder co-sign, API field.
- Tradeoffs: a range over a single date; quiet by default over more alerts; drafts over automatic actions.
- Scale: stages (pre-seed, seed, Series A); team sizes (solo, co-founders, first finance hire); adjacent users (fractional CFOs, accountants, consumer startups via Stripe or Shopify data, AI agents via Rho's API).

### 11. Metrics and close
- Headline: Success means founders act before the date.
- North star (decisions): share of date-move alerts that lead to a founder action within 7 days.
- Adoption: admins who confirm an inferred item within 7 days.
- Relevance: "not relevant" and mute rate.
- Literacy: the gap between the founder's guess and the real date shrinks (about 90 days to under 30).
- Guardrails: zero money moved without approval; at most 1 interruption a month; "This is wrong" under 5%.
- Long term: retention through the next round; the round lands at Rho.
- Why it matters to Rho:
  - Rho's own FAQ: "When should a startup switch banks?" "Ideally never. That's the point of choosing well at seed." 58% of founders have one bank account (NFX survey, 870 founders, 2023).
  - Rho's money comes after the raise: partner programs pay a bonus "once you raise" for keeping $200K and running payroll through Rho; Treasury fee 0.60% a year under $2M (rho.co/rates).
  - Raising takes time: 40% of founders took 3-5 months, 31% took 6-12 (NFX). Median seed to Series A is 616 days (Carta).
- Close (dark): Every finance tool shows founders what they spent. Rho shows what they've already signed.

---

## Part 4. Numbers sheet (synthetic demo company, keep identical everywhere)

- Raised $2.7M in July 2026. Planned burn $150K a month = 18 months.
- November 11, 2026 (month 4): cash $2.1M.
- New: 3 hires +$27K a month (Gusto debits, founder confirms). Sales $9K a month behind plan. HubSpot annual renewal $60K, auto-renews Dec 20, cancel window closes Nov 20.
- Burn now about $186K a month, plus the $60K renewal. ($2.1M - $60K) / $186K = about 11 months.
- Raise-by = cash-out minus 6 months: was July 2027, now Apr 11, 2027 (base case; range Mar 1 - Apr 28).
- Of the 3 months lost: about 2.4 signed (hires and renewal), about 0.6 not certain (sales).
- Daily burn about $6.3K. Renewal = about 9 days. Monthly billing = about +1 day. Cancel = about 9 days. Collecting $18K overdue = about +2 days.

---

## Part 5. Do not say

- "Rho is a bank," "FDIC-insured," "bank-verified." Say "Rho account."
- "AI CFO," "accurate," "guaranteed," "you must raise by."
- Rho runs payroll or integrates with Gusto. Rho sees Gusto debits; the founder confirms.
- Rho Invoicing sends reminders (not confirmed). Say Rho drafts a reminder the founder sends.
- "Rho has nothing for runway." Rho has a manual calculator on its tools page; say "no live runway in the app."
- A $150M Series C for Rho (unverified). "80% more clients after SVB" (that was 2020, PPP).
- SimpleClosure's 71% or $265K as current (they are 2024 numbers).
- Any Treasury, yield or "move your cash" suggestion.
- Mercury can't build this. Say Mercury looks backward today; Rho already has the pieces to look forward.

---

## Part 6. Re-check before slides

- Carta "about 60% of seed deals go to first-time founders" and "about 5% of $1M-$10M startups have a finance person": seen only in search excerpts.
- Rho's runway calculator page (rho.co/tools/runway-calculator): not opened.
- Neue Montreal is a commercial font; if not licensed, use Inter regular.

Sources: research_brief.md in this folder, and the agent reports in the session scratchpad (research/, rho_fit/, judges/, panel/, stress/).
