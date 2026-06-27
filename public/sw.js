/*
 * Minimal service worker: installability + an offline-tolerant app shell.
 * Strategy: network-first for navigations, falling back to the cached root when
 * offline. This is intentionally small; a precaching/runtime-caching setup
 * (e.g. Serwist) can replace it once it supports our Next.js version.
 */
const CACHE = "bonsai-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

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

  event.respondWith(
    fetch(request).catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
  );
});
