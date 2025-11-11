/* Timurita PWA service worker
   Strategija:
   - HTML: network-first su cache fallback (offline veiks su paskutine versija)
   - Static (CSS/PNG/JS): cache-first (greita ir offline)
   - API/duomenys (workers.json): network-first su cache fallback
*/

const VERSION = 'v3-2025-11-11';
const APP_CACHE = `timurita-app-${VERSION}`;
const RUNTIME_CACHE = `timurita-runtime-${VERSION}`;

// App shell – privalomi failai offline režimui
const APP_SHELL = [
  // Puslapiai
  '/timurita/',
  '/timurita/index.html',
  '/timurita/darbuotojai.html',
  '/timurita/pasiulymai.html',
  '/timurita/profilis.html',
  '/timurita/darbdavys.html',

  // Stiliai / manifestas / piktogramos
  '/timurita/style.css',
  '/timurita/manifest.json',
  '/timurita/Timurita_logo_192x192.png',
  '/timurita/Timurita_logo_512x512.png'
];

// Install – į talpyklą sudedame „app shell“
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate – išvalome senas talpyklas
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
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isHtmlRequest(req) {
  const accept = req.headers.get('accept') || '';
  return req.method === 'GET' && accept.includes('text/html');
}

function isStaticAsset(url) {
  // Paprastas tikrinimas pagal plėtinį – prireikus papildyk.
  return /\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Tik savo domeno užklausoms taikome SW strategijas
  if (!isSameOrigin(url)) return;

  // 1) API/duomenys – network-first (pvz., workers.json)
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

  // 2) HTML – network-first su fallback į cache (offline)
  if (isHtmlRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(async () => {
          // Pirmiausia bandome tikslų puslapį, tada – index.html
          const cached = await caches.match(req);
          return cached || caches.match('/timurita/index.html');
        })
    );
    return;
  }

  // 3) Static turtas – cache-first
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

  // 4) Numatyta – bandome cache, tada network (saugus default)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Paprastas „postMessage“ listenerys (jei norėsi force-update iš UI)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
