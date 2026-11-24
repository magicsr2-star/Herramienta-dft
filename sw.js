/* Herramientas DTF — Service Worker
   Precarga la app para que abra sin internet. Al publicar una versión
   nueva, sube el número de CACHE_VERSION para que se refresque todo. */
const CACHE_VERSION = 'hdtf-v37';
const CACHE_NAME = 'herramientas-dtf-' + CACHE_VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/fonts.css',
  './assets/fonts/Archivo-var-latin.woff2',
  './assets/fonts/Archivo-var-latin-ext.woff2',
  './assets/fonts/IBMPlexMono-400-latin.woff2',
  './assets/fonts/IBMPlexMono-400-latin-ext.woff2',
  './assets/fonts/IBMPlexMono-600-latin.woff2',
  './assets/fonts/IBMPlexMono-600-latin-ext.woff2',
  './assets/imagetracer_v1.2.6.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/playera-foto-frente.png',
  './assets/playera-foto-espalda.png',
  './assets/taza-foto.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('herramientas-dtf-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // lo externo (IA/CDN) va directo a la red

  // Navegación: primero la red (para recibir versiones nuevas) y sin
  // conexión se sirve la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Archivos de la app: primero la caché, y lo que falte se baja y se guarda.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
