// Service worker minimal : rend Feathery installable (raccourci sur le bureau / Dock).
// Aucune mise en cache des données : les requêtes passent toujours par le réseau.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') event.respondWith(fetch(event.request));
});
