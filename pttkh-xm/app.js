// Phiếu Thông Tin Khách Hàng — XI MĂNG (Công ty TNHH MTV Khôi Huy). Client-side, offline.
(function () {
  'use strict';

  const DRAFT_KEY = 'pttkh-xm-draft-v1';
  const HISTORY_KEY = 'pttkh-xm-history-v1';
  const CUSTOMERS_KEY = 'pttkh-xm-customers-v1';
  const CO_NAME = 'CÔNG TY TNHH MTV KHÔI HUY';
  const CO_ADDR = '26/7A Chánh Hưng, xã Phước Lộc, Huyện Nhà Bè, TP.HCM';
  const MAX_HISTORY = 60;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const money = (s) => { const n = parseInt(digits(s)); return n ? n.toLocaleString('vi-VN') : ''; };
  const TEXT_IDS = ['ma_kh', 'cong_trinh', 'kh', 'dia_chi', 'mst', 'nguoi_dd', 'nguoi_lh', 'dd_nhan', 'kl_dk', 'tt_ht', 'tt_th', 'tt_hm', 'hd_ten', 'hd_mst', 'hd_email', 'hd_diachi', 'ykien', 'sign_gd', 'sign_nvkd'];
  const newXm = () => ({ loai: '', mua: '', ban: '', hd: '', cuoc: '', gc: '' });

  let STATE = blank();
  function blank() {
    return {
      ma_kh: '', cong_trinh: '', kh: '', dia_chi: '', mst: '', nguoi_dd: '', nguoi_lh: '', dd_nhan: '', kl_dk: '',
      xm: [newXm(), newXm(), newXm()],
      tt_ht: '', tt_th: '', tt_hm: '',
      hd_ten: '', hd_mst: '', hd_email: '', hd_diachi: '',
      ck: [{ ng: '', cv: '', sdt: '', dg: '', gc: '' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }],
      ykien: '', sign_gd: 'ĐẶNG DUY KHƯƠNG', sign_nvkd: 'NGUYỄN TẤN ĐẠT',
    };
  }

  // ---------- render dynamic tables ----------
  function renderXm() {
    const num = (i, f, v) => `<td><input data-t="xm" data-i="${i}" data-f="${f}" value="${esc(v)}" inputmode="numeric" placeholder="0"></td>`;
    $('xm-body').innerHTML = STATE.xm.map((x, i) => `<tr>
      <td>${i + 1}</td>
      <td><input class="l" data-t="xm" data-i="${i}" data-f="loai" value="${esc(x.loai)}" placeholder="VD: XM FICO PCB40 bao"></td>
      ${num(i, 'mua', x.mua)}${num(i, 'ban', x.ban)}${num(i, 'hd', x.hd)}${num(i, 'cuoc', x.cuoc)}
      <td><input class="l" data-t="xm" data-i="${i}" data-f="gc" value="${esc(x.gc)}"></td>
      <td>${STATE.xm.length > 1 ? `<span class="del" data-del="xm" data-i="${i}">✕</span>` : ''}</td>
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
  function renderTables() { renderXm(); renderCk(); }

  // ---------- sync inputs <-> STATE ----------
  function collect() {
    TEXT_IDS.forEach(k => { const e = $('f-' + k); if (e) STATE[k] = e.value; });
    document.querySelectorAll('#form input[data-t]').forEach(inp => {
      const t = inp.dataset.t, i = +inp.dataset.i, f = inp.dataset.f;
      if (STATE[t] && STATE[t][i]) STATE[t][i][f] = inp.value;
    });
  }
  function apply() {
    TEXT_IDS.forEach(k => { const e = $('f-' + k); if (e) e.value = STATE[k] || ''; });
    renderTables();
    renderDoc();
    saveDraft();
  }
  function sync() { collect(); renderDoc(); saveDraft(); }
  window.__pttkhSync = () => { collect(); renderTables(); renderDoc(); saveDraft(); };

  // ---------- customers autocomplete ----------
  function loadCustomers() {
    let list = [];
    [CUSTOMERS_KEY, 'pttkh-mktt-customers-v1', 'dntt-mktt-customers-v1'].forEach(k => {
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
    const snap = { id: STATE._id || ('X' + Date.now()), at: Date.now(), state: JSON.parse(JSON.stringify(STATE)) };
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
    const xmAny = p.xm.filter(x => x.loai || x.mua || x.ban || x.hd || x.cuoc || x.gc);
    const xmRows = (xmAny.length ? xmAny : [newXm()]).map((x, i) => `<tr><td>${('0' + (i + 1)).slice(-2)}</td><td class="l">${esc(x.loai)}</td><td class="n">${money(x.mua)}</td><td class="n">${money(x.ban)}</td><td class="n">${money(x.hd)}</td><td class="n">${money(x.cuoc)}</td><td class="l">${esc(x.gc)}</td></tr>`).join('');
    const ckAny = p.ck.filter(c => c.ng || c.cv || c.sdt || c.dg || c.gc);
    const ckRows = (ckAny.length ? ckAny : [{}]).map((c, i) => `<tr><td>${('0' + (i + 1)).slice(-2)}</td><td class="l">${esc(c.ng || '')}</td><td class="l">${esc(c.cv || '')}</td><td>${esc(c.sdt || '')}</td><td class="n">${money(c.dg)}</td><td class="l">${esc(c.gc || '')}</td></tr>`).join('');
    const head = `<div class="d-head kh-head"><div class="co">${CO_NAME}<div class="addr">${CO_ADDR}</div></div></div>`;
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
      <div class="r"><b>Địa điểm nhận hàng:</b> ${esc(p.dd_nhan)}</div>
      <div class="r"><b>Khối lượng dự kiến:</b> ${esc(p.kl_dk)}${p.kl_dk ? ' tấn' : ''}</div>
      <div class="st">II. Đơn giá xi măng (VNĐ/tấn)</div>
      <table class="xm-tbl"><thead><tr><th>STT</th><th>Chủng loại XM</th><th>Giá mua vào</th><th>Giá bán ra</th><th>Giá xuất HĐ</th><th>Cước vận chuyển</th><th>Ghi chú</th></tr></thead><tbody>${xmRows}</tbody></table>
      <div class="st">III. Hình thức thanh toán</div>
      <div class="r"><b>Hình thức thanh toán:</b> ${esc(p.tt_ht)}</div>
      <div class="r"><b>Thời hạn thanh toán:</b> ${esc(p.tt_th)}</div>
      <div class="r"><b>Hạn mức công nợ:</b> ${esc(p.tt_hm)}</div>
      <div class="st">IV. Thông tin xuất hoá đơn</div>
      <div class="r"><b>Tên công ty:</b> ${esc(p.hd_ten)}</div>
      <div class="r"><b>Mã số thuế:</b> ${esc(p.hd_mst)} &nbsp;&nbsp; <b>Email:</b> ${esc(p.hd_email)}</div>
      <div class="r"><b>Địa chỉ:</b> ${esc(p.hd_diachi)}</div>`;
    const page2 = `
      ${head}
      <div class="st">V. Chiết khấu (nếu có)</div>
      <table><thead><tr><th>STT</th><th>Người nhận</th><th>Chức vụ</th><th>SĐT</th><th>Đơn giá (VNĐ/tấn)</th><th>Ghi chú</th></tr></thead><tbody>${ckRows}</tbody></table>
      <div class="st">VI. Ý kiến</div>
      ${p.ykien ? `<div class="r">${esc(p.ykien)}</div>` : ''}
      <div class="ylines">${'<div class="dotline"></div>'.repeat(4)}</div>
      <div class="d-date">TP.HCM, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</div>
      <div class="sign">
        <div class="col"><div class="role">Xác nhận khách hàng</div><div class="gap"></div><div class="nm"></div></div>
        <div class="col"><div class="role">NV. Kinh doanh</div><div class="gap"></div><div class="nm">${esc(p.sign_nvkd)}</div></div>
        <div class="col"><div class="role">Giám đốc</div><div class="gap"></div><div class="nm">${esc(p.sign_gd)}</div></div>
      </div>`;
    $('quote').innerHTML = `<div class="pg doc">${page1}</div><div class="pg doc">${page2}</div>`;
  }

  // ---------- font size ----------
  let PDF_FONT = 12;
  function applyFont() { document.documentElement.style.setProperty('--pdf-font', PDF_FONT + 'px'); $('font-val').textContent = PDF_FONT; }

  // ---------- PDF ----------
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'KH'; }
  async function exportPDF() {
    collect(); renderDoc(); saveToHistory(); loadCustomers();
    const q = $('quote'), wrap = $('preview-wrap');
    if (!q || typeof html2pdf === 'undefined') { alert('Chưa tải được bộ tạo PDF. Kiểm tra mạng rồi thử lại.'); return; }
    const btn = $('btn-pdf'); const old = btn.textContent;
    btn.classList.add('pdf-busy'); btn.textContent = '⏳ Đang tạo PDF...';
    const prev = { t: q.style.transform, m: q.style.margin, sh: q.style.boxShadow, pv: wrap.style.getPropertyValue('--pv-scale'), h: wrap.style.height, ov: wrap.style.overflow };
    q.style.transform = 'none'; q.style.margin = '0'; q.style.boxShadow = 'none'; q.classList.add('pdf-exporting');
    wrap.style.setProperty('--pv-scale', '1'); wrap.style.height = 'auto'; wrap.style.overflow = 'visible';
    try { window.scrollTo(0, 0); } catch (_) {}
    await new Promise(r => setTimeout(r, 120));
    const filename = `PTTKH_XiMang_${slug(STATE.kh)}_${(new Date()).toISOString().slice(0, 10)}.pdf`;
    const SAFE = 3800, hpx = q.offsetHeight || 1123, wpx = q.offsetWidth || 794;
    let scale = Math.min(2, SAFE / hpx, SAFE / wpx); if (!(scale > 0.5)) scale = 0.9;
    const canvasOpt = { scale, useCORS: true, backgroundColor: '#ffffff' };
    const jsPDFopt = { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true };
    const pages = [...q.querySelectorAll('.pg')];
    try {
      const pdf = await html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.95 }, html2canvas: canvasOpt, jsPDF: jsPDFopt, pagebreak: { mode: ['css'] } }).from(pages[0]).toPdf().get('pdf');
      // html2pdf đôi khi đẻ thêm 1 trang trắng sau trang 1 → giữ đúng 1 trang
      while (pdf.getNumberOfPages() > 1) pdf.deletePage(pdf.getNumberOfPages());
      for (let i = 1; i < pages.length; i++) {
        const c = await html2pdf().set({ html2canvas: canvasOpt }).from(pages[i]).toCanvas().get('canvas');
        let h = 210 * c.height / c.width; if (h > 297) h = 297;
        pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, h, undefined, 'FAST');
      }
      pdf.save(filename);
    }
    catch (err) { alert('Lỗi tạo PDF: ' + (err && err.message ? err.message : err)); }
    finally { q.style.transform = prev.t; q.style.margin = prev.m; q.style.boxShadow = prev.sh; q.classList.remove('pdf-exporting'); wrap.style.setProperty('--pv-scale', prev.pv || '1'); wrap.style.height = prev.h; wrap.style.overflow = prev.ov; btn.classList.remove('pdf-busy'); btn.textContent = old; }
  }

  // ---------- init ----------
  function init() {
    loadDraft(); applyFont(); loadCustomers(); apply();
    $('form').addEventListener('input', (e) => {
      if (e.target.matches('input[data-t]')) { const t = e.target.dataset.t, i = +e.target.dataset.i, f = e.target.dataset.f; if (STATE[t] && STATE[t][i]) STATE[t][i][f] = e.target.value; renderDoc(); saveDraft(); return; }
      if (e.target.id && e.target.id.startsWith('f-')) sync();
    });
    $('form').addEventListener('click', (e) => {
      const d = e.target.dataset;
      if (d.del === 'xm') { collect(); STATE.xm.splice(+d.i, 1); renderXm(); renderDoc(); saveDraft(); }
      if (d.del === 'ck') { collect(); STATE.ck.splice(+d.i, 1); renderCk(); renderDoc(); saveDraft(); }
    });
    $('btn-add-xm').onclick = () => { collect(); STATE.xm.push(newXm()); renderXm(); renderDoc(); saveDraft(); };
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
