import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const PUBLIC = new URL('../public/', import.meta.url);

// Dotfiles (Finder's .DS_Store) are not shipped files and are never precached.
function walk(dir, base = '') {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .flatMap((e) =>
      e.isDirectory() ? walk(new URL(`${e.name}/`, dir), `${base}${e.name}/`) : [`${base}${e.name}`]);
}

test('the service worker precaches every shipped file', () => {
  const sw = readFileSync(new URL('sw.js', PUBLIC), 'utf8');
  const files = walk(PUBLIC).filter((f) => f !== 'sw.js');
  for (const f of files) {
    assert.ok(sw.includes(`'./${f}'`), `sw.js does not precache ./${f}`);
  }
});

// ---- Behavior of the worker itself, run in a minimal ServiceWorkerGlobalScope ----

function makeCaches({ caches: initial = {} } = {}) {
  const stores = new Map(Object.entries(initial).map(([k, v]) => [k, new Map(Object.entries(v))]));
  const deleted = [];
  const api = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (urls) => { for (const u of urls) store.set(u, { body: `cached ${u}` }); },
        put: async (req, res) => { store.set(req.url, res); },
      };
    },
    match: async (req) => {
      const url = typeof req === 'string' ? req : req.url;
      for (const store of stores.values()) if (store.has(url)) return store.get(url);
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => { deleted.push(name); return stores.delete(name); },
  };
  return { api, stores, deleted };
}

function loadWorker({ caches, fetchImpl }) {
  const handlers = {};
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => {},
  };
  // Minimal Response stand-in: enough for the offline fallback to report status.
  class FakeResponse {
    constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = init.headers ?? {}; }
  }
  const sandbox = { self, caches, fetch: fetchImpl, Response: FakeResponse, console };
  vm.runInNewContext(readFileSync(new URL('sw.js', PUBLIC), 'utf8'), sandbox);
  const run = async (type, event) => {
    const waits = [];
    handlers[type]({ ...event, waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  };
  const request = async (req) => {
    let responded;
    handlers.fetch({ request: req, respondWith: (p) => { responded = p; } });
    return responded;
  };
  return { handlers, run, request };
}

test('install precaches every shipped file into the versioned cache', async () => {
  const { api, stores } = makeCaches();
  const worker = loadWorker({ caches: api, fetchImpl: async () => { throw new Error('no network'); } });
  await worker.run('install', {});
  const cached = [...stores.get('raise-by-v1').keys()].sort();
  const files = walk(PUBLIC).filter((f) => f !== 'sw.js').map((f) => `./${f}`).sort();
  assert.deepEqual(cached, files);
});

test('activate deletes caches from older versions', async () => {
  const { api, deleted } = makeCaches({ caches: { 'raise-by-v0': {}, 'raise-by-v1': {} } });
  const worker = loadWorker({ caches: api, fetchImpl: async () => ({}) });
  await worker.run('activate', {});
  assert.deepEqual(deleted, ['raise-by-v0']);
});

test('a cached GET is served without touching the network', async () => {
  let calls = 0;
  const request = { url: './styles.css', method: 'GET' };
  const { api } = makeCaches({ caches: { 'raise-by-v1': { './styles.css': { body: 'cached' } } } });
  const worker = loadWorker({ caches: api, fetchImpl: async () => { calls += 1; } });
  const res = await worker.request(request);
  assert.equal((await res).body, 'cached');
  assert.equal(calls, 0);
});

test('a GET miss goes to the network and writes the response back', async () => {
  const request = { url: './late.json', method: 'GET' };
  const { api, stores } = makeCaches();
  const worker = loadWorker({
    caches: api,
    fetchImpl: async () => ({ body: 'from network', clone() { return { body: 'from network' }; } }),
  });
  const res = await worker.request(request);
  assert.equal((await res).body, 'from network');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(stores.get('raise-by-v1').get('./late.json').body, 'from network');
});

test('a non-GET request is left alone', async () => {
  const { api } = makeCaches();
  const worker = loadWorker({ caches: api, fetchImpl: async () => { throw new Error('should not fetch'); } });
  let responded = false;
  worker.handlers.fetch({ request: { url: './x', method: 'POST' }, respondWith: () => { responded = true; } });
  assert.equal(responded, false);
});

test('an offline navigation falls back to the precached index.html', async () => {
  const { api } = makeCaches({ caches: { 'raise-by-v1': { './index.html': { body: 'shell' } } } });
  const worker = loadWorker({ caches: api, fetchImpl: async () => { throw new Error('offline'); } });
  const res = await worker.request({ url: '/?present', method: 'GET', mode: 'navigate' });
  assert.equal((await res).body, 'shell');
});

test('an offline navigation with nothing cached answers 503, never undefined', async () => {
  const { api } = makeCaches();
  const worker = loadWorker({ caches: api, fetchImpl: async () => { throw new Error('offline'); } });
  const res = await worker.request({ url: '/?present', method: 'GET', mode: 'navigate' });
  assert.ok(res, 'respondWith always receives a promise');
  const response = await res;
  assert.ok(response, 'respondWith never resolves to undefined');
  assert.equal(response.status, 503);
  assert.equal(response.body, 'Offline');
  assert.equal(response.headers['content-type'], 'text/plain');
});

test('an offline non-navigation still rejects instead of faking a response', async () => {
  const { api } = makeCaches();
  const worker = loadWorker({ caches: api, fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(async () => worker.request({ url: './late.json', method: 'GET' }), /offline/);
});
