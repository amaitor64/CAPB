const CACHE_NAME = "capb-urgence-v7";
const STATIC_ASSETS = [
  "./manifest.webmanifest",
  "./icons/favicon.png?v=2",
  "./icons/logo capb.png",
  "./auth/",
  "./auth/index.html"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isAuthNavigation = event.request.mode === "navigate" && url.pathname.startsWith("/auth");

  if (isAuthNavigation) {
    event.respondWith(fetch(event.request).catch(() => caches.match("./auth/index.html")));
    return;
  }

  if (!sameOrigin || event.request.mode === "navigate") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
