const CACHE = 'gymtracker-v26';
const ASSETS = ['./', './index.html', './styles.css', './foods.js', './app.js', './health.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './legal.css', './legal.js', './impressum.html', './datenschutz.html', './hinweise.html', './lizenzen.html'];
// Diese Dateien werden auf neue Versionen geprüft
const CORE = ['./', './index.html', './styles.css', './foods.js', './app.js', './health.js', './manifest.webmanifest',
  './legal.css', './impressum.html', './datenschutz.html', './hinweise.html', './lizenzen.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache zuerst (schneller Start, offline). Neue Versionen holt checkForUpdate().
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fetch(e.request);
    if (res.ok) cache.put(e.request, res.clone());
    return res;
  }));
});

// Lädt die Kern-Dateien frisch vom Server, legt neue Versionen in den Cache und meldet, ob sich etwas geändert hat
async function checkForUpdate() {
  const cache = await caches.open(CACHE);
  let changed = false;
  await Promise.all(CORE.map(async url => {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return;
      const old = await cache.match(url, { ignoreSearch: true });
      const [fresh, prev] = await Promise.all([res.clone().text(), old ? old.text() : null]);
      if (fresh !== prev) { await cache.put(url, res); if (old) changed = true; }
    } catch { /* offline – später nochmal */ }
  }));
  return changed;
}

self.addEventListener('message', e => {
  if (e.data?.type !== 'CHECK') return;
  e.waitUntil(checkForUpdate().then(async changed => {
    if (!changed) return;
    for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type: 'UPDATE_READY' });
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
