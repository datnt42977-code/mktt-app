# Phase 2 — Template mặc định + refactor app.js

## Overview
- Priority: HIGH (trụ chính, giết bottleneck lớn nhất)
- Status: pending
- Refactor `app.js` để tách state ra/vào form; thêm nút "Tạo báo giá mới" + "Lưu làm mặc định".

## Requirements
- "Lưu làm mặc định": lưu bộ giá hiện tại (rows + pumps + vat) làm template.
- "Tạo báo giá mới": reset khách/công trình/ghi chú, ngày→hôm nay, nạp giá từ template.
- Không phá bản nháp tự lưu hiện có (localStorage `baogia-mktt-v2`).

## Refactor app.js (tách hàm tái dùng)
- `collectState()` → trả object đầy đủ `{date, customer, project, rows(clone), pump1Ca, pump1M3, pump2Ca, pump2M3, vat, extra}`. Rút từ `saveState`; `saveState` gọi lại `collectState`.
- `applyState(state, opts)` → đổ object vào form + `rows`, rồi `renderRowList()` + `syncAll()`. Rút từ `loadState`; `loadState` gọi `applyState` sau khi đọc localStorage/migrate.
- `pricesFromState(state)` → `{rows, pump1Ca, pump1M3, pump2Ca, pump2M3, vat}` (phần giá cho template).
- Expose cho quote-actions: sau `init()`, gọi
  ```js
  window.QuoteActions.init({ collectState, applyState, pricesFromState, syncAll,
                             getRows: () => rows, setRows: (r) => { rows = r; } });
  ```
  (rows là biến trong IIFE → truyền getter/setter).

## quote-actions.js (phần Template)
- `saveTemplate()`: `if (!confirm('Lưu bảng giá hiện tại làm mặc định?')) return;` → `QuotesStore.setTemplate(deps.pricesFromState(deps.collectState()))` → alert xác nhận.
- `newQuote()`:
  - Nếu form đang có data (customer/project/rows) → `confirm('Tạo báo giá mới? Nội dung đang nhập sẽ bị xoá.')`.
  - Build state mới: date=hôm nay, customer/project/extra rỗng, giá = `QuotesStore.getTemplate()` (nếu null → rows rỗng, pumps rỗng, vat false).
  - `deps.applyState(newState)`.

## index.html
- Trong form, thêm hàng nút (gần nút In hoặc đầu form):
  ```html
  <div class="form-actions no-print">
    <button type="button" id="btn-new">Tạo báo giá mới</button>
    <button type="button" id="btn-save-template">Lưu làm mặc định</button>
    <button type="button" id="btn-history">Lịch sử</button>
  </div>
  ```
  (nút `btn-history` để sẵn cho Phase 3.)
- Nạp script TRƯỚC `app.js`:
  ```html
  <script src="quotes-store.js"></script>
  <script src="quote-actions.js"></script>
  <script src="app.js"></script>
  ```

## styles.css
- `.form-actions { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; }` + style nút phụ nhạt hơn `.btn-primary`.

## Related Code Files
- Sửa: `app.js`, `index.html`, `styles.css`
- Tạo: `quote-actions.js` (khởi tạo khung + phần Template; History ở Phase 3)

## Todo
- [ ] Refactor `collectState`/`applyState`/`pricesFromState` trong app.js
- [ ] `saveState`/`loadState` dùng lại hàm mới (không đổi hành vi cũ)
- [ ] Tạo `quote-actions.js` + `window.QuoteActions.init(deps)`
- [ ] saveTemplate() + newQuote() với confirm
- [ ] Thêm nút + nạp script trong index.html
- [ ] Style .form-actions
- [ ] Test: lưu template → Tạo mới → giá tự điền; bản nháp cũ vẫn load bình thường

## Success Criteria
- Điền 1 bảng giá → "Lưu làm mặc định" → "Tạo báo giá mới" → giá xuất hiện lại, khách/công trình trống, ngày = hôm nay.
- Reload app vẫn nạp bản nháp gần nhất như cũ (không regression).

## Risks
- Shared reference rows giữa template và form → luôn deep clone khi applyState.
- Refactor loadState làm hỏng migrate độ sụt/ngày cũ → giữ nguyên logic migrate, chỉ bọc lại.
