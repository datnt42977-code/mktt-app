// Báo Giá MKTT — data layer (localStorage). Thuần dữ liệu, KHÔNG chạm DOM.
// Expose window.QuotesStore. Nạp TRƯỚC app.js.
(function () {
  'use strict';

  const TEMPLATE_KEY = 'baogia-mktt-template-v1';
  const QUOTES_KEY = 'baogia-mktt-quotes-v1';

  // ---------- localStorage guards ----------
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  // Deep clone để caller không mutate cache localStorage.
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  // ---------- template (1 bộ giá mặc định) ----------
  function getTemplate() {
    return clone(readJSON(TEMPLATE_KEY, null));
  }

  function setTemplate(priceObj) {
    writeJSON(TEMPLATE_KEY, priceObj || null);
  }

  // ---------- lịch sử báo giá ----------
  function readQuotes() {
    const data = readJSON(QUOTES_KEY, { quotes: [] });
    return Array.isArray(data.quotes) ? data.quotes : [];
  }

  function listQuotes() {
    return clone(readQuotes()); // đã lưu mới nhất trước (unshift)
  }

  function getQuote(id) {
    return clone(readQuotes().find((q) => q.id === id) || null);
  }

  function addQuote(quoteObj) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const entry = Object.assign({}, clone(quoteObj), { id, savedAt: Date.now() });
    const quotes = readQuotes();
    quotes.unshift(entry);
    writeJSON(QUOTES_KEY, { quotes });
    return id;
  }

  function deleteQuote(id) {
    const quotes = readQuotes().filter((q) => q.id !== id);
    writeJSON(QUOTES_KEY, { quotes });
  }

  // ---------- autocomplete ----------
  function distinctBy(field) {
    const seen = new Set();
    const out = [];
    readQuotes().forEach((q) => {
      const v = String(q[field] || '').trim();
      if (v && !seen.has(v)) { seen.add(v); out.push(v); }
    });
    return out; // giữ thứ tự mới → cũ
  }

  window.QuotesStore = {
    getTemplate, setTemplate,
    listQuotes, getQuote, addQuote, deleteQuote,
    distinctCustomers: () => distinctBy('customer'),
    distinctProjects: () => distinctBy('project'),
  };
})();
