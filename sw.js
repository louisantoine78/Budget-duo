const CACHE_NAME = 'trace-v5-budget-months-20261013';
const FALLBACK = ['./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FALLBACK)));
});

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || /\.(?:js|css|html)$/.test(url.pathname)) {
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
