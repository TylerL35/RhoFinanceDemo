# Raise-By

Static demo. No build step, no dependencies, no runtime network calls.

## Run locally

    python3 -m http.server 8000 --directory public

Port 8000 is occupied on this machine by an unrelated server, so here use:

    python3 -m http.server 8019 --directory public

The service worker is not registered on `localhost` (it is cache-first, so it would serve
old code after every edit). To test offline locally, open `/?offline`.

## Present

Open `/?present`. It starts from the fixture every time (nothing from rehearsal is
kept) and shows `Step n / 10` in the footer. No mouse needed:

| Key | Does |
|---|---|
| `→` | Next step. Steps 3, 5 and 7 are beats on the same screen: confirm the 3 hires, choose Cancel on the HubSpot renewal, draft the 2 reminders |
| `←` | Back one step, undoing a beat the keys did (never one you clicked) |
| `1`–`4` | On Home, guess May / Jun / Jul / Aug 2027 |
| `Esc` | Back to Home |
| `Shift` + `Esc` | Start over (clears every choice and what-if) |

Order: Home → Raise-by (the dot slides from Jul 12 to Apr 11) → confirm hires (the bar
re-splits, the date does not move) → Bill Pay → Cancel (+9 days, the date pill flashes,
the draft email appears) → Invoicing → draft reminders → Needs a look → Trust → Ask Rho.

The renewal beat picks Cancel (`PRESENTER_CHOICE` in `public/js/app.js`); set it to
`'monthly'` to show the near-neutral option instead. After Cancel, Trust and Ask Rho
describe the company with the renewal cancelled (Apr 20, 2.7 months), because every
screen re-derives from the same scenario.

Live what-if: on Raise-by, use the controls (Hires `+`, start month, Cushion, Prices,
HubSpot). Every tap moves the date at once; Undo steps back, "Reset what-ifs" clears
all. Typing works in plain words too ("what if we hire two engineers in april",
"prices up 10%", "drop hubspot"); anything it cannot model offers two sentences to tap.
What-ifs are hypothetical: the bar, the confirm card and Ask Rho keep describing the
real company, and the headline says the date without the what-if.

## Test

    node --test tests/*.test.mjs

## Fonts

Inter (400, 500) and DM Mono (400), SIL OFL 1.1, subset to Latin and bundled in
`public/assets/fonts` with their licences. No CDN.

## Regenerate the sandbox snapshot

    RHO_API_TOKEN=demo node scripts/fetch-rho-sandbox.mjs

This rewrites `public/data/rho-sandbox.snapshot.json`; the token is never written to it.

## Deploy

    npx vercel --prod

Set the output directory to `public`. Then make the QR from the final URL, following `assets/QR-INSTRUCTIONS.md`.

**Bump the cache version on every deploy.** `public/sw.js` precaches the whole app under a
versioned cache name (`CACHE = 'raise-by-v2'`). The fetch handler is cache-first, so a browser
that has already installed the worker answers navigations from its cached `index.html` and JS
and never asks the network — the only thing that tells it to re-install is a byte change in
`sw.js`, and the only thing that drops the old entries is the new cache name in `activate`.
So on each deploy edit the constant to the next number (`raise-by-v2` -> `raise-by-v3` ->
`raise-by-v4`, ...), commit it with the rest of the change, and deploy. Skipping the bump
serves the previous build to anyone who has visited before, which is the whole reason a
"fixed" screen can still look broken on the demo machine.
