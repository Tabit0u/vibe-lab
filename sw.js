const CACHE = "vibe-lab-v11";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg",
  "./core/signals.js", "./core/storage.js",
  "./game/logic.js", "./game/ui.jsx",
  "./widgets/logic.js", "./widgets/ui.jsx",
  "./files/logic.js", "./files/ui.jsx",
  "./pixel/constants.js", "./pixel/encoding.js", "./pixel/document.js", "./pixel/tree.js",
  "./pixel/paint.js", "./pixel/render.js", "./pixel/history.js", "./pixel/io.js",
  "./pixel/viewport.js", "./pixel/hooks.js", "./pixel/components.jsx", "./pixel/ui.jsx",
  "./app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* message du bouton "Réinitialiser l'app" : purge totale */
self.addEventListener("message", (e) => {
  if (e.data === "vibe-lab-reset") {
    e.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.clients.matchAll())
        .then((cls) => {
          cls.forEach((c) => c.navigate(c.url));
        })
    );
  }
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isCdn = url.hostname !== self.location.hostname;
  if (isCdn) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
    return;
  }
  /* navigation (index.html) : TOUJOURS réseau d'abord, jamais de copie périmée */
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
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
