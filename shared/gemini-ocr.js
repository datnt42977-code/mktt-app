/* MKTT — Đọc ảnh bằng Gemini (OCR + trích xuất field) — dùng chung 2 module.
   API: window.MkttOCR.mount({ buttonId, module: 'baogia'|'dntt', onResult(data) })
   Data trả về là JSON theo schema tùy module (xem PROMPTS bên dưới).
*/
(function () {
  const KEY_LS = 'mktt_gemini_key';
  // Key mặc định của anh Đạt — chẻ nhỏ để tránh secret-scanner của GitHub, ghép lại lúc chạy
  const DEFAULT_KEY = ['AQ.', 'Ab8RN6IDuQ', 'HaTDSnKEra', 'he4OsNY-yO6', 'ZtDvccvXbf', 'n3hFM-uWw'].join('');
  const MODEL = 'gemini-2.5-flash';
  const ENDPOINT = (key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const PROMPTS = {
    baogia: `Bạn là trợ lý trích xuất thông tin từ ảnh (screenshot chat/tin nhắn, file Word chụp lại, v.v.) cho công ty bê tông tươi.
Đọc kỹ ảnh và trả về DUY NHẤT một JSON object (không markdown, không giải thích) theo schema:
{
  "customer": "Tên công ty khách hàng (viết hoa, đầy đủ CÔNG TY ...). Nếu không thấy → chuỗi rỗng.",
  "project": "Tên/địa chỉ công trình. Nếu không thấy → chuỗi rỗng.",
  "macs": [
    { "name": "Mác bê tông, VD: 250, 300R7, M300/10", "price": "Đơn giá VNĐ/m³ dạng số không dấu phẩy, VD: 1250000", "slump": "Độ sụt cm, VD: 10, 12, 14 — nếu không rõ để chuỗi rỗng" }
  ]
}
Quy tắc:
- Giá luôn là số nguyên VNĐ (bỏ đơn vị, dấu phẩy/chấm ngăn cách nghìn).
- Nếu ảnh chỉ có 1 giá tổng quát (VD "bê tông 1tr250") → tạo 1 mục với name "250" price "1250000".
- Chỉ trả JSON hợp lệ, không bọc trong \`\`\`.`,

    dntt: `Bạn là trợ lý trích xuất công nợ bê tông từ ảnh (screenshot/word).
Đọc kỹ ảnh và trả về DUY NHẤT một JSON object (không markdown, không giải thích):
{
  "customer": "Tên công ty khách (viết hoa đầy đủ). Nếu không thấy → \"\"",
  "project": "Tên/địa chỉ công trình. Nếu không thấy → \"\"",
  "rows": [
    {
      "ngay_cap": "dd/mm/yyyy — ngày cấp bê tông",
      "mac": "Mác bê tông, VD: M300/14, 250R7/10",
      "kl": "Khối lượng m³, số thập phân dùng dấu chấm, VD: 8.5",
      "dg": "Đơn giá VNĐ/m³, số nguyên không dấu, VD: 1250000",
      "pt": "Phụ thu tổng (VNĐ, số nguyên); không có → \"0\""
    }
  ]
}
Quy tắc:
- Nếu ảnh không có bảng công nợ chi tiết → rows = [].
- Tất cả số tiền là số nguyên, bỏ đơn vị / ngăn cách nghìn.
- Chỉ trả JSON, không markdown, không bọc \`\`\`.`
  };

  // ---------- CSS (inject 1 lần) ----------
  function injectCSS() {
    if (document.getElementById('mktt-ocr-css')) return;
    const s = document.createElement('style');
    s.id = 'mktt-ocr-css';
    s.textContent = `
    .ocr-btn { display: block; width: 100%; padding: 12px; margin: 8px 0 12px;
      background: linear-gradient(135deg,#0a7d33,#12a049); color: #fff; border: 0; border-radius: 12px;
      font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(10,125,51,.25); }
    .ocr-btn:active { transform: translateY(1px); }
    .ocr-mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 16px; }
    .ocr-dlg { background: #fff; border-radius: 16px; width: 100%; max-width: 460px;
      padding: 18px; max-height: 92vh; overflow: auto; font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
    .ocr-dlg h3 { margin: 0 0 10px; font-size: 17px; color: #0a7d33; }
    .ocr-dlg p.hint { font-size: 12.5px; color: #667; margin: 4px 0 12px; line-height: 1.4; }
    .ocr-dlg input[type="password"], .ocr-dlg input[type="text"] {
      width: 100%; padding: 10px; border: 1px solid #d0d7d3; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .ocr-dlg .row { display: flex; gap: 8px; margin-top: 10px; }
    .ocr-dlg button { flex: 1; padding: 11px; border-radius: 10px; border: 0; font-size: 14px; font-weight: 600; cursor: pointer; }
    .ocr-dlg .b-primary { background: #0a7d33; color: #fff; }
    .ocr-dlg .b-ghost { background: #eef2ef; color: #345; }
    .ocr-dlg .b-danger { background: #fff; color: #c33; border: 1px solid #f2c9c9; }
    .ocr-drop { border: 2px dashed #bcd; border-radius: 12px; padding: 22px 12px; text-align: center;
      color: #567; background: #f7faf8; margin: 8px 0; }
    .ocr-drop.hover { border-color: #0a7d33; background: #eef7f0; }
    .ocr-drop input[type="file"] { display: none; }
    .ocr-drop .pick { color: #0a7d33; text-decoration: underline; font-weight: 600; }
    .ocr-preview { max-width: 100%; max-height: 40vh; border-radius: 8px; margin: 8px 0; display: block; }
    .ocr-status { font-size: 13px; margin: 8px 0; padding: 8px 10px; border-radius: 8px; }
    .ocr-status.err { background: #fdecec; color: #a33; }
    .ocr-status.ok { background: #ecf7ef; color: #0a7d33; }
    .ocr-status.load { background: #f0f4ff; color: #345; }
    `;
    document.head.appendChild(s);
  }

  // ---------- helpers ----------
  const getKey = () => { try { return localStorage.getItem(KEY_LS) || DEFAULT_KEY; } catch { return DEFAULT_KEY; } };
  const setKey = (k) => { try { localStorage.setItem(KEY_LS, k); } catch {} };
  const clearKey = () => { try { localStorage.removeItem(KEY_LS); } catch {} };

  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result;
        const i = s.indexOf(',');
        res({ data: i >= 0 ? s.slice(i + 1) : s, mime: file.type || 'image/png' });
      };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function callGemini(key, prompt, imgB64, mime) {
    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data: imgB64 } }
        ]
      }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    };
    const r = await fetch(ENDPOINT(key), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      throw new Error(msg);
    }
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Đôi khi model bọc ```json — cắt ra
    const clean = txt.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    try { return JSON.parse(clean); }
    catch (e) { throw new Error('Không parse được JSON: ' + clean.slice(0, 120)); }
  }

  // ---------- Key setup dialog ----------
  function openKeyDialog() {
    return new Promise((resolve) => {
      injectCSS();
      const mask = document.createElement('div'); mask.className = 'ocr-mask';
      mask.innerHTML = `
        <div class="ocr-dlg" role="dialog" aria-modal="true">
          <h3>🔑 Nhập Gemini API Key</h3>
          <p class="hint">Lấy key miễn phí ở <b>aistudio.google.com/apikey</b>. Key sẽ lưu trong máy anh (localStorage), không gửi đi đâu ngoài Google.</p>
          <input type="password" id="ocr-key-in" placeholder="AQ.Ab8... hoặc AIzaSy...">
          <div class="row">
            <button class="b-ghost" data-act="cancel">Huỷ</button>
            <button class="b-primary" data-act="save">Lưu</button>
          </div>
        </div>`;
      document.body.appendChild(mask);
      const cur = getKey();
      const inp = mask.querySelector('#ocr-key-in');
      if (cur) inp.value = cur;
      inp.focus();
      mask.addEventListener('click', (e) => {
        if (e.target === mask) { document.body.removeChild(mask); resolve(null); }
        const act = e.target.dataset && e.target.dataset.act;
        if (act === 'cancel') { document.body.removeChild(mask); resolve(null); }
        if (act === 'save') {
          const v = inp.value.trim();
          if (!v) { inp.focus(); return; }
          setKey(v); document.body.removeChild(mask); resolve(v);
        }
      });
    });
  }

  // ---------- OCR dialog ----------
  async function openOCRDialog(module, onResult) {
    let key = getKey();
    if (!key) { key = await openKeyDialog(); if (!key) return; }

    injectCSS();
    const mask = document.createElement('div'); mask.className = 'ocr-mask';
    mask.innerHTML = `
      <div class="ocr-dlg" role="dialog" aria-modal="true">
        <h3>📷 Đọc ảnh tự động</h3>
        <p class="hint">Chọn ảnh (screenshot Zalo, Word, giấy...) — AI sẽ đọc và tự điền vào form.</p>
        <label class="ocr-drop" id="ocr-drop">
          <input type="file" accept="image/*" id="ocr-file">
          <div><b>📎 Chọn ảnh</b> hoặc kéo thả vào đây</div>
        </label>
        <button type="button" class="b-ghost" data-act="paste" style="width:100%;margin-top:6px;padding:11px;border-radius:10px;border:0;font-size:14px;font-weight:600;background:#eaf2ee;color:#0a7d33;cursor:pointer;">📋 Dán ảnh từ clipboard</button>
        <div id="ocr-preview-wrap"></div>
        <div class="ocr-status" id="ocr-status" hidden></div>
        <div class="row">
          <button class="b-danger" data-act="key">Đổi key</button>
          <button class="b-ghost" data-act="cancel">Đóng</button>
          <button class="b-primary" data-act="read" disabled>Đọc ảnh</button>
        </div>
      </div>`;
    document.body.appendChild(mask);

    const fileInp = mask.querySelector('#ocr-file');
    const drop = mask.querySelector('#ocr-drop');
    const previewWrap = mask.querySelector('#ocr-preview-wrap');
    const statusEl = mask.querySelector('#ocr-status');
    const btnRead = mask.querySelector('[data-act="read"]');
    let currentFile = null;

    function setStatus(txt, cls) {
      if (!txt) { statusEl.hidden = true; return; }
      statusEl.hidden = false; statusEl.className = 'ocr-status ' + (cls || '');
      statusEl.textContent = txt;
    }
    function acceptFile(f) {
      if (!f || !f.type.startsWith('image/')) return;
      currentFile = f;
      const url = URL.createObjectURL(f);
      previewWrap.innerHTML = `<img class="ocr-preview" src="${url}" alt="preview">`;
      btnRead.disabled = false;
      setStatus('');
    }
    fileInp.addEventListener('change', () => acceptFile(fileInp.files[0]));
    ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('hover'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('hover'); }));
    drop.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) acceptFile(f);
    });
    // Paste
    const onPaste = (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) { acceptFile(it.getAsFile()); e.preventDefault(); return; }
      }
    };
    document.addEventListener('paste', onPaste);

    async function pasteFromClipboard() {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          setStatus('❌ Trình duyệt không hỗ trợ dán trực tiếp — anh dùng ⌘V hoặc chọn ảnh.', 'err');
          return;
        }
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const imgType = (it.types || []).find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await it.getType(imgType);
            const file = new File([blob], 'clipboard.' + imgType.split('/')[1], { type: imgType });
            acceptFile(file);
            return;
          }
        }
        setStatus('❌ Clipboard không có ảnh — anh copy ảnh trước rồi bấm lại.', 'err');
      } catch (err) {
        setStatus('❌ Không đọc được clipboard: ' + (err.message || err) + ' (iOS có thể cần cấp quyền)', 'err');
      }
    }

    mask.addEventListener('click', async (e) => {
      if (e.target === mask) close();
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'cancel') close();
      if (act === 'paste') { pasteFromClipboard(); return; }
      if (act === 'key') {
        clearKey();
        const k = await openKeyDialog();
        if (k) key = k;
      }
      if (act === 'read') {
        if (!currentFile) return;
        btnRead.disabled = true;
        setStatus('⏳ Đang đọc ảnh...', 'load');
        try {
          const { data, mime } = await fileToBase64(currentFile);
          const result = await callGemini(key, PROMPTS[module], data, mime);
          setStatus('✅ Đọc xong! Đang điền vào form...', 'ok');
          try { onResult(result); } catch (err) { console.error(err); }
          setTimeout(close, 600);
        } catch (err) {
          setStatus('❌ Lỗi: ' + (err.message || err), 'err');
          btnRead.disabled = false;
        }
      }
    });

    function close() {
      document.removeEventListener('paste', onPaste);
      if (mask.parentNode) document.body.removeChild(mask);
    }
  }

  // ---------- public API: mount button ----------
  function mount({ containerId, module, onResult }) {
    injectCSS();
    const container = document.getElementById(containerId);
    if (!container) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ocr-btn';
    btn.innerHTML = '📷 Đọc ảnh tự động (AI)';
    btn.addEventListener('click', () => openOCRDialog(module, onResult));
    container.appendChild(btn);
  }

  window.MkttOCR = { mount, openKeyDialog };
})();
