// Báo Giá MKTT — form logic, format vi-VN, localStorage, VAT toggle, dynamic mác rows
(function () {
  'use strict';

  const STORAGE_KEY = 'baogia-mktt-v2';
  const MAX_ROWS = 10;
  // Người liên hệ mặc định — luôn điền sẵn nhưng có thể sửa cho từng báo giá.
  const DEFAULT_CONTACT = '0903.071.734 Mr Đạt';

  // Gợi ý mác — bấm chip để thêm nhanh
  const SUGGESTIONS = [
    'M150R28', 'M200R28', 'M250R28', 'M300R28', 'M350R28', 'M400R28',
    'C8', 'C12', 'C16', 'C20', 'C25', 'C30',
    'B20', 'B25', 'B30', 'B40',
  ];

  // ---------- number format ----------
  const digitsOnly = (s) => String(s || '').replace(/\D/g, '');
  const formatVN = (s) => {
    const d = digitsOnly(s);
    if (!d) return '';
    return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  function attachNumberFormatter(input) {
    input.addEventListener('input', () => {
      const before = input.value;
      const caret = input.selectionStart ?? before.length;
      const digitsBeforeCaret = digitsOnly(before.slice(0, caret)).length;
      const formatted = formatVN(before);
      input.value = formatted;
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBeforeCaret) {
        if (/\d/.test(formatted[pos])) seen++;
        pos++;
      }
      try { input.setSelectionRange(pos, pos); } catch (_) {}
      onAnyChange();
    });
  }

  // ---------- simple bind: form → preview (non-mác fields) ----------
  const bindings = [
    ['f-customer', 'q-customer'],
    ['f-project', 'q-project'],
    ['f-pump1-ca', 'q-pump1-ca', true],
    ['f-pump1-m3', 'q-pump1-m3', true],
    ['f-pump2-ca', 'q-pump2-ca', true],
    ['f-pump2-m3', 'q-pump2-m3', true],
  ];

  function syncBinding([fId, qId, isNum]) {
    const input = document.getElementById(fId);
    const out = document.getElementById(qId);
    if (!input || !out) return;
    const val = input.value.trim();
    if (isNum) {
      out.textContent = val || '________';
    } else {
      out.textContent = val || (qId === 'q-customer' || qId === 'q-project' ? '________________________' : '__');
    }
  }

  // ---------- ngày báo giá (1 ô dd/mm/yyyy) ----------
  // Tách chuỗi "dd/mm/yyyy" thành {day, month, year}; thiếu phần nào để rỗng.
  function parseDate(s) {
    const p = String(s || '').split('/');
    return { day: (p[0] || '').trim(), month: (p[1] || '').trim(), year: (p[2] || '').trim() };
  }

  // Tự chèn dấu "/" khi gõ: 03072026 → 03/07/2026
  function attachDateFormatter(input) {
    input.addEventListener('input', () => {
      const d = digitsOnly(input.value).slice(0, 8);
      let out = d;
      if (d.length > 4) out = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
      else if (d.length > 2) out = d.slice(0, 2) + '/' + d.slice(2);
      input.value = out;
      onAnyChange();
    });
  }

  function syncDate() {
    const input = document.getElementById('f-date');
    if (!input) return;
    const { day, month, year } = parseDate(input.value);
    setText('q-day', day || '__');
    setText('q-month', month || '__');
    setText('q-year', year || '____');
  }

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  function formatToday() {
    const now = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    return pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
  }

  function syncAll() {
    bindings.forEach(syncBinding);
    syncDate();
    syncVat();
    syncContact();
    syncExtra();
    syncMacPreview();
    syncPump();
    fitToTwoPages();
  }

  // ---------- ẩn/hiện phần bơm ----------
  // Tick "Có báo giá bơm" → hiện ô nhập giá + mục "Đơn giá sử dụng bơm"
  // (tiêu đề lẫn bảng) trong báo giá. Bỏ tick → ẩn hoàn toàn.
  function syncPump() {
    const on = isChecked('f-pump-on');
    const wrap = document.getElementById('f-pump-wrap');
    if (wrap) wrap.hidden = !on;
    const heading = document.getElementById('q-pump-heading');
    const table = document.getElementById('q-pump-table');
    const display = on ? '' : 'none';
    if (heading) heading.style.display = display;
    if (table) table.style.display = display;
  }

  // ---------- người liên hệ ----------
  // Mặc định tick sẵn → dùng DEFAULT_CONTACT, ẩn ô nhập.
  // Bỏ tick → hiện ô nhập để tự điền; trống thì vẫn fallback về mặc định.
  function syncContact() {
    const useDefault = isChecked('f-contact-default');
    const wrap = document.getElementById('f-contact-wrap');
    if (wrap) wrap.hidden = useDefault;
    const custom = val('f-contact').trim();
    setText('q-contact', (!useDefault && custom) ? custom : DEFAULT_CONTACT);
  }

  // ---------- ghi chú thêm ----------
  // Mỗi dòng người dùng nhập → 1 gạch đầu dòng nối vào cuối danh sách Ghi chú.
  function syncExtra() {
    const input = document.getElementById('f-extra');
    const list = document.getElementById('q-notes-list');
    if (!input || !list) return;
    // xoá các bullet phụ đã thêm lần trước
    list.querySelectorAll('.q-note-extra').forEach((el) => el.remove());
    input.value.split('\n').forEach((line) => {
      const t = line.trim();
      if (!t) return;
      const li = document.createElement('li');
      li.className = 'q-note-extra';
      li.textContent = t;
      list.appendChild(li);
    });
  }

  // Co/giãn font + margin theo biến --fit để báo giá lấp gần đầy 2 trang A4
  // mà không tràn sang trang 3.
  function fitToTwoPages() {
    const quote = document.getElementById('quote');
    if (!quote) return;
    const pxPerMm = 96 / 25.4;
    // @page margin: 8mm × (top+bottom) × 2 trang = 32mm bị trừ
    // → vùng in lý thuyết = 594 - 32 = 562mm.
    // Lùi sâu hơn (40mm) vì iOS Safari có thể ép margin tối thiểu lớn hơn
    // và .q-signature là flex block không tách trang được → cần buffer
    // đủ rộng để nguyên cục chữ ký lọt trang 2.
    const maxPx = 520 * pxPerMm;
    const targetPx = 510 * pxPerMm;

    // Tạm ép #quote về đúng kích thước A4 (210mm) khi đo, để scrollHeight
    // khớp với layout in. Nếu không, trên mobile #quote bị CSS responsive
    // co còn width viewport (~375px), content wrap dài gấp đôi → fit sai.
    const prevMin = quote.style.minHeight;
    const prevWidth = quote.style.width;
    const prevMaxW = quote.style.maxWidth;
    const prevPad = quote.style.padding;
    const prevFontSize = quote.style.fontSize;
    quote.style.minHeight = '0';
    quote.style.width = '210mm';
    quote.style.maxWidth = '210mm';
    quote.style.padding = '15mm';
    quote.style.fontSize = 'calc(11pt * var(--fit))';

    // Bracket scale trong [0.45, 1.40]. Sàn 0.45 đủ co cho ≥3 mác bê tông
    // vẫn vừa 2 trang. Init best = lo để worst-case dùng scale nhỏ nhất,
    // tránh fallback về 1 gây tràn trang 3.
    let lo = 0.45, hi = 1.40, best = lo;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      quote.style.setProperty('--fit', mid.toFixed(3));
      const h = quote.scrollHeight;
      if (h <= maxPx) {
        best = mid;
        if (h >= targetPx) break; // đủ lấp đầy, dừng
        lo = mid;
      } else {
        hi = mid;
      }
    }
    quote.style.setProperty('--fit', best.toFixed(3));

    // Khôi phục style để CSS responsive tiếp quản trên mobile
    quote.style.minHeight = prevMin;
    quote.style.width = prevWidth;
    quote.style.maxWidth = prevMaxW;
    quote.style.padding = prevPad;
    quote.style.fontSize = prevFontSize;
  }

  // ---------- VAT ----------
  function syncVat() {
    const checked = document.getElementById('f-vat').checked;
    const note = document.getElementById('q-vat-note');
    note.textContent = checked ? 'Giá đã bao gồm VAT' : 'Giá chưa bao gồm VAT';
  }

  // ---------- dynamic mác rows ----------
  // manual = người dùng đã tự gõ giá dòng này → không cho bậc giá ghi đè.
  let rows = []; // [{name, price, slump, manual}]
  // Nhãn độ sụt hiển thị nguyên văn; "19±1" là loại đặc biệt.
  const SLUMP_OPTIONS = ['10±2', '12±2', '14±2', '16±2', '18±2', '19±1', '20±2'];
  const DEFAULT_SLUMP = '10±2';
  // Chuẩn hoá state cũ (chỉ lưu số như "10") sang nhãn mới ("10±2").
  const normalizeSlump = (s) => {
    if (!s) return DEFAULT_SLUMP;
    if (SLUMP_OPTIONS.includes(s)) return s;
    const withTol = s + '±2';
    return SLUMP_OPTIONS.includes(withTol) ? withTol : DEFAULT_SLUMP;
  };

  // ---------- bậc giá theo mác (mốc = M250) ----------
  const ladder = () => window.MacPriceLadder;

  // Dòng có thể được bậc giá tự điền: hệ M, không phải dòng mốc, chưa bị khoá tay.
  function isDerivable(row, idx) {
    const L = ladder();
    if (!L || L.parseMacGrade(row.name) == null) return false;
    if (idx === findAnchorIndex()) return false;
    return !row.manual;
  }

  // Dòng mốc = dòng ĐẦU TIÊN có tên bắt đầu bằng M250.
  function findAnchorIndex() {
    const L = ladder();
    if (!L) return -1;
    return rows.findIndex((r) => L.isAnchorName(r.name));
  }

  // Tính lại giá mọi dòng suy ra được từ dòng mốc.
  // Trả về true nếu có dòng nào đổi giá (để cập nhật ô nhập tương ứng).
  function applyLadder() {
    const L = ladder();
    const anchorIdx = findAnchorIndex();
    if (!L || anchorIdx < 0) return false;
    const anchor = rows[anchorIdx];
    const base = L.deriveBase(Number(digitsOnly(anchor.price)), anchor.slump);
    if (base == null) return false;

    let changed = false;
    rows.forEach((row, idx) => {
      if (!isDerivable(row, idx)) return;
      const price = L.computePrice(base, row.name, row.slump);
      const next = price == null ? '' : formatVN(String(price));
      if (row.price !== next) { row.price = next; changed = true; }
    });
    return changed;
  }

  // Đẩy giá đã tính vào các ô nhập, trừ ô đang gõ (tránh nhảy con trỏ).
  function syncPriceInputs(skipIdx) {
    document.querySelectorAll('#mac-list .extra-row').forEach((div, idx) => {
      if (!rows[idx]) return;
      // Nút khoá luôn cập nhật, kể cả dòng đang gõ (vừa gõ là vừa bị khoá).
      syncLockButton(div, idx);
      if (idx === skipIdx) return;
      const input = div.querySelector('input[data-field="price"]');
      if (input && input.value !== rows[idx].price) input.value = rows[idx].price;
    });
  }

  // Nút 🔒 chỉ hiện ở dòng hệ M (không phải mốc) đã bị gõ tay.
  function syncLockButton(div, idx) {
    const btn = div.querySelector('.btn-lock');
    if (!btn) return;
    const L = ladder();
    const row = rows[idx];
    const show = !!row && !!row.manual && L && L.parseMacGrade(row.name) != null
      && idx !== findAnchorIndex();
    btn.hidden = !show;
  }

  function renderChips() {
    const root = document.getElementById('mac-chips');
    root.innerHTML = '';
    SUGGESTIONS.forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        if (rows.length >= MAX_ROWS) return;
        rows.push({ name, price: '', slump: DEFAULT_SLUMP, manual: false });
        applyLadder();
        renderRowList();
        onAnyChange();
        // focus the new price input for fast entry
        const last = document.querySelector('#mac-list .extra-row:last-child input[data-field="price"]');
        if (last) last.focus();
      });
      root.appendChild(btn);
    });
  }

  function renderRowList() {
    const root = document.getElementById('mac-list');
    root.innerHTML = '';
    rows.forEach((row, idx) => {
      const div = document.createElement('div');
      div.className = 'extra-row';
      const slump = normalizeSlump(row.slump);
      const options = SLUMP_OPTIONS.map((s) =>
        `<option value="${s}"${s === slump ? ' selected' : ''}>${s}</option>`
      ).join('');
      div.innerHTML = `
        <input type="text" placeholder="Tên mác" data-field="name" value="${escapeHtml(row.name)}">
        <input type="text" placeholder="Đơn giá" inputmode="decimal" data-field="price" value="${escapeHtml(row.price)}">
        <select data-field="slump" aria-label="Độ sụt">${options}</select>
        <button type="button" class="btn-lock" aria-label="Mở khoá — tính lại theo mác 250" title="Giá tự sửa tay. Bấm để tính lại theo mác 250." hidden>&#128274;</button>
        <button type="button" class="btn-del" aria-label="Xóa">×</button>
      `;
      const nameInput = div.querySelector('input[data-field="name"]');
      const priceInput = div.querySelector('input[data-field="price"]');
      const slumpSelect = div.querySelector('select[data-field="slump"]');
      const lockBtn = div.querySelector('.btn-lock');
      const delBtn = div.querySelector('.btn-del');
      nameInput.addEventListener('input', () => {
        rows[idx].name = nameInput.value;
        // Đổi tên dòng → dòng có thể thành/hết là mốc, tính lại cả bảng.
        applyLadder();
        syncPriceInputs(-1);
        onAnyChange();
      });
      priceInput.addEventListener('input', () => {
        priceInput.value = formatVN(priceInput.value);
        rows[idx].price = priceInput.value;
        // Gõ tay vào dòng không phải mốc → khoá dòng đó lại.
        if (idx !== findAnchorIndex()) rows[idx].manual = true;
        applyLadder();
        syncPriceInputs(idx);
        onAnyChange();
      });
      slumpSelect.addEventListener('change', () => {
        rows[idx].slump = slumpSelect.value;
        applyLadder();
        syncPriceInputs(-1);
        onAnyChange();
      });
      lockBtn.addEventListener('click', () => {
        rows[idx].manual = false;
        applyLadder();
        syncPriceInputs(-1);
        onAnyChange();
      });
      delBtn.addEventListener('click', () => {
        rows.splice(idx, 1);
        // Xoá dòng mốc: các dòng còn lại giữ nguyên giá cuối cùng.
        renderRowList();
        onAnyChange();
      });
      syncLockButton(div, idx);
      root.appendChild(div);
    });
    document.getElementById('btn-add-mac').disabled = rows.length >= MAX_ROWS;
  }

  function syncMacPreview() {
    const body = document.getElementById('q-mac-body');
    body.innerHTML = '';
    // chỉ hiện những dòng có tên HOẶC có giá
    const visible = rows.filter((r) => (r.name || '').trim() || (r.price || '').trim());
    visible.forEach((row, i) => {
      const tr = document.createElement('tr');
      const stt = String(i + 1).padStart(2, '0');
      tr.innerHTML = `
        <td>${stt}</td>
        <td><span class="r">${escapeHtml(row.name) || '________'}</span></td>
        <td>M³</td>
        <td>${escapeHtml(normalizeSlump(row.slump))}</td>
        <td class="num"><span class="r">${escapeHtml(row.price) || '________'}</span></td>
        <td></td>
      `;
      body.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // ---------- state <-> form (tái dùng cho draft, template, lịch sử) ----------
  // Gom toàn bộ giá trị form thành 1 object.
  function collectState() {
    return {
      date: val('f-date'),
      customer: val('f-customer'), project: val('f-project'),
      contact: val('f-contact'), contactDefault: isChecked('f-contact-default'),
      pumpOn: isChecked('f-pump-on'),
      pump1Ca: val('f-pump1-ca'), pump1M3: val('f-pump1-m3'),
      pump2Ca: val('f-pump2-ca'), pump2M3: val('f-pump2-m3'),
      vat: document.getElementById('f-vat').checked,
      extra: val('f-extra'),
      rows: rows.map((r) => ({ name: r.name, price: r.price, slump: r.slump, manual: !!r.manual })),
    };
  }

  // Chỉ phần giá (cho template mặc định).
  function pricesFromState(s) {
    return {
      rows: (s.rows || []).map((r) => ({ name: r.name, price: r.price, slump: r.slump, manual: !!r.manual })),
      pumpOn: s.pumpOn,
      pump1Ca: s.pump1Ca, pump1M3: s.pump1M3,
      pump2Ca: s.pump2Ca, pump2M3: s.pump2M3,
      vat: s.vat,
    };
  }

  // Đổ 1 object vào form + rows, rồi render + sync preview.
  function applyState(state) {
    state = state || {};
    setVal('f-date', state.date || formatToday());
    setVal('f-customer', state.customer); setVal('f-project', state.project);
    // Bản nháp cũ (chưa có contactDefault): coi như dùng mặc định nếu chưa từng tự điền.
    setVal('f-contact', state.contact === DEFAULT_CONTACT ? '' : state.contact);
    setChecked('f-contact-default',
      state.contactDefault != null ? state.contactDefault : !String(state.contact || '').trim());
    setVal('f-pump1-ca', state.pump1Ca); setVal('f-pump1-m3', state.pump1M3);
    setVal('f-pump2-ca', state.pump2Ca); setVal('f-pump2-m3', state.pump2M3);
    // Mặc định LUÔN có phần bơm; chỉ ẩn khi người dùng chủ động bỏ tick.
    setChecked('f-pump-on', state.pumpOn !== false);
    document.getElementById('f-vat').checked = !!state.vat;
    setVal('f-extra', state.extra);
    rows = Array.isArray(state.rows)
      ? state.rows.slice(0, MAX_ROWS).map((r) => ({
          name: r.name || '', price: r.price || '', slump: normalizeSlump(r.slump),
          manual: !!r.manual,
        }))
      : [];
    applyLadder();
    renderRowList();
    syncAll();
  }

  // ---------- persistence (bản nháp đang gõ) ----------
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState())); } catch (_) {}
  }

  function loadState() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}
    if (!state) { applyState({ date: formatToday() }); return; }
    // Ngày báo giá luôn gợi ý = hôm nay (vẫn sửa được); các field khác giữ từ bản nháp.
    applyState(Object.assign({}, state, { date: formatToday() }));
  }

  const val = (id) => (document.getElementById(id)?.value || '');
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  const isChecked = (id) => !!document.getElementById(id)?.checked;
  const setChecked = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };

  // ---------- wiring ----------
  let saveTimer = null;
  function onAnyChange() {
    syncAll();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 250);
  }

  function init() {
    document.querySelectorAll('#form input.num').forEach(attachNumberFormatter);
    attachDateFormatter(document.getElementById('f-date'));
    document.querySelectorAll('#form input[type="text"], #form input[type="number"]').forEach((el) => {
      if (el.classList.contains('num') || el.id === 'f-date') return;
      el.addEventListener('input', onAnyChange);
    });
    document.getElementById('f-vat').addEventListener('change', onAnyChange);
    document.getElementById('f-contact-default').addEventListener('change', (e) => {
      onAnyChange();
      if (!e.target.checked) document.getElementById('f-contact').focus();
    });
    document.getElementById('f-pump-on').addEventListener('change', (e) => {
      onAnyChange();
      if (e.target.checked) document.getElementById('f-pump1-ca').focus();
    });
    document.getElementById('f-extra').addEventListener('input', onAnyChange);

    document.getElementById('btn-add-mac').addEventListener('click', () => {
      if (rows.length >= MAX_ROWS) return;
      rows.push({ name: '', price: '', slump: DEFAULT_SLUMP, manual: false });
      renderRowList();
      onAnyChange();
      const last = document.querySelector('#mac-list .extra-row:last-child input[data-field="name"]');
      if (last) last.focus();
    });

    document.getElementById('btn-print').addEventListener('click', () => {
      saveState();
      // Tự lưu snapshot vào lịch sử mỗi lần tạo báo giá.
      try { window.QuotesStore.addQuote(collectState()); } catch (_) {}
      try { window.QuoteActions.refresh(); } catch (_) {}
      // Một số iOS PWA standalone không hỗ trợ window.print() → báo cho user
      if (typeof window.print !== 'function') {
        alert('Trình duyệt này không hỗ trợ in. Hãy mở Báo Giá trong Safari/Chrome và dùng menu Chia sẻ → In.');
        return;
      }
      try {
        window.print();
      } catch (err) {
        alert('Không mở được hộp thoại in. Vui lòng dùng menu Chia sẻ → In của trình duyệt.');
      }
    });

    loadState();
    renderChips();
    renderRowList();
    syncAll();

    // Nối các tính năng mới (template / lịch sử / gợi ý) — module riêng.
    try {
      window.QuoteActions.init({ collectState, applyState, pricesFromState, persist: saveState });
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
