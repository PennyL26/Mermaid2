/**
 * Service Worker
 * Handles caching for offline support
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `truefalse-quiz-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/state.js',
    '/js/ui.js',
    '/js/quiz.js',
    '/js/timer.js',
    '/js/excel.js',
    '/js/settings.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/service-worker.js',
    '/vendor/xlsx.full.min.js',
    '/data/qkumite.xlsx',
    '/data/qkata.xlsx',
    '/data/mini-affirmations.xlsx'
];

// Assets that can be lazy-loaded (images)
const ASSETS_TO_CACHE = [];
for (let i = 1; i <= 13; i++) {
    ASSETS_TO_CACHE.push(`/assets/mermaid-${i}.png`);
}

const ALL_FILES = [...FILES_TO_CACHE, ...ASSETS_TO_CACHE];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache opened');
                return cache.addAll(ALL_FILES);
            })
            .then(() => {
                self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                return clients.claim();
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }
    
    // Skip requests from other origins
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(request));
        return;
    }
    
    // Special handling for Excel files - try network first, then cache
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.xlsx')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }
    
    // For images and other assets, try cache first, then network
    if (url.pathname.includes('/assets/') || 
        url.pathname.includes('/vendor/') ||
        url.pathname.includes('/js/') ||
        url.pathname.includes('/css/')) {
        
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached response, but update in background
                        event.waitUntil(
                            fetch(request)
                                .then((response) => {
                                    if (response && response.status === 200) {
                                        const responseClone = response.clone();
                                        caches.open(CACHE_NAME).then((cache) => {
                                            cache.put(request, responseClone);
                                        });
                                    }
                                })
                                .catch(() => {})
                        );
                        return cachedResponse;
                    }
                    
                    // If not cached, fetch from network
                    return fetch(request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(request, responseClone);
                                });
                            }
                            return response;
                        });
                })
        );
        return;
    }
    
    // For HTML and other files, try network first, then cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Fallback to offline page
                        return caches.match('/index.html');
                    });
            })
    );
});

// Message event for skipping waiting
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});