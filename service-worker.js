// AgriFarmers Production Service Worker v7.4
const CACHE_NAME = 'agrifarmers-v7.4';
const STATIC_CACHE_NAME = 'agrifarmers-static-v7.4';

// URLs for caching
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/tailwind.min.css',
  './styles.css',
  './js/app.js',
  './script.js',
  './js/app-config.js',
  './js/auth.js',
  './js/storage.js',
  './js/translations.js',
  './js/auth-ui.js',
  './js/features/crop-doctor.js',
  './js/features/farm-map.js',
  './js/features/irrigation-planner.js',
  './js/features/soil-prescription.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - Pre-cache essential static assets and immediately activate
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v7.4...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[Service Worker] Pre-cache warning:', err);
      });
    })
  );
});

// Activate event - Wipe out ALL outdated caches so new code runs instantly
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v7.4 & purging stale caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming all clients...');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network-First for HTML & Scripts, Cache-Fallback when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Always bypass dynamic API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Bypass third-party geocoding / weather / reverse-geocode APIs from Service Worker interception
  if (
    event.request.url.includes('openweathermap.org') ||
    event.request.url.includes('bigdatacloud.net') ||
    event.request.url.includes('ipwho.is') ||
    event.request.url.includes('nominatim.openstreetmap.org')
  ) {
    return;
  }

  // NETWORK-FIRST STRATEGY:
  // Always fetch fresh JS, CSS, and HTML from network.
  // When online, cache is updated in the background.
  // When offline, fallback to cached assets.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline) - Serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('Offline: Resource not available', { status: 503 });
        });
      })
  );
});

// Instant message handler
self.addEventListener('message', (event) => {
  if (event.data && (event.data.action === 'skipWaiting' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});