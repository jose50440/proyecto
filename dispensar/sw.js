/* Service Worker - IHSS A TU CASA PWA */
const CACHE_NAME = 'ihss-atucasa-v2';
const urlsToCache = [
  './',
  './index.html',
  './logistica.html',
  './manifest.webmanifest',
  './supabase-db-adapter.js',
  './qr-local.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => {
        if (name !== CACHE_NAME) return caches.delete(name);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const clone = res.clone();
          if (res.ok && isCacheable(url)) {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        }).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

function isCacheable(url) {
  const path = url.pathname;
  if (path.includes('supabase') || path.includes('googleapis') || path.includes('unpkg') || path.includes('cdn.')) return false;
  return /\.(html|js|css|json|svg|png|jpg|jpeg|gif|ico|woff|woff2)$/i.test(path) || path.endsWith('/') || path === '';
}
