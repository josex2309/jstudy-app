self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // 🛑 IGNORAR peticiones de Firebase Firestore para evitar que el Service Worker rompa la conexión en tiempo real
  if (e.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
