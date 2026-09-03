// Đề Nghị Thanh Toán MKTT — client-side, offline. Port từ app FastAPI gốc.
(function () {
  'use strict';

  const DRAFT_KEY = 'dntt-mktt-draft-v1';
  const HISTORY_KEY = 'dntt-mktt-history-v1';
  const CUSTOMERS_KEY = 'dntt-mktt-customers-v1';
  const DEFAULT_TIEUDE = 'THƯ ĐỀ NGHỊ THANH TOÁN';
  const MAX_ROWS = 30;
  const MAC_OPTIONS = ['M150R28/10±2', 'M200R28/10±2', 'M250R28/10±2', 'M300R28/10±2', 'M350R28/10±2'];

  const BANKS = {
    cong_ty: {
      owner: 'CÔNG TY TNHH BÊ TÔNG MÊ KÔNG THƯƠNG TÍN',
      no: '8600024006',
      name: 'Tại Ngân Hàng TMCP Đầu Tư Và Phát triển Việt Nam (BIDV) chi nhánh Trung Tâm Sài Gòn',
    },
    ca_nhan: {
      owner: 'NGUYỄN TẤN ĐẠT',
      no: '19035673705013',
      name: 'Tại Ngân Hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
    },
  };

  // ---------- số thành chữ (port so_thanh_chu.py) ----------
  const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const SCALE = ['', 'nghìn', 'triệu', 'tỷ'];
  function readThree(n, full) {
    const tram = Math.floor(n / 100), chuc = Math.floor(n / 10) % 10, dv = n % 10;
    const parts = [];
    if (tram || full) parts.push(DIGITS[tram] + ' trăm');
    if (chuc === 0 && dv !== 0 && (tram || full)) parts.push('lẻ');
    else if (chuc === 1) parts.push('mười');
    else if (chuc >= 2) parts.push(DIGITS[chuc] + ' mươi');
    if (dv !== 0) {
      if (chuc >= 2 && dv === 1) parts.push('mốt');
      else if (chuc >= 1 && dv === 5) parts.push('lăm');
      else parts.push(DIGITS[dv]);
    }
    return parts.join(' ').trim();
  }
  function soThanhChu(amount) {
    amount = Math.round(amount);
    if (amount === 0) return 'Không đồng';
    let sign = '';
    if (amount < 0) { sign = 'Âm '; amount = -amount; }
    const groups = [];
    while (amount > 0) { groups.push(amount % 1000); amount = Math.floor(amount / 1000); }
    const parts = [];
    let leading = true;
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g === 0) { leading = false; continue; }
      let chunk = readThree(g, !leading);
      if (SCALE[i]) chunk += ' ' + SCALE[i];
      parts.push(chunk);
      leading = false;
    }
    const result = sign + parts.join(' ') + ' đồng';
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // ---------- format tiền ----------
  const digitsOnly = (s) => String(s || '').replace(/\D/g, '');
  const fmtVND = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, '.');
  const parseMoney = (s) => parseInt(digitsOnly(s)) || 0;

  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

  // ---------- date ----------
  function maskDate(el) {
    let v = digitsOnly(el.value).slice(0, 8);
    if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    el.value = v;
  }
  function parseDate(s) {
    const p = String(s || '').split('/');
    return { day: (p[0] || '').trim(), month: (p[1] || '').trim(), year: (p[2] || '').trim() };
  }
  function formatToday() {
    const d = new Date(), p = (v) => String(v).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  // ---------- rows state ----------
  let rows = []; // {ngay_cap, mac, kl, dg, pt}
  const emptyRow = () => ({ ngay_cap: formatToday(), mac: '', kl: '', dg: '', pt: '0' });

  function renderRows() {
    const root = $('debt-list');
    root.innerHTML = '';
    const opts = MAC_OPTIONS.map((m) => `<option value="${m}">`).join('');
    rows.forEach((r, idx) => {
      const div = document.createElement('div');
      div.className = 'debt-row';
      div.innerHTML = `
        <label class="field">Ngày cấp
          <input type="text" inputmode="numeric" class="date-mask" maxlength="10" data-f="ngay_cap" value="${esc(r.ngay_cap)}">
        </label>
        <label class="field">Mác BT
          <input type="text" maxlength="15" list="dl-mac" data-f="mac" value="${esc(r.mac)}">
        </label>
        <label class="field">Khối lượng (m³)
          <input type="number" step="0.01" min="0.01" inputmode="decimal" data-f="kl" value="${esc(r.kl)}">
        </label>
        <label class="field">Đơn giá
          <input type="text" inputmode="numeric" class="money" data-f="dg" value="${esc(r.dg)}">
        </label>
        <label class="field">Phụ thu
          <input type="text" inputmode="numeric" class="money" data-f="pt" value="${esc(r.pt)}">
        </label>
        <div class="row-bottom">
          <span>Thành tiền: <span class="tt">${fmtVND(calcRow(r))}</span> đ</span>
          <button type="button" class="btn-remove">× Xoá</button>
        </div>
      `;
      div.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', () => {
          if (inp.classList.contains('date-mask')) maskDate(inp);
          if (inp.classList.contains('money')) inp.value = inp.value ? fmtVND(digitsOnly(inp.value)) : '';
          rows[idx][inp.dataset.f] = inp.value;
          const ttEl = div.querySelector('.tt');
          if (ttEl) ttEl.textContent = fmtVND(calcRow(rows[idx]));
          onChange();
        });
      });
      div.querySelector('.btn-remove').addEventListener('click', () => {
        if (rows.length <= 1) { alert('Phải có ít nhất 1 dòng công nợ'); return; }
        rows.splice(idx, 1); renderRows(); onChange();
      });
      root.appendChild(div);
    });
    // datalist mác
    let dl = $('dl-mac');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'dl-mac'; document.body.appendChild(dl); }
    dl.innerHTML = opts;
    $('btn-add-row').disabled = rows.length >= MAX_ROWS;
  }

  function calcRow(r) {
    const kl = parseFloat(r.kl) || 0;
    const dg = parseMoney(r.dg);
    const pt = parseMoney(r.pt);
    return Math.round(kl * dg + pt);
  }
  function totalAmount() { return rows.reduce((s, r) => s + calcRow(r), 0); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- sync preview ----------
  function syncAll() {
    const { day, month, year } = parseDate($('f-date').value);
    setText('q-day', day || '__'); setText('q-month', month || '__'); setText('q-year', year || '____');
    setText('q-title', ($('f-tieude').value || DEFAULT_TIEUDE).toUpperCase());
    setText('q-customer', $('f-customer').value.trim() || '________________________');
    setText('q-project', $('f-project').value.trim() || '________________________');

    const bank = BANKS[$('f-bank').value] || BANKS.cong_ty;
    setText('q-bank-owner', bank.owner); setText('q-bank-no', bank.no); setText('q-bank-name', bank.name);

    // rows preview
    const body = $('q-rows');
    body.innerHTML = '';
    const visible = rows.filter((r) => (r.mac || '').trim() || (r.dg || '').trim() || (r.kl || '').trim());
    visible.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(r.ngay_cap)}</td>
        <td>${esc(r.mac)}</td>
        <td>${esc(r.kl)}</td>
        <td class="num">${r.dg ? fmtVND(digitsOnly(r.dg)) : ''}</td>
        <td class="num">${r.pt ? fmtVND(digitsOnly(r.pt)) : '0'}</td>
        <td class="num">${fmtVND(calcRow(r))}</td>`;
      body.appendChild(tr);
    });
    const total = totalAmount();
    setText('q-total', fmtVND(total) + 'đ');
    setText('f-total', fmtVND(total));
    setText('q-bangchu', soThanhChu(total));

    // ký sống → ẩn chữ ký + dấu treo để in ra ký tay, đóng dấu thật
    const kysong = $('f-kysong').checked;
    const sig = document.querySelector('.q-signature');
    if (sig) sig.classList.toggle('kysong', kysong);
    const hs = $('q-hanging-stamp');
    if (hs) hs.style.display = kysong ? 'none' : '';

    fitOnePage();
    fitPreview();
  }

  // ---------- state <-> form ----------
  function collectState() {
    return {
      savedAt: Date.now(),
      tieude: $('f-tieude').value, date: $('f-date').value,
      customer: $('f-customer').value, project: $('f-project').value,
      bank: $('f-bank').value, kysong: $('f-kysong').checked,
      rows: rows.map((r) => ({ ...r })),
    };
  }
  function applyState(s) {
    s = s || {};
    $('f-tieude').value = s.tieude || DEFAULT_TIEUDE;
    $('f-date').value = s.date || formatToday();
    $('f-customer').value = s.customer || '';
    $('f-project').value = s.project || '';
    $('f-bank').value = s.bank || 'cong_ty';
    $('f-kysong').checked = !!s.kysong;
    rows = Array.isArray(s.rows) && s.rows.length ? s.rows.slice(0, MAX_ROWS).map((r) => ({ ...r })) : [emptyRow()];
    renderRows(); syncAll();
  }

  // ---------- persistence ----------
  let saveTimer = null;
  function onChange() {
    syncAll();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectState())); } catch (_) {}
    }, 300);
  }
  function loadDraft() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) {}
    if (!s) { applyState({ date: formatToday(), rows: [emptyRow()] }); return; }
    // ngày lập: nếu nháp khác ngày → đặt lại hôm nay
    const sameDay = s.savedAt && new Date(s.savedAt).toDateString() === new Date().toDateString();
    applyState(Object.assign({}, s, sameDay ? {} : { date: formatToday() }));
    const notice = $('draft-notice');
    if (notice) {
      notice.hidden = false;
      notice.innerHTML = 'Đã khôi phục dữ liệu lần trước. <button type="button" class="btn-load-last" id="btn-drop-draft">Nhập mới</button>';
      $('btn-drop-draft').addEventListener('click', () => { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} location.reload(); });
    }
  }

  // ---------- customers + history ----------
  function loadCustomers() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]'); } catch (_) {}
    const dl = $('dl-customers');
    if (dl) dl.innerHTML = list.map((c) => `<option value="${esc(c)}">`).join('');
  }
  function rememberCustomer(name) {
    name = (name || '').trim();
    if (!name) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]'); } catch (_) {}
    list = [name, ...list.filter((c) => c !== name)].slice(0, 50);
    try { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list)); } catch (_) {}
    loadCustomers();
  }
  function addHistory(state) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    list.unshift({ at: Date.now(), total: totalAmount(), state });
    list = list.slice(0, 50);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) {}
  }
  function toggleHistory() {
    const panel = $('history-panel');
    if (!panel.hidden) { panel.hidden = true; return; }
    let list = [];
    try { list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    if (!list.length) { panel.innerHTML = 'Chưa có lịch sử.'; }
    else {
      panel.innerHTML = list.map((h, i) => {
        const d = new Date(h.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        const kh = (h.state && h.state.customer) || '(chưa có khách)';
        return `<div class="hist-item" data-i="${i}">${d} — ${esc(kh)} — <strong>${fmtVND(h.total)}đ</strong></div>`;
      }).join('');
      panel.querySelectorAll('.hist-item').forEach((el) => {
        el.addEventListener('click', () => { applyState(list[+el.dataset.i].state); panel.hidden = true; window.scrollTo(0, 0); });
      });
    }
    panel.hidden = false;
  }

  // ---------- co nội dung gọn trong 1 trang A4 (chỉnh --fit = cỡ chữ) ----------
  function fitOnePage() {
    const q = $('quote');
    if (!q) return;
    const pxPerMm = 96 / 25.4;
    // A4 cao 297mm − lề in 8mm×2 = 281mm vùng in. Chừa 3mm buffer cho chắc.
    const maxPx = 278 * pxPerMm;
    // Đo ở đúng hình học lúc IN: khổ 210mm, padding 0, không transform.
    const prev = { w: q.style.width, mw: q.style.maxWidth, pad: q.style.padding, tf: q.style.transform, fit: q.style.getPropertyValue('--fit') };
    q.style.transform = 'none';
    q.style.width = '194mm';   /* = 210mm − lề in 8mm×2 (bề rộng thực khi in) */
    q.style.maxWidth = 'none';
    q.style.padding = '0';
    q.style.setProperty('--zoom', '1');
    // B1: co font (--fit) trong dải rộng
    let lo = 0.35, hi = 1.15, best = lo;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      q.style.setProperty('--fit', mid.toFixed(3));
      if (q.scrollHeight <= maxPx) { best = mid; lo = mid; } else { hi = mid; }
    }
    q.style.setProperty('--fit', best.toFixed(3));
    // B2: nếu font đã co mà VẪN dài (bảng/ảnh cứng), co toàn bộ bằng zoom
    let zoom = 1;
    if (q.scrollHeight > maxPx) {
      zoom = Math.max(0.5, (maxPx - 2) / q.scrollHeight);
      q.style.setProperty('--zoom', zoom.toFixed(3));
    }
    // khôi phục style màn hình
    q.style.width = prev.w; q.style.maxWidth = prev.mw; q.style.padding = prev.pad; q.style.transform = prev.tf;
  }

  // ---------- fit A4 preview vào bề ngang màn hình ----------
  function fitPreview() {
    const wrap = $('preview-wrap');
    const q = $('quote');
    if (!wrap || !q) return;
    wrap.style.setProperty('--pv-scale', '1');
    wrap.style.height = 'auto';
    const avail = wrap.clientWidth;
    const qw = q.offsetWidth || 1;
    const scale = Math.min(1, (avail - 2) / qw);
    wrap.style.setProperty('--pv-scale', String(scale));
    // Thu chiều cao wrapper theo scale để không chừa khoảng trống lớn phía dưới
    wrap.style.height = (q.offsetHeight * scale) + 'px';
  }
  window.addEventListener('resize', fitPreview);

  // ---------- init ----------
  function init() {
    ['f-tieude', 'f-customer', 'f-project'].forEach((id) => $(id).addEventListener('input', onChange));
    $('f-bank').addEventListener('change', onChange);
    $('f-kysong').addEventListener('change', onChange);
    const fd = $('f-date');
    fd.addEventListener('input', () => { maskDate(fd); onChange(); });
    $('f-customer').addEventListener('change', () => rememberCustomer($('f-customer').value));

    $('btn-reset-tieude').addEventListener('click', () => { $('f-tieude').value = DEFAULT_TIEUDE; onChange(); });
    $('btn-add-row').addEventListener('click', () => {
      if (rows.length >= MAX_ROWS) return;
      rows.push(emptyRow()); renderRows(); onChange();
    });
    $('btn-new').addEventListener('click', () => {
      if (!confirm('Tạo đề nghị mới? Dữ liệu đang nhập sẽ bị xoá.')) return;
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      applyState({ date: formatToday(), rows: [emptyRow()] });
      const n = $('draft-notice'); if (n) n.hidden = true;
    });
    $('btn-history').addEventListener('click', toggleHistory);
    $('btn-print').addEventListener('click', () => {
      rememberCustomer($('f-customer').value);
      addHistory(collectState());
      if (typeof window.print !== 'function') {
        alert('Trình duyệt không hỗ trợ in. Mở trong Safari/Chrome và dùng Chia sẻ → In.');
        return;
      }
      try { fitOnePage(); } catch (_) {}
      try { window.print(); } catch (_) { alert('Không mở được hộp thoại in. Dùng menu Chia sẻ → In.'); }
    });

    loadCustomers();
    loadDraft();
    fitOnePage();
    fitPreview();
    window.addEventListener('load', () => { fitOnePage(); fitPreview(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
