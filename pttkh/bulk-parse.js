/* Phiếu KH — tách danh sách khách từ chữ dán vào (hoặc kết quả AI đọc ảnh).
   Mỗi dòng 1 khách. Ví dụ đều đọc được:
     CÔNG TY AN PHÚ | 1.250.000 | 1.150.000 | Thu VAT 25%      (có dấu | ; hoặc Tab — copy từ Excel cũng được)
     Cty Hoà Bình 1250 1150                                   (số 4 chữ số hiểu là nghìn đồng)
     Anh Tuấn Q7, M300, cn 1tr3, hđ 1tr2
     M350 1.400.000 1.300.000                                 (dòng không có tên = thêm mác cho khách ngay trên)
   Kết quả: [{ kh, ct, mac, cn, hd, gc }] — cn/hd là số nguyên VNĐ (0 nếu không có). */
(function (root) {
  'use strict';
  const VAT_DEFAULT = 'Thu VAT 25%';
  const MAC_RE = /(?:^|[\s,;:(])((?:m[aá]c\s*)?[MB]\s?\d{2,3}(?:[.,]5)?(?:\s*R\s?\d{1,2})?(?:\s*S\s?\d{1,2})?)(?=$|[\s,;:)])/i;
  const MONEY_RE = /(\d+\s*tr\s*\d{1,3}|\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(tri[eệ]u|tr|k|ngh[iì]n|ng[aà]n|vn[dđ]|đ)?(?![\d%])(?!\s*%)/gi;
  // \b của JS không hiểu chữ có dấu (đ, ợ...) -> tự làm ranh giới từ theo Unicode
  const B = '(?<![\\p{L}\\d])', E = '(?![\\p{L}\\d])';
  const LABEL_TAIL = new RegExp('(?:[\\s:=\\-–,;]|' + B + '(?:gi[aá]|đơn\\s*gi[aá]|c[oô]ng\\s*n[oợ]|cn|xu[aấ]t\\s*h[oó][aá]\\s*đ[oơ]n|xu[aấ]t\\s*hđ|xhđ|hđ|h[oó][aá]\\s*đ[oơ]n)' + E + ')+$', 'iu');
  const HD_LABEL = new RegExp(B + '(hđ|h[oó][aá]\\s*đ[oơ]n|xhđ|xu[aấ]t)' + E, 'iu');
  const CN_LABEL = new RegExp(B + '(n[oợ]|cn)' + E, 'iu');
  const MIN_PRICE = 200000;   // đơn giá bê tông/m³ luôn lớn hơn mức này; số nhỏ hơn (50k gửi giá...) là ghi chú
  const GC_HINT = /(vat|thu[eế]|%|ghi\s*ch[uú]|g[uử]i\s*gi[aá]|ch[eê]nh)/i;

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').replace(/^[\s:=\-–,;.|]+|[\s:=\-–,;|]+$/g, '').trim(); }

  // "1.250.000" "1250000" "1250" (nghìn) "1250k" "1,25tr" "1tr25" -> 1250000 ; không phải tiền -> 0
  function normMoney(raw) {
    let s = String(raw == null ? '' : raw).toLowerCase().replace(/\s+/g, '').replace(/(vnđ|vnd|đồng|dong|đ)$/, '');
    if (!s) return 0;
    let m = s.match(/^(\d+)tr(\d{1,3})$/);
    if (m) return Math.round((+m[1] + +('0.' + m[2])) * 1e6);
    m = s.match(/^(\d+(?:[.,]\d+)?)(triệu|trieu|tr)$/);
    if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1e6);
    m = s.match(/^(\d+(?:[.,]\d+)?)(k|nghìn|nghin|ngàn|ngan)$/);
    if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1e3);
    let n;
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) n = parseInt(s.replace(/[.,]/g, ''), 10);
    else if (/^\d+$/.test(s)) n = parseInt(s, 10);
    else if (/^\d+[.,]\d{1,2}$/.test(s)) n = Math.round(parseFloat(s.replace(',', '.')) * 1e6);   // "1,25" = 1,25 triệu
    else return 0;
    if (n < 100) return 0;           // 25, 10... không phải đơn giá
    if (n < 10000) n *= 1000;        // 1250 = 1.250 nghìn đồng
    return n;
  }
  const isMoneyPart = (p) => /^\s*(\d+\s*tr\s*\d{1,3}|\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(tri[eệ]u|tr|k|ngh[iì]n|ng[aà]n|vn[dđ]|đ)?\s*$/i.test(p) && normMoney(p) > 0;
  const fmtMac = (s) => clean(String(s || '').replace(/^m[aá]c\s*/i, '')).toUpperCase().replace(/^([MB])\s+/, '$1');

  function parseLine(line) {
    let s = String(line || '').replace(/\u00a0/g, ' ').trim();
    if (!s) return null;
    s = s.replace(/^\s*(?:\d{1,3}\s*[.)\/]\s+|[-•*+–]\s*)/, '');           // bỏ "1." "2)" "-" "•" đầu dòng
    const row = { kh: '', ct: '', mac: '', cn: 0, hd: 0, gc: '' };
    const parts = s.split(/\t|\||;/).map(clean).filter(Boolean);
    if (parts.length >= 2) {
      const nums = [], texts = [];
      parts.forEach(p => {
        if (isMoneyPart(p)) nums.push(normMoney(p));
        else if (!row.mac && new RegExp('^' + MAC_RE.source.replace('(?:^|[\\s,;:(])', '').replace('(?=$|[\\s,;:)])', '') + '$', 'i').test(p)) row.mac = fmtMac(p);
        else texts.push(p);
      });
      texts.forEach((t, i) => {
        if (i === 0 && !GC_HINT.test(t)) row.kh = t;
        else if (GC_HINT.test(t)) row.gc = row.gc ? row.gc + '; ' + t : t;
        else if (!row.ct) row.ct = t;
        else row.gc = row.gc ? row.gc + '; ' + t : t;
      });
      row.cn = nums[0] || 0; row.hd = nums[1] || 0;
    } else {
      const mm = s.match(MAC_RE);
      if (mm) { row.mac = fmtMac(mm[1]); s = (s.slice(0, mm.index) + ' ' + s.slice(mm.index + mm[0].length)).trim(); }
      const found = [];
      let m; MONEY_RE.lastIndex = 0;
      const all = [];
      while ((m = MONEY_RE.exec(s))) { const v = normMoney(m[0]); if (v >= MIN_PRICE) all.push({ v, a: m.index, b: m.index + m[0].length, weak: /^\d{3}$/.test(m[0].trim()) }); }
      // số trần 3 chữ số (VD "CÔNG TY 577") dễ là tên -> chỉ dùng làm giá khi không có số nào rõ ràng hơn
      const strong = all.filter(x => !x.weak);
      (strong.length ? strong : all).slice(0, 2).forEach(x => found.push(x));
      if (!found.length) { row.kh = clean(s); }
      else {
        row.kh = clean(s.slice(0, found[0].a).replace(LABEL_TAIL, ''));
        const after = clean(s.slice(found[found.length - 1].b));
        if (after) row.gc = after;
        // gán giá: nhãn ngay trước số quyết định (hđ / công nợ); không nhãn -> số đầu = công nợ, số sau = xuất HĐ
        const free = [];
        found.forEach((f, i) => {
          const lab = s.slice(i ? found[i - 1].b : Math.max(0, f.a - 24), f.a);
          if (HD_LABEL.test(lab) && !row.hd) row.hd = f.v;
          else if (CN_LABEL.test(lab) && !row.cn) row.cn = f.v;
          else free.push(f.v);
        });
        free.forEach(v => { if (!row.cn) row.cn = v; else if (!row.hd) row.hd = v; });
      }
      // tên khách có ", công trình ..." / "- CT ..." thì tách
      const ctm = row.kh.match(/^(.*?)[,\-–]\s*(?:ct|c[oô]ng\s*tr[iì]nh)[:\s]+(.+)$/i);
      if (ctm) { row.kh = clean(ctm[1]); row.ct = clean(ctm[2]); }
    }
    row.kh = clean(row.kh.replace(/^(kh|kh[aá]ch(\s*h[aà]ng)?)\s*[:\-]\s*/i, '')).toUpperCase();
    if (!row.kh && !row.mac && !row.cn && !row.hd) return null;
    if (!row.kh && !row.cn && !row.hd && row.gc === '') return null;
    return row;
  }

  function isHeader(line) { return !/\d/.test(line) && /(kh[aá]ch|t[eê]n)/i.test(line) && /(gi[aá]|n[oợ]|hđ|h[oó]a)/i.test(line); }

  function finish(rows) {
    let prev = null;
    rows.forEach(r => {
      if (!r.kh && prev) { r.kh = prev.kh; if (!r.ct) r.ct = prev.ct; if (!r.gc) r.gc = prev.gc; }
      if (!r.gc) r.gc = VAT_DEFAULT;
      if (r.kh) prev = r;
    });
    return rows.filter(r => r.kh);
  }

  function parseText(text) {
    const rows = [];
    String(text || '').split(/\r?\n/).forEach(l => { if (isHeader(l)) return; const r = parseLine(l); if (r) rows.push(r); });
    return finish(rows);
  }

  // kết quả AI đọc ảnh: { rows:[{kh, cong_trinh, mac, cn, hd, gc}] }
  function fromOCR(d) {
    const list = (d && Array.isArray(d.rows)) ? d.rows : [];
    return finish(list.map(r => ({
      kh: clean(r.kh).toUpperCase(), ct: clean(r.cong_trinh), mac: fmtMac(r.mac),
      cn: normMoney(r.cn), hd: normMoney(r.hd), gc: clean(r.gc),
    })).filter(r => r.kh || r.cn || r.hd || r.mac));
  }

  const api = { parseText, parseLine, normMoney, fromOCR, VAT_DEFAULT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PttkhBulk = api;
})(typeof window !== 'undefined' ? window : globalThis);
