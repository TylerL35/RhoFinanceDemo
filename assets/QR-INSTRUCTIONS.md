# Demo QR

This machine has no QR generator installed, so the QR is a manual step.

1. Deploy, then copy the final Vercel URL (for example `https://raise-by.vercel.app`).
2. Generate a QR from that exact URL, including any `?present` suffix you plan to scan.
3. Open the QR on your phone before the pitch and confirm it loads `#/setup`.
4. Save the image here as `qr-demo.png` (and `qr-demo.svg` if you have both).

Do not put the QR under `public/`: the service worker precaches every file there,
and tests/sw.test.mjs fails on a file that is listed but not shipped.
