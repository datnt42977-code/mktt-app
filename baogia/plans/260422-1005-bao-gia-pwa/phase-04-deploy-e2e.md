# Phase 4 — Deploy GitHub Pages + E2E Android

**Priority:** P1
**Status:** pending
**Est:** 1h
**Depends:** Phase 3

## Goal
App chạy trên GitHub Pages. Test thực tế trên Android: flow form → PDF → share Zalo ≤10s.

## Steps
1. **Git setup**
   - Init repo GitHub public (hoặc reuse repo hiện tại)
   - Commit hết files phase 1-3
   - Push main
2. **Enable GitHub Pages**
   - Settings → Pages → Source: main / root
   - URL: `https://<user>.github.io/<repo>/`
3. **Test lần đầu trên Android**
   - Mở URL bằng Chrome Android
   - Đợi prompt "Cài ứng dụng" → Cài
   - Mở từ home screen
4. **E2E test scenarios**:
   - [ ] Flow happy path: nhập đủ field → tap Tạo → print preview → Lưu PDF → Share Zalo
   - [ ] Thêm 3 mác phụ → in ra không tràn trang
   - [ ] Tắt 4G → reload app vẫn chạy
   - [ ] Reload → giá cũ prefill
   - [ ] Font tiếng Việt có dấu (ă, ơ, ư, đ) hiển thị đúng cả trên screen + print
5. **Đo thời gian thực tế**: stopwatch từ tap icon → PDF share xong
6. **Fine-tune nếu lệch layout** khi print từ Android (có thể khác desktop Chrome)

## Files
- Create: `.gitignore`, `README.md` (optional, hướng dẫn dùng)
- No code changes (chỉ deploy + test)

## Acceptance Criteria
- [ ] URL GitHub Pages truy cập được
- [ ] Cài được vào home screen Android
- [ ] Flow full ≤10s (mục tiêu <5s)
- [ ] PDF output khớp template, không lệch ô/font đáng kể
- [ ] Share trực tiếp sang Zalo OK
- [ ] Hoạt động offline sau lần load đầu

## Risks
- **Print-to-PDF Android Chrome khác desktop** → có thể cần tweak CSS print sau khi test
- **Font Việt trên print** → nếu lệch, fallback font khác hoặc embed web font

## Post-launch
- Dùng ~1 tuần → ghi nhận pain point → phase 5 nếu cần (vd: reset default button, history, export docx)

## Done Criteria for Plan
Khi Phase 4 pass hết acceptance → plan status = completed.
