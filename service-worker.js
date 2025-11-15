/* Timurita – Service Worker (pilnas)
 * Strategijos:
 * - HTML: network-first su offline fallback
 * - Statiniai (CSS/JS/ikonos): stale-while-revalidate (cache-first su fone vykstančiu atnaujinimu)
 * - Paveikslėliai: cache-first (su dydžio limitu)
 * - Supabase: VISADA per tinklą (be cache)
 * - „Skip waiting“: per postMessage('SKIP_WAITING')
 */

const VERSION = 'v31-2025-11-15'; // ⬅️ PAKEISK kai atnaujini SW
const BASE = '/timurita';

const CACHE_STATIC  = `timurita-static-${VERSION}`;
const CACHE_RUNTIME = `timurita-runtime-${VERSION}`;
const CACHE_IMAGES  = `timurita-images-${VERSION}`;

/** App Shell – failai, kuriuos norime turėti offline iškart */
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
  `${BASE}/Timurita_logo_192x192.png`,
  `${BASE}/Timurita_logo_512x512.png`,
  `${BASE}/manifest.json`,
];

/* Naudingos funkcijos */
const isHTMLRequest = (req) =>
  req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html');

const isImageRequest = (req) => {
  const url = new URL(req.url);
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname);
};

const isStaticAsset = (req) => {
  const url = new URL(req.url);
  return /\.(css|js|mjs|json|ico)$/i.test(url.pathname);
};

const fromCache = (cacheName, request) =>
  caches.open(cacheName).then((cache) => cache.match(request));

const putCache = (cacheName, request, response) =>
  caches.open(cacheName).then((cache) => cache.put(request, response.clone()));

async function staleWhileRevalidate(cacheName, request) {
  const cachePromise = caches.open(cacheName);
  const cached = await (await cachePromise).match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      // Saugom tik 200 atsakymus
      if (resp && resp.status === 200) {
        cachePromise.then((cache) => cache.put(request, resp.clone()));
      }
      return resp;
    })
    .catch(() => null);

  // Grąžinam iš cache, o fone atsinaujins
  return cached || (await networkPromise);
}

async function cacheFirst(cacheName, request) {
  const cached = await fromCache(cacheName, request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.status === 200) {
    await putCache(cacheName, request, resp);
  }
  return resp;
}

async function networkFirstHTML(request) {
  try {
    // Navigation Preload atsakymas (jei įjungtas) yra greitesnis
    const preload = await self.registration.navigationPreload?.getState?.()
      .then((s) => s?.enabled ? event.preloadResponse : null)
      .catch(() => null);

    const resp = (preload ? await preload : null) || await fetch(request, { cache: 'no-store' });
    // Į cache dedam tik sėkmingą atsakymą
    if (resp && resp.status === 200) {
      await putCache(CACHE_RUNTIME, request, resp);
    }
    return resp;
  } catch (err) {
    // Tinklas neveikia: bandome iš cache, tada offline.html
    const cached = await fromCache(CACHE_RUNTIME, request) || await fromCache(CACHE_STATIC, request);
    return cached || caches.match(`${BASE}/offline.html`);
  }
}

/* Ribojam paveikslėlių cache, kad neaugtų be ribų */
async function trimImageCache(maxEntries = 60) {
  const cache = await caches.open(CACHE_IMAGES);
  const keys = await cache.keys();
  const surplus = keys.length - maxEntries;
  if (surplus > 0) {
    for (let i = 0; i < surplus; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/* INSTALL – sukaupiam App Shell */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      await cache.addAll(APP_SHELL);
      // aktyvuojam, nelaukiant seno SW
      self.skipWaiting();
    })()
  );
});

/* ACTIVATE – išvalom senus cache + įjungiam navigation preload */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation Preload (greitesni HTML atsakymai)
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch {}
      }

      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (![CACHE_STATIC, CACHE_RUNTIME, CACHE_IMAGES].includes(key)) {
            return caches.delete(key);
          }
        })
      );
      // perimam kontrolę iškart
      await self.clients.claim();
    })()
  );
});

/* PRANEŠIMAS iš puslapio – leidžia „Skip Waiting“ iš UI */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* FETCH – maršrutizacija pagal tipą ir domeną */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) Supabase – VISADA per tinklą (be cache)
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // 2) HTML (navigacijos) – network-first su offline fallback
  if (isHTMLRequest(request)) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // 3) Paveikslėliai – cache-first su dydžio ribojimu
  if (isImageRequest(request)) {
    event.respondWith(
      (async () => {
        const resp = await cacheFirst(CACHE_IMAGES, request);
        trimImageCache().catch(()=>{});
        return resp;
      })()
    );
    return;
  }

  // 4) Statiniai assetai (CSS/JS/JSON/ICO) – stale-while-revalidate
  if (isStaticAsset(request) || url.pathname.startsWith(`${BASE}/`)) {
    event.respondWith(staleWhileRevalidate(CACHE_STATIC, request));
    return;
  }

  // 5) Visi kiti – bandome tinklą, jei failina – cache
  event.respondWith(
    (async () => {
      try {
        const resp = await fetch(request);
        return resp;
      } catch {
        const cached = await fromCache(CACHE_RUNTIME, request) || await fromCache(CACHE_STATIC, request);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
