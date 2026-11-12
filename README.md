# Raise-By

Static demo. No build step, no dependencies, no runtime network calls.

## Run locally

    python3 -m http.server 8000 --directory public

Port 8000 is occupied on this machine by an unrelated server, so here use:

    python3 -m http.server 8019 --directory public

## Regenerate the sandbox snapshot

    RHO_API_TOKEN=demo node scripts/fetch-rho-sandbox.mjs

This rewrites `public/data/rho-sandbox.snapshot.json`; the token is never written to it.

## Deploy

    npx vercel --prod

Set the output directory to `public`. Then make the QR from the final URL, following `assets/QR-INSTRUCTIONS.md`.

**Bump the cache version on every deploy.** `public/sw.js` precaches the whole app under a
versioned cache name (`CACHE = 'raise-by-v1'`). The fetch handler is cache-first, so a browser
that has already installed the worker answers navigations from its cached `index.html` and JS
and never asks the network — the only thing that tells it to re-install is a byte change in
`sw.js`, and the only thing that drops the old entries is the new cache name in `activate`.
So on each deploy edit the constant to the next number (`raise-by-v1` -> `raise-by-v2` ->
`raise-by-v3`, ...), commit it with the rest of the change, and deploy. Skipping the bump
serves the previous build to anyone who has visited before, which is the whole reason a
"fixed" screen can still look broken on the demo machine.
