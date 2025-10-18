self.addEventListener('install', () => {
  console.log('Service Worker installed.');
});

self.addEventListener('fetch', () => {
  // Online mode only – no caching
});
