const CACHE_VERSION = 'v12';
const CACHE_NAME = 'hris-absen-' + CACHE_VERSION;
const CDN_CACHE = 'hris-cdn-' + CACHE_VERSION;
const CORE_ASSETS = ['./', './index.html', './manifest.json'];
const CDN_URLS = ['unpkg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== CDN_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isCDN = CDN_URLS.some(domain => url.hostname.includes(domain));
  if (isCDN) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CDN_CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }
  const isShell = e.request.mode === 'navigate' || CORE_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')));
  if (isShell) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
