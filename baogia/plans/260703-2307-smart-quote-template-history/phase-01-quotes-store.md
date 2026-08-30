# Phase 1 — Data layer `quotes-store.js`

## Overview
- Priority: CRITICAL (Phase 2 & 3 phụ thuộc)
- Status: pending
- Tạo file mới `quotes-store.js`, thuần dữ liệu (KHÔNG chạm DOM), expose `window.QuotesStore`.

## Requirements
- Đọc/ghi localStorage an toàn (try/catch, JSON parse guard).
- Template: 1 bộ giá. Quotes: mảng, giữ tất cả, mới nhất trước.
- Distinct customers/projects cho autocomplete (bỏ rỗng, trim, unique, giữ thứ tự mới→cũ).

## API (window.QuotesStore)
```js
QuotesStore = {
  // Template
  getTemplate(),                 // -> {rows, pump1Ca, pump1M3, pump2Ca, pump2M3, vat} | null
  setTemplate(priceObj),         // ghi đè template

  // Lịch sử
  listQuotes(),                  // -> [quote] mới nhất trước
  getQuote(id),                  // -> quote | null
  addQuote(quoteObj),            // gán id + savedAt, unshift, lưu -> trả id
  deleteQuote(id),               // xoá theo id

  // Autocomplete
  distinctCustomers(),           // -> [string]
  distinctProjects(),            // -> [string]
}
```

## Chi tiết implement
- Keys:
  ```js
  const TEMPLATE_KEY = 'baogia-mktt-template-v1';
  const QUOTES_KEY   = 'baogia-mktt-quotes-v1';
  ```
- Helper `readJSON(key, fallback)` / `writeJSON(key, val)` bọc try/catch.
- `addQuote`: `id = Date.now().toString(36) + Math.random().toString(36).slice(2,6)`; `savedAt = Date.now()`; `quotes.unshift(...)`.
- `listQuotes`: đọc `{quotes:[]}`, trả `quotes` (đã lưu mới nhất trước nhờ unshift).
- `distinctCustomers/Projects`: map field từ listQuotes → trim → filter truthy → unique giữ thứ tự.
- **Deep clone** khi trả template/quote rows (tránh caller mutate localStorage cache): `JSON.parse(JSON.stringify(x))`.
- Bọc toàn bộ trong IIFE, gán `window.QuotesStore = {...}`. Không phụ thuộc app.js.

## Related Code Files
- Tạo: `quotes-store.js`
- (Chưa đụng file khác ở phase này)

## Todo
- [ ] Tạo `quotes-store.js` với IIFE + window.QuotesStore
- [ ] readJSON/writeJSON guard
- [ ] Template get/set
- [ ] Quotes list/get/add/delete
- [ ] distinctCustomers/distinctProjects
- [ ] Deep clone ở get/list
- [ ] Kiểm tra file < 200 dòng, không lỗi cú pháp

## Success Criteria
- Gọi thử trong console: set/get template khớp; addQuote rồi listQuotes thấy item mới đầu mảng; deleteQuote xoá đúng; distinct trả list sạch.
- Không tham chiếu DOM, không lỗi khi localStorage trống.

## Risks
- localStorage đầy/lỗi → try/catch nuốt lỗi, trả fallback. Không crash app.
