// Simple Service Worker for offline support and image caching

const CACHE_NAME = 'blazing-andromeda-cache-v1';
const IMAGE_CACHE = 'blazing-andromeda-images';

// Files to pre-cache (core assets)
const PRECACHE_URLS = [
    './',
    './index.html',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== IMAGE_CACHE) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Image caching (network first, then cache)
    if (request.destination === 'image' || /\.(png|jpe?g|webp|svg)$/i.test(url.pathname)) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) => {
                return fetch(request)
                    .then((networkResponse) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    })
                    .catch(() => cache.match(request));
            })
        );
        return;
    }

    // Pre-cached assets (cache-first)
    if (PRECACHE_URLS.includes(url.pathname) || url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
        );
    }
});
