/* ============================================================
   FANTASY CODEX PRO — SERVICE WORKER
   Nhóm 5.4: PWA Offline Support
   ============================================================ */

const CACHE_NAME = 'fantasy-codex-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './GiaoDien.css',
    './factions.css',
    './WorldLaws.css',
    './SkillTreeVortex.css',
    './app.js',
    './imageDB.js',
    './idSystem.js',
    './toast.js',
    './features.js',
    './tournament.js',
    './weather.js',
    './commandPalette.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Plus+Jakarta+Sans:wght@300;400;600&display=swap'
];

// Install Event - Caching assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Đang cache assets tĩnh...');
                // Bỏ qua các asset bị lỗi thay vì crash toàn bộ
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return cache.add(url).catch(err => console.log('[Service Worker] Bỏ qua cache:', url));
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Xóa cache cũ:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network First for data/html, Cache First for assets
self.addEventListener('fetch', (event) => {
    // Không can thiệp các request từ IndexedDB hay API ngoài nếu không cần
    if (event.request.method !== 'GET') return;
    
    // Nếu là file js/css tĩnh -> Ưu tiên Cache
    if (event.request.url.match(/\.(js|css|png|jpg|jpeg|woff2)$/i) || event.request.url.includes('font-awesome') || event.request.url.includes('fonts.googleapis')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(response => {
                    // Update cache
                    if(response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
    } else {
        // Mặc định: Network First (cho HTML hoặc API json)
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
