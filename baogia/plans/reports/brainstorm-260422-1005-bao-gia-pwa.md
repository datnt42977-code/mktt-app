---
name: Brainstorm — Báo Giá MKTT PWA (client-only)
description: Static HTML/CSS/JS PWA sinh báo giá bê tông, print-to-PDF qua Chrome Android, zero server
date: 2026-04-22
status: Approved — ready for /ck:plan
supersedes: plans/reports/brainstorm-260422-0054-bao-gia-mktt-rebuild.md
---

# Brainstorm — Báo Giá MKTT PWA

## Goal (locked)
**Tốc độ ra báo giá trên Android** — <5s từ mở app đến file PDF chia sẻ khách.

## User Profile
- 1 user (chính chủ), Android, đi công trình, 4G
- ~10 báo giá/ngày
- Budget $0, tự host, không phụ thuộc dịch vụ trả phí

## Pivot từ brainstorm cũ
Brainstorm 260422-0054 chọn backend Express + LibreOffice trên Render free. Lật ngược vì:
- Goal thực = **tốc độ**, không phải fidelity tuyệt đối
- Cold start 60s phá goal
- LibreOffice fidelity không đảm bảo
- Server = risk không cần thiết khi chỉ 1 user

## Kiến trúc final — "HTML Quote PWA"
```
[Android Chrome PWA]
  index.html    — form + preview A4 container
  app.js        — bind form → preview, format vi-VN, add/remove mác phụ, localStorage
  styles.css    — screen + @media print (A4 portrait)
  sw.js         — service worker cache-first (offline)
  manifest.json — PWA install
  assets/logo.png

Flow: Form → Tap "Xem" → preview HTML A4 → Tap "In" → window.print() →
      Chrome Android "Lưu PDF" → Share → Zalo
```

**PDF strategy:** HTML template clone layout .docx + Chrome native print-to-PDF.
Fidelity 100% do control CSS, không convert.

## Functional Requirements
- Form nhập: ngày/tháng/năm, tên khách, tên công trình
- Bảng mác: 3 dòng cố định **M200, M250, M300** (sửa đơn giá)
- Thêm mác phụ động: **tối đa 3**, chèn sau M300, nút `[+ Thêm mác]` + `[×]` mỗi dòng
- Các ô đỏ khác trong template gốc: editable field (giá bơm, phụ phí...)
- Format số `1650000` → `1.650.000` realtime khi nhập
- Output: PDF qua Chrome print-to-PDF, filename gợi ý ASCII (slug khách + yyyymmdd)
- Text đỏ trong preview → in ra **đen** (qua `@media print { color: black }`)
- Prefill giá mặc định **hard-code trong code** (giá cụ thể — unresolved, user cung cấp sau)
- localStorage ghi đè default từ lần nhập thứ 2

## UX Requirements (mobile-first)
- Layout **Flat** (scroll dọc, không gập section)
- `inputmode="decimal"` cho ô số → bàn phím số
- Nút primary ≥48px cao
- Form 1 cột, không scroll ngang
- Realtime preview dưới form (optional, nếu đỡ cost thì bỏ — chỉ preview khi tap "Xem")

## Non-functional
- Zero backend, zero server, zero cold start
- Offline-first qua service worker
- <500ms load lần đầu, instant từ lần 2
- Tổng bundle <200KB

## Stack
- Vanilla HTML + JS (không framework, không build step)
- CSS thuần (không Tailwind, đỡ toolchain)
- Service Worker + Web App Manifest
- Host: **GitHub Pages** (free, không cần CI)

## File Structure
```
/
  index.html       (~200 LOC)
  app.js           (~150 LOC)
  styles.css       (~300 LOC, phần lớn clone template layout)
  sw.js            (~30 LOC)
  manifest.json
  assets/
    logo.png
    icon-192.png
    icon-512.png
```
Tổng ~700 LOC, 1 folder, không build.

## Phases đề xuất
1. **Phase 1 — HTML/CSS clone template (CRITICAL)**: Mở `BAO GIA MKTT- CLAUDE.docx`, extract logo, viết HTML table + CSS print A4. Test print preview Chrome khớp ảnh gốc.
2. **Phase 2 — Form logic**: input binding, format số vi-VN, add/remove mác phụ (max 3), localStorage prefill.
3. **Phase 3 — PWA shell**: manifest, service worker cache-first, icons, install prompt.
4. **Phase 4 — Deploy + E2E Android**: push GitHub Pages, cài home screen Android, test print-to-PDF, share Zalo.

## Trade-offs Accepted
| Vấn đề | Đánh giá |
|---|---|
| 1 lần setup viết HTML/CSS clone template (~2h) | Đổi lấy zero server, zero cold start |
| Output phải qua bước "In → Lưu PDF" của Chrome | Thêm 2 tap, đổi lấy fidelity 100% |
| Không có history báo giá cũ | YAGNI — user không yêu cầu |
| Không support iOS | User dùng Android, YAGNI |

## Risks
- **CSS print lệch px so với .docx gốc** → test + fine-tune Phase 1, có thể 1-2 iteration
- **Service worker cache stale** → strategy cache-first với version bump khi deploy
- **localStorage bị clear** → không mất nhiều, user chỉ cần nhập lại default 1 lần

## Success Criteria (~99% đạt goal tốc độ)
- Mở app → tạo PDF → share Zalo ≤ 10s (mục tiêu <5s)
- Hoạt động offline hoàn toàn sau lần load đầu
- Preview A4 trong Chrome print → khớp ảnh template gốc (không lệch ô/font đáng kể)
- Số tự format `.` nghìn khi nhập
- Không có backend cần bảo trì

## Next Steps
Chạy `/ck:plan` chia phase chi tiết với acceptance criteria từng phase.

## Unresolved
- Giá default cụ thể: M200, M250, M300, giá bơm, phụ phí (user cung cấp trước Phase 2)
- Nút "Reset về mặc định": có cần không? (đề xuất: bỏ — YAGNI, có thể thêm sau nếu cần)
- Các ô đỏ khác trong template ngoài bảng mác + giá bơm: có ô nào cần default không?
- Font Việt trong template: cần embed web font cụ thể (Times New Roman có sẵn trên Android)?
