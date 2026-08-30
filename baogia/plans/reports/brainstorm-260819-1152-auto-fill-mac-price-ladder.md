# Brainstorm — Tự động điền giá theo bậc mác

**Ngày:** 2026-08-19 | **Branch:** main | **Trạng thái:** Design đã duyệt

## Problem

Người dùng phải gõ tay giá từng mác bê tông trong form báo giá. Giá các mác liên hệ tuyến tính theo quy ước ±50.000đ/m³ mỗi bậc mác. Muốn: chỉ nhập giá M250, app suy ra phần còn lại.

## Quyết định (đã chốt qua hỏi đáp)

| Điểm | Quyết định |
|---|---|
| Dòng mốc | Cố định `M250` (dòng đầu tiên khớp `^M250`) |
| Phạm vi | Chỉ hệ M (`M150R28`, `M200R28`...). Hệ C/B và tên tự gõ → nhập tay |
| Độ sụt | Có cộng: +20.000đ mỗi 2cm (đúng ghi chú in trong báo giá) |
| Mốc ở sụt ≠ 10 | Giá nhập = giá tại sụt đó → quy ngược về base sụt 10 |
| Sửa tay | Dòng sửa tay bị khoá, không ghi đè. Icon 🔒 để mở khoá |
| Sụt `19±1` | Coi như 18 → 4 nấc → +80.000đ |

## Công thức

```
base = giá M250 quy về sụt 10
giá(mác, sụt) = base + (mác − 250) × 1.000 + nấcSụt(sụt) × 20.000
nấcSụt(s) = floor((số_sụt − 10) / 2)     // 19 → dùng 18 → 4
```

`(mác−250)/50 × 50.000` rút gọn `(mác−250) × 1.000`.

### Bảng kiểm chứng (base = 1.630.000)

| Mác | Sụt 10 | Sụt 12 | Sụt 16 |
|---|---|---|---|
| M150 | 1.530.000 | 1.550.000 | 1.590.000 |
| M200 | 1.580.000 | 1.600.000 | 1.640.000 |
| M250 | 1.630.000 (mốc) | 1.650.000 | 1.690.000 |
| M300 | 1.680.000 | 1.700.000 | 1.740.000 |
| M400 | 1.780.000 | 1.800.000 | 1.840.000 |

## Hành vi

1. Parse mác: regex `^M(\d+)` → không khớp thì app không đụng tới dòng đó.
2. Gõ giá vào dòng M250 → mọi dòng hệ M khác điền lại ngay.
3. Đổi sụt dòng nào → dòng đó tính lại ngay.
4. Thêm chip mác mới khi đã có mốc → điền tự động luôn.
5. Gõ tay dòng ≠ M250 → khoá dòng đó (`manual: true`), hiện 🔒. Bấm 🔒 → mở khoá + tính lại.

## Ca biên

| Tình huống | Hành vi |
|---|---|
| Chưa có / trống M250 | Không auto-fill, giữ hành vi hiện tại |
| Xoá dòng M250 | Các dòng giữ giá cuối, không xoá trắng |
| Nhập M250 ở sụt 12 = 1.650.000 | base = 1.630.000 |
| 2 dòng M250 khác sụt | Dòng đầu = mốc; dòng sau là dòng thường |
| Kết quả ≤ 0 | Để trống, không in số âm |

## Approaches đã cân nhắc

| Approach | Bỏ vì |
|---|---|
| Dòng mốc động (dòng nào nhập giá đầu tiên) | User chọn cố định M250 — dễ đoán hơn, không lệch mốc ngoài ý |
| Quy đổi C/B sang thang M | Bảng quy đổi không chắc khớp giá thật → rủi ro sai |
| Ghi đè toàn bộ khi đổi mốc | Mất công sửa tay của user |
| Sụt 19 tính đúng tỷ lệ (+90.000đ) | Ra số lẻ xấu trong báo giá in |

## Files

- **Tạo mới:** `mac-price-ladder.js` (~60 dòng) — hàm thuần: `parseMacGrade`, `parseSlumpSteps`, `computePrice`, `deriveBase`. Tách riêng vì thuần logic, dễ kiểm chứng.
- **Sửa:** `app.js` — gọi ladder trong `renderRowList` / `onAnyChange`, thêm field `manual` vào row + persist localStorage.
- **Sửa:** `index.html` — thêm `<script src="mac-price-ladder.js">` trước `app.js`.
- **Sửa:** `styles.css` — style icon khoá 🔒.
- **Sửa:** `sw.js` — thêm file mới vào cache list nếu có precache.

## Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Giá mác thấp (M150) lệch giá bán thật — chênh lệch thực tế không tuyến tính | Trung bình | Dòng sửa tay tự khoá; user liếc lại trước khi in |
| Ghi đè nhầm giá user đã nhập | Thấp | Cơ chế khoá `manual` |
| State cũ trong localStorage thiếu field `manual` | Thấp | Default `false` khi load |

## Success criteria

- Nhập M250/sụt10 = 1.630.000 → M200 ra 1.580.000, M300 ra 1.680.000
- Đổi sụt M300 sang 12 → ra 1.700.000
- Sửa tay M400 → đổi lại M250 → M400 giữ nguyên
- Bấm 🔒 trên M400 → M400 tính lại theo công thức
- Dòng C25 / B30 không bị đụng tới
- Reload trang → trạng thái khoá còn nguyên

## Unresolved

- Chưa chốt vị trí/kiểu hiển thị icon 🔒 (trong ô giá hay cạnh nút xoá) — quyết khi implement.
- Chưa rõ `sw.js` có precache danh sách file cứng không — kiểm tra khi implement.
