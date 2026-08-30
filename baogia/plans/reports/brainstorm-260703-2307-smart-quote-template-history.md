# Brainstorm: Báo giá thông minh — Template mặc định + Lịch sử

**Ngày:** 2026-07-03
**Mục tiêu tối thượng:** Điền báo giá NHANH NHẤT cho mọi lần, kể cả khách mới.

## Vấn đề
- App hiện chỉ nhớ 1 bản nháp gần nhất → khách cũ mất, mỗi báo giá gõ lại từ đầu.
- Bottleneck xác nhận từ user: **(1) nhập lại danh sách mác + đơn giá**, (2) gõ tên khách + công trình.
- Ngữ cảnh user: giá KHÁC tùy khách, nhưng **hầu như là khách mới** (ít gặp lại khách cũ), và **luôn xuất phát từ 1 bộ mác + giá quen thuộc rồi chỉnh**.

## Insight quyết định (đã lật thiết kế ban đầu)
"Chọn khách cũ → tự điền hết" giá trị THẤP vì hiếm gặp lại khách cũ. Thứ áp dụng cho *mọi* báo giá mới là **một bảng giá mặc định luôn điền sẵn**. → chuyển trọng tâm sang Template.

## Phương án đã xét
- **A. Nhớ báo giá gần nhất mỗi khách** — bỏ, thiếu lịch sử.
- **B. Dropdown chọn khách cũ tự điền** — bỏ phần dropdown, ít dùng (khách mới là chính).
- **C. CRM/IndexedDB đầy đủ** — bỏ, YAGNI.
- **★ D (chốt). Template mặc định + Lịch sử** — đúng trọng tâm, thuần localStorage.

## Giải pháp chốt

### 1. Bảng giá mặc định (Template) — trụ chính
- 1 bộ: mác + đơn giá + giá bơm + VAT.
- Tự điền sẵn khi "Tạo báo giá mới".
- Nút **"Lưu làm mặc định"** cập nhật template từ form hiện tại (có confirm).
- Khách mới chỉ cần sửa vài giá lệch + gõ tên khách/công trình.

### 2. Lịch sử báo giá (giữ tất cả) — trụ phụ
- Mỗi lần bấm In → tự lưu snapshot đầy đủ.
- Panel "Lịch sử": liệt kê (Khách • Công trình • Ngày), mỗi dòng **[Mở lại]** + **[Xoá]**.
- Mở lại = nạp full vào form (lo luôn ca hiếm gặp lại khách cũ).

### 3. Gợi ý tên khách (nhẹ)
- `datalist` autocomplete cho ô Khách + Công trình từ lịch sử. Phụ trợ.

### Thao tác mới trên form
- **"Tạo báo giá mới"**: xoá khách/công trình/ghi chú, ngày→hôm nay, nạp template giá (có confirm nếu form đang có data).
- **"Lưu làm mặc định"**, **"Lịch sử"**.

## Data model (localStorage, máy này)
```
baogia-mktt-v2            (giữ nguyên) — bản nháp đang gõ
baogia-mktt-template-v1   { rows[], pump1Ca, pump1M3, pump2Ca, pump2M3, vat }
baogia-mktt-quotes-v1     { quotes: [ { id, savedAt, date, customer, project,
                             rows[], pump1Ca, pump1M3, pump2Ca, pump2M3, vat, extra } ] }
```

## Cấu trúc code (giữ file < 200 dòng)
- **Mới** `quotes-store.js`: data layer — template get/set, quotes add/list/delete, distinct customers.
- `app.js`: nối nút + datalist + render panel lịch sử.
- (Tùy chọn) tách `history-panel.js` nếu app.js phình.
- `index.html`: thêm 3 nút + panel + datalist; nạp `quotes-store.js` trước `app.js`.
- `sw.js`: bump VERSION + thêm file mới vào cache ASSETS.

## Rủi ro & giảm thiểu
- Xoá cache trình duyệt = mất data (đánh đổi của "1 máy"). Tương lai có thể thêm Xuất/Nhập JSON — chưa làm (YAGNI).
- Lỡ ghi đè template → confirm().
- "Tạo báo giá mới" xoá draft → confirm() nếu form đang có data.
- Lịch sử phình: mỗi snapshot ~1-2KB, hàng nghìn cái vẫn ổn.

## Tiêu chí thành công
- Báo giá khách mới: chỉ gõ tên khách + công trình + sửa vài giá; KHÔNG phải add mác rồi gõ full giá.
- Tra lại được mọi báo giá đã tạo; mở lại/tái dùng bất kỳ cái nào.
- Không backend, không đăng nhập, vẫn deploy GitHub Pages như cũ.

## Câu hỏi còn mở
- Template chỉ 1 bộ (đã chốt). Nếu sau này cần vài bộ đặt tên (giá khu A/B) → mở rộng quotes-store thành mảng templates. Chưa làm giờ.
