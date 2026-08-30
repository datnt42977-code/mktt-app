# Phase 1 — HTML/CSS Clone Template (CRITICAL)

**Priority:** P0 — blocker cho mọi phase sau
**Status:** pending
**Est:** 2-3h

## Goal
Tạo file `index.html` + `styles.css` clone chính xác layout `BAO GIA MKTT- CLAUDE.docx` để Chrome print-to-PDF ra giống template gốc.

## Inputs
- `BAO GIA MKTT- CLAUDE.docx` (root project) — template nguồn
- Logo trong template (extract ra `assets/logo.png`)

## Steps
1. **Extract assets từ .docx**
   - Unzip `.docx` → lấy `word/media/*.png|jpg` → copy qua `assets/logo.png`
   - Đọc `word/document.xml` để hiểu layout bảng + font + màu
2. **Screenshot template** mở bằng Word → lưu ảnh reference để so sánh
3. **Viết `index.html`** cấu trúc:
   - `<div id="quote">` chứa toàn bộ preview A4
   - Header: logo, công ty, địa chỉ, hotline
   - Block ngày/khách/công trình
   - `<table id="mac-table">` bảng mác (3 dòng cố định + slot mác phụ)
   - Block giá bơm, phụ phí, ghi chú
   - Footer: ký tên
4. **Viết `styles.css`**:
   - Screen stylesheet: hiện form + preview
   - `@media print`: A4 portrait, margin 1.5cm, ẩn form, chỉ in `#quote`
   - Font: Times New Roman (có sẵn Android Chrome)
   - Bảng: border-collapse, padding, căn text như template
   - Class `.editable-red` cho field đỏ, `@media print { .editable-red { color: black } }`
5. **Test print preview Chrome desktop** → so với screenshot Word → tinh chỉnh CSS tới khi khớp

## Files
- Create: `index.html`, `styles.css`, `assets/logo.png`
- Reference: `BAO GIA MKTT- CLAUDE.docx`

## Acceptance Criteria
- [ ] `index.html` hiển thị preview A4 giống template (dung sai lệch <5%)
- [ ] Chrome print preview output khớp ảnh Word gốc về: layout bảng, vị trí logo, font size, spacing
- [ ] Text đỏ trên màn hình → đen khi print
- [ ] File trang A4 không bị tràn 2 trang khi có 3 mác cố định + 3 mác phụ + đủ ô

## Risks
- **CSS print engine khác Word render** → iteration test-and-fix, có thể tốn 2-3 lần tinh chỉnh
- **Font Times New Roman render khác trên Android** → fallback `serif` nếu cần, test thực tế

## Next
Phase 2 — form logic.
