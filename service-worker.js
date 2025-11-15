/* ===== TIMURITA SERVICE WORKER =====
 * 2025-11-15 — versija su Supabase išimtimi
 * Palaiko:
 *   - App shell cache (offline puslapiai)
 *   - Static failų kešavimą
 *   - HTML network-first strategiją
 *   - Supabase – visada per tinklą (be cache)
 */

const VERSION = 'v36-2025-11-15';
const BASE = '/timurita';

const CACHE_STATIC = `timurita-static-${VERSION}`;
const CACHE_RUNTIME = `timurita-runtime-${VERSION}`;

const APP_SHELL = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/offline.html`,
  `${BASE}/auth.html`,
  `${BASE}/darbdavys.html`,
  `${BASE}/pasiulymai.html`,
  `${BASE}/darbuotojai.html`,
  `${BASE}/profilis.html`,
  `${BASE}/style.css`,
  `${BASE}/db.js`,
  `${BASE}/theme.js`,
  `${BASE}/supabase.js`,
  `${BASE}/manifest.json`,
  `${BASE}/Timurita_logo_192x192.png`,
  `${BASE}/Timurita_logo_512x512.png`,
];

/* === Pagalbinės funkcijos === */
function isHTML(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
}

function isStatic(req) {
  const url = new URL(req.url);
  return /\.(js|css|json|ico|png|jpg|jpeg|svg|webp)$/i.test(url.pathname);
}

/* === INSTALL === */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* === ACTIVATE === */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', VERSION);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (![CACHE_STATIC, CACHE_RUNTIME].includes(key)) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
      self.clients.claim();
    })()
  );
});

/* === FETCH === */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ 1. Supabase — visada per tinklą, be cache
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ 2. HTML (navigacija) — network first, fallback į offline.html
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(`${BASE}/offline.html`)))
    );
    return;
  }

  // ✅ 3. Statiniai failai — cache first
  if (isStatic(req)) {
    event.respondWith(
      caches.match(req).then((cacheResp) => {
        return (
          cacheResp ||
          fetch(req).then((networkResp) => {
            caches.open(CACHE_STATIC).then((c) => c.put(req, networkResp.clone()));
            return networkResp;
          })
        );
      })
    );
    return;
  }

  // ✅ 4. Kiti – tiesiog bandome tinklą
  event.respondWith(
    fetch(req).catch(() => caches.match(`${BASE}/offline.html`))
  );
});

/* === Pranešimas iš puslapio (pvz. skip waiting) === */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
