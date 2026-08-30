# Brainstorm: Rebuild Báo Giá MKTT

**Date:** 2026-04-22
**Status:** Agreed — ready for `/ck:plan`

## User Profile & Usecase (locked)
- **User**: 1 người dùng duy nhất (chính bạn)
- **Context**: đi công trình, thao tác trên **điện thoại**, luôn có 4G
- **Tần suất**: ~10 báo giá/ngày
- **Fidelity**: tuyệt đối / tối thiểu "không lệch ô"
- **Hosting**: **Render free tier** (chấp nhận cold start ~60s lần đầu mỗi sáng, các request sau warm <3s)
- **Budget**: $0

## Problem
Dựng lại từ đầu hệ thống sinh file báo giá bê tông từ template `BAO GIA MKTT- CLAUDE.docx`. Repo cũ đã xóa. Giữ 100% layout/logo/text đen của template gốc. User nhập vài field → nhận PDF.

## Requirements

### Functional
- User nhập: ngày/tháng/năm, tên khách hàng, tên công trình
- Bảng mác bê tông: 3 dòng cố định **M200, M250, M300** (chỉnh đơn giá)
- Thêm mác phụ động (tên mác + đơn giá), chèn **sau** 3 dòng cố định
- Giá bơm + các ô khác: **mọi text màu đỏ** trong template = editable field
- Số tiền auto format `1650000` → `1.650.000`
- Output: PDF, filename ASCII không dấu
- Sau render: text đỏ trong PDF đổi sang **đen**
- **Preview PDF inline trong browser** trước khi tải về (mobile-friendly)

### Mobile UX (MUST)
- Form 1 màn hình, không scroll ngang
- `inputmode="decimal"` cho ô số tiền → bàn phím số mặc định
- Nút "Tạo PDF" tối thiểu 48px cao
- Prefill giá mặc định từ lần nhập trước (localStorage)
- Preview PDF embed `<iframe>` hoặc `<object>` ngay sau khi render xong, nút "Tải về" riêng

### Non-functional
- Giữ 100% fidelity với .docx gốc (font, bảng, logo)
- Stateless, không DB, không auth
- Deploy: Frontend Vercel, Backend Render (Docker)
- Chấp nhận cold start Render ~40-60s

## Architecture

```
Frontend (Vercel)                Backend (Render + Docker)
Next.js + Tailwind  ──POST──►   Express
  form                           │
                                 ├─ parse template.docx XML
                                 ├─ replace red runs (→ black)
                                 ├─ replace {day}/{customer}/{project}
                                 ├─ insert extra grade rows
                                 ├─ format numbers vi-VN
                                 ├─ libreoffice --convert-to pdf
                                 └─ stream PDF (filename ASCII)
```

### Endpoints
- `GET /api/fields` — parse template, trả list red runs `[{id, text, context}]`
- `POST /api/quote` — body: `{date:{d,m,y}, customer, project, redFields:[{id,newText}], extraGrades:[{name,price}]}` → PDF binary

### Template rules
- 3 placeholder `{day}`, `{month}`, `{year}`, `{customer}`, `{project}` sạch trong single run (user sửa template 1 lần)
- Mọi cell cần editable: tô màu đỏ trong Word
- Dòng M300 = dòng template để clone cho mác phụ
- Server detect đỏ bằng RGB heuristic (R>150, R>G·1.5, R>B·1.5) để bắt cả `FF0000`, `C00000`, theme red

## Stack
- **Backend**: Node 20, Express, `pizzip`, `docxtemplater`, `p-limit` (concurrency=1 cho LibreOffice)
- **Docker**: `node:20-slim` + `libreoffice-core` + `fonts-liberation` + `fonts-dejavu` + copy font Việt nếu template dùng
- **Frontend**: Next.js App Router, Tailwind, form React đơn giản, fetch API

## File Structure
```
backend/
  Dockerfile
  package.json
  src/
    server.js              # Express routes
    render-pdf.js          # docx → pdf pipeline
    parse-red-runs.js      # XML parser cho run màu đỏ
    format-number.js       # 1650000 → "1.650.000"
    slugify.js             # ASCII filename
    insert-grade-rows.js   # clone row XML
  templates/
    template.docx
frontend/
  app/
    page.jsx               # form
    layout.jsx
    globals.css
  package.json
  next.config.js
```

## Trade-offs Accepted
| Vấn đề | Chọn |
|---|---|
| Docker image ~600MB (LibreOffice) | Đổi lấy fidelity 100% |
| Cold start Render free | Chấp nhận |
| Concurrent render có thể treo LO | Queue p-limit=1 |
| User phải sửa template lần đầu (thêm 5 placeholder + tô đỏ ô editable) | Hướng dẫn chi tiết trong phase-01 |

## Risks
- **Font tiếng Việt**: LibreOffice container có thể render sai diacritics nếu thiếu font. Mitigation: bundle font file cùng template, cài `fonts-noto-core`.
- **Red detection false positive**: nếu logo có màu đỏ. Mitigation: chỉ check run trong `w:t` (text runs), bỏ qua image/shape.
- **Row cloning .docx**: XML table row phức tạp với merged cells. Mitigation: test với dòng M300 cụ thể, giữ format strict.

## Success Criteria
- PDF xuất ra trùng khớp pixel với .docx gốc khi mở bằng Word
- 3 mác cố định + n mác phụ render đúng thứ tự
- Tất cả số có dấu `.` ngăn cách nghìn
- Text đỏ gốc → đen trong PDF
- Filename: `bao-gia-<slug-customer>-<yyyymmdd>.pdf`, ASCII only
- Tải về được trên điện thoại Android/iOS không lỗi encoding

## Next Steps
1. User sửa template 1 lần: thêm `{day}/{month}/{year}/{customer}/{project}`, tô đỏ các ô editable
2. `/ck:plan` → chia phase: (1) template prep + parser, (2) backend render pipeline, (3) Dockerfile + Render deploy, (4) frontend form + Vercel deploy, (5) E2E test

## Unresolved
- Font tiếng Việt cụ thể trong template gốc? (cần check `fontTable.xml` khi implement)
- Tên/đơn giá mặc định của M200/M250/M300 để prefill form?
