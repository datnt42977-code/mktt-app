---
name: Báo Giá MKTT PWA
description: Client-only PWA sinh báo giá bê tông, print-to-PDF qua Chrome Android, zero server
status: pending
created: 2026-04-22
brainstorm: plans/reports/brainstorm-260422-1005-bao-gia-pwa.md
---

# Báo Giá MKTT PWA — Implementation Plan

## Goal
Tốc độ ra báo giá <5s trên Android. Static HTML/CSS/JS, no backend, print-to-PDF qua Chrome native.

## Context
- Brainstorm: `plans/reports/brainstorm-260422-1005-bao-gia-pwa.md`
- Template gốc: `BAO GIA MKTT- CLAUDE.docx` (ở project root)
- Stack: Vanilla HTML + JS + CSS, không framework, không build step
- Host: GitHub Pages

## Phases

| # | Phase | File | Status | Est |
|---|---|---|---|---|
| 1 | HTML/CSS clone template (CRITICAL) | [phase-01-html-css-template.md](phase-01-html-css-template.md) | pending | 2-3h |
| 2 | Form logic + mác phụ + format | [phase-02-form-logic.md](phase-02-form-logic.md) | pending | 2h |
| 3 | PWA shell (manifest + SW + icons) | [phase-03-pwa-shell.md](phase-03-pwa-shell.md) | pending | 1h |
| 4 | Deploy GitHub Pages + E2E Android | [phase-04-deploy-e2e.md](phase-04-deploy-e2e.md) | pending | 1h |

## Dependencies
- Phase 1 → 2 → 3 → 4 (sequential, mỗi phase depend phase trước)
- Phase 1 critical nhất: nếu CSS lệch layout thì rework cả app

## Success Criteria
- Flow form → PDF → share Zalo ≤ 10s trên Android thực tế
- PDF in ra khớp ảnh template `.docx` gốc (không lệch ô/font đáng kể)
- Offline hoàn toàn sau lần load đầu
- Tổng LOC ≤ 800

## Decisions locked
- Giá default: **trống**, localStorage nhớ từ lần 2 (không hard-code)
- VAT: **checkbox toggle**, hiện note "Giá đã/chưa bao gồm VAT" dưới bảng, không hiện %, không tính toán
- Logo: `assets/logo.png` (tải từ mekongthuongtin.com)

## Unresolved
- Các ô đỏ khác trong template ngoài bảng mác + giá bơm + note VAT — xác định khi Phase 1 mở .docx
