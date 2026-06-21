const CACHE_NAME = "bachatkhata-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico"
];

// Install Event - cache core layout shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up obsolete cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - cache-first for assets, network-first for sync interfaces
self.addEventListener("fetch", (event) => {
  // Avoid caching non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Network-First with Cache Fallback for dynamic sync paths (auth/sync/api)
  if (
    requestUrl.pathname.startsWith("/api/") || 
    requestUrl.hostname.includes("firebase") || 
    requestUrl.hostname.includes("firestore")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((fallback) => {
            return fallback || new Response(
              JSON.stringify({ error: "Network unavailable. Operating in offline fallback mode." }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Cache-First for static assets (fonts, bundles, images, icons)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback for document navigation if offline
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Offline resource unavailable", { status: 404, statusText: "Offline" });
      });
    })
  );
});
