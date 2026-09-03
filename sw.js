// MKTT App service worker — cache launcher + module Báo Giá + ĐNTT (offline).
const VERSION = 'v14';
const CACHE = 'mktt-app-' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'assets/logo.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',

  // Module Báo Giá
  'baogia/index.html',
  'baogia/styles.css',
  'baogia/app.js',
  'baogia/mac-price-ladder.js',
  'baogia/quotes-store.js',
  'baogia/quote-actions.js',
  'baogia/assets/logo.png',
  'baogia/assets/stamp.png',
  'baogia/assets/signature.png',

  // Module Đề Nghị Thanh Toán
  'dntt/index.html',
  'dntt/styles.css',
  'dntt/app.js',
  'dntt/assets/logo.png',
  'dntt/assets/stamp.png',
  'dntt/assets/stamp-treo.png',
  'dntt/assets/signature.png',
  'dntt/assets/sign-tight.png',
  'dntt/assets/banner.png',

  // Shared
  'shared/gemini-ocr.js',
];

// Tài liệu/mã nguồn: network-first (luôn lấy bản mới, offline fallback cache)
const SHELL = /\.(html|js|css)(\?|$)|\/$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
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
  if (url.origin !== location.origin) return;

  if (SHELL.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
      return res;
    }))
  );
});
