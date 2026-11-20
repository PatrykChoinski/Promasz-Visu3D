// VizuApp jako aplikacja na telefonie / tablecie (PWA): zawsze z sieci (dane maszyny na zywo); strona z pamieci
// tylko gdy serwer VizuApp na maszynie nie odpowiada (wtedy okno Polaczenie - szukanie maszyn w sieci)
const CACHE = 'vizuapp-v1';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'img/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && SHELL.some((s) => url.pathname.endsWith(s.replace('./', '/')))) {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
