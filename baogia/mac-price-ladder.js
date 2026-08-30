// Bậc giá mác bê tông — hàm thuần, không đụng DOM.
// Quy ước báo giá: tăng/giảm 1 cấp mác (50 đơn vị) = ±50.000đ/m³;
// tăng mỗi 2cm độ sụt = +20.000đ/m³.
//
// Công thức:  giá(mác, sụt) = base + (mác − 250) × 1.000 + nấcSụt × 20.000
// với base = giá mác 250 quy về độ sụt 10.
(function (global) {
  'use strict';

  const ANCHOR_GRADE = 250;        // mác mốc: người dùng chỉ nhập giá dòng này
  const PRICE_PER_GRADE_UNIT = 1000;   // (50.000đ / 50 đơn vị mác)
  const PRICE_PER_SLUMP_STEP = 20000;  // mỗi nấc 2cm
  const BASE_SLUMP_CM = 10;

  // "M250R28" → 250 | "C25"/"B30"/tên tự gõ → null (không auto-fill hệ khác)
  function parseMacGrade(name) {
    const m = /^\s*M\s*(\d{2,4})/i.exec(String(name || ''));
    return m ? parseInt(m[1], 10) : null;
  }

  // "12±2" → 12 | "19±1" → 18 (làm tròn xuống nấc chẵn, xem quyết định design)
  function parseSlumpCm(slump) {
    const m = /(\d+)/.exec(String(slump || ''));
    if (!m) return BASE_SLUMP_CM;
    const cm = parseInt(m[1], 10);
    return cm % 2 === 0 ? cm : cm - 1;
  }

  // Số nấc 2cm so với độ sụt gốc 10.
  function slumpSteps(slump) {
    return Math.floor((parseSlumpCm(slump) - BASE_SLUMP_CM) / 2);
  }

  // Chênh lệch giá của 1 dòng so với base (mác 250, sụt 10).
  function offsetFrom(grade, slump) {
    return (grade - ANCHOR_GRADE) * PRICE_PER_GRADE_UNIT
      + slumpSteps(slump) * PRICE_PER_SLUMP_STEP;
  }

  function isAnchorName(name) {
    return parseMacGrade(name) === ANCHOR_GRADE;
  }

  // Từ giá dòng mốc (tại độ sụt của chính nó) → base chuẩn ở sụt 10.
  // anchorPrice: số nguyên (đồng). Trả null nếu không hợp lệ.
  function deriveBase(anchorPrice, anchorSlump) {
    if (!Number.isFinite(anchorPrice) || anchorPrice <= 0) return null;
    return anchorPrice - slumpSteps(anchorSlump) * PRICE_PER_SLUMP_STEP;
  }

  // Giá của 1 dòng bất kỳ trong hệ M. Trả null nếu không tính được
  // (không phải hệ M, chưa có base, hoặc kết quả ≤ 0).
  function computePrice(base, name, slump) {
    if (!Number.isFinite(base)) return null;
    const grade = parseMacGrade(name);
    if (grade == null) return null;
    const price = base + offsetFrom(grade, slump);
    return price > 0 ? price : null;
  }

  global.MacPriceLadder = {
    ANCHOR_GRADE,
    parseMacGrade,
    parseSlumpCm,
    slumpSteps,
    isAnchorName,
    deriveBase,
    computePrice,
  };
})(window);
