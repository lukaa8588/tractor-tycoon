// Self-destructing service worker - clears all caches and unregisters itself
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => {
        console.log('Deleting cache:', name);
        return caches.delete(name);
      }));
    }).then(() => {
      console.log('All caches cleared. Unregistering SW...');
      return self.registration.unregister();
    }).then(() => {
      // Tell all open clients to reload
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => client.navigate(client.url));
    })
  );
});
