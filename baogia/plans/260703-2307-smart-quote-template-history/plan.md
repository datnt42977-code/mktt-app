---
name: Báo Giá Thông Minh — Template + Lịch Sử
description: Template bảng giá mặc định tự điền + lịch sử báo giá + autocomplete tên khách, thuần localStorage
status: completed
created: 2026-07-03
brainstorm: plans/reports/brainstorm-260703-2307-smart-quote-template-history.md
---

# Báo Giá Thông Minh — Implementation Plan

## Goal
Điền báo giá nhanh nhất cho MỌI lần (kể cả khách mới): bảng giá mặc định luôn điền sẵn + lịch sử tra cứu/mở lại + gợi ý tên khách. Không backend, giữ deploy GitHub Pages.

## Context
- Brainstorm: `plans/reports/brainstorm-260703-2307-smart-quote-template-history.md`
- Stack hiện tại: Vanilla HTML/CSS/JS, IIFE trong `app.js`, localStorage, service worker cache-first.
- Files hiện có: `index.html`, `app.js` (~360 dòng), `styles.css`, `sw.js`.

## Kiến trúc (chia file, tránh phình app.js)
- **Mới** `quotes-store.js` → `window.QuotesStore`: data layer thuần (không DOM). Template + quotes + distinct customers/projects.
- **Mới** `quote-actions.js` → `window.QuoteActions.init(deps)`: wiring UI mới (nút Tạo mới / Lưu mặc định / Lịch sử, datalist). Nhận `collectState`, `applyState`, `syncAll` từ app.js.
- `app.js`: refactor tách `collectState()`/`applyState()` (từ save/loadState), gọi `QuoteActions.init`, gọi `QuotesStore.addQuote` khi In. Tăng ~15 dòng.
- `index.html`: thêm 3 nút + panel lịch sử + 2 datalist; nạp `quotes-store.js` + `quote-actions.js` TRƯỚC `app.js`.
- `sw.js`: bump VERSION + thêm 2 file JS vào ASSETS.

## Data model (localStorage)
```
baogia-mktt-v2            (giữ nguyên) — bản nháp đang gõ
baogia-mktt-template-v1   { rows[], pump1Ca, pump1M3, pump2Ca, pump2M3, vat }
baogia-mktt-quotes-v1     { quotes: [ { id, savedAt, date, customer, project,
                             rows[], pump1Ca, pump1M3, pump2Ca, pump2M3, vat, extra } ] }
```

## Phases

| # | Phase | File | Status | Est |
|---|---|---|---|---|
| 1 | Data layer `quotes-store.js` | [phase-01-quotes-store.md](phase-01-quotes-store.md) | completed | 45m |
| 2 | Template mặc định + refactor app.js | [phase-02-template.md](phase-02-template.md) | completed | 1h |
| 3 | Lịch sử + autocomplete + sw bump | [phase-03-history-autocomplete.md](phase-03-history-autocomplete.md) | completed | 1h |

## Dependencies
- Phase 1 → 2 → 3 (tuần tự). Phase 2 & 3 đều dùng API của Phase 1.
- Phase 2 refactor `collectState`/`applyState` → Phase 3 tái dùng.

## Success Criteria
- Báo giá khách mới: bấm "Tạo báo giá mới" → giá đã điền sẵn từ template; chỉ gõ khách/công trình + sửa vài giá.
- Bấm In → tự lưu vào lịch sử; panel Lịch sử mở lại/xoá được.
- Ô Khách/Công trình gợi ý từ lịch sử.
- Mỗi file JS < 200 dòng (trừ app.js đã có sẵn, không nở thêm đáng kể).
- Offline vẫn chạy; không lỗi console.

## Decisions locked
- Template chỉ 1 bộ (chưa làm nhiều bộ đặt tên — YAGNI).
- Giữ TẤT CẢ lịch sử (không giới hạn số lượng).
- Bỏ dropdown "chọn khách cũ tự điền" (dùng Lịch sử → Mở lại thay thế).
- Tự lưu lịch sử khi bấm In (không thêm nút Lưu riêng).
- confirm() khi: ghi đè template, "Tạo báo giá mới" lúc form đang có data, xoá 1 lịch sử.

## Unresolved
- Chưa làm Xuất/Nhập JSON backup (để dành khi user cần chuyển máy).
