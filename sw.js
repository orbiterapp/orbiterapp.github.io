const CACHE = 'tasks-v7'; // ORB-22: bumped to bust cache after adding auth.js + shader
const SHELL  = ['./index.html', './quick.html', './manifest.json', './iconbg.png', './auth.js', './shader-background.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
);

// Network first, fall back to cache (so tasks are always fresh when online)
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.mode === 'navigate') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
