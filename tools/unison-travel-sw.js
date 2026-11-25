/* Unison travel listening: the offline copy (2026-11-28). Registered by
   tools/unison-travel-listening-2026-11-28.html with a scope that covers only
   that page. It answers only for that page, its engine file and the keys and
   bass clips, and only from what "Download for the flight" saved; everything
   else goes to the network untouched. */
const CACHE = "unison-travel-tl1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  const isPage = /\/tools\/unison-travel-listening-2026-11-28\.html$/.test(p);
  const isAsset = p.indexOf("/tools/unison-travel-listening-2026-11-28/") > -1 || p.indexOf("/tools/unison-keys-bass-2026-11-22/") > -1;
  if (!isPage && !isAsset) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(p);
    if (!hit) return fetch(req);
    if (isAsset) return hit;
    // the page: the network first (4 s), then the saved copy
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(req, { signal: ctl.signal });
      clearTimeout(t);
      return r.ok ? r : hit;
    } catch (err) { return hit; }
  })());
});
