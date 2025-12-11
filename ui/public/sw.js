const CACHE_NAME = "teeko-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/bell.opus",
  "/icon.svg",
  "/assets/db",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for API/WebSocket, cache-first for assets
  if (url.protocol === "wss:" || url.pathname.startsWith("/api/")) {
    return;
  }

  // SPA: navigation requests should return index.html
  const isNavigate = event.request.mode === "navigate";

  event.respondWith(
    caches.match(isNavigate ? "/index.html" : event.request).then((cached) => {
      const fetchPromise = fetch(isNavigate ? "/index.html" : event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(isNavigate ? "/index.html" : event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
