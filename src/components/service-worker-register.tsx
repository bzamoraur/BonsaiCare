"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production only) for installability and an
 * offline-tolerant app shell. Registration failures are non-fatal — the app
 * works without the SW. A precaching strategy (e.g. Serwist) can replace the
 * hand-rolled worker later; see docs/decisions/0001-platform-pwa-first.md.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* non-fatal */
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
