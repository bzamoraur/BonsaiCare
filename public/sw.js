/*
 * Service worker: installability, an offline-tolerant app shell, and a runtime
 * cache for private-bucket photos.
 *
 * App shell — network-first for navigations, falling back to a static offline
 * page when the network fails. The fallback is /offline.html (NOT "/"): "/"
 * redirects to /today or /login, and the Cache API refuses to serve a redirected
 * response for a navigation, so a cached "/" never worked.
 *
 * Photos (repeat-visit speed) — the app renders private Supabase Storage objects
 * through SHORT-LIVED signed URLs that are RE-SIGNED on every server render, so
 * the ?token=… changes each navigation and the browser HTTP cache misses every
 * time even though the bytes are identical. Storage paths are immutable UUIDs
 * (uploads use upsert:false; a "replaced" photo is a NEW path; delete just stops
 * the app from ever requesting it), so a given path ALWAYS maps to the same bytes
 * — the ideal case for a cache-first store keyed by PATH with the token stripped.
 * We re-fetch as CORS to read the real status and cache only 200s (never an opaque
 * error, which would also pad quota), bound the entry count (FIFO), and version
 * the cache name so a bump purges it. Repeat visits then read from disk — zero
 * network, zero Supabase egress. Rollback = revert this file; activate() drops the
 * image cache via the keep-list.
 */
const SHELL_CACHE = "bonsai-shell-v2";
const IMAGE_CACHE = "bonsai-images-v1";
const KEEP = [SHELL_CACHE, IMAGE_CACHE];

const OFFLINE_URL = "/offline.html";
const APP_SHELL = [OFFLINE_URL, "/manifest.webmanifest"];

// Cap on cached photos (entries, not bytes). FIFO-trim the oldest on overflow.
const IMAGE_CACHE_MAX = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// A private-bucket photo we can safely cache by path: a GET image request whose
// URL is a Supabase Storage object ending in .webp (signed /sign/ and /public/
// both live under the /storage/v1/object/ prefix).
function isCacheablePhoto(request) {
  if (request.method !== "GET" || request.destination !== "image") return false;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  return url.pathname.includes("/storage/v1/object/") && url.pathname.endsWith(".webp");
}

// Cache key = origin + path, WITHOUT ?token=… — collapses every re-signed URL for
// the same object onto one stable entry.
function pathKey(request) {
  const url = new URL(request.url);
  return url.origin + url.pathname;
}

async function trimCache(cache) {
  const keys = await cache.keys(); // insertion order → oldest first
  const overflow = keys.length - IMAGE_CACHE_MAX;
  for (let i = 0; i < overflow; i++) await cache.delete(keys[i]);
}

async function cacheFirstPhoto(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const key = pathKey(request);

  const hit = await cache.match(key);
  if (hit) return hit;

  // Miss: fetch the REAL url (with its fresh token) as CORS so we can read the
  // status and never cache an opaque error body. Supabase Storage sends CORS
  // headers; on failure fall back to a plain fetch so the image still loads.
  try {
    const response = await fetch(request.url, { mode: "cors", credentials: "omit" });
    if (response.ok) {
      await cache.put(key, response.clone());
      void trimCache(cache); // out-of-band; never delays the image
    }
    return response;
  } catch {
    return fetch(request);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (isCacheablePhoto(request)) {
    event.respondWith(cacheFirstPhoto(request));
    return;
  }

  // App shell: network-first navigations → precached offline page on failure.
  if (request.method === "GET" && request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
  }
});
