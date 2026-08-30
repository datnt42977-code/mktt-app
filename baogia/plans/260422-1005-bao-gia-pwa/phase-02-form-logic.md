# Phase 2 — Form Logic + Mác Phụ + Format

**Priority:** P0
**Status:** pending
**Est:** 2h
**Depends:** Phase 1

## Goal
Form mobile-first bind realtime vào preview `#quote`. Thêm/xóa mác phụ (max 3). Format số vi-VN. localStorage prefill.

## Steps
1. **Form HTML** trong `index.html` (trên `#quote`, ẩn khi print)
   - Layout **Flat**, 1 cột, scroll dọc
   - Fields: ngày (3 `input type="number"` d/m/y hoặc 1 `type="date"`), khách, công trình
   - Bảng mác: 3 `input` cố định cho M200/M250/M300
   - Container `#extra-mac` + nút `[+ Thêm mác]` (max 3 dòng)
   - Field giá bơm + các ô đỏ khác từ template
   - Nút `[Tạo báo giá]` gọi `window.print()`
2. **`app.js` logic**:
   - `inputmode="decimal"` + format `1650000 → 1.650.000` on `input` event
   - Không có DEFAULTS hard-code — field trống lần đầu, localStorage nhớ từ lần 2
   - `loadState()` từ localStorage → prefill nếu có
   - `bindToPreview()` — mỗi input event → update text trong `#quote`
   - `addMacRow()` — clone template row, append `#extra-mac`, disable nút `+` khi đủ 3
   - `removeMacRow(idx)` — xóa row + reindex
   - `saveState()` on "Tạo báo giá" → localStorage
   - `formatViNumber(n)` — utility
3. **Validation nhẹ**:
   - Required: tên khách, công trình, ngày
   - Giá: chỉ số, cho phép rỗng nhưng warning
4. **VAT toggle**:
   - Checkbox `☐ Có VAT` trên form
   - Check → preview hiện note dưới bảng: "Giá đã bao gồm VAT"
   - Uncheck → preview hiện: "Giá chưa bao gồm VAT"
   - Không hiển thị % cụ thể, không tính toán cộng/trừ VAT
   - Trạng thái checkbox lưu localStorage

## Files
- Update: `index.html` (thêm form markup), `styles.css` (form styles)
- Create: `app.js`

## Acceptance Criteria
- [ ] Nhập tên khách → preview update realtime
- [ ] Gõ `1650000` → hiện `1.650.000` trong cả input và preview
- [ ] Tap `[+ Thêm mác]` → dòng mới xuất hiện trong bảng preview
- [ ] Tap `[×]` → xóa dòng đó
- [ ] Không thêm được mác thứ 4
- [ ] Reload app → giá cũ prefill từ localStorage
- [ ] Lần đầu (localStorage trống) → field trống
- [ ] Toggle checkbox VAT → note dưới bảng đổi đúng 2 text

## Risks
- **Input format + cursor position** khi format số realtime có thể nhảy cursor → dùng pattern update value sau debounce hoặc track selection
- **Reindex extra mác** phải clean, tránh memory leak event listener

## Next
Phase 3 — PWA shell.
