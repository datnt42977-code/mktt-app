# Phase 3 — PWA Shell

**Priority:** P1
**Status:** pending
**Est:** 1h
**Depends:** Phase 2

## Goal
Cài được app vào home screen Android. Offline-first qua service worker. Icon + manifest.

## Steps
1. **`manifest.json`**:
   ```json
   {
     "name": "Báo Giá MKTT",
     "short_name": "Báo Giá",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#ffffff",
     "icons": [
       { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```
2. **Icon**: generate 192 + 512 PNG từ logo hoặc chữ "BG"
3. **`sw.js`** service worker:
   - Cache-first strategy
   - Precache: `index.html`, `styles.css`, `app.js`, `defaults.js`, `manifest.json`, `assets/*`
   - Version string bump để invalidate cache khi deploy
4. **Register SW trong `index.html`**:
   ```html
   <link rel="manifest" href="manifest.json">
   <script>
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('sw.js');
     }
   </script>
   ```
5. **Meta tags mobile**:
   - `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`
   - `<meta name="theme-color" content="#ffffff">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">` (dù user chủ yếu Android)

## Files
- Create: `manifest.json`, `sw.js`, `assets/icon-192.png`, `assets/icon-512.png`
- Update: `index.html` (meta + manifest link + SW register)

## Acceptance Criteria
- [ ] Chrome Android hiện prompt "Cài ứng dụng"
- [ ] Sau cài → app mở từ home screen, fullscreen, không thanh URL
- [ ] Tắt 4G/WiFi → reload app vẫn load được (offline)
- [ ] Deploy version mới → SW update cache tự động

## Risks
- **SW cache stale** → luôn bump CACHE_VERSION khi deploy, dùng `skipWaiting()` + `clients.claim()`

## Next
Phase 4 — deploy + E2E.
