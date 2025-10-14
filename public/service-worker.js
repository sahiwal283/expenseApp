// ExpenseApp Service Worker
// Version: 1.0.1 - FIXED MOBILE CACHING ISSUES
// Date: October 14, 2025
// 
// Changes from v1.0.0:
// - Network-first strategy for API calls (fixes stale data on mobile)
// - Cache-first only for static assets
// - Proper cache versioning
// - Excludes API responses from cache

const CACHE_NAME = 'expenseapp-v1.0.1';  // BUMPED VERSION to force update
const STATIC_CACHE = 'expenseapp-static-v1.0.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install event - cache essential static files only
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v1.0.1...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache installation failed:', error);
      })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Fetch event - SMART CACHING STRATEGY
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // STRATEGY 1: NETWORK-FIRST for API calls
  // Always fetch fresh data from server for API endpoints
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache API responses (they should always be fresh)
          return response;
        })
        .catch((error) => {
          console.log('[ServiceWorker] API fetch failed, app offline:', url.pathname);
          // Return offline message for API calls
          return new Response(
            JSON.stringify({ 
              error: 'You are offline. Please check your connection.' 
            }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // STRATEGY 2: CACHE-FIRST for static assets
  // HTML, JS, CSS, images can be cached
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version but also fetch update in background
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {
            // Ignore fetch errors for background updates
          });
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache static assets only
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return response;
          })
          .catch(() => {
            // Return offline fallback
            return caches.match('/index.html');
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating v1.0.1...');
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] v1.0.1 activated and ready!');
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Message event - allow clients to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});
