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
