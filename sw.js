const CACHE_NAME = 'tractor-cache-v99';
const ASSETS = [
  './',
  './index.html?v=91',
  './yandex-sdk.js',
  './manifest.json?v=91',
  './icon.png?v=91',
  './fence.jpg',
  './hay.jpg',
  './dirt.jpg',
  './grass.jpg''
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
