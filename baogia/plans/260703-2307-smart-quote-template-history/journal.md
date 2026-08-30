# Journal — Báo giá thông minh (Template + Lịch sử)

**Ngày:** 2026-07-03
**Trạng thái:** Hoàn tất, đã push GitHub Pages (sw v23).

## Làm gì
Thêm 3 tính năng vào PWA báo giá, thuần localStorage:
- Template bảng giá mặc định (nút "Lưu làm mặc định" + "Tạo báo giá mới" tự điền giá).
- Lịch sử báo giá (tự lưu khi In, panel Mở lại/Xoá, giữ tất cả).
- Autocomplete tên khách/công trình (datalist).

## Quyết định đáng nhớ
- **Lật thiết kế lúc brainstorm:** ban đầu định làm "dropdown chọn khách cũ → tự điền".
  User xác nhận *hầu như khách mới* → tính năng đó ít giá trị. Chuyển trọng tâm sang
  **template mặc định** (áp dụng cho MỌI báo giá, kể cả khách mới) — đúng bottleneck thật
  (nhập lại mác + đơn giá). Bài học: hỏi kỹ "khách lặp lại không" trước khi chọn hướng.
- **Tách file** thay vì nhồi app.js: `quotes-store.js` (data thuần) + `quote-actions.js` (UI).
  app.js refactor `collectState`/`applyState`/`pricesFromState` dùng chung cho draft + template + lịch sử (DRY).
- Bỏ Xuất/Nhập JSON backup (YAGNI) — để dành khi user cần chuyển máy.

## Kiểm chứng
- node --check 4 file JS: OK.
- Test data layer QuotesStore bằng Node (stub localStorage): 9 assertion pass (roundtrip, deep clone, thứ tự mới→cũ, distinct dedup, delete).
- Chưa test DOM tự động (không có jsdom) → cần user thử luồng thật trên máy.

## Còn mở
- User test on-device luồng: Lưu mặc định → Tạo mới → In → Lịch sử → Mở lại.
- Rủi ro cố hữu: xoá cache trình duyệt = mất dữ liệu (đánh đổi của "chỉ 1 máy").
