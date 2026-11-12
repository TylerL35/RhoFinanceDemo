// Offline for the demo. Every file the app ships is cached at install time,
// because the venue network cannot be trusted and a half-cached screen would
// render as a blank card in front of judges.
//
// PRECACHE is generated from `find public -type f | sort` minus sw.js, and
// tests/sw.test.mjs fails if a shipped file is missing from it.
const CACHE = 'raise-by-v1';
const PRECACHE = [
  './data/fixture-seed.json',
  './data/rho-sandbox.snapshot.json',
  './index.html',
  './js/app.js',
  './js/calendar.js',
  './js/derived.js',
  './js/engine.js',
  './js/intents.js',
  './js/money.js',
  './js/scenario.js',
  './js/screens/alerts.js',
  './js/screens/bar.js',
  './js/screens/bill.js',
  './js/screens/claude.js',
  './js/screens/common.js',
  './js/screens/confirm.js',
  './js/screens/connect.js',
  './js/screens/home.js',
  './js/screens/invoices.js',
  './js/screens/reveal.js',
  './js/screens/setup.js',
  './js/screens/trust.js',
  './js/screens/whatif.js',
  './styles.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

// Cache-first for GET. A miss falls back to the network and writes the response
// back into the cache, so the first online load fills any gap the install list
// could not cover. If the network is gone, a navigation still gets the cached
// shell: the precache stores './index.html', while a navigation requests '/' or
// '/?present', so those URLs never match on their own.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch((err) => {
          if (e.request.mode === 'navigate') return caches.match('./index.html');
          throw err;
        });
    })
  );
});
