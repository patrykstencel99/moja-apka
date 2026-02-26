const CACHE_NAME = 'patternfinder-v3';
const APP_SHELL = ['/', '/today', '/systems', '/review', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }
  if (!url.protocol.startsWith('http')) {
    return;
  }
  if (url.origin !== self.location.origin) {
    return;
  }

  const isApi = url.pathname.startsWith('/api/');
  const isDocument = request.destination === 'document';

  if (isApi) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          if (isDocument) {
            return caches.match('/today');
          }
          return new Response('', { status: 504 });
        })
      )
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data
    ? event.data.json()
    : {
        title: 'PatternFinder',
        body: 'Czas na check-in.',
        url: '/today'
      };

  const title = payload.title ?? 'PatternFinder';
  const options = {
    body: payload.body ?? 'Czas na check-in.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: {
      url: payload.url ?? '/today'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
