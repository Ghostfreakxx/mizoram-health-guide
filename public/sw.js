// Mizoram Health Guide service worker.
//
// Caches only public website files (pages and code). It never caches API
// responses or anything a person types: health answers stay in page memory.
const VERSION = "v4";
const CACHE = `mhg-${VERSION}`;
const CORE_PAGES = ["/offline", "/ai-hospital/emergency", "/ai-hospital/first-aid", "/ai-hospital/departments/general-medicine/room", "/helplines", "/ai-hospital", "/ai-hospital/triage", "/"];

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(
    CORE_PAGES.map(async (url) => {
      const res = await fetch(url, { cache: "reload" });
      if (!res.ok) return;
      await cache.put(url, res.clone());
      // Also save the code each core page needs, so it works fully offline.
      const html = await res.text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
      await Promise.allSettled(assets.map((a) => cache.add(a)));
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mhg-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Never store Next.js page-data requests under a page address.
  if (req.headers.get("RSC") || req.headers.get("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;

  // A response body can only be read once, so copy it before handing it back.
  const save = (key, res) => {
    if (!res.ok) return;
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key, copy));
  };

  // Versioned code, styles and the guide's 3D model never change: cache first.
  // (Model URLs carry ?v=…, so a new model is a new cache entry.)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/models/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            save(req, res);
            return res;
          }),
      ),
    );
    return;
  }

  // Pages: try the network first so content stays fresh; fall back to the
  // saved copy, then to the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!url.search) save(url.pathname, res);
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/offline")) || Response.error()),
    );
    return;
  }

  // Other files (icons, manifest, page data): use saved copy, refresh in background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (!url.search) save(req, res);
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
