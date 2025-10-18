self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('timurita-cache-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './Timurita_logo_192x192.png',
        './Timurita_logo_512x512.png'
      ]);
    })
  );
  console.log('✅ Service Worker installed and cached files.');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
