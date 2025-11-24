// src/service-worker.js
// Simple Service Worker for offline support and image caching

const CACHE_NAME = 'blazing-andromeda-cache-v1';
const IMAGE_CACHE = 'blazing-andromeda-images';

// Files to pre-cache (core assets)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/static/js/bundle.js', // adjust if using build output
    '/static/css/main.css',
    // Add any other critical assets here
];

self.addEventListener('install', (event) => {
    // Pre-cache core assets
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Clean up old caches
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

// Runtime caching for images (network first, then cache)
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Handle image requests (png, jpg, jpeg, webp, svg)
    if (request.destination === 'image' || /\.(png|jpe?g|webp|svg)$/i.test(url.pathname)) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) => {
                return fetch(request)
                    .then((networkResponse) => {
                        // Clone and store in cache
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    })
                    .catch(() => {
                        // If network fails, try cache
                        return cache.match(request);
                    });
            })
        );
        return;
    }

    // For other requests, use cache-first strategy for pre-cached assets
    if (PRECACHE_URLS.includes(url.pathname) || url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request);
            })
        );
    }
});
