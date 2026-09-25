// Phiếu Thông Tin Khách Hàng — MKTT App. Client-side, offline.
(function () {
  'use strict';

  const DRAFT_KEY = 'pttkh-mktt-draft-v1';
  const HISTORY_KEY = 'pttkh-mktt-history-v1';
  const CUSTOMERS_KEY = 'pttkh-mktt-customers-v1';
  const COMPANY = 'CÔNG TY TNHH BÊ TÔNG MÊ KÔNG THƯƠNG TÍN';
  const MAX_HISTORY = 60;

  const ADDONS = [
    'Phụ gia 03 ngày đạt 70% mác thiết kế|140.000',
    'Phụ gia 04 ngày đạt 70% mác thiết kế|140.000',
    'Phụ gia 07 ngày đạt 90% mác thiết kế|70.000',
    'Phụ gia 14 ngày đạt 90% mác thiết kế|50.000',
    'Phụ gia chống thấm B4|10.000',
    'Phụ gia chống thấm B6|70.000',
    'Phụ gia chống thấm B8|80.000',
    'Phụ gia chống thấm B10|100.000',
    'Xe Nước|700.000',
    'Đá Xanh|200.000',
    'Đá Mi|50.000',
    'Tăng/giảm một cấp độ mác|50.000',
    'Tăng cấp độ sụt lên thêm mỗi 02cm|20.000',
    'KL cung cấp 3m³ ≤ 01 chuyến < 4,5m³|350.000',
    'KL cung cấp 2m³ < 01 chuyến < 3m³|450.000',
    'KL cung cấp 01 chuyến ≤ 2m³|550.000',
  ].map(s => { const [n, g] = s.split('|'); return { n, g }; });

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const money = (s) => { const n = parseInt(digits(s)); return n ? n.toLocaleString('vi-VN') : ''; };
  // Ghi chú = Giá xuất HĐ − Giá công nợ (chênh lệch). Rỗng nếu thiếu 1 trong 2 giá.
  const diffCN = (cn, hd) => { if (!digits(cn) || !digits(hd)) return ''; const d = (parseInt(digits(hd)) || 0) - (parseInt(digits(cn)) || 0); return d.toLocaleString('vi-VN'); };
  const TEXT_IDS = ['ma_kh', 'cong_trinh', 'kh', 'dia_chi', 'mst', 'nguoi_dd', 'nguoi_lh', 'culy_di', 'culy_ve', 'kl_dk', 'tt_ht', 'tt_th', 'tt_hm', 'hd_ten', 'hd_mst', 'hd_email', 'hd_diachi', 'ykien', 'sign_nvkd'];

  let STATE = blank();
  function blank() {
    return {
      ma_kh: '', cong_trinh: '', kh: '', dia_chi: '', mst: '', nguoi_dd: '', nguoi_lh: '',
      culy_di: '', culy_ve: '', kl_dk: '',
      mac: [{ m: '', s: '10±2', cn: '', hd: '', gc: '' }, { m: 'M250 R28 S10', s: '10±2', cn: '', hd: '', gc: '' }, { m: '', s: '10±2', cn: '', hd: '', gc: '' }],
      addon: ADDONS.map(a => ({ n: a.n, g: a.g })),
      tt_ht: '', tt_th: '', tt_hm: '',
      hd_ten: '', hd_mst: '', hd_email: '', hd_diachi: '',
      ck: [{ ng: '', cv: '', sdt: '', dg: '', gc: '' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }],
      ykien: '', sign_nvkd: 'NGUYỄN TẤN ĐẠT', kysong: false,
    };
  }

  // ---------- render dynamic tables ----------
  function renderMac() {
    $('mac-body').innerHTML = STATE.mac.map((m, i) => `<tr>
      <td>${i + 1}</td>
      <td><input class="l" data-t="mac" data-i="${i}" data-f="m" value="${esc(m.m)}" placeholder="Mác bê tông"></td>
      <td><input data-t="mac" data-i="${i}" data-f="s" value="${esc(m.s)}" style="width:54px"></td>
      <td><input data-t="mac" data-i="${i}" data-f="cn" value="${esc(m.cn)}" inputmode="numeric" placeholder="0"></td>
      <td><input data-t="mac" data-i="${i}" data-f="hd" value="${esc(m.hd)}" inputmode="numeric" placeholder="0"></td>
      <td class="gc-calc l" data-gci="${i}" title="Tự tính = Giá xuất HĐ − Giá công nợ">${diffCN(m.cn, m.hd)}</td>
      <td>${STATE.mac.length > 1 ? `<span class="del" data-del="mac" data-i="${i}">✕</span>` : ''}</td>
    </tr>`).join('');
  }
  function renderAddon() {
    $('add-body').innerHTML = STATE.addon.map((a, i) => `<tr>
      <td>${('0' + (i + 4)).slice(-2)}</td>
      <td class="fix">${esc(a.n)}</td>
      <td><input data-t="addon" data-i="${i}" data-f="g" value="${esc(a.g)}" inputmode="numeric"></td>
    </tr>`).join('');
  }
  function renderCk() {
    $('ck-body').innerHTML = STATE.ck.map((c, i) => `<tr>
      <td>${i + 1}</td>
      <td><input class="l" data-t="ck" data-i="${i}" data-f="ng" value="${esc(c.ng)}"></td>
      <td><input class="l" data-t="ck" data-i="${i}" data-f="cv" value="${esc(c.cv)}"></td>
      <td><input data-t="ck" data-i="${i}" data-f="sdt" value="${esc(c.sdt)}" inputmode="tel"></td>
      <td><input data-t="ck" data-i="${i}" data-f="dg" value="${esc(c.dg)}" inputmode="numeric"></td>
      <td><input class="l" data-t="ck" data-i="${i}" data-f="gc" value="${esc(c.gc)}"></td>
      <td>${STATE.ck.length > 1 ? `<span class="del" data-del="ck" data-i="${i}">✕</span>` : ''}</td>
    </tr>`).join('');
  }
  function renderTables() { renderMac(); renderAddon(); renderCk(); }

  // ---------- sync inputs <-> STATE ----------
  function collect() {
    TEXT_IDS.forEach(k => { const e = $('f-' + k); if (e) STATE[k] = e.value; });
    STATE.kysong = $('f-kysong').checked;
    // dynamic tables đọc từ DOM
    document.querySelectorAll('#form input[data-t]').forEach(inp => {
      const t = inp.dataset.t, i = +inp.dataset.i, f = inp.dataset.f;
      if (STATE[t] && STATE[t][i]) STATE[t][i][f] = inp.value;
    });
  }
  function apply() {
    TEXT_IDS.forEach(k => { const e = $('f-' + k); if (e) e.value = STATE[k] || ''; });
    $('f-kysong').checked = !!STATE.kysong;
    renderTables();
    renderDoc();
    saveDraft();
  }
  function sync() { collect(); renderDoc(); saveDraft(); }
  window.__pttkhSync = () => { collect(); renderTables(); renderDoc(); saveDraft(); };

  // ---------- customers autocomplete ----------
  function loadCustomers() {
    let list = [];
    [CUSTOMERS_KEY, 'dntt-mktt-customers-v1'].forEach(k => {
      try { const a = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(a)) list = list.concat(a); } catch (_) {}
    });
    const uniq = [...new Set(list.filter(Boolean).map(s => String(s)))];
    $('dl-customers').innerHTML = uniq.slice(0, 3000).map(c => `<option value="${esc(c)}">`).join('');
  }
  function rememberCustomer(name) {
    name = String(name || '').trim(); if (!name) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]'); } catch (_) {}
    if (!list.includes(name)) { list.unshift(name); list = list.slice(0, 500); try { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list)); } catch (_) {} }
  }

  // ---------- draft ----------
  function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(STATE)); } catch (_) {} }
  function loadDraft() { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d && typeof d === 'object') STATE = Object.assign(blank(), d); } catch (_) {} }

  // ---------- history ----------
  function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; } }
  function setHistory(l) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(l.slice(0, MAX_HISTORY))); } catch (_) {} }
  function saveToHistory() {
    collect();
    rememberCustomer(STATE.kh);
    const l = getHistory();
    const snap = { id: STATE._id || ('P' + Date.now()), at: Date.now(), state: JSON.parse(JSON.stringify(STATE)) };
    snap.state._id = snap.id;
    const idx = l.findIndex(x => x.id === snap.id);
    if (idx >= 0) l[idx] = snap; else l.unshift(snap);
    setHistory(l);
    STATE._id = snap.id;
  }
  function toggleHistory() {
    const p = $('history-panel');
    if (!p.hidden) { p.hidden = true; return; }
    const l = getHistory();
    p.innerHTML = l.length ? l.map((h, i) => `<div class="hist-item">
      <div class="hi"><b>${esc(h.state.kh) || '(chưa tên KH)'}</b><div class="s">${esc(h.state.cong_trinh) || '—'} · ${new Date(h.at).toLocaleString('vi-VN')}</div></div>
      <button data-open="${i}">Mở</button><button class="del" data-hdel="${i}">Xoá</button>
    </div>`).join('') : '<div style="padding:12px;color:#789;font-size:13px">Chưa có phiếu nào đã lưu.</div>';
    p.hidden = false;
    p.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const h = getHistory()[+b.dataset.open]; if (h) { STATE = Object.assign(blank(), JSON.parse(JSON.stringify(h.state))); apply(); p.hidden = true; window.scrollTo(0, 0); } });
    p.querySelectorAll('[data-hdel]').forEach(b => b.onclick = () => { const l2 = getHistory(); l2.splice(+b.dataset.hdel, 1); setHistory(l2); toggleHistory(); toggleHistory(); });
  }

  // ---------- render A4 doc ----------
  function renderDoc() {
    const p = STATE;
    const now = new Date();
    const macRows = p.mac.map((m, i) => `<tr><td>${('0' + (i + 1)).slice(-2)}</td><td class="l">${esc(m.m)}</td><td>${esc(m.s)}</td><td class="n">${money(m.cn)}</td><td class="n">${money(m.hd)}</td><td class="n">${diffCN(m.cn, m.hd)}</td></tr>`).join('');
    const addRows = p.addon.map((a, i) => `<tr><td>${('0' + (i + 4)).slice(-2)}</td><td class="l" colspan="2">${esc(a.n)}</td><td class="n" colspan="2">${money(a.g)}</td><td></td></tr>`).join('');
    const ckAny = p.ck.filter(c => c.ng || c.cv || c.sdt || c.dg || c.gc);
    const ckRows = (ckAny.length ? ckAny : [{}]).map((c, i) => `<tr><td>${('0' + (i + 1)).slice(-2)}</td><td class="l">${esc(c.ng || '')}</td><td class="l">${esc(c.cv || '')}</td><td>${esc(c.sdt || '')}</td><td class="n">${money(c.dg)}</td><td class="l">${esc(c.gc || '')}</td></tr>`).join('');
    const sig = p.kysong ? '' : '<img src="assets/sign-dat.png" alt="Chữ ký">';
    const head = `<div class="d-head"><img src="assets/logo.png" alt="MKTT"><div class="co">CÔNG TY TNHH BÊ TÔNG<br>MÊ KÔNG THƯƠNG TÍN</div></div>`;
    // ----- Trang 1: đầu phiếu + KH + bảng đơn giá -----
    const page1 = `
      ${head}
      <h2 class="d-title">Phiếu thông tin khách hàng</h2>
      <div class="r"><b>Mã KH:</b> ${esc(p.ma_kh)}</div>
      <div class="r"><b>Công trình:</b> ${esc(p.cong_trinh)}</div>
      <div class="st">I. Thông tin khách hàng</div>
      <div class="r"><b>Khách hàng:</b> ${esc(p.kh)}</div>
      <div class="r"><b>Địa chỉ:</b> ${esc(p.dia_chi)}</div>
      <div class="r"><b>Mã số thuế:</b> ${esc(p.mst)}</div>
      <div class="r"><b>Người đại diện:</b> ${esc(p.nguoi_dd)}</div>
      <div class="r"><b>Người liên hệ trực tiếp:</b> ${esc(p.nguoi_lh)}</div>
      <div class="r"><b>Cự ly vận chuyển:</b> lượt đi: ${esc(p.culy_di)} km; lượt về: ${esc(p.culy_ve)} km</div>
      <div class="r"><b>Khối lượng dự kiến:</b> ${esc(p.kl_dk)} m³</div>
      <div class="st">II. Đơn giá bê tông (VNĐ/m³)</div>
      <table><thead><tr><th>STT</th><th>Mác bê tông</th><th>Độ sụt (cm)</th><th>Giá công nợ</th><th>Giá xuất HĐ</th><th>Ghi chú</th></tr></thead><tbody>${macRows}${addRows}</tbody></table>`;
    // ----- Trang 2: thanh toán + xuất HĐ + chiết khấu + ý kiến + chữ ký -----
    const page2 = `
      ${head}
      <div class="st">III. Hình thức thanh toán</div>
      <div class="r"><b>Hình thức thanh toán:</b> ${esc(p.tt_ht)}</div>
      <div class="r"><b>Thời hạn thanh toán:</b> ${esc(p.tt_th)}</div>
      <div class="r"><b>Hạn mức công nợ:</b> ${esc(p.tt_hm)}</div>
      <div class="st">IV. Thông tin xuất hoá đơn</div>
      <div class="r"><b>Tên công ty:</b> ${esc(p.hd_ten)}</div>
      <div class="r"><b>Mã số thuế:</b> ${esc(p.hd_mst)} &nbsp;&nbsp; <b>Email:</b> ${esc(p.hd_email)}</div>
      <div class="r"><b>Địa chỉ:</b> ${esc(p.hd_diachi)}</div>
      <div class="st">V. Chiết khấu (nếu có)</div>
      <table><thead><tr><th>STT</th><th>Người nhận</th><th>Chức vụ</th><th>SĐT</th><th>Đơn giá (VNĐ/m³)</th><th>Ghi chú</th></tr></thead><tbody>${ckRows}</tbody></table>
      <div class="st">VI. Ý kiến</div>
      <div class="r" style="min-height:24px">${esc(p.ykien)}</div>
      <div class="d-date">TP.HCM, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</div>
      <div class="sign">
        <div class="col"><div class="role">Tổng Giám đốc</div><div class="gap"></div><div class="nm">Lê Thanh Tâm</div></div>
        <div class="col"><div class="role">Phòng Kinh doanh</div><div class="gap"></div><div class="nm">Nguyễn Thị Bé</div></div>
        <div class="col"><div class="role">NV. Kinh doanh</div><div class="gap">${sig}</div><div class="nm">${esc(p.sign_nvkd)}</div></div>
      </div>`;
    $('quote').innerHTML = `<div class="pg">${page1}</div><div class="pg">${page2}</div>`;
  }

  // ---------- font size ----------
  let PDF_FONT = 12;
  function applyFont() { document.documentElement.style.setProperty('--pdf-font', PDF_FONT + 'px'); $('font-val').textContent = PDF_FONT; }

  // ---------- PDF ----------
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'PTTKH'; }
  async function exportPDF() {
    collect(); renderDoc(); saveToHistory(); loadCustomers();
    const q = $('quote'), wrap = $('preview-wrap');
    if (!q || typeof html2pdf === 'undefined') { alert('Chưa tải được bộ tạo PDF. Kiểm tra mạng rồi thử lại.'); return; }
    const btn = $('btn-pdf'); const old = btn.textContent;
    btn.classList.add('pdf-busy'); btn.textContent = '⏳ Đang tạo PDF...';
    const prev = { t: q.style.transform, m: q.style.margin, sh: q.style.boxShadow, pv: wrap.style.getPropertyValue('--pv-scale'), h: wrap.style.height, ov: wrap.style.overflow };
    q.style.transform = 'none'; q.style.margin = '0'; q.style.boxShadow = 'none';
    wrap.style.setProperty('--pv-scale', '1'); wrap.style.height = 'auto'; wrap.style.overflow = 'visible';
    try { window.scrollTo(0, 0); } catch (_) {}
    try { await Promise.all([...q.querySelectorAll('img')].map(img => { if (img.complete && img.naturalWidth > 0) return Promise.resolve(); if (img.decode) return img.decode().catch(() => {}); return new Promise(r => { img.onload = img.onerror = r; }); })); } catch (_) {}
    await new Promise(r => setTimeout(r, 120));
    const filename = `PTTKH_${slug(STATE.kh)}_${(new Date()).toISOString().slice(0, 10)}.pdf`;
    const SAFE = 3800, hpx = q.offsetHeight || 1123, wpx = q.offsetWidth || 794;
    let scale = Math.min(2, SAFE / hpx, SAFE / wpx); if (!(scale > 0.5)) scale = 0.9;
    const opt = { margin: 0, filename, image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: q.scrollWidth, windowHeight: q.scrollHeight },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }, pagebreak: { mode: ['css', 'legacy'] } };
    try { await html2pdf().set(opt).from(q).save(); }
    catch (err) { alert('Lỗi tạo PDF: ' + (err && err.message ? err.message : err)); }
    finally { q.style.transform = prev.t; q.style.margin = prev.m; q.style.boxShadow = prev.sh; wrap.style.setProperty('--pv-scale', prev.pv || '1'); wrap.style.height = prev.h; wrap.style.overflow = prev.ov; btn.classList.remove('pdf-busy'); btn.textContent = old; }
  }

  // ---------- init ----------
  function init() {
    loadDraft(); applyFont(); loadCustomers(); apply();
    // input events
    $('form').addEventListener('input', (e) => {
      if (e.target.matches('input[data-t]')) { const t = e.target.dataset.t, i = +e.target.dataset.i, f = e.target.dataset.f; if (STATE[t] && STATE[t][i]) STATE[t][i][f] = e.target.value; if (t === 'mac' && (f === 'cn' || f === 'hd')) { const cell = document.querySelector(`.gc-calc[data-gci="${i}"]`); if (cell) cell.textContent = diffCN(STATE.mac[i].cn, STATE.mac[i].hd); } renderDoc(); saveDraft(); return; }
      if (e.target.id && e.target.id.startsWith('f-')) sync();
    });
    $('form').addEventListener('change', (e) => { if (e.target.id === 'f-kysong') sync(); });
    // delete row (delegate)
    $('form').addEventListener('click', (e) => {
      const d = e.target.dataset;
      if (d.del === 'mac') { collect(); STATE.mac.splice(+d.i, 1); renderMac(); renderDoc(); saveDraft(); }
      if (d.del === 'ck') { collect(); STATE.ck.splice(+d.i, 1); renderCk(); renderDoc(); saveDraft(); }
    });
    $('btn-add-mac').onclick = () => { collect(); STATE.mac.push({ m: '', s: '10±2', cn: '', hd: '', gc: '' }); renderMac(); renderDoc(); saveDraft(); };
    $('btn-add-ck').onclick = () => { collect(); STATE.ck.push({ ng: '', cv: '', sdt: '', dg: '', gc: '' }); renderCk(); renderDoc(); saveDraft(); };
    $('btn-new').onclick = () => { if (confirm('Tạo phiếu mới? (phiếu hiện tại nên Lưu trước)')) { STATE = blank(); apply(); window.scrollTo(0, 0); } };
    $('btn-save').onclick = () => { saveToHistory(); loadCustomers(); alert('Đã lưu phiếu 🦐'); };
    $('btn-history').onclick = toggleHistory;
    $('btn-pdf').onclick = exportPDF;
    $('btn-font-dec').onclick = () => { PDF_FONT = Math.max(9, PDF_FONT - 1); applyFont(); };
    $('btn-font-inc').onclick = () => { PDF_FONT = Math.min(16, PDF_FONT + 1); applyFont(); };
    $('btn-font-reset').onclick = () => { PDF_FONT = 12; applyFont(); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
