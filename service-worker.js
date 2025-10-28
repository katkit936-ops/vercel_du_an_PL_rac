// CHANGE THE VERSION string whenever you deploy a new release
const CACHE_VERSION = "recycle-ai-v1"; // -> update to recycle-ai-v2 on next release
const CACHE_FILES = [
  "/", // index.html
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  // Optional: CSS/JS files you want cached
];

// Helper: cache model files only by network-first strategy (so model updates quicker)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// Activate and remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for model files, cache-first for others
self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);

    // Serve model files (so model updates get fetched if available)
if (reqUrl.pathname.startsWith("/model/")) {
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // ✅ Clone ngay lập tức để tránh lỗi "Response body already used"
        const respClone = resp.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, respClone));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
  return;
}

  // For everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(resp => {
        // Optionally cache runtime assets:
        // caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resp.clone()));
        return resp;
      });
    }).catch(() => {
      // fallback (optional): return offline page or image
    })
  );
});
