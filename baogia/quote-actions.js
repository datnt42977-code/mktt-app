// Báo Giá MKTT — UI cho template mặc định, lịch sử, gợi ý tên khách.
// Nhận helper từ app.js qua init(deps). Nạp SAU quotes-store.js, TRƯỚC/ĐỘC LẬP app.js.
(function () {
  'use strict';

  let deps = null;
  const byId = (id) => document.getElementById(id);

  function init(d) {
    deps = d;
    byId('btn-new').addEventListener('click', newQuote);
    byId('btn-save-template').addEventListener('click', saveTemplate);
    byId('btn-history').addEventListener('click', toggleHistory);
    renderDatalists();
  }

  // Form có dữ liệu đáng kể chưa? (để hỏi xác nhận trước khi ghi đè)
  function formHasData() {
    const s = deps.collectState();
    return !!((s.customer || '').trim() || (s.project || '').trim() ||
      (s.rows || []).some((r) => (r.name || '').trim() || (r.price || '').trim()));
  }

  // ---------- template ----------
  function saveTemplate() {
    if (!confirm('Lưu bảng giá hiện tại làm mặc định?')) return;
    window.QuotesStore.setTemplate(deps.pricesFromState(deps.collectState()));
    alert('Đã lưu bảng giá mặc định.');
  }

  function newQuote() {
    if (formHasData() && !confirm('Tạo báo giá mới? Nội dung đang nhập sẽ bị xoá.')) return;
    const tpl = window.QuotesStore.getTemplate() || {};
    deps.applyState({
      date: '', customer: '', project: '', extra: '',
      rows: tpl.rows || [],
      pumpOn: tpl.pumpOn,
      pump1Ca: tpl.pump1Ca, pump1M3: tpl.pump1M3,
      pump2Ca: tpl.pump2Ca, pump2M3: tpl.pump2M3,
      vat: tpl.vat,
    });
    deps.persist();
  }

  // ---------- autocomplete (datalist) ----------
  function fillDatalist(id, values) {
    const dl = byId(id);
    if (!dl) return;
    dl.innerHTML = '';
    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      dl.appendChild(opt);
    });
  }

  function renderDatalists() {
    fillDatalist('dl-customers', window.QuotesStore.distinctCustomers());
    fillDatalist('dl-projects', window.QuotesStore.distinctProjects());
  }

  // ---------- lịch sử ----------
  function toggleHistory() {
    const panel = byId('history-panel');
    if (!panel) return;
    if (panel.hidden) { renderHistory(); panel.hidden = false; }
    else { panel.hidden = true; }
  }

  function renderHistory() {
    const panel = byId('history-panel');
    panel.innerHTML = '';
    const quotes = window.QuotesStore.listQuotes();
    if (!quotes.length) {
      const p = document.createElement('p');
      p.className = 'hist-empty';
      p.textContent = 'Chưa có báo giá nào.';
      panel.appendChild(p);
      return;
    }
    quotes.forEach((q) => panel.appendChild(historyRow(q)));
  }

  // Dùng textContent (không innerHTML) → an toàn, khỏi escape.
  function historyRow(q) {
    const row = document.createElement('div');
    row.className = 'hist-row';

    const label = document.createElement('span');
    label.className = 'hist-label';
    label.textContent = [q.customer || '—', q.project || '—', q.date || '']
      .filter(Boolean).join(' • ');

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Mở lại';
    openBtn.addEventListener('click', () => openQuote(q.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'hist-del';
    delBtn.textContent = 'Xoá';
    delBtn.addEventListener('click', () => {
      if (!confirm('Xoá báo giá này?')) return;
      window.QuotesStore.deleteQuote(q.id);
      renderHistory();
      renderDatalists();
    });

    row.appendChild(label);
    row.appendChild(openBtn);
    row.appendChild(delBtn);
    return row;
  }

  function openQuote(id) {
    if (formHasData() && !confirm('Mở lại báo giá này? Nội dung đang nhập sẽ bị thay thế.')) return;
    const q = window.QuotesStore.getQuote(id);
    if (!q) return;
    deps.applyState(q);
    deps.persist();
    byId('history-panel').hidden = true;
  }

  // Gọi sau khi thêm/xoá báo giá để cập nhật gợi ý + panel đang mở.
  function refresh() {
    renderDatalists();
    const panel = byId('history-panel');
    if (panel && !panel.hidden) renderHistory();
  }

  window.QuoteActions = { init, refresh };
})();
