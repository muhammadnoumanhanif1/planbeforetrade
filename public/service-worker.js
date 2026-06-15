// Service Worker for Plan Before Trade PWA
// Handles offline caching and push notifications

const CACHE_NAME = "pbt-v1";
const STATIC_ASSETS = [
  "/",
  "/signals",
  "/offline.html",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API calls (they should be handled separately)
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok && request.method === "GET") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if offline
          return caches.match(request);
        })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "New trading signal available",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    tag: data.tag || "pbt-notification",
    requireInteraction: data.requireInteraction || false,
    actions: [
      {
        action: "view",
        title: "View Signal",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Plan Before Trade", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;

  if (event.action === "dismiss") {
    notification.close();
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow("/signals");
        }
      })
  );

  notification.close();
});

// Background sync for notifications
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-signals") {
    event.waitUntil(
      fetch("/api/market-structure-signals?symbols=BTCUSDT,ETHUSDT")
        .then(() => {
          // Notify user of new signals
          return self.registration.showNotification("Signals Updated", {
            body: "New trading signals are available",
            icon: "/icon-192.png",
            tag: "sync-notification",
          });
        })
        .catch((error) => {
          console.error("Background sync failed:", error);
        })
    );
  }
});
