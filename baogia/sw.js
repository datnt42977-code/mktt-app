// Báo Giá MKTT service worker
// - App shell (html/js/css): network-first → luôn lấy bản mới, fallback cache khi offline
// - Assets (ảnh, manifest): cache-first cho tốc độ
// Bump VERSION khi deploy để xoá cache cũ.
const VERSION = 'v30';
const CACHE = 'baogia-mktt-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'mac-price-ladder.js',
  'quotes-store.js',
  'quote-actions.js',
  'manifest.json',
  'assets/logo.png',
  'assets/stamp.png',
  'assets/signature.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',
];

// File nào phải luôn lấy bản mới (network-first)
const APP_SHELL = /\/(index\.html|app\.js|mac-price-ladder\.js|quotes-store\.js|quote-actions\.js|styles\.css)(\?|$)|\/$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAppShell = APP_SHELL.test(url.pathname);

  if (isAppShell) {
    // network-first: thử mạng trước, lưu vào cache, fallback cache nếu offline
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // cache-first cho assets
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
