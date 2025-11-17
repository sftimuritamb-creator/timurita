/* ===== TIMURITA SERVICE WORKER =====
 * Versija v24-2025-11-15
 * Funkcijos:
 *  - Kešuoja pagrindinius puslapius (app shell) – veiks offline
 *  - Statiniams failams (CSS/JS/ikonos) – cache-first
 *  - HTML – network-first su fallback iš cache
 *  - Supabase užklausos – VISADA per tinklą (nekaišioja cache)
 */

const VERSION = 'v95-2025-11-15';
const BASE = '/timurita';

const CACHE_STATIC = `timurita-static-${VERSION}`;
const CACHE_RUNTIME = `timurita-runtime-${VERSION}`;

// Puslapiai ir failai, kuriuos norim turėti offline iškart
const APP_SHELL = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/auth.html`,
  `${BASE}/darbuotojai.html`,
  `${BASE}/pasiulymai.html`,
  `${BASE}/profilis.html`,
  `${BASE}/darbdavys.html`,
  `${BASE}/style.css`,
  `${BASE}/manifest.json`,
  `${BASE}/Timurita_logo_192x192.png`,
  `${BASE}/Timurita_logo_512x512.png`,
];

// Pagalbinės funkcijos
function isHTML(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

function isStatic(request) {
  const url = new URL(request.url);
  return /\.(js|css|json|ico|png|jpg|jpeg|svg|webp)$/i.test(url.pathname);
}

// INSTALL – sukeliame APP_SHELL į cache
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ACTIVATE – išvalome senus cache
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

// FETCH – logika visiems užklausų tipams
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Supabase – VISADA per tinklą (be cache)
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(req));
    return;
  }

  // 2) HTML (navigacija) – network-first
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          // įsidedam į runtime cache
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() =>
          // jei offline – bandome iš runtime, tada iš static
          caches.match(req).then((cached) =>
            cached || caches.match(`${BASE}/index.html`)
          )
        )
    );
    return;
  }

  // 3) Statiniai failai (CSS/JS/paveiksliukai) – cache-first
  if (isStatic(req)) {
    event.respondWith(
      caches.match(req).then((cacheResp) => {
        if (cacheResp) return cacheResp;
        return fetch(req).then((networkResp) => {
          // įsidedam naują į static cache
          return caches.open(CACHE_STATIC).then((c) => {
            c.put(req, networkResp.clone());
            return networkResp;
          });
        });
      })
    );
    return;
  }

  // 4) Visi kiti – pabandome tinklą, o jei nepavyksta – kažką iš cache
  event.respondWith(
    fetch(req).catch(() =>
      caches.match(req).then((cached) =>
        cached || new Response('Offline', { status: 503, statusText: 'Offline' })
      )
    )
  );
});

// Gali naudoti iš puslapio: navigator.serviceWorker.controller.postMessage('SKIP_WAITING')
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
