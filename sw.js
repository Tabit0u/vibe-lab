const CACHE = "vibe-lab-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
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
// Stratégie network-first pour les fichiers de l'app : les mises à jour
// sont visibles immédiatement ; le cache ne sert qu'en hors-ligne.
// Les CDN (React, Tailwind, Babel) restent cache-first pour la vitesse.
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