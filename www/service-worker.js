const CACHE_NAME = 'life-buddy-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js',
    'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return from cache
                }
                return fetch(event.request); // Fetch from network
            })
    );
});