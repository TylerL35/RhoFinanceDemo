# BUILD PROMPT: Raise-By pitch deck for the NYU PMC x Rho case competition

Paste this whole file into the tool you're building slides with. Attach the images in `assets/` and the files in `source/` (folder: ~/rho-casecomp/). Everything the deck needs is below: the task, the design system, the slide-by-slide content with sourced facts, the demo screens, the numbers, and what not to say.

---

## Your role and task

You are a senior product designer and pitch-deck designer. Build an 11-slide, 16:9 pitch deck for a 7-minute product pitch (target 6:15 spoken). The deck pitches "Raise-By," an AI feature for Rho (rho.co). It must:

1. Follow the case's judging criteria exactly (listed below) so every criterion is visibly answered.
2. Look like Rho made it: Rho's real fonts, colors, layout patterns and product UI (design system below, plus reference screenshots in `assets/`). Impeccable, minimal, editorial. Not a generic student deck.
3. Use only the facts given here, each with a small source footer. Don't invent numbers, quotes, customers or features.
4. Keep headlines as full-sentence claims in sentence case. Someone reading only the headlines should get the whole story.

Deliver: the slides (editable), plus speaker notes per slide (about 50-80 words each, plain first person, no cue words), plus a short appendix (numbers sheet, sources, Q&A backup).

Work in this order: build slide 1 and slide 6 first as a style check, then the rest.

---

## Reference images (attach these)

Rho brand and website style:
- `assets/rhoco_startups_hero.jpg`: rho.co startups page. Dark near-black hero, huge regular-weight white headline, mint "Open Account" button, monospace uppercase eyebrow chip with a small mint square, scattered white-dot texture.
- `assets/rhoco_logos_row.jpg`: dark section with a monospace uppercase label and a single row of customer logos.
- `assets/rhoco_billpay_light_hero.jpg`: light product page. White background, big regular headline, body copy, email field with mint button, small gray disclaimer.
- `assets/rhoco_stat_cards_eyebrow.jpg`: light stat cards (very light gray fill, big number, small gray caption) and a monospace "HOW IT WORKS" eyebrow above a big headline.

Rho's real product UI (use to make demo screens look authentic):
- `assets/rho_web_accounts_tab.png`: web app. Left sidebar (Home, Transactions, Accounts, Cards, Vendors, Reporting; Workflows: Invoicing, Expenses, Reimbursements, Bill Pay, Accounting), Accounts table, mint "Move funds" button.
- `assets/rho_web_accounting_dashboard.png`: Accounting dashboard with counters (Sync Errors, Not Synced, Missing Attributes), transaction table, "Request Accountant" menu.
- `assets/rho_web_home_balance_widget.png`: Home balance widget.
- `assets/rho_mobile_home.png`: mobile home: "N transfers need your approval" banner, total balance, Deposit/Transfer/Pay, accounts list.

Case material:
- `source/NYU PMC x Rho Case Prompt - Fall 2026.pdf` and `source/case_prompt.txt`: the full case prompt.
- `source/Product Thinking Slides.pdf` (also `source/slides_1-9.png`): PMC's framework: product-market fit, inflections (technology, regulatory, societal, adoption), insight (a non-obvious truth about using an inflection), problem validation through user interviews.

---

## Case requirements (from the prompt)

- Design an AI-powered feature, workflow or system change that uses Rho's view of a company's money to help users understand what's happening and act on what matters.
- Choose a specific user. (Ours: a first-time founder at pre-seed or seed.)
- Address See, plus one or two of Act, Close, Plan, Delegate, and explain why the rest were deprioritized. (Ours: See + Act + Plan.)
  - See: turn raw transactions into a clear, current picture of burn, runway, upcoming obligations and anything unusual.
  - Act: turn an insight into a ready-to-approve action (pay a bill, cancel an unused subscription, move idle cash).
  - Close: reduce the work of keeping books clean and investor-ready.
  - Plan: model decisions (a new hire, a delayed raise, a price change) and see the effect on runway before committing.
  - Delegate: share finance work safely with the right roles, approvals and visibility.
