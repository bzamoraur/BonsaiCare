/*
 * Minimal service worker: installability + an offline-tolerant app shell.
 * Strategy: network-first for navigations, falling back to a static offline
 * page when the network fails. The fallback is /offline.html (NOT "/"): the
 * app's "/" redirects to /today or /login, and the Cache API refuses to serve a
 * redirected response for a navigation, so the old cached-"/" fallback never
 * worked. This stays intentionally small; a precaching/runtime-caching setup
 * (e.g. Serwist) can replace it once it supports our Next.js version (M9.2).
 */
const CACHE = "bonsai-shell-v2";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  // Network-first; on failure serve the precached, non-redirecting offline page.
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
    ),
  );
});
