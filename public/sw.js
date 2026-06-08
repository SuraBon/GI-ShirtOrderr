const CACHE_NAME = "shirtclaim-shell-v6";
const BLOB_IMAGE_CACHE_NAME = "shirtclaim-blob-images-v1";
const MAX_BLOB_IMAGE_CACHE_ENTRIES = 80;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/gi-logo.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png"
];

function isVercelBlobImageRequest(request, url) {
  return request.destination === "image" && url.hostname.endsWith(".public.blob.vercel-storage.com");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function cacheBlobImage(request) {
  const cache = await caches.open(BLOB_IMAGE_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    try {
      await cache.put(request, response.clone());
      await trimCache(BLOB_IMAGE_CACHE_NAME, MAX_BLOB_IMAGE_CACHE_ENTRIES);
    } catch (error) {
      console.warn("Failed to cache Blob image", error);
    }
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, BLOB_IMAGE_CACHE_NAME].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (isVercelBlobImageRequest(event.request, url)) {
    event.respondWith(
      cacheBlobImage(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || Response.error())
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        }
        // If not 200, try to serve from cache if available, otherwise return network response
        return caches.match(event.request).then((cached) => cached || response);
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
