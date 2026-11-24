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
  // Ghi chú = Giá công nợ − Giá xuất HĐ (chênh lệch). Rỗng nếu thiếu 1 trong 2 giá.
  const diffCN = (cn, hd) => { if (!digits(cn) || !digits(hd)) return ''; const d = (parseInt(digits(cn)) || 0) - (parseInt(digits(hd)) || 0); return d.toLocaleString('vi-VN'); };
  // Đơn giá chiết khấu dòng 1 = giá trị ô Ghi chú (Giá công nợ − Giá xuất HĐ) của dòng mác đầu tiên có đủ giá
  const ckAuto = (p) => { const m = ((p || STATE).mac || []).find(x => digits(x.cn) && digits(x.hd)); return m ? diffCN(m.cn, m.hd) : ''; };
  const TEXT_IDS = ['ma_kh', 'cong_trinh', 'kh', 'dia_chi', 'mst', 'nguoi_dd', 'nguoi_lh', 'culy_di', 'culy_ve', 'kl_dk', 'tt_ht', 'tt_th', 'tt_hm', 'hd_ten', 'hd_mst', 'hd_email', 'hd_diachi', 'ykien', 'sign_nvkd'];

  let STATE = blank();
  function blank() {
    return {
      ma_kh: '', cong_trinh: '', kh: '', dia_chi: '', mst: '', nguoi_dd: '', nguoi_lh: '',
      culy_di: '', culy_ve: '', kl_dk: '',
      mac: [{ m: '', s: '10±2', cn: '', hd: '', gc: '' }, { m: 'M250 R28 S10', s: '10±2', cn: '', hd: '', gc: '' }, { m: '', s: '10±2', cn: '', hd: '', gc: '' }],
      addon: ADDONS.map(a => ({ n: a.n, g: a.g })),
      tt_ht: 'Thanh Toán Trước', tt_th: '', tt_hm: '',
      hd_ten: '', hd_mst: '', hd_email: '', hd_diachi: '',
      ck: [{ ng: 'NGUYỄN TẤN ĐẠT', cv: 'KD', sdt: '', dg: '', gc: 'Thuế 25%' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }, { ng: '', cv: '', sdt: '', dg: '', gc: '' }],
      ykien: '', sign_nvkd: 'NGUYỄN TẤN ĐẠT', kysong: false, ckGcInit: true, ttInit: true,
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
      <td><input class="l" data-t="mac" data-i="${i}" data-f="gc" data-gci="${i}" value="${esc(m.gc)}" placeholder="${diffCN(m.cn, m.hd) || 'Ghi chú'}" title="Để trống = tự tính chênh lệch (công nợ − xuất HĐ)"></td>
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
      ${i === 0 ? `<td class="gc-calc ck-auto" title="Tự lấy = ô Ghi chú bảng đơn giá">${ckAuto()}</td>` : `<td><input data-t="ck" data-i="${i}" data-f="dg" value="${esc(c.dg)}" inputmode="numeric"></td>`}
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
  function loadDraft() { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d && typeof d === 'object') { STATE = Object.assign(blank(), d); if (!d.ckGcInit) STATE.ckGcInit = false; if (!d.ttInit) STATE.ttInit = false; } } catch (_) {} fillCk0(); }
  function fillCk0() { const c = STATE.ck && STATE.ck[0]; if (c && !c.ng && !c.cv) { c.ng = 'NGUYỄN TẤN ĐẠT'; c.cv = 'KD'; } if (c && !STATE.ckGcInit) { if (!c.gc) c.gc = 'Thuế 25%'; STATE.ckGcInit = true; } if (!STATE.ttInit) { if (!STATE.tt_ht) STATE.tt_ht = 'Thanh Toán Trước'; STATE.ttInit = true; } }

  // ---------- history ----------
  function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; } }
  function setHistory(l) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(l.slice(0, MAX_HISTORY))); } catch (_) {} }
  function saveToHistory(noCollect) {
    if (!noCollect) collect();
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

  // ---------- render A4 doc (dựng theo đúng file Word "Phiếu thông tin khách hàng") ----------
  const S3 = '<sup class="s3">3</sup>';
  const pad2 = (n) => ('0' + n).slice(-2);
  const nb = (v) => esc(v) || '&nbsp;';
  // Chiều cao dòng bảng đơn giá như Word: 3 dòng mác 19.6 / 22.6 / 19.9pt, các dòng phụ gia 19.85pt
  const MAC_H = [19.6, 22.6, 19.9];
  function pageHTML(p, which) {
    const now = new Date();
    const foot = '<img class="foot" src="assets/footer-banner.png" alt="">';
    if (which === 1) {
      const macRows = p.mac.map((m, i) => `<tr style="height:${MAC_H[i] || 19.9}pt"><td>${pad2(i + 1)}</td><td class="mac">${esc(m.m)}</td><td>${esc(m.s)}</td><td>${money(m.cn)}</td><td>${money(m.hd)}</td><td>${m.gc ? esc(m.gc) : diffCN(m.cn, m.hd)}</td></tr>`).join('');
      const addRows = p.addon.map((a, i) => `<tr style="height:19.85pt"><td>${pad2(p.mac.length + i + 1)}</td><td>${esc(a.n).replace(/m³/g, 'm3')}</td><td colspan="2">${money(a.g)}</td><td></td><td></td></tr>`).join('');
      return `<div class="pg doc">
        <div class="hd"><img class="logo" src="assets/logo-phieu.jpg" alt=""><div class="ttl">PHIẾU THÔNG TIN KHÁCH HÀNG</div><div class="makh">Mã KH: <span>${esc(p.ma_kh)}</span></div></div>
        <div class="ln ct" style="margin-bottom:.3pt">Công trình: ${esc(p.cong_trinh)}</div>
        <div class="ln h" style="margin-bottom:8.1pt">I/ THÔNG TIN KHÁCH HÀNG</div>
        <div class="ln" style="margin-bottom:8pt">Khách hàng: ${esc(p.kh)}</div>
        <div class="ln" style="margin-bottom:8.1pt">Địa chỉ: ${esc(p.dia_chi)}</div>
        <div class="ln" style="margin-bottom:8pt">Mã số thuế: ${esc(p.mst)}</div>
        <div class="ln flex" style="margin-bottom:8pt"><span>Người đại diện:&nbsp;&nbsp;</span><span class="ld fill">${nb(p.nguoi_dd)}</span></div>
        <div class="ln flex" style="margin-bottom:8.1pt"><span>Người liên hệ trực tiếp:&nbsp;&nbsp;</span><span class="ld fill">${nb(p.nguoi_lh)}</span></div>
        <div class="ln" style="margin-bottom:8pt">Cự ly vận chuyển: lượt đi: <span class="ld c" style="min-width:76pt">${nb(p.culy_di)}</span> km; lượt về: <span class="ld c" style="min-width:59.5pt">${nb(p.culy_ve)}</span> km</div>
        <div class="ln" style="margin-bottom:8.1pt">Khối lượng dự kiến:&nbsp;&nbsp; <span class="ld c" style="min-width:28.3pt">${nb(p.kl_dk)}</span> m${S3}</div>
        <div class="ln h" style="margin-bottom:4.2pt">II/ ĐƠN GIÁ</div>
        <div class="ln h dg-head" style="margin-bottom:6.75pt"><span>1.&nbsp;&nbsp;&nbsp;<u>Đơn giá bê tông</u></span><span class="unit">(Đơn vị tính: m${S3})</span></div>
        <table class="t1"><colgroup><col style="width:35.5pt"><col style="width:202.8pt"><col style="width:56.6pt"><col style="width:78pt"><col style="width:78pt"><col style="width:78pt"></colgroup>
          <thead><tr style="height:78pt"><th><span>STT</span></th><th><span>MAC BÊ TÔNG<br>Đạt cường độ sau 28 ngày</span></th><th><span>ĐỘ SỤT<br>(CM)</span></th><th><span>ĐƠN GIÁ<br>CÔNG NỢ<br>(VNĐ/M${S3})</span></th><th><span>ĐƠN GIÁ<br>XUẤT HOÁ<br>ĐƠN<br>(VNĐ/M${S3})</span></th><th><span>GHI CHÚ<br>(Chênh lệch<br>giá, gửi giá)</span></th></tr></thead>
          <tbody>${macRows}${addRows}</tbody></table>
        ${foot}</div>`;
    }
    const ck = p.ck.map((c, i) => i === 0 ? Object.assign({}, c, { dg: ckAuto(p) }) : c);
    while (ck.length < 3) ck.push({});
    const ckRows = ck.map((c, i) => `<tr style="height:23.2pt"><td>${pad2(i + 1)}</td><td class="l">${esc(c.ng || '')}</td><td>${esc(c.cv || '')}</td><td>${esc(c.sdt || '')}</td><td>${money(c.dg)}</td><td>${esc(c.gc || '')}</td></tr>`).join('');
    const yk = String(p.ykien || '').split(/\n/).filter(Boolean);
    const ykGap = [12.9, 13, 6.9, 12.8, 12.9];
    const ykLines = ykGap.map((g, i) => `<div class="yk" style="margin-top:${g}pt">${esc(yk[i] || '')}</div>`).join('');
    const sig = p.kysong ? '' : '<img src="assets/sign-dat.png" alt="">';
    return `<div class="pg doc">
      <div class="ln h" style="margin-top:.35pt;margin-bottom:5.4pt">III/&nbsp;&nbsp;HÌNH THỨC THANH TOÁN</div>
      <div class="ln bl flex" style="margin-bottom:11.4pt"><span class="bu">•</span><span>Hình thức thanh toán:</span><span class="ld dot fill" style="margin-right:9.6pt">${nb(p.tt_ht)}</span></div>
      <div class="ln bl flex" style="margin-bottom:12.6pt"><span class="bu">•</span><span>Thời hạn thanh toán:&nbsp;</span><span class="ld fill">${nb(p.tt_th)}</span></div>
      <div class="ln bl" style="margin-bottom:9.9pt"><span class="bu">•</span>Hạn mức công nợ:</div>
      <div class="ln bl" style="margin-bottom:13.5pt"><span class="ld dot" style="width:384pt">${nb(p.tt_hm)}</span></div>
      <div class="ln bl h" style="margin-bottom:13.3pt"><span class="bu">•</span>IV/ THÔNG TIN XUẤT HÓA ĐƠN (nếu có):</div>
      <div class="ln bl flex" style="margin-bottom:7.1pt"><span class="bu">-</span><span>Tên Công ty:&nbsp;</span><span class="ld fill">${nb(p.hd_ten)}</span></div>
      <div class="ln bl flex" style="margin-bottom:7.1pt"><span class="bu">-</span><span class="lb70">Mã số thuế:</span><span class="ld" style="width:127.8pt">${nb(p.hd_mst)}</span><span>&nbsp;&nbsp;Email:&nbsp;</span><span class="ld fill">${nb(p.hd_email)}</span></div>
      <div class="ln bl flex" style="margin-bottom:6.8pt"><span class="bu">-</span><span class="lb70">Địa chỉ:</span><span class="ld fill">${nb(p.hd_diachi)}</span></div>
      <div class="ln h" style="margin-bottom:6.75pt">V/ CHIẾT KHẤU (nếu có):</div>
      <table class="t2"><colgroup><col style="width:33.6pt"><col style="width:119.8pt"><col style="width:77.3pt"><col style="width:77.5pt"><col style="width:105.6pt"><col style="width:98.9pt"></colgroup>
        <thead><tr style="height:41.5pt"><th><span>STT</span></th><th><span>Người nhận</span></th><th><span>Chức vụ</span></th><th><span>Số điện<br>thoại</span></th><th><span>Đơn giá<br>(VNĐ/M${S3})</span></th><th><span>Ghi chú</span></th></tr></thead>
        <tbody>${ckRows}</tbody></table>
      <div class="ln h" style="margin-top:5.2pt">VI/ Ý KIẾN</div>
      ${ykLines}
      <div class="ln date" style="margin-top:12.9pt;margin-bottom:6.6pt">TP HCM, Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</div>
      <div class="sign">
        <div style="width:170.25pt"><div>TỔNG GIÁM ĐỐC</div><div class="gap"></div><div>LÊ THANH TÂM</div></div>
        <div style="width:170.65pt"><div>PHÒNG KINH DOANH</div><div class="gap"></div><div>NGUYỄN THỊ BÉ</div></div>
        <div style="width:172.2pt"><div>NV. KINH DOANH</div><div class="gap">${sig}</div><div>${esc(String(p.sign_nvkd || '').toUpperCase())}</div></div>
      </div>
      ${foot}</div>`;
  }
  function docHTML(p) { return pageHTML(p, 1) + pageHTML(p, 2); }
  function renderDoc() { $('quote').innerHTML = docHTML(STATE); }

  // ---------- PDF ----------
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'PTTKH'; }
  async function waitImgs(q) {
    try { await Promise.all([...q.querySelectorAll('img')].map(img => { if (img.complete && img.naturalWidth > 0) return Promise.resolve(); if (img.decode) return img.decode().catch(() => {}); return new Promise(r => { img.onload = img.onerror = r; }); })); } catch (_) {}
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
  }
  // Mỗi .pg chụp thành 1 ảnh -> đúng 1 trang A4 (trang dài hơn A4 thì thu nhỏ cho vừa)
  async function capturePages(q, ctx) {
    const jsPDFopt = { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true };
    const pages = [...q.querySelectorAll('.pg')];
    for (let i = 0; i < pages.length; i++) {
      const pw = pages[i].offsetWidth || 794, ph = pages[i].scrollHeight || 1123;
      let sc = Math.min(2, Math.sqrt(15000000 / (pw * ph))); if (!(sc > 0.5)) sc = 0.9;
      const c = await html2pdf().set({ html2canvas: { scale: sc, useCORS: true, backgroundColor: '#ffffff' } }).from(pages[i]).toCanvas().get('canvas');
      const A = document.createElement('canvas'); A.width = c.width; A.height = Math.round(c.width * 297 / 210);
      const g = A.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, A.width, A.height);
      const k = Math.min(1, A.height / c.height), dw = c.width * k; g.drawImage(c, (A.width - dw) / 2, 0, dw, c.height * k);
      if (!ctx.pdf) {
        // lấy 1 đối tượng PDF trắng từ html2pdf (không đưa ảnh qua html2pdf vì nó tự cắt ảnh thành nhiều mảnh)
        const tiny = document.createElement('div'); tiny.style.cssText = 'width:10px;height:10px;background:#fff';
        ctx.pdf = await html2pdf().set({ margin: 0, jsPDF: jsPDFopt, html2canvas: { scale: 1 } }).from(tiny).toPdf().get('pdf');
        while (ctx.pdf.getNumberOfPages() > 1) ctx.pdf.deletePage(ctx.pdf.getNumberOfPages());
        ctx.pdf.setPage(1);
      } else ctx.pdf.addPage();
      ctx.pdf.addImage(A.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      c.width = c.height = A.width = A.height = 0;   // nhả bộ nhớ (iPhone)
    }
  }
  // Đưa khung xem trước về đúng cỡ thật trong lúc chụp, xong trả lại như cũ
  async function exportMode(btn, busyText, fn) {
    const q = $('quote'), wrap = $('preview-wrap');
    if (!q || typeof html2pdf === 'undefined') { alert('Chưa tải được bộ tạo PDF. Kiểm tra mạng rồi thử lại.'); return; }
    const old = btn.textContent; btn.classList.add('pdf-busy'); btn.textContent = busyText; btn.disabled = true;
    const prev = { t: q.style.transform, m: q.style.margin, pv: wrap.style.getPropertyValue('--pv-scale'), h: wrap.style.height, ov: wrap.style.overflow, mw: wrap.style.maxWidth };
    q.style.transform = 'none'; q.style.margin = '0'; q.classList.add('pdf-exporting');
    wrap.style.setProperty('--pv-scale', '1'); wrap.style.height = 'auto'; wrap.style.overflow = 'visible'; wrap.style.maxWidth = 'none';
    try { window.scrollTo(0, 0); } catch (_) {}
    try { await fn(q, (t) => { btn.textContent = t; }); }
    catch (err) { alert('Lỗi tạo PDF: ' + (err && err.message ? err.message : err)); }
    finally {
      q.style.transform = prev.t; q.style.margin = prev.m; q.classList.remove('pdf-exporting');
      wrap.style.setProperty('--pv-scale', prev.pv || ''); wrap.style.height = prev.h; wrap.style.overflow = prev.ov; wrap.style.maxWidth = prev.mw;
      btn.classList.remove('pdf-busy'); btn.textContent = old; btn.disabled = false;
    }
  }
  async function exportPDF() {
    collect(); renderDoc(); saveToHistory(); loadCustomers();
    const filename = `PTTKH_${slug(STATE.kh)}_${(new Date()).toISOString().slice(0, 10)}.pdf`;
    await exportMode($('btn-pdf'), '⏳ Đang tạo PDF...', async (q) => {
      await waitImgs(q); await new Promise(r => setTimeout(r, 120));
      const ctx = {}; await capturePages(q, ctx); ctx.pdf.save(filename);
    });
  }

  // ---------- Nhập nhiều khách -> mỗi khách 1 phiếu ----------
  const BULK_KEY = 'pttkh-mktt-bulk-v1';
  let BULK = [];
  const VAT = () => (window.PttkhBulk && window.PttkhBulk.VAT_DEFAULT) || 'Thu VAT 25%';
  function loadBulk() { try { const a = JSON.parse(localStorage.getItem(BULK_KEY) || '[]'); BULK = Array.isArray(a) ? a : []; } catch (_) { BULK = []; } }
  function saveBulk() { try { localStorage.setItem(BULK_KEY, JSON.stringify(BULK)); } catch (_) {} }
  const toRow = (r) => ({ kh: r.kh || '', ct: r.ct || '', mac: r.mac || '', cn: r.cn ? money(r.cn) : '', hd: r.hd ? money(r.hd) : '', gc: r.gc || VAT() });
  // khách liền nhau cùng tên + cùng công trình = 1 phiếu (nhiều mác)
  function bulkGroups() {
    const g = [];
    BULK.filter(r => String(r.kh || '').trim()).forEach(r => {
      const key = String(r.kh).trim().toUpperCase() + '|' + String(r.ct || '').trim().toUpperCase();
      const last = g[g.length - 1];
      if (last && last.key === key) last.rows.push(r); else g.push({ key, rows: [r] });
    });
    return g.map(x => x.rows);
  }
  function renderBulk() {
    const body = $('bulk-body'); if (!body) return;
    body.innerHTML = BULK.map((r, i) => `<tr>
      <td class="stt">${i + 1}</td>
      <td><input class="l" data-b="kh" data-i="${i}" value="${esc(r.kh)}" placeholder="Tên khách"></td>
      <td><input class="l" data-b="ct" data-i="${i}" value="${esc(r.ct)}"></td>
      <td><input data-b="mac" data-i="${i}" value="${esc(r.mac)}" placeholder="M250 R28 S10" style="min-width:84px"></td>
      <td><input data-b="cn" data-i="${i}" value="${esc(r.cn)}" inputmode="numeric" placeholder="0"></td>
      <td><input data-b="hd" data-i="${i}" value="${esc(r.hd)}" inputmode="numeric" placeholder="0"></td>
      <td><input class="l" data-b="gc" data-i="${i}" value="${esc(r.gc)}"></td>
      <td><span class="del" data-bdel="${i}">✕</span></td>
    </tr>`).join('') || '<tr><td colspan="8" style="padding:12px;color:#789">Chưa có khách nào. Dán danh sách vào ô trên rồi bấm “Tách danh sách”.</td></tr>';
    const n = bulkGroups().length;
    $('btn-bulk-pdf').textContent = n ? `⬇️ Tạo PDF ${n} phiếu (mỗi khách 1 phiếu)` : '⬇️ Tạo PDF hàng loạt';
    $('btn-bulk-pdf').disabled = !n;
  }
  function bulkMsg(t, err) { const m = $('bulk-msg'); m.textContent = t || ''; m.className = 'bulk-msg' + (err ? ' err' : ''); m.hidden = !t; }
  function addBulkRows(rows, how) {
    if (!rows.length) { bulkMsg('Không tách được khách nào. Mỗi dòng 1 khách: tên, giá công nợ, giá xuất HĐ.', true); return; }
    const onlyEmpty = BULK.every(r => !String(r.kh || '').trim());
    BULK = (onlyEmpty ? [] : BULK).concat(rows.map(toRow));
    saveBulk(); renderBulk();
    const miss = rows.filter(r => !r.cn || !r.hd).length;
    bulkMsg(`✅ ${how} ${rows.length} dòng → ${bulkGroups().length} phiếu.` + (miss ? ` ${miss} dòng thiếu giá, anh xem lại bảng dưới.` : ' Anh xem lại bảng rồi bấm Tạo PDF.'));
  }
  function makeState(base, rows) {
    const S = JSON.parse(JSON.stringify(base)); delete S._id;
    Object.assign(S, { ma_kh: '', cong_trinh: rows[0].ct || '', kh: String(rows[0].kh).trim(), dia_chi: '', mst: '', nguoi_dd: '', nguoi_lh: '',
      culy_di: '', culy_ve: '', kl_dk: '', hd_ten: '', hd_mst: '', hd_email: '', hd_diachi: '', ykien: '' });
    S.mac = blank().mac;
    const slot = [1, 2, 0];   // như mẫu Word: mác đầu tiên ở dòng 02
    rows.forEach((r, j) => {
      const m = { m: r.mac || (j === 0 ? 'M250 R28 S10' : ''), s: '10±2', cn: r.cn || '', hd: r.hd || '', gc: r.gc || VAT() };
      if (j < 3) S.mac[slot[j]] = m; else S.mac.push(m);
    });
    if (!S.ck || !S.ck.length) S.ck = blank().ck;
    S.ck = S.ck.map(c => Object.assign({}, c));
    return S;
  }
  async function exportBulk() {
    collect(); saveDraft();
    const groups = bulkGroups();
    if (!groups.length) { bulkMsg('Chưa có khách nào trong bảng.', true); return; }
    const base = JSON.parse(JSON.stringify(STATE)), keep = STATE;
    const filename = `PTTKH_${groups.length}-khach_${(new Date()).toISOString().slice(0, 10)}.pdf`;
    await exportMode($('btn-bulk-pdf'), '⏳ Đang tạo...', async (q, say) => {
      const ctx = {};
      try {
        for (let i = 0; i < groups.length; i++) {
          say(`⏳ Đang tạo phiếu ${i + 1}/${groups.length}...`);
          STATE = makeState(base, groups[i]);
          renderDoc(); await waitImgs(q); await new Promise(r => setTimeout(r, 60));
          await capturePages(q, ctx);
          saveToHistory(true); rememberCustomer(STATE.kh);
        }
        ctx.pdf.save(filename);
        bulkMsg(`✅ Đã tạo ${filename}: ${groups.length} phiếu, ${groups.length * 2} trang A4. Từng phiếu cũng đã lưu trong 🕘 Lịch sử.`);
      } finally { STATE = keep; renderDoc(); loadCustomers(); }
    });
  }
  function initBulk() {
    loadBulk(); renderBulk();
    $('btn-bulk-parse').onclick = () => {
      const t = $('bulk-text').value;
      if (!t.trim()) { bulkMsg('Anh dán danh sách khách vào ô trên trước nha.', true); return; }
      addBulkRows(window.PttkhBulk ? window.PttkhBulk.parseText(t) : [], 'Đã tách');
    };
    $('btn-bulk-ocr').onclick = () => {
      if (!window.MkttOCR || !window.MkttOCR.open) { bulkMsg('Chưa tải được phần đọc ảnh. Kiểm tra mạng rồi thử lại.', true); return; }
      window.MkttOCR.open('pttkh_list', (d) => addBulkRows(window.PttkhBulk.fromOCR(d), 'AI đọc được'));
    };
    $('btn-bulk-add').onclick = () => { BULK.push(toRow({})); saveBulk(); renderBulk(); };
    $('btn-bulk-clear').onclick = () => { if (!BULK.length || confirm('Xoá hết danh sách khách trong bảng?')) { BULK = []; saveBulk(); renderBulk(); bulkMsg(''); } };
    $('btn-bulk-pdf').onclick = exportBulk;
    $('bulk-body').addEventListener('input', (e) => {
      const d = e.target.dataset; if (!d.b) return;
      const r = BULK[+d.i]; if (!r) return;
      r[d.b] = e.target.value; saveBulk();
      if (d.b === 'kh' || d.b === 'ct') { const n = bulkGroups().length; $('btn-bulk-pdf').textContent = n ? `⬇️ Tạo PDF ${n} phiếu (mỗi khách 1 phiếu)` : '⬇️ Tạo PDF hàng loạt'; $('btn-bulk-pdf').disabled = !n; }
    });
    $('bulk-body').addEventListener('change', (e) => {
      const d = e.target.dataset; if (d.b !== 'cn' && d.b !== 'hd') return;
      const r = BULK[+d.i]; if (!r) return;
      const v = window.PttkhBulk ? window.PttkhBulk.normMoney(e.target.value) : 0;
      if (v) { r[d.b] = money(v); e.target.value = r[d.b]; saveBulk(); }
    });
    $('bulk-body').addEventListener('click', (e) => {
      const i = e.target.dataset.bdel; if (i == null) return;
      BULK.splice(+i, 1); saveBulk(); renderBulk();
    });
  }
  window.__pttkhTest = { bulkGroups, makeState: (rows) => makeState(STATE, rows), docHTML };

  // ---------- init ----------
  function init() {
    loadDraft(); loadCustomers(); apply();
    // input events
    $('form').addEventListener('input', (e) => {
      if (e.target.matches('input[data-t]')) { const t = e.target.dataset.t, i = +e.target.dataset.i, f = e.target.dataset.f; if (STATE[t] && STATE[t][i]) STATE[t][i][f] = e.target.value; if (t === 'mac' && (f === 'cn' || f === 'hd')) { const cell = document.querySelector(`input[data-gci="${i}"]`); if (cell) cell.placeholder = diffCN(STATE.mac[i].cn, STATE.mac[i].hd) || 'Ghi chú'; const ca = document.querySelector('.ck-auto'); if (ca) ca.textContent = ckAuto(); } renderDoc(); saveDraft(); return; }
      if (e.target.id && e.target.id.startsWith('f-')) sync();
    });
    $('form').addEventListener('change', (e) => { if (e.target.id === 'f-kysong') sync(); });
    // delete row (delegate)
    $('form').addEventListener('click', (e) => {
      const d = e.target.dataset;
      if (d.del === 'mac') { collect(); STATE.mac.splice(+d.i, 1); renderMac(); renderCk(); renderDoc(); saveDraft(); }
      if (d.del === 'ck') { collect(); STATE.ck.splice(+d.i, 1); renderCk(); renderDoc(); saveDraft(); }
    });
    $('btn-add-mac').onclick = () => { collect(); STATE.mac.push({ m: '', s: '10±2', cn: '', hd: '', gc: '' }); renderMac(); renderDoc(); saveDraft(); };
    $('btn-add-ck').onclick = () => { collect(); STATE.ck.push({ ng: '', cv: '', sdt: '', dg: '', gc: '' }); renderCk(); renderDoc(); saveDraft(); };
    $('btn-new').onclick = () => { if (confirm('Tạo phiếu mới? (phiếu hiện tại nên Lưu trước)')) { STATE = blank(); apply(); window.scrollTo(0, 0); } };
    $('btn-save').onclick = () => { saveToHistory(); loadCustomers(); alert('Đã lưu phiếu 🦐'); };
    $('btn-history').onclick = toggleHistory;
    $('btn-pdf').onclick = exportPDF;
    initBulk();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
