// Đề Nghị Thanh Toán MKTT service worker
const VERSION = 'v5';
const CACHE = 'dntt-mktt-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'assets/logo.png',
  'assets/stamp.png',
  'assets/stamp-treo.png',
  'assets/signature.png',
  'assets/sign-tight.png',
  'assets/banner.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',
];

const APP_SHELL = /\/(index\.html|app\.js|styles\.css)(\?|$)|\/$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (APP_SHELL.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
