const CACHE_NAME = 'cs-blog-apk-hub-v1.2'; // Increment version on updates
const urlsToCache = [
    '/', // Or your specific HTML file name e.g., 'index.html'
    // Add your HTML file explicitly if not served as '/'
    // e.g. 'your-main-file.html'
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    // Add actual font files if you know them (check network tab after loading Google Fonts)
    // Add critical icons (these should be local)
    'icon-192x192.png',
    'icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                // Add URLs one by one and log issues, as addAll can fail silently for one bad URL
                const promises = urlsToCache.map(urlToCache => {
                    return cache.add(urlToCache).catch(reason => {
                        console.warn(`Failed to cache ${urlToCache}: ${reason}`);
                    });
                });
                return Promise.all(promises);
            })
            .then(() => self.skipWaiting()) // Activate new SW immediately
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of open clients
    );
});

self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    // For navigation requests, try network first, then cache (Network-first strategy for HTML)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request.url === self.registration.scope ? '/' : event.request.url)) // Fallback to cache, ensure base path correctly resolves
        );
        return;
    }

    // For other requests (CSS, JS, images), use Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Serve from cache
                }
                // Not in cache, fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                            // For opaque responses (like CDN resources not allowing CORS), we can't cache them safely
                            // or check their status. Just return them.
                            if (networkResponse && networkResponse.type === 'opaque') {
                                // Not caching opaque responses by default
                            } else {
                                // Could decide to cache other successful responses here
                            }
                            return networkResponse;
                        }
                        
                        // Clone the response to cache it
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('Fetching failed:', error);
                    // You could return a custom offline page/image here if appropriate
                });
            })
    );
});
