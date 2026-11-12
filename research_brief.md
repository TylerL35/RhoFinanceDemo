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