- Goal: the right insight to the right person at the right time, trustworthy enough that they act on it.
- Rules: the user stays in control (no money moves without human approval); every insight shows its work; relevance over volume (show how the product decides what NOT to surface); financial data protected (roles, permissions, what happens when the agent is wrong); extend Rho, don't rebuild; clickable prototype or demo (no real AI backend needed); go deep on one moment.
- Expectations: clear problem, solution and user; prototype; at least one end-to-end scenario (a specific company, a specific financial development, what the user does next); feasibility, MVP scope, key tradeoffs, fit with Rho's existing product; hypothetical companies and synthetic data are fine; keep assumptions about Rho's internal systems separate from evidence.

## Judging criteria (follow exactly)

1. Problem identification: a specific failure point in how startups understand and act on their finances; why it matters now; why existing tools fall short.
2. Impact analysis: significance of the problem; relevant data points, user behavior patterns, competitive insights.
3. Solution design: addresses the pain for the chosen user; creative or original; connects specific financial activity to a clear, actionable insight and shows why it matters; keeps the user in control, explains its suggestions, protects financial data; justified as the best option among alternatives considered.
4. Design and prototyping: clear prototype or demo with a compelling core experience; scales across company stages, team sizes, or adjacent users.
5. Success metrics: measure insight relevance, adoption and effect on user decisions, not number of alerts; prioritize the right KPIs; balance short term vs long term.
6. Presentation quality: clear, organized, accessible to business and technical audiences; within 7 minutes with sufficient, well-prepared slides.
7. Overall impact: creativity, strong product thinking, genuine focus on user needs.

Put a small gray tag in the bottom-left of slides 2-11 naming the criterion it answers (e.g., "1 · Problem identification").

---

## Demo screens to build (match Rho's real web app; label "Synthetic data")

