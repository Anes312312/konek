const CACHE_NAME = 'konek-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.png?v=2',
    '/splash.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Solo manejamos peticiones GET
    if (event.request.method !== 'GET') return;
    // Ignorar extensiones de Chrome u otros esquemas
    if (!event.request.url.startsWith('http')) return;

    // Estrategia: Network First (La red primero, caché como respaldo)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Guardar una copia en la caché para la próxima vez que estemos sin internet
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Falla la conexión (ej. sin internet o interrupción temporal)
                // Usamos ignoreSearch para que querystrings como ?view=admin coincidan con "/" o "/index.html"
                return caches.match(event.request, { ignoreSearch: true })
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Para navegaciones fallback al index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        // Respuesta offline genérica
                        return new Response('Internet Connection Offline', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});
