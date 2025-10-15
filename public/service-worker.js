// ExpenseApp Service Worker
// Version: 1.0.28 - REFACTOR: Frontend Custom Hooks (Phase 5 continued)
// Date: October 15, 2025
//
// Changes from v1.0.27:
// - Created useDashboardData hook (data fetching for Dashboard)
// - Created useDashboardStats hook (stats calculations)
// - Refactored Dashboard.tsx (~85 lines removed)
// - 3 major components now using custom hooks (Approvals, Expenses, Dashboard)
// 
// Changes from v1.0.23:
// - Removed meaningless decorations from Dashboard stat cards
// - Removed fake "+12.5%" trend (was always there, provided no value)
// - Removed useless "Normal" status under Pending Approvals
// - Removed redundant "1 total" under Active Events
// - Cards now show only the important info (number and title)
// - Button text always "Push to Zoho" (was "Go to Reports" for multiple events)
// - Makes sense since we navigate directly to event with most items anyway
//
// Changes from v1.0.22:
// - Fixed "Push to Zoho" link in Dashboard pending tasks
// - Now navigates DIRECTLY to the event's detailed report (not general Reports page)
// - Backend provides event info (which events have unsynced expenses)
// - If single event: goes directly to that event's report (instant push)
// - If multiple events: goes to event with most unsynced expenses
// - Button text changes: "Push to Zoho" (single) vs "Go to Reports" (multiple)
// - No more clicking trade show cards - straight to push button!
// - Uses URL hash deep linking: #event=123
// - Events auto-remove from expense dropdown 1 month + 1 day after end date
// - Consolidated documentation files into AI_MASTER_GUIDE.md
// - Restored CHANGELOG.md for GitHub best practices
// - Simplified sync bar logic - no longer shows "All Synced" message
// - Bar ONLY shows when there's actual activity (offline, syncing, pending, failed)
// - Removed persistent "All Synced" bar that wouldn't hide
// - Added "Reject" button for pending user registrations
// - Admins can now reject/delete pending users with confirmation modal
// - Added UUID polyfill for crypto.randomUUID() compatibility
// - Fixes "crypto.randomUUID is not a function" error in older browsers
// - Fixed auto-logout on token expiration
// - Prevents empty data display on auth errors
// - Background Sync API integration for offline queue processing
// - Sync event handler for automatic retry
// - Better offline support with sync queue
// - Network-first strategy for API calls (fixes stale data on mobile)
// - Cache-first only for static assets
// - Proper cache versioning

const CACHE_NAME = 'expenseapp-v1.0.28';  // BUMPED VERSION for frontend refactor
const STATIC_CACHE = 'expenseapp-static-v1.0.28';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install event - cache essential static files only
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v1.0.28...');
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
  console.log('[ServiceWorker] Activating v1.0.28...');
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
      console.log('[ServiceWorker] v1.0.28 activated and ready!');
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    console.log('[ServiceWorker] Received SYNC_NOW message');
    // Trigger sync if supported
    if (self.registration.sync) {
      self.registration.sync.register('expense-sync').then(() => {
        console.log('[ServiceWorker] Sync registered');
      }).catch((error) => {
        console.error('[ServiceWorker] Sync registration failed:', error);
      });
    }
  }
});

// Background Sync event - process sync queue when online
// Note: Not supported on iOS Safari - fallback handled in app
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event triggered:', event.tag);
  
  if (event.tag === 'expense-sync') {
    event.waitUntil(
      processSyncQueue()
        .then(() => {
          console.log('[ServiceWorker] Sync queue processed successfully');
        })
        .catch((error) => {
          console.error('[ServiceWorker] Sync queue processing failed:', error);
          // Re-throw to retry sync later
          throw error;
        })
    );
  }
});

// Process sync queue by notifying all clients
async function processSyncQueue() {
  console.log('[ServiceWorker] Processing sync queue...');
  
  try {
    // Notify all clients to process their sync queues
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    });
    
    if (clients.length === 0) {
      console.log('[ServiceWorker] No clients available for sync');
      return;
    }
    
    // Send sync message to all clients
    const syncPromises = clients.map(client => {
      return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        };
        
        client.postMessage({
          type: 'PROCESS_SYNC_QUEUE'
        }, [messageChannel.port2]);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          reject(new Error('Sync timeout'));
        }, 30000);
      });
    });
    
    await Promise.all(syncPromises);
    console.log('[ServiceWorker] All clients synced successfully');
    
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
    throw error;
  }
}

// Periodic Background Sync (if supported)
// This allows syncing even when the app is closed
self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync event triggered:', event.tag);
  
  if (event.tag === 'expense-periodic-sync') {
    event.waitUntil(
      processSyncQueue()
        .then(() => {
          console.log('[ServiceWorker] Periodic sync completed');
        })
        .catch((error) => {
          console.error('[ServiceWorker] Periodic sync failed:', error);
        })
    );
  }
});
