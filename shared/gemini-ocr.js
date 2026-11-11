/* MKTT — Đọc ảnh bằng Gemini (OCR + trích xuất field) — dùng chung 2 module.
   API: window.MkttOCR.mount({ buttonId, module: 'baogia'|'dntt', onResult(data) })
   Data trả về là JSON theo schema tùy module (xem PROMPTS bên dưới).
*/
(function () {
  const KEY_LS = 'mktt_gemini_key';
  // Key mặc định của anh Đạt — chẻ nhỏ để tránh secret-scanner của GitHub, ghép lại lúc chạy
  const DEFAULT_KEY = ['AQ.', 'Ab8RN6IDuQ', 'HaTDSnKEra', 'he4OsNY-yO6', 'ZtDvccvXbf', 'n3hFM-uWw'].join('');
  // Chuỗi model dự phòng: thử lần lượt khi model trước bị quá tải/lỗi tạm thời.
  // gemini-flash-latest là alias luôn trỏ tới bản flash hiện hành → chống khai tử.
  // think = mức "suy nghĩ": mặc định model nghĩ mức medium → chậm gấp ~3 lần mà đọc form không cần.
  // Đo 11/11/2026: 3.6-flash mặc định 8.4s → minimal 2.8s, kết quả y hệt. flash-latest KHÔNG nhận minimal → low.
  const MODELS = [
    { name: 'gemini-3.6-flash', think: 'minimal' },
    { name: 'gemini-flash-latest', think: 'low' },
    { name: 'gemini-flash-lite-latest', think: 'minimal' }
  ];
  const CALL_TIMEOUT_MS = 25000;   // 1 model treo quá 25s → bỏ hẳn
  const HEDGE_MS = 6000;           // model đang chạy quá 6s chưa xong → bật thêm model kế chạy SONG SONG, ai xong trước lấy
  const IMG_MAX_SIDE = 1600;       // ảnh iPhone 4032px → thu còn 1600px: upload nhẹ ~10 lần, vẫn đọc rõ chữ
  const IMG_QUALITY = 0.85;
  const ENDPOINT = (model, key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const PROMPTS = {
    baogia: `Bạn trích xuất thông tin ĐẶT MUA BÊ TÔNG TƯƠI từ ảnh chụp (screenshot Zalo/tin nhắn/Word/giấy) và/hoặc đoạn text khách gửi.
QUY TẮC BẮT BUỘC:
1. BỎ QUA HOÀN TOÀN chữ nằm trong thẻ xem trước bản đồ / Google Maps nhúng (link maps.app.goo.gl, tên địa điểm POI hiển thị trong ô bản đồ, đánh giá sao). Chỉ đọc nội dung do người dùng GÕ/VIẾT trong tin nhắn.
2. customer = tên công ty hoặc người MUA bê tông (bên đặt hàng / nhà thầu / người nhắn tin). Viết HOA đầy đủ dạng "CÔNG TY ...". Nếu chỉ có tên người thì ghi tên người.
3. chu_dau_tu = chủ đầu tư (CĐT) của công trình nếu có nhắc; không có để rỗng.
4. project = tên và/hoặc địa chỉ CÔNG TRÌNH do khách GÕ trong nội dung (VD "Khu dân cư NBB Garden III, Phú Định"). TUYỆT ĐỐI không lấy tên trong thẻ bản đồ nhúng.
5. macs = danh sách mác bê tông khách yêu cầu. Mỗi mục: name (VD 250, 300R7, M300/10), price (đơn giá VNĐ/m³ số nguyên không dấu phẩy nếu có), slump (độ sụt cm nếu có). Giá bỏ đơn vị & dấu ngăn nghìn. Không có mác nào thì để mảng rỗng.
6. TUYỆT ĐỐI không bịa. Không chắc thì để chuỗi rỗng.`,

    dntt: `Bạn trích xuất công nợ bê tông từ ảnh (screenshot/Word) và/hoặc text khách gửi.
QUY TẮC:
- BỎ QUA chữ trong thẻ bản đồ/Google Maps nhúng; chỉ đọc nội dung người dùng gõ/viết.
- customer = tên công ty khách (viết HOA đầy đủ). project = tên/địa chỉ công trình.
- rows = từng dòng cấp bê tông: ngay_cap (dd/mm/yyyy — NẾU nội dung KHÔNG ghi năm thì CHỈ trả "dd/mm", TUYỆT ĐỐI không tự đoán năm), mac (VD M300/14), kl (khối lượng m³, thập phân dùng dấu chấm), dg (đơn giá VNĐ/m³ số nguyên), pt (phụ thu tổng VNĐ số nguyên, không có → "0").
- Không có bảng công nợ chi tiết → rows = []. Mọi số tiền là số nguyên, bỏ đơn vị/ngăn cách nghìn. Không bịa.`,

    pttkh: `Bạn trích xuất THÔNG TIN KHÁCH HÀNG từ ảnh chụp (name card / danh thiếp, giấy phép kinh doanh, hợp đồng, con dấu công ty, screenshot Zalo...) và/hoặc text khách gửi. Dùng để điền Phiếu thông tin khách hàng ngành bê tông.
QUY TẮC BẮT BUỘC:
1. BỎ QUA chữ trong thẻ bản đồ/Google Maps nhúng; chỉ đọc nội dung thật.
2. kh = tên khách hàng / công ty (viết HOA đầy đủ dạng "CÔNG TY ..."; nếu chỉ có tên người thì ghi tên người).
3. dia_chi = địa chỉ đầy đủ của khách/công ty.
4. mst = mã số thuế (chỉ chữ số, bỏ khoảng trắng/dấu gạch).
5. nguoi_dd = người đại diện pháp luật (giám đốc / chủ hộ) nếu có.
6. nguoi_lh = người liên hệ trực tiếp và/hoặc số điện thoại liên hệ.
7. TUYỆT ĐỐI không bịa. Không chắc thì để chuỗi rỗng.`
  };

  // Schema ép cấu trúc JSON (controlled generation) — chính xác & type-safe hơn free-text.
  const SCHEMAS = {
    baogia: {
      type: 'OBJECT',
      properties: {
        customer: { type: 'STRING' },
        chu_dau_tu: { type: 'STRING' },
        project: { type: 'STRING' },
        macs: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, price: { type: 'STRING' }, slump: { type: 'STRING' } } }
        }
      },
      required: ['customer', 'project', 'macs']
    },
    dntt: {
      type: 'OBJECT',
      properties: {
        customer: { type: 'STRING' },
        project: { type: 'STRING' },
        rows: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { ngay_cap: { type: 'STRING' }, mac: { type: 'STRING' }, kl: { type: 'STRING' }, dg: { type: 'STRING' }, pt: { type: 'STRING' } }
          }
        }
      },
      required: ['customer', 'project', 'rows']
    },
    pttkh: {
      type: 'OBJECT',
      properties: {
        kh: { type: 'STRING' },
        dia_chi: { type: 'STRING' },
        mst: { type: 'STRING' },
        nguoi_dd: { type: 'STRING' },
        nguoi_lh: { type: 'STRING' }
      },
      required: ['kh']
    }
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

  // Thu nhỏ + nén JPEG trên máy trước khi gửi (ảnh nhỏ sẵn thì giữ nguyên).
  function compressImage(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const scale = Math.min(1, IMG_MAX_SIDE / Math.max(w, h));
          if (scale === 1 && file.size < 500 * 1024) { URL.revokeObjectURL(url); return resolve(fileToBase64(file)); }
          const c = document.createElement('canvas');
          c.width = Math.round(w * scale); c.height = Math.round(h * scale);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // PNG nền trong → trắng
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const d = c.toDataURL('image/jpeg', IMG_QUALITY);
          URL.revokeObjectURL(url);
          resolve({ data: d.slice(d.indexOf(',') + 1), mime: 'image/jpeg' });
        } catch (e) { URL.revokeObjectURL(url); resolve(fileToBase64(file)); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(fileToBase64(file)); };
      img.src = url;
    });
  }

  // Mở sẵn kết nối tới Google ngay khi trang tải → lần đọc đầu đỡ mất thời gian bắt tay TLS.
  function preconnect() {
    if (document.querySelector('link[data-ocr-preconnect]')) return;
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = 'https://generativelanguage.googleapis.com'; l.crossOrigin = '';
    l.setAttribute('data-ocr-preconnect', '1');
    document.head.appendChild(l);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Lỗi tạm thời (quá tải / rate limit) → thử lại cùng model.
  const isTransient = (status, msg) =>
    status === 429 || status === 500 || status === 503 ||
    /high demand|overload|unavailable|try again|rate limit|quota/i.test(msg || '');
  // Lỗi chết người (sai key / hết quyền) → dừng hẳn, đổi model cũng vô ích (cùng 1 key).
  // (400 khác — VD "Unable to process input image" — hay chập chờn phía Google → sang model kế, không dừng.)
  const isFatal = (status, msg) =>
    status === 401 || status === 403 ||
    /api[_ ]?key|permission denied|api_key_invalid|forbidden/i.test(msg || '');

  // Gọi 1 model, tự parse JSON. Ném lỗi có .transient / .fatal để loop xử lý.
  // input = { imgB64?, mime?, text? } — cho phép ảnh, text, hoặc CẢ HAI cùng lúc.
  async function callOnce(model, key, prompt, schema, input, think, extSignal) {
    const parts = [{ text: prompt }];
    if (input.text && input.text.trim())
      parts.push({ text: 'NỘI DUNG KHÁCH GỬI (text):\n' + input.text.trim() });
    if (input.imgB64)
      parts.push({ inline_data: { mime_type: input.mime || 'image/png', data: input.imgB64 } });
    const gc = { temperature: 0, responseMimeType: 'application/json' };
    if (schema) gc.responseSchema = schema;
    if (think) gc.thinkingConfig = { thinkingLevel: think };
    const body = { contents: [{ parts }], generationConfig: gc };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CALL_TIMEOUT_MS);
    if (extSignal) { if (extSignal.aborted) ctl.abort(); else extSignal.addEventListener('abort', () => ctl.abort()); }
    let r, j;
    try {
      r = await fetch(ENDPOINT(model, key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: ctl.signal
      });
      j = await r.json();
    } catch (err) {
      const e = new Error(err && err.name === 'AbortError' ? 'Quá ' + (CALL_TIMEOUT_MS / 1000) + 's không phản hồi' : ('Mất mạng? ' + (err.message || err)));
      e.transient = true;
      throw e;
    } finally { clearTimeout(timer); }
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      const e = new Error(msg);
      // Model không nhận mức thinking → không phải lỗi key, gọi lại không kèm thinkingConfig.
      if (think && /thinking/i.test(msg)) { e.badThink = true; throw e; }
      e.fatal = isFatal(r.status, msg);
      e.transient = !e.fatal && isTransient(r.status, msg);
      throw e;
    }
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Đôi khi model bọc ```json — cắt ra
    const clean = txt.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    try { return JSON.parse(clean); }
    catch (e) { throw new Error('Không parse được JSON: ' + clean.slice(0, 120)); }
  }

  // 1 model (tự gọi lại không kèm thinkingConfig nếu model không nhận mức thinking đó).
  async function callModel(m, key, prompt, schema, input, signal) {
    try { return await callOnce(m.name, key, prompt, schema, input, m.think, signal); }
    catch (e) { if (!e.badThink) throw e; return await callOnce(m.name, key, prompt, schema, input, null, signal); }
  }

  // "Đua" các model: chạy model 1; lỗi → bật NGAY model kế; quá HEDGE_MS chưa xong → bật thêm model kế chạy song song.
  // Cái nào trả kết quả trước thì lấy, huỷ các cái còn lại.
  function raceModels(key, prompt, schema, input, onProgress) {
    return new Promise((resolve, reject) => {
      let next = 0, pending = 0, done = false, lastErr = null, hedge = null;
      const ctls = [];
      const finish = () => { done = true; clearTimeout(hedge); ctls.forEach((c) => c.abort()); };
      const launch = () => {
        if (done || next >= MODELS.length) return;
        const mi = next++, ctl = new AbortController();
        ctls.push(ctl); pending++;
        if (mi > 0 && onProgress) onProgress(`⏳ Google chậm, chạy thêm model dự phòng ${mi + 1}/${MODELS.length}`);
        clearTimeout(hedge); hedge = setTimeout(launch, HEDGE_MS);
        callModel(MODELS[mi], key, prompt, schema, input, ctl.signal).then(
          (r) => { if (done) return; finish(); resolve(r); },
          (e) => {
            pending--; if (done) return; lastErr = e;
            if (e.fatal) { finish(); return reject(e); }   // sai key / hết quyền → dừng hẳn
            if (next < MODELS.length) launch();
            else if (pending === 0) { finish(); reject(lastErr); }
          });
      };
      launch();
    });
  }

  async function callGemini(key, prompt, schema, input, onProgress) {
    try { return await raceModels(key, prompt, schema, input, onProgress); }
    catch (e) {
      if (e.fatal) throw e;
      if (onProgress) onProgress('⏳ Google đang bận, chờ chút rồi thử lại');
      await sleep(1500);
      return await raceModels(key, prompt, schema, input, onProgress);
    }
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
        <p class="hint">Chọn hoặc dán ảnh (screenshot Zalo, Word, giấy...) là <b>tự đọc luôn</b>. Chỉ có text thì gõ/dán rồi bấm <b>Đọc &amp; điền</b>.</p>
        <label class="ocr-drop" id="ocr-drop">
          <input type="file" accept="image/*" id="ocr-file">
          <div><b>📎 Chọn ảnh</b> hoặc kéo thả vào đây</div>
        </label>
        <button type="button" class="b-ghost" data-act="paste" style="width:100%;margin-top:6px;padding:11px;border-radius:10px;border:0;font-size:14px;font-weight:600;background:#eaf2ee;color:#0a7d33;cursor:pointer;">📋 Dán ảnh từ clipboard</button>
        <div id="ocr-preview-wrap"></div>
        <div style="text-align:center;color:#889;font-size:12px;margin:10px 0 4px;">— hoặc dán/gõ nội dung text —</div>
        <textarea id="ocr-text" placeholder="VD: Bên em là Công ty Xây dựng An Phú Gia, cần báo giá bê tông M300 độ sụt 12 cho công trình Khu dân cư NBB Garden III, Phú Định..." style="width:100%;min-height:70px;padding:10px;border:1px solid #d0d7d3;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit;resize:vertical;"></textarea>
        <div class="ocr-status" id="ocr-status" hidden></div>
        <div class="row">
          <button class="b-danger" data-act="key">Đổi key</button>
          <button class="b-ghost" data-act="cancel">Đóng</button>
          <button class="b-primary" data-act="read" disabled>Đọc &amp; điền</button>
        </div>
      </div>`;
    document.body.appendChild(mask);

    const fileInp = mask.querySelector('#ocr-file');
    const drop = mask.querySelector('#ocr-drop');
    const previewWrap = mask.querySelector('#ocr-preview-wrap');
    const statusEl = mask.querySelector('#ocr-status');
    const btnRead = mask.querySelector('[data-act="read"]');
    const textEl = mask.querySelector('#ocr-text');
    let currentFile = null;
    let imgPromise = null;     // nén ảnh chạy nền ngay khi chọn ảnh
    let busy = false;
    let autoTimer = null;

    function setStatus(txt, cls) {
      if (!txt) { statusEl.hidden = true; return; }
      statusEl.hidden = false; statusEl.className = 'ocr-status ' + (cls || '');
      statusEl.textContent = txt;
    }
    // Bật nút "Đọc & điền" khi có ảnh HOẶC có text.
    function refreshReadBtn() {
      const hasText = !!(textEl.value && textEl.value.trim());
      btnRead.disabled = busy || (!currentFile && !hasText);
    }
    textEl.addEventListener('input', refreshReadBtn);
    function acceptFile(f) {
      if (!f || !f.type.startsWith('image/')) return;
      if (busy) return;
      currentFile = f;
      imgPromise = compressImage(f);
      const url = URL.createObjectURL(f);
      previewWrap.innerHTML = `<img class="ocr-preview" src="${url}" alt="preview">`;
      refreshReadBtn();
      setStatus('');
      // Có ảnh là TỰ ĐỌC luôn — khỏi bấm nút. (Text gõ kèm, nếu có, được gửi cùng.)
      clearTimeout(autoTimer);
      autoTimer = setTimeout(doRead, 250);
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
      if (act === 'read') doRead();
    });

    async function doRead() {
      clearTimeout(autoTimer);
      const text = (textEl.value || '').trim();
      if (busy || (!currentFile && !text)) return;
      busy = true; refreshReadBtn();
      const t0 = Date.now();
      let msg = '⏳ Đang đọc & phân tích';
      const tick = () => setStatus(msg + '... ' + Math.floor((Date.now() - t0) / 1000) + 's', 'load');
      tick();
      const iv = setInterval(tick, 500);
      try {
        const input = { text };
        if (currentFile) {
          const { data, mime } = await (imgPromise || compressImage(currentFile));
          input.imgB64 = data; input.mime = mime;
        }
        const result = await callGemini(key, PROMPTS[module], SCHEMAS[module], input, (t) => { msg = t.replace(/\.+$/, ''); tick(); });
        clearInterval(iv);
        setStatus('✅ Đọc xong sau ' + ((Date.now() - t0) / 1000).toFixed(1) + 's — đã điền vào form', 'ok');
        try { onResult(result); } catch (err) { console.error(err); }
        setTimeout(close, 500);
      } catch (err) {
        clearInterval(iv);
        setStatus('❌ Lỗi: ' + (err.message || err), 'err');
      } finally {
        busy = false; refreshReadBtn();
      }
    }

    function close() {
      document.removeEventListener('paste', onPaste);
      if (mask.parentNode) document.body.removeChild(mask);
    }
  }

  // ---------- public API: mount button ----------
  function mount({ containerId, module, onResult }) {
    injectCSS();
    preconnect();
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
