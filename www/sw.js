/* Vida Brasil — service worker (cache offline) */
const CACHE = 'vidabrasil-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/game.js',
  './manifest.webmanifest',
  './img/favicon.png',
  './img/pwa-192.png',
  './img/pwa-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const copy = resp.clone();
      if (resp.ok && new URL(e.request.url).origin === self.location.origin) {
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
