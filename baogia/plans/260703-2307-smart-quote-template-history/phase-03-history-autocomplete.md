# Phase 3 — Lịch sử + autocomplete + sw bump

## Overview
- Priority: MEDIUM
- Status: pending
- Tự lưu lịch sử khi In, panel Lịch sử (Mở lại/Xoá), autocomplete tên khách/công trình, bump service worker.

## Requirements
- Bấm In → tự lưu snapshot vào lịch sử (giữ tất cả).
- Panel Lịch sử: liệt kê mới→cũ (Khách • Công trình • Ngày), mỗi dòng [Mở lại] + [Xoá].
- Ô Khách + Công trình gợi ý (datalist) từ lịch sử.

## app.js
- Trong handler `btn-print`, TRƯỚC khi `window.print()`:
  ```js
  try { QuotesStore.addQuote(collectState()); } catch (_) {}
  window.QuoteActions.refresh();   // cập nhật datalist + panel nếu đang mở
  ```
  (đặt sau `saveState()` hiện có.)

## quote-actions.js (phần History + autocomplete)
- `refresh()`: nạp datalist customers/projects + re-render panel nếu đang mở.
- `renderDatalists()`:
  - `#dl-customers` ← `QuotesStore.distinctCustomers()`
  - `#dl-projects` ← `QuotesStore.distinctProjects()`
- `toggleHistory()`: ẩn/hiện `#history-panel`, khi hiện thì `renderHistory()`.
- `renderHistory()`:
  - `QuotesStore.listQuotes()` → nếu rỗng: "Chưa có báo giá nào".
  - Mỗi item: `<div class="hist-row"><span>{customer||'—'} • {project||'—'} • {date}</span><button data-open><button data-del></div>`.
  - [Mở lại]: `confirm` nếu form có data → `deps.applyState(QuotesStore.getQuote(id))` → đóng panel.
  - [Xoá]: `confirm('Xoá báo giá này?')` → `QuotesStore.deleteQuote(id)` → `renderHistory()` + `renderDatalists()`.
- Gọi `renderDatalists()` một lần trong `init()`.

## index.html
- Datalist + gắn `list` cho input:
  ```html
  <datalist id="dl-customers"></datalist>
  <datalist id="dl-projects"></datalist>
  ```
  Thêm `list="dl-customers"` vào `#f-customer`, `list="dl-projects"` vào `#f-project`.
- Panel lịch sử (ẩn mặc định), đặt trong form (no-print):
  ```html
  <div id="history-panel" class="no-print" hidden></div>
  ```

## styles.css
- `.hist-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #eee; }`
- Style nút nhỏ Mở lại/Xoá.

## sw.js
- `VERSION` bump (hiện `v22` → `v23`).
- Thêm vào ASSETS: `'quotes-store.js'`, `'quote-actions.js'`.

## Related Code Files
- Sửa: `app.js`, `quote-actions.js`, `index.html`, `styles.css`, `sw.js`

## Todo
- [ ] addQuote khi In + refresh
- [ ] renderDatalists + gắn list vào input
- [ ] toggleHistory + renderHistory (Mở lại/Xoá + confirm)
- [ ] Panel + datalist trong index.html
- [ ] Style .hist-row
- [ ] Bump sw VERSION + thêm 2 file vào ASSETS
- [ ] Test E2E: In → thấy trong Lịch sử → Mở lại đổ đúng; Xoá mất; gõ tên khách thấy gợi ý

## Success Criteria
- Tạo vài báo giá khác nhau → panel Lịch sử liệt kê đúng, mới nhất trên cùng.
- Mở lại 1 cái → form đổ đúng toàn bộ (khách, mác, giá, bơm, VAT, ghi chú).
- Ô Khách gõ thấy gợi ý khách cũ.
- Offline vẫn chạy sau bump SW; không lỗi console.

## Risks
- Panel render lỗi khi quote thiếu field cũ → guard `|| ''` / `|| []`.
- SW cache cũ → nhắc user reload; bump VERSION xử lý.
