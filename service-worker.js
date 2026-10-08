// service-worker.js
// WeGEM Learning offline service worker.

const CACHE_VERSION = "wegem-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/signup.html",
  "/login.html",
  "/forgot-password.html",
  "/home.html",
  "/notes.html",
  "/exams.html",
  "/quiz.html",
  "/compete.html",
  "/leaderboard.html",
  "/progress.html",
  "/wallpapers.html",
  "/settings.html",
  "/css/main.css",
  "/css/base.css",
  "/css/layout.css",
  "/css/components.css",
  "/css/pages.css",
  "/css/mobile.css",
  "/manifest.webmanifest",
];

const RUNTIME_MAX_ENTRIES = 60;

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] Failed to cache:", url, err);
            }),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

/* =========================================================
   ACTIVATE — clean old caches
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* =========================================================
   FETCH STRATEGY
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip Firebase, Unsplash, and other 3rd-party
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("unsplash") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // HTML pages — network first, fallback to cache
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  // CSS, JS, fonts — cache first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Images, manifest — stale-while-revalidate
  if (
    request.destination === "image" ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else — network with cache fallback
  event.respondWith(networkFirst(request));
});

/* =========================================================
   STRATEGIES
   ========================================================= */

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigate requests, fall back to cached home
    if (request.mode === "navigate") {
      const fallback = await caches.match("/home.html");
      if (fallback) return fallback;
    }

    return new Response("You're offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/* =========================================================
   TRIM CACHE
   ========================================================= */

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;

  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

/* =========================================================
   MESSAGING (for updates)
   ========================================================= */

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