All screens: white background, Rho sidebar on the left, black text, one mint button per screen, 6px radius, light gray cards (#EFF3F2 fill, #D7E0DE border).

1. Home card, "Your raise-by date moved this week." Optional guess: month chips May / Jun / Jul / Aug 2027, buttons "Reveal" (mint) and "Just show me." Small note: on a normal week the card says "Raise-by holds at Jul 2027. Next check Monday."
2. Reveal. "Start raising by Apr 14, 2027. Estimated range Mar to May." Math line: "$2.04M cash after the renewal ÷ $186K a month = 11 months. Minus your 6-month cushion = start by Apr 14." Link "Change cushion." Confirm card: "Payroll through Gusto rose $27K a month in Oct. Is that 3 new hires?" buttons "Yes, 3 hires" / "One-time" / "Other." Bar "Why it moved 3 months": Signed 2.3 mo (solid mint) vs Not certain yet 0.7 mo (outline). Rows with source chips: Payroll +$27K a month (6 Gusto debits, confirmed by you); HubSpot renewal $60K on Dec 1 (quoted from order form); Sales $9K a month behind plan (12 deposits).
3. Bill Pay, awaiting approval. "HubSpot, annual renewal, $60,000. Auto-renews Dec 1. Already in your raise-by date." Highlight: "9 days left to change it (cancel window closes Nov 20)." Quote: Order form p.2: "renews automatically unless notice is given 30 days prior." Chips: Open order form, Last year's charge, $6.3K a day burn. Options with dates: Approve as is (Apr 14), Ask for monthly (about +5 days, Apr 19), Cancel (+10 days, Apr 24). Note: "Draft opens in your email. You review and send. Monthly plans can cost more, so the net shows once they quote."
4. Invoicing, the open part. "Sales are $9K a month behind your plan." Acme Corp $12,000, 21 days overdue; Brightline $6,000, 14 days overdue. Mint button "Draft 2 reminders, about +3 days." Note: "Collecting moves timing; closing $9K more a month by Feb holds Apr 14."
5. Unusual item: "Not sure, take a look: possible duplicate charge" (same vendor, same amount, 6 days apart) with "Dispute" / "Not a duplicate."
6. Trust panel. "About three quarters is already signed." "Didn't bother you: 41 items. Rule: we only speak up when something moves your date 7 days or more." "What we can't see: payroll detail beyond Gusto totals, Stripe payouts before they land, accounts outside Rho." "AI reads and explains. Math makes every number. You approve. Rho never moves money." Buttons "This is wrong," "Share read-only with accountant."
7. Claude, connected to Rho (read-only). User: "When should we start raising?" Answer: "Rho estimates Apr 14, 2027 (range Mar to May), when you'd have 6 months of cash left. It moved 3 months earlier mainly because of 3 new hires and the HubSpot renewal. Sales is the uncertain part." Source chips: Rho raise-by, HubSpot order form p.2, Gusto debits.

---

## Quality checklist before you finish

- Every number matches the numbers sheet. Every stat has a source footer.
- Headlines are full sentences; only one big number per slide.
- Fonts and colors match the design system; mint is the only accent.
- Demo screens look like Rho's real app (compare to the assets).
- No AI clichés, no gradients, no stock photos, no emoji, no em dashes.
- Each judging criterion is tagged and visibly answered.
- Total spoken time about 6:15.

---

# Full content: deck master

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
- Flow: date moved (guess first, optional) > reveal Apr 14, 2027 (range Mar-May) with the math > "Payroll rose $27K a month. 3 new hires?" confirm > signed vs not certain bar > HubSpot renewal $60K, 9 days left on the cancel window, options priced in days > 2 overdue invoices, drafted reminders > one "not sure" item (a duplicate charge) > Claude answering "when should we raise?" with the same date.
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
- New: 3 hires +$27K a month (Gusto debits, founder confirms). Sales $9K a month behind plan. HubSpot annual renewal $60K, auto-renews Dec 1, cancel window closes Nov 20.
- Burn now about $186K a month, plus the $60K renewal. ($2.1M - $60K) / $186K = about 11 months.
- Raise-by = cash-out minus 6 months: was July 2027, now April 14, 2027 (range March to May).
- Of the 3 months lost: about 2.3 signed (hires and renewal), about 0.7 not certain (sales).
- Daily burn about $6.3K. Renewal = about 10 days. Monthly billing = about +5 days. Cancel = +10 days. Collecting $18K overdue = about +3 days.

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


---

# Full research brief (background for speaker notes and Q&A)

# Raise-By: research brief (NYU PMC x Rho case competition)

Team: Michael, Neha, Tyler, Regis. Deck due Thu Nov 12, 11:59pm ET. Pitch Fri Nov 13 (7 min + 3 min Q&A).
Status: working draft, Nov 11. Items marked [verify] are being fact-checked. Demo numbers are synthetic.

---

## 1. The problem

- Failure point: first-time founders learn their runway shrank after it is too late to act.
- Why it happens: hires, annual renewals and other commitments are signed weeks before the money leaves the account. Runway tools average past spending, so they only catch it later.
- How founders find out: from an outsider (an investor, an accountant, a lender) or from their bank balance, not from a routine check.

## 2. Our user (ICP)

- First-time founders at pre-seed and seed, 6 to 12 months after their first raise ($500K to $3M), team of 2 to 6.
- Little or no finance experience. No CFO or finance hire, at most a part-time bookkeeper.
- Too busy building and selling to watch the numbers. They want it handled, and want to be told what to do.
ICP data (checked Nov 11; sources in scratchpad rho_fit/03_icp_data.md):
- How many: a record 8,625 US startups raised their first-ever VC round in Q1-Q3 2026, beating 2021's full-year record (PitchBook-NVCA, Oct 2026). 50,316 pre-seed SAFEs and notes in 2025, $10.4B (Carta). 5.67M US business applications in 2025, 1.71M likely to hire (Census).
- First-time: about 60% of seed and Series A deals go to first-time founders (Carta, 2025) [search excerpt only, re-check].
- Small teams, no finance hire: median seed team is 4 people (Carta, May 2026). About 5% of startups valued $1M-$10M have a finance person (Carta, 2023) [search excerpt only, re-check].
- Doing it alone: more than 2 in 3 US small business owners do their own bookkeeping (QuickBooks survey, n=1,305, vendor). 39% handle finances alone; only 15% use an accountant (Xero, US, n=1,021, 2024, vendor).
- Too busy: admin takes 36% of a 45.5-hour week, about 16 hours (Time etc/Censuswide, n=251, 2023, vendor).
- Low confidence: 38% don't know if they were profitable last month; 55% avoid their finances (Xero/Opinium, UK, n=1,000, Oct 2025, vendor; UK sample). US: 50% hit problems from limited financial knowledge though 55% rate their literacy high (Xero 2024).
- Seed economics: median seed $3.0M (PitchBook 2026) or $4.1M (Carta); seed to Series A median 616 days, about 20 months (Carta); YC: a round lasts 18-24 months; only 24% of 2023 $1M+ seed companies got past seed vs 55%+ historically (SimpleClosure, Aug 2026).
- Founder voice (Pilot's interviews with seed founders, Mar 2026): one asked for a dashboard of "how many days left until we die?"; others say they only know the account hasn't hit zero, that they've never taken a business class, that their financial systems are "in shambles."
- Could not find: share of founders who misjudge runway; hours spent on finance specifically.

## 3. What the research found

Evidence (checked against primary sources Nov 11; footers in scratchpad rho_fit/04_stat_verification.md):
- VERIFIED. Paul Graham: "Half the founders I talk to don't know whether they're default alive or default dead." (Default Alive or Default Dead?, Oct 2015)
- VERIFIED. Mercury: 75% of founders say running a business costs more than expected, up from 66% (survey of 1,500 US founders, published Aug 19, 2026; vendor survey).
- VERIFIED. CB Insights (Mar 5, 2026): 70% of 385 shutdowns ran out of cash, which CB calls the symptom, not the root cause (PMF 43%). Median 22 months from last raise to shutdown. Frame Raise-By as visibility, not a cure.
- CORRECTED. SimpleClosure: only 24% of 2023 seed-funded startups ($1M+ rounds) made it past seed, vs a historical 55%+ (H1 2026 report, Aug 20, 2026). The 71% pre-seed/seed share and ~$265K left at shutdown are 2024 data; cite as 2024 only, or skip.
- VERIFIED. Carta via TechCrunch: 966 shutdowns in 2024 vs 769 in 2023 (+26%); Carta says it undercounts.
- VERIFIED. HN founder pplante, Bench shutdown thread, Dec 27, 2024: "This led to a $300k shortfall from where I thought I was vs reality." (Bench had hidden his Gusto payroll lines; it led to layoffs.)
- VERIFIED. Census: 5.67M US business applications in 2025.
- VERIFIED. Carta: 50,316 pre-seed SAFEs and notes in 2025 ($10.4B).

Behavior patterns:
- Founders push finance off until something forces them to look (tax deadlines, investors, lenders).
- VERIFIED. Budgets don't change behavior: Clarity Money x Duke Common Cents Lab, 9,035 users, 13 weeks. Budgets got people opening the app more often, but spending didn't change.
- VERIFIED. Alerts at the moment of decision do: UK FCA (Jul 2018, 1M+ customers at 2 banks). Alerts sent before a fee hits cut charges 13 to 18%; generic low-balance warnings barely helped.
- CORRECTED date. Mint trial (run 2018, published May 2025, 39,000+ users): AI-timed, loss-framed alerts cut overdrafts 9% the next week.
- CAVEAT. CFO trust: only 14% of CFOs fully trust AI accounting data; 86% have seen it get things wrong (n=100, vendor-commissioned, Wakefield for Maximor, Jan 2026).
- CORRECTED framing. APQC: even top payables teams see 0.8% of payments go out duplicate or wrong; bottom teams 2% (count of payments, 2020 data).
- People switch off AI that gets things wrong; trust has to be earned with receipts.
- Founders want the job handled, not another dashboard: "I wish someone would just tell me what to do" (r/Entrepreneur).

Interviews:
- Sarah Chou (founder, B2B annual contracts): ran the books herself for about 3 years with a box of receipts, then a trusted friend, then an accounting firm. Hired on trust, no live check between monthly accountant visits. OK with AI only with a human in the loop.
- Additional founder interviews: [pending, Tyler]

Competitive landscape:
- Mercury Insights (Mar 2026): runway = balance divided by average burn of the last 3 months. Looks backward.
- Ramp Budgets (Jan 2026), Digits Budgets (Nov 2026): budget vs actual for finance teams.
- Puzzle, Pilot: trailing burn and runway. Xero and QuickBooks: short forward views from bills.
- Table stakes: burn and runway display, budgets, spend alerts, what-ifs, AI chat.
- Not found anywhere: a raise date built from signed commitments, options priced in days at the moment of decision, quiet-by-default with a visible "didn't bother you" list.

## 4. Insight

Runway is lost when it is signed, not when it is spent. The platform that pays your bills sees the signature first, and AI can now read those signatures. So Rho can warn founders at the moment they can still act.

Inflections (why now):
- Technology: AI can reliably read contracts and invoices, and act as a read-only agent (Rho already has a Claude connector).
- Adoption: founders already use AI on their own finances (a Rho customer built an AI CFO on the Rho API in about five hours); Mercury, Ramp and Rho shipped finance agents in 2026.
- Society: record US business formation (5.67M applications in 2025, Census); more first-time founders on lean teams.
- Norms: human approval for AI money movement is becoming standard (e.g., Mercury Agent Controls).

## 5. Ideation and why Raise-By won

- About 30 ideas from 10 angles (behavioral, AI-native, trust, founder empathy, data, contrarian, analogies, Rho growth, social, demo-first), narrowed to 4 finalists, then 1.
- Criteria: case fit, trust, feasibility on Rho, originality, evidence it changes behavior.
- Finalist scores on the 7 judging criteria (out of 70): Raise-By with the approval price tag 63, Raise-By alone 57, Price Tag / Second Key 55, Before They Ask 52, Flight Plan 45.
- Why the others lost:
  - Flight Plan (budgets and a plan): budgets don't change behavior; Ramp and Digits already do it; too broad.
  - Before They Ask (investor-update prep): runs on the investor's calendar, not the founder's decision moment.
  - Price Tag / Second Key: misses slow sales; kept as one screen inside Raise-By.
  - AI CFO chatbot: founders don't know what to ask.
- Pivot: we started with a smarter dashboard. Research showed dashboards and budgets don't change behavior, but alerts at the moment of decision do. So we moved the warning onto the bill.

## 6. The solution: Raise-By

One date, the day the founder should start raising (when 6 months of cash remain), built from what is already signed. Quiet until it moves. When it moves, Rho shows why with receipts and hands the founder a ready-to-approve fix.

## 7. Objectives: See + Act + Plan

The case requires See plus one or two of Act, Close, Plan, Delegate. We chose Act and Plan.

See (required): a clear, current picture of burn, runway, upcoming obligations and anything unusual.
- Burn and runway: the raise-by date from current spending plus signed commitments, shown as a range with the math on screen.
- Upcoming obligations: payroll, scheduled bills, renewals and their cancel windows (the "signed" part of the bar).
- Anything unusual: duplicate charges, unfamiliar vendors, spending jumps, surfaced if they move the date 7+ days. Anything the AI can't classify goes to "Not sure, take a look."

Act: turn an insight into a ready-to-approve action.
- Approve or change a bill; a drafted cancel or switch-to-monthly email to a vendor; reminders for overdue invoices; dispute a duplicate charge.
- Why: our user is too busy to work out the next step.
- Boundary: nothing happens without the founder's approval. No idle-cash or Treasury suggestions (Rho Treasury is run by an SEC-registered adviser).

Plan: model a decision and see the effect on runway before committing.
- New hire: "Hire #4 in March instead of January?" shows the new date before the offer goes out.
- Delayed raise: "What if raising takes 9 months instead of 6?" (change the cushion).
- Price change: "What if we raise prices 10%?" (sales range shifts).
- The price tag on a bill is Plan at the moment of commitment ("this renewal costs 10 days").

Deprioritized:
- Close: Rho Close already does AI bookkeeping, and clean books don't drive this week's decision. We use its categories as an input.
- Delegate: our user has no finance person and a team of 2 to 6, so there is little to delegate yet. We keep a read-only share with an accountant; full delegation comes when they hire finance.

Right insight, right person, right time:
- Right insight: the one thing that moved the raise-by date, and why.
- Right person: the founder (admins only), with an optional read-only share to their accountant.
- Right time: the decision moment (a cancel window closing, a bill waiting for approval); quiet otherwise.
- Trusted enough to act on: receipts on every number, inferred items wait for the founder's yes, a range not a fake-exact date, nothing happens without approval.

## 8. Built on what Rho already has

Rho already holds the inputs; Raise-By adds a founder-friendly layer on top.
- Reused: bank balances and transactions; scheduled payments; Bill Pay with invoice scanning (OCR) and duplicate flags; Invoicing (receivables and due dates); corporate cards; Rho Close categories and accounting syncs (QuickBooks and others [verify list]); roles and approvals; the Slack app; the read-only Claude connector; the API including Cash Flow Insights (beta).
- New: a forward-looking forecast engine (signed vs not certain), reading renewal and notice terms from contracts, the 7-day surfacing rule, pricing options in days, drafted actions, the trust panel.
- Rho today shows no runway or forecast in the app; its API page tells customers to build their own.
Inventory, checked Nov 11 (full table in scratchpad rho_fit/01_rho_inventory.md):
- Cash and transactions: checking, sub-accounts, linked outside accounts (Plaid, Mastercard, Stripe). Every inflow and outflow with counterparty and memo.
- Scheduled and recurring payments: the API describes them as money "committed but has not gone out yet" (amount, frequency, next release date). API in Beta.
- Bill Pay with OCR: forwarded invoices become draft bills; OCR reads vendor, amount and due date with a Green/Yellow/Red confidence flag. QuickBooks bills sync into Bill Pay.
- Cards and vendor cards: one card per vendor or subscription, so recurring software spend is visible by vendor.
- Invoicing: receivables with due dates and unpaid/overdue status.
- Accounting sync: QuickBooks Online (native plus bank feed), NetSuite, Sage Intacct, Xero, Puzzle, Campfire; Rillet as a one-way bank feed. Only QuickBooks is partly two-way.
- Rho Close: AI suggests coding, a human confirms, then it syncs (same pattern Raise-By uses).
- Payroll: Rho does not run payroll; Gusto, Rippling, Justworks, Deel and Every pull funds over ACH, so Rho sees the debits.
- Roles: Account Owner, Administrator, Department Owner, Employee, Bookkeeper, Investor, AP & Expense Manager, External Admin, External Accountant, custom roles. (An Investor role already exists.)
- Surfaces: Home and All Accounts (total cash, money in vs out, Oct 2026); Rho for Slack (GA Nov 4; routines announced; approvals "not yet"); read-only Claude connector; API with webhooks.
- Other: Capital credit line (GA Sep 2026), incorporation, Treasury.

What Raise-By reuses vs adds:
- Reuses: cash, scheduled outflows, bills with OCR, receivables, vendor card history, accounting categories, payroll debits, roles, webhooks, Home/Slack/Claude surfaces, the read-only cite-your-sources AI pattern.
- Adds: the forward-commitment forecast (Rho only shows past cash flow); contract-term extraction (no renewal or notice field exists today); inferring recurring payroll and subscriptions from history (recurring bill pay "not supported yet"); the speak-only-when-the-date-moves rule; pricing options in days; drafts for the founder to send.

Corrections to our assumptions:
- Invoice reminders: NOT confirmed in Rho Invoicing (Rho's own comparison credits reminders to Stripe). In the demo, the reminder is a drafted email the founder sends, and we call it new.
- Rho has a web runway calculator in its tools (rho.co/tools/runway-calculator, seen in the sitemap, not opened). It's a manual calculator, not live in the app; mention it carefully.
- Rho's Treasury page says enterprise-style cash forecasting isn't what most growing companies need. Our answer: this isn't enterprise forecasting; it's one date for founders who have no finance person.
- Rho's Slack marketing promises a heads-up before payroll leaves. Raise-By sits above alerts: it explains what changed the date and what to do.
- Keep off slides: the Capital limit ($2M vs $5M on different pages) and whether the Slack agent is for all businesses or select ones (pages disagree).

## 9. Why this supports Rho specifically

- Fills a visible gap vs Mercury, and goes further: forward-looking instead of trailing.
- The raise is when founders choose where the money lands; if Rho told them when, the round is more likely to land at Rho (deposits).
- Keeps founders through seed and Series A; pulls more bills and invoices through Rho.
- Accountants and investors who see the shared view refer other startups (Rho already runs partner programs).
- Fits "business banking for the AI era" and "the source of truth your agents plug into."
Business data points (checked Nov 11; sources in scratchpad rho_fit/02_rho_business_fit.md):
- Rho is a fintech, not a bank; checking and cards through Webster Bank and Lead Bank. No monthly or per-user fees; earns from card interchange and deposits.
- Treasury: $50K minimum; Rho's fee is 0.60% a year under $2M, down to 0.15% at $20M+ (rho.co/rates). A $3M round in Treasury is roughly $13.5K a year in fees at the 0.45% tier (assumption on balance).
- Cards: up to 1.25% cashback standard, up to 2% on Platinum.
- Funding: "more than $205 million in equity and debt" (Bloomberg, Jan 2024); $75M Series B Dec 2021. A $150M Series C is NOT verified; don't cite.
- Rho's own startup FAQ: "When should a startup switch banks?" "Ideally never. That's the point of choosing well at seed." NFX survey of 870 founders (2023): 58% had only one bank account.
- Rho's partner program (e.g., Precursor Ventures): free incorporation, then "once you raise" a $2,000 bonus for keeping $200K for 90 days and running payroll through Rho. Rho's money comes after the raise; Raise-By helps more founders get there.
- Rho's API page lists "burn and runway dashboards" as something customers can build themselves; Rho's API tokens "do not initiate payments."
- Verified on rho.co (I checked the pages myself): Seve Ortale of Wayve Payments built burn/runway tracking, an AI CFO chat and weekly board summaries on Rho's API "in about five hours" (Introducing the Rho API, Jul 29, 2026; Oct '26 Product Update). Rho: "the source of truth your agents plug into" (Oct '26 Product Update).
- Also on Rho's API post: Justin Hays (Arbor Management) connected Rho's API and QuickBooks to Claude to automate bookkeeping, work that "previously took his team and a fractional CFO 3-5 hours a week." Evidence that savvy founders are already building this layer themselves; Raise-By gives it to founders who can't.
- Fundraising takes time: NFX 2023, 40% of founders who raised took 3-5 months, 31% took 6-12 months (supports a 6-month cushion).
- Seed economics: median seed $4.1M at $24.3M valuation (Carta, Jul 2026); median 616 days from seed to Series A (Carta, Sep 2025).
- Competition: Mercury 300K+ customers, ~$650M revenue run rate, "one in three US startups," AI recap alerts (Mercury annual letter, Feb 2026). Capital One closed its Brex acquisition Apr 7, 2026. Ramp 70K+ customers, $1B+ run rate (Jun 2026).
- Not public: Rho's revenue, customer count, valuation, deposit spread.
- The 80% jump in Rho clients was in 2020 (PPP loans), not after SVB; don't cite it as an SVB effect.

## 10. Trust and safety

- AI reads documents and explains; fixed math makes every number; a checker blocks any number the math didn't produce.
- Anything inferred (e.g., "Payroll rose $27K a month. 3 new hires?") waits for the founder's yes.
- Range, not a single date. Says what it can't see (payroll detail, accounts outside Rho).
- Never moves money; never gives investment or tax advice. Wording: "estimated range," never "you must."
- Admins only; payroll shown as one total; accountant share is read-only and expires.
- "This is wrong" recalculates and is logged.

## 11. MVP and roadmap

- MVP (beta, about 50 design partners): home card, reveal with receipts, bill price tag, vendor and collections drafts, unusual-item flags, "This is wrong," admin-only, cancel-window alert.
- Later: forecast track record, Slack, Claude connector answers, fuller what-ifs, co-founder co-sign, API field, consumer startups via Stripe/Shopify data.

## 12. Success metrics

- North star (decisions): share of date-move alerts that lead to a founder action within 7 days.
- Adoption: admins who confirm an inferred item within 7 days.
- Relevance: "not relevant" and mute rate.
- Literacy: gap between the founder's guess and the real date shrinks (about 90 days to under 30).
- Guardrails: zero money moved without approval; at most 1 interruption a month; "This is wrong" under 5%.
- Long term: retention through the next round; the next round deposited at Rho.

## 13. Demo scenario (synthetic)

Seed SaaS company, $2.7M raised July 2026, planned $150K a month (18 months). By November: 3 hires (+$27K a month), a $60K annual renewal due Dec 1 with a cancel window closing Nov 20, sales $9K a month behind, $18K in overdue invoices. Cash $2.1M; about $186K a month plus the renewal, so about 11 months. Raise-by moves from July 2027 to April 14, 2027 (range March to May).
