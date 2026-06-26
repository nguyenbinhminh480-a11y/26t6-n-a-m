// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect & Security Expert
// @DESCRIPTION: Service Worker for offline operations & Background Synchronization
// ============================================================================

const CACHE_NAME = "bingo18-deepquant-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/App.tsx",
  "/src/index.css",
  "/manifest.json"
];

// Install event - Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell ngầm...");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[Service Worker] Cache prefill warning (some files might be dynamically bundled):", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Cleanup old caches & Claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Đang dọn dẹp bộ nhớ đệm rác:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Sync Event - Tác vụ nền (Background Sync) tự động gửi dữ liệu khi có mạng lại
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-draws') {
    event.waitUntil(
      // Chạy ngầm tiến trình đồng bộ dữ liệu khi kết nối mạng được khôi phục
      new Promise(resolve => {
        console.log("[Service Worker] Thực hiện đồng bộ nền (Background Sync)...");
        // Giả lập đồng bộ an toàn
        setTimeout(resolve, 1000);
      })
    );
  }
});

// Fetch event - Network first for APIs, Stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Bypass Firestore and external auth APIs
  if (url.pathname.includes("/api/") || url.hostname.includes("firestore.googleapis.com") || url.hostname.includes("googleapis.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-while-revalidate pattern
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Lỗi mạng ẩn
      });

      return cachedResponse || fetchPromise.then(res => res || new Response("Offline", { status: 503 }));
    })
  );
});
