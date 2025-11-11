// /timurita/service-worker.js
// PWA service worker su App Shell cache + duomenų strategija
// 2025-11-11 – v5

const VERSION = 'v10-2025-11-11';
const APP_CACHE = `timurita-app-${VERSION}`;
const RUNTIME_CACHE = `timurita-runtime-${VERSION}`;

// Visi pagrindiniai failai, kurie bus pasiekiami offline iškart
const APP_SHELL = [
  '/timurita/',
  '/timurita/index.html',
  '/timurita/style.css',
  '/timurita/manifest.json',
  '/timurita/Timurita_logo_192x192.png',
  '/timurita/Timurita_logo_512x512.png',

  // 🔹 nauji failai – kad iškart būtų offline
  '/timurita/db.js',
  '/timurita/pasiulymai.html',
  '/timurita/profilis.html',
  '/timurita/darbuotojai.html',
  '/timurita/darbdavys.html'
];

// Instaliacija – cache pagrindinių failų
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
  console.log('[SW] Installed', VERSION);
});

// Aktivacija – ištrinam senus cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
  console.log('[SW] Activated', VERSION);
});

// Pagalbinės funkcijos
function isHtmlRequest(req) {
  return req.destination === 'document' || req.headers.get('accept')?.includes('text/html');
}
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico')
  );
}

// Fetch logika
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Tik saugojimui aktualūs prašymai
  if (req.method !== 'GET' || !url.origin.includes('github.io')) return;

  // HTML – network-first su fallback į cache
  if (isHtmlRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('/timurita/index.html');
        })
    );
    return;
  }

  // Statiniai failai – cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return resp;
        });
      })
    );
    return;
  }

  // Dinaminiai JSON (pvz., workers.json) – network-first
  if (url.pathname.startsWith('/timurita/workers.json')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Numatyta strategija – bandyti iš cache, jei nepavyksta iš tinklo
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
            return resp;
          })
          .catch(() => new Response('Offline', { status: 503 }))
      );
    })
  );
});

// „skip waiting“ – SW atnaujinimui iš karto
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
