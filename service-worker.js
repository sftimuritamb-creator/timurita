// /timurita/service-worker.js
// App Shell + stale cache + offline fallback
const VERSION = 'v27-2025-11-12';
const APP_CACHE = `timurita-app-${VERSION}`;
const RUNTIME_CACHE = `timurita-runtime-${VERSION}`;

const APP_SHELL = [
  '/timurita/',
  '/timurita/index.html',
  '/timurita/style.css',
  '/timurita/manifest.json',
  '/timurita/Timurita_logo_192x192.png',
  '/timurita/Timurita_logo_512x512.png',
  '/timurita/db.js',
  '/timurita/pasiulymai.html',
  '/timurita/profilis.html',
  '/timurita/darbuotojai.html',
  '/timurita/darbdavys.html',
  // 🔹 naujas atsarginis puslapis
  '/timurita/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== APP_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isHtml(req) {
  return req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');
}

function isStatic(url) {
  return /\.(css|js|png|jpg|jpeg|svg|ico|webp|woff2?)$/i.test(url.pathname);
}

// Stale-while-revalidate helperis statikai
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((resp) => {
    if (resp && resp.status === 200) cache.put(request, resp.clone());
    return resp;
  }).catch(() => undefined);
  return cached || network || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Tik GET ir tik savo kilmei
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // 1) HTML: network-first → cache → offline.html
  if (isHtml(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('/timurita/offline.html');
        })
    );
    return;
  }

  // 2) JSON duomenys (pvz., workers.json): network-first su cache fallback
  if (url.pathname.startsWith('/timurita/') && url.pathname.endsWith('.json')) {
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

  // 3) Statiniai failai: stale-while-revalidate
  if (isStatic(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 4) Numatytasis: cache-first, po to network; gilaus offline atveju – offline.html tik navigacijoms
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => {
      return isHtml(req) ? caches.match('/timurita/offline.html') : new Response('', { status: 504 });
    }))
  );
});

// Leisti atsinaujinti iš UI (update banner)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
