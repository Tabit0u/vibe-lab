const CACHE = "vibe-lab-v4";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg",
  "./js/signals.js", "./js/storage.js", "./js/game.js",
  "./js/widgets.js", "./js/files.js", "./js/app.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isCdn = url.hostname !== self.location.hostname;
  if (isCdn) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.method === "GET") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});