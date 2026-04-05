// ================================================================
// api.js — Giao tiếp với Google Apps Script
// Tất cả requests dùng POST với JSON body (tránh vấn đề GAS GET params)
// ================================================================
const API = {
  connected: false,

  async post(body) {
    this._check();
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      // Không set Content-Type để tránh CORS preflight — GAS đọc được text/plain
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'GAS error');
    return data;
  },

  _check() {
    if (!CONFIG.GAS_URL || CONFIG.GAS_URL.startsWith('THAY_BANG'))
      throw new Error('Chưa cấu hình GAS_URL trong config.js');
  },

  // ── Tasks ────────────────────────────────────────────────────────
  async getTasks() {
    const d = await this.post({ action: 'getAll', sheet: 'Tasks' });
    return d.rows.map(r => ({ ...r, comments: this._arr(r.comments) }));
  },
  async saveTask(t) {
    return this.post({ action: 'upsert', sheet: 'Tasks',
      row: { ...t, comments: JSON.stringify(t.comments || []) } });
  },
  async deleteTask(id) { return this.post({ action: 'delete', sheet: 'Tasks', id }); },

  // ── Meetings ─────────────────────────────────────────────────────
  async getMeetings() {
    const d = await this.post({ action: 'getAll', sheet: 'Meetings' });
    return d.rows.map(r => ({ ...r, attendees: this._arr(r.attendees) }));
  },
  async saveMeeting(m) {
    return this.post({ action: 'upsert', sheet: 'Meetings',
      row: { ...m, attendees: JSON.stringify(m.attendees || []) } });
  },
  async deleteMeeting(id) { return this.post({ action: 'delete', sheet: 'Meetings', id }); },

  // ── Docs ─────────────────────────────────────────────────────────
  async getDocs() {
    const d = await this.post({ action: 'getAll', sheet: 'Docs' });
    return d.rows;
  },
  async saveDoc(doc)  { return this.post({ action: 'upsert', sheet: 'Docs', row: doc }); },
  async deleteDoc(id) { return this.post({ action: 'delete', sheet: 'Docs', id }); },

  // ── Ping (kiểm tra kết nối) ───────────────────────────────────────
  async ping() { return this.post({ action: 'ping' }); },

  // ── Helpers ──────────────────────────────────────────────────────
  _arr(str, fb = []) {
    if (!str) return fb;
    try { return JSON.parse(str); } catch { return fb; }
  },
  genId() {
    return 'I' + Date.now() + Math.random().toString(36).slice(2, 5).toUpperCase();
  },
};
