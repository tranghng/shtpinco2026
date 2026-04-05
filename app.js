// ================================================================
// app.js — Logic ứng dụng chính
// ================================================================

let tasks = [], meetings = [], docs = [];
let currentFilter = 'all';

// ── KHỞI ĐỘNG ─────────────────────────────────────────────────────
async function init() {
  countdown();
  setInterval(countdown, 60000);
  renderGantt();

  if (!CONFIG.GAS_URL || CONFIG.GAS_URL.startsWith('THAY_BANG')) {
    showConfigBanner();
    tasks = defaultTasks(); meetings = defaultMeetings(); docs = defaultDocs();
    hideLoading(); renderOverview();
    return;
  }

  setLoadingMsg('Đang tải nhiệm vụ...');
  try {
    [tasks, meetings, docs] = await Promise.all([
      API.getTasks(), API.getMeetings(), API.getDocs()
    ]);
    API.connected = true;
    setApiDot('ok');
  } catch (err) {
    console.warn(err);
    tasks = defaultTasks(); meetings = defaultMeetings(); docs = defaultDocs();
    setApiDot('error');
    showToast('Không kết nối được Sheets — dùng dữ liệu mẫu', true);
  }
  hideLoading();
  renderOverview();
}

function showConfigBanner() {
  setApiDot('error');
  const el = document.createElement('div');
  el.style.cssText = 'background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 18px;margin:0 32px 16px;font-size:13px;color:#fcd34d';
  el.innerHTML = '⚠ <strong>Chưa cấu hình GAS_URL.</strong> Mở <code>config.js</code> và dán URL Apps Script vào. Đang hiển thị dữ liệu mẫu.';
  document.querySelector('main').prepend(el);
}

// ── UI HELPERS ────────────────────────────────────────────────────
function setLoadingMsg(m) { document.getElementById('loading-msg').textContent = m; }
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  el.style.opacity = '0';
  setTimeout(() => el.style.display = 'none', 400);
}
function setApiDot(s) {
  const d = document.getElementById('api-status');
  d.className = 'api-dot ' + s;
  d.title = s === 'ok' ? '✓ Kết nối Google Sheets' : '✗ Chưa kết nối Sheets';
}
function setSyncBar(state, text) {
  const b = document.getElementById('sync-bar');
  b.className = 'show ' + state;
  document.getElementById('sync-text').textContent = text;
}
function hideSyncBar(ms = 2500) {
  setTimeout(() => document.getElementById('sync-bar').classList.remove('show'), ms);
}
function showToast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = (err ? '⚠ ' : '✓ ') + msg;
  t.style.borderColor = err ? 'var(--accent4)' : 'var(--accent2)';
  t.style.color        = err ? 'var(--accent4)' : 'var(--accent2)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function countdown() {
  const diff = new Date(CONFIG.EVENT_DATE + 'T08:00:00') - new Date();
  document.getElementById('countdown').textContent =
    diff <= 0 ? '🎉 Sự kiện!' : `Còn ${Math.floor(diff / 86400000)} ngày`;
}
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('onclick').includes("'" + name + "'")) t.classList.add('active');
  });
  const renders = { overview: renderOverview, tasks: renderTasks, gantt: renderGantt,
                    meetings: renderMeetings, docs: renderDocs };
  renders[name] && renders[name]();
}
document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
);

// ── OVERVIEW ──────────────────────────────────────────────────────
function renderOverview() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'done').length;
  const doing = tasks.filter(t => t.status === 'doing').length;
  const high  = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;

  setText('s-total', total); setText('s-done', done); setText('s-doing', doing);
  setText('s-late', high);
  setText('s-pct', total ? Math.round(done / total * 100) + '% hoàn thành' : '0%');
  setText('s-mtg', meetings.length);

  const phases = [
    { id:'1', name:'GĐ 1 — Chuẩn bị KH',  period:'01/3–15/4',  color:'#3b82f6' },
    { id:'2', name:'GĐ 2 — Khởi động',     period:'15/4–30/6',  color:'#10b981' },
    { id:'3', name:'GĐ 3 — Nội dung',      period:'30/6–31/8',  color:'#f59e0b' },
    { id:'4', name:'GĐ 4 — Kỹ thuật',      period:'15/9–30/9',  color:'#8b5cf6' },
    { id:'5', name:'GĐ 5 — Hậu kỳ',        period:'01–15/10',   color:'#06b6d4' },
  ];
  document.getElementById('phase-overview-grid').innerHTML = phases.map(p => {
    const pt  = tasks.filter(t => t.phase === p.id);
    const pd  = pt.filter(t => t.status === 'done').length;
    const pct = pt.length ? Math.round(pd / pt.length * 100) : 0;
    return `<div class="phase-card">
      <div class="phase-name">${p.name}</div>
      <div class="phase-period">${p.period}</div>
      <div class="phase-progress-wrap"><div class="phase-progress" style="width:${pct}%;background:${p.color}"></div></div>
      <div class="phase-stat"><span>${pd}/${pt.length} nhiệm vụ</span><span style="color:${p.color};font-weight:700">${pct}%</span></div>
    </div>`;
  }).join('');

  const urgent = [...tasks]
    .filter(t => t.status !== 'done')
    .sort((a, b) => ({ high:0, med:1, low:2 }[a.priority] - { high:0, med:1, low:2 }[b.priority]))
    .slice(0, 5);
  document.getElementById('recent-tasks').innerHTML = urgent.length
    ? urgent.map(t => taskHtml(t, true)).join('')
    : '<div class="empty-state" style="padding:20px"><div class="empty-icon">🎉</div>Tất cả đã hoàn thành!</div>';

  document.getElementById('badge-tasks').textContent = tasks.filter(t => t.status !== 'done').length;
}

function setText(id, val) { document.getElementById(id).textContent = val; }

// ── TASKS ─────────────────────────────────────────────────────────
const STATUS_BADGE = {
  todo:  '<span class="badge badge-gray">Chưa bắt đầu</span>',
  doing: '<span class="badge badge-blue">Đang thực hiện</span>',
  done:  '<span class="badge badge-green">Hoàn thành</span>',
};
const PRI_DOT = { high:'priority-high', med:'priority-med', low:'priority-low' };
const PHASE_LABEL = { '1':'GĐ 1','2':'GĐ 2','3':'GĐ 3','4':'GĐ 4','5':'GĐ 5' };

function taskHtml(t, compact) {
  return `<div class="task-item" id="task-${t.id}">
    <div class="task-check ${t.status==='done'?'done':''}" onclick="toggleTask('${t.id}')"></div>
    <div class="priority-dot ${PRI_DOT[t.priority]||'priority-low'}"></div>
    <div class="task-info">
      <div class="task-name ${t.status==='done'?'done':''}">${t.name}</div>
      <div class="task-meta">
        ${STATUS_BADGE[t.status]||''}
        <span class="task-meta-item">📁 ${PHASE_LABEL[t.phase]||'—'}</span>
        <span class="task-meta-item">👤 ${t.owner}</span>
        ${t.due  ? `<span class="task-meta-item">📅 ${t.due}</span>` : ''}
        ${t.note ? `<span class="task-meta-item" title="${t.note}">💬 ${t.note.slice(0,40)}${t.note.length>40?'…':''}</span>` : ''}
      </div>
    </div>
    ${!compact ? `<div class="task-actions">
      <button class="btn btn-ghost btn-xs" onclick="cycleStatus('${t.id}')" title="Chuyển trạng thái">▶</button>
      <button class="btn btn-danger btn-xs" onclick="deleteTask('${t.id}')">✕</button>
    </div>` : ''}
  </div>`;
}

function filterTasks(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const filters = {
    all: () => true,
    todo: t => t.status === 'todo', doing: t => t.status === 'doing',
    done: t => t.status === 'done', high: t => t.priority === 'high',
    p1: t => t.phase==='1', p2: t => t.phase==='2',
    p3: t => t.phase==='3', p4: t => t.phase==='4',
  };
  const filtered = tasks.filter(filters[currentFilter] || (() => true));
  document.getElementById('task-list').innerHTML = filtered.length
    ? filtered.map(t => taskHtml(t, false)).join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div>Không có nhiệm vụ nào</div>';
}

function toggleAddForm() {
  const f = document.getElementById('add-task-form');
  f.classList.toggle('visible');
  if (f.classList.contains('visible')) document.getElementById('f-name').focus();
}

async function addTask() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { alert('Vui lòng nhập tên nhiệm vụ!'); return; }
  const task = {
    id: API.genId(), name,
    phase:    document.getElementById('f-phase').value,
    owner:    document.getElementById('f-owner').value,
    due:      document.getElementById('f-due').value,
    priority: document.getElementById('f-priority').value,
    status:   'todo',
    note:     document.getElementById('f-note').value,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  ['f-name','f-note','f-due'].forEach(id => document.getElementById(id).value = '');
  toggleAddForm();
  renderTasks(); renderOverview();
  await syncSheet(() => API.saveTask(task), 'Đã thêm nhiệm vụ!');
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'todo' : 'done';
  renderTasks(); renderOverview();
  await syncSheet(() => API.saveTask(t));
}

async function cycleStatus(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.status = { todo:'doing', doing:'done', done:'todo' }[t.status];
  renderTasks(); renderOverview();
  await syncSheet(() => API.saveTask(t), 'Đã cập nhật trạng thái');
}

async function deleteTask(id) {
  if (!confirm('Xóa nhiệm vụ này?')) return;
  tasks = tasks.filter(t => t.id !== id);
  renderTasks(); renderOverview();
  await syncSheet(() => API.deleteTask(id), 'Đã xóa nhiệm vụ');
}

// ── GANTT ─────────────────────────────────────────────────────────
const GANTT = [
  { label:'GĐ 1: Chuẩn bị Kế hoạch',          sub:'01/3–15/4', m:[1,1,0,0,0,0,0,0,0], c:'#3b82f6' },
  { label:'Mời đối tác & xác nhận địa điểm',   sub:'',         m:[1,1,0,0,0,0,0,0,0], c:'#60a5fa', i:true },
  { label:'Thành lập Ban tổ chức',              sub:'',         m:[0,1,0,0,0,0,0,0,0], c:'#60a5fa', i:true },
  { label:'GĐ 2: Khởi động & Truyền thông',    sub:'15/4–30/6',m:[0,1,1,1,0,0,0,0,0], c:'#10b981' },
  { label:'Ra mắt website sự kiện',             sub:'',         m:[0,1,1,0,0,0,0,0,0], c:'#34d399', i:true },
  { label:'Call for Papers mở đăng ký',         sub:'',         m:[0,0,1,1,0,0,0,0,0], c:'#34d399', i:true },
  { label:'GĐ 3: Xây dựng Nội dung chính',     sub:'30/6–15/9',m:[0,0,0,1,1,1,1,0,0], c:'#f59e0b' },
  { label:'Tiếp nhận & thẩm định bài viết',     sub:'',         m:[0,0,0,1,1,1,0,0,0], c:'#fcd34d', i:true },
  { label:'Xác nhận diễn giả',                  sub:'',         m:[0,0,0,0,1,1,0,0,0], c:'#fcd34d', i:true },
  { label:'Xin cấp phép tổ chức',               sub:'',         m:[0,0,0,0,0,0,1,0,0], c:'#fcd34d', i:true },
  { label:'GĐ 4: Truyền thông & Kỹ thuật',     sub:'15/9–30/9',m:[0,0,0,0,0,0,1,0,0], c:'#8b5cf6' },
  { label:'Truyền thông báo chí, website',      sub:'',         m:[0,0,0,0,0,0,1,0,0], c:'#a78bfa', i:true },
  { label:'Gửi thư mời chính thức',             sub:'',         m:[0,0,0,0,0,0,1,0,0], c:'#a78bfa', i:true },
  { label:'GĐ 5: Hậu kỳ chuẩn bị',             sub:'01–15/10', m:[0,0,0,0,0,0,0,1,0], c:'#06b6d4' },
  { label:'Dựng sảnh triển lãm & in tài liệu', sub:'',         m:[0,0,0,0,0,0,0,1,0], c:'#67e8f9', i:true },
  { label:'Kiểm tra AV & livestream',            sub:'',         m:[0,0,0,0,0,0,0,1,0], c:'#67e8f9', i:true },
  { label:'🎯 SỰ KIỆN 15–16/10/2026',           sub:'ĐH FPT',   m:[0,0,0,0,0,0,0,1,0], c:'#ef4444' },
  { label:'Tổng kết & thanh quyết toán',         sub:'T11/2026', m:[0,0,0,0,0,0,0,0,1], c:'#6b7280' },
];

function renderGantt() {
  document.getElementById('gantt-body').innerHTML = GANTT.map(row => {
    const cells = row.m.map(on => on
      ? `<td style="padding:4px 3px"><div style="background:${row.c};border-radius:3px;height:24px"></div></td>`
      : '<td></td>'
    ).join('');
    const style = row.i ? 'padding-left:28px;font-size:12px;color:var(--muted)' : 'font-weight:600;font-size:13px';
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 16px;border-right:1px solid var(--border)">
        <div style="${style}">${row.label}</div>
        ${row.sub ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${row.sub}</div>` : ''}
      </td>${cells}
    </tr>`;
  }).join('');
}

// ── MEETINGS ──────────────────────────────────────────────────────
function renderMeetings() {
  const list = document.getElementById('meeting-list');
  if (!meetings.length) {
    list.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🗓</div>Chưa có lịch họp</div>';
    return;
  }
  list.innerHTML = [...meetings]
    .sort((a, b) => (a.date||'').localeCompare(b.date||''))
    .map(m => `<div class="meeting-card">
      <div class="meeting-header">
        <div>
          <div class="meeting-title">${m.name}</div>
          <span class="badge badge-blue">${m.mode}</span>
        </div>
        <button class="btn btn-danger btn-xs" onclick="deleteMeeting('${m.id}')">✕</button>
      </div>
      <div class="meeting-body">
        <div class="meeting-row">📅 ${m.date||'—'} · ${m.time||''}</div>
        <div class="meeting-row">📍 ${m.loc||'—'}</div>
        ${m.agenda ? `<div class="meeting-row">📋 ${m.agenda}</div>` : ''}
        ${m.link   ? `<div class="meeting-row">🔗 <a href="${m.link}" target="_blank" style="color:var(--accent)">Mở link họp</a></div>` : ''}
        ${(m.attendees||[]).length ? `<div class="attendees">${m.attendees.map(a=>`<span class="attendee-tag">${a}</span>`).join('')}</div>` : ''}
      </div>
    </div>`).join('');
}

function openMeetingModal() {
  document.querySelectorAll('#attendee-chips .chip').forEach(c => c.classList.remove('sel'));
  ['m-name','m-loc','m-agenda','m-link'].forEach(id => document.getElementById(id).value='');
  document.getElementById('modal-meeting').classList.add('open');
}
function closeMeetingModal() { document.getElementById('modal-meeting').classList.remove('open'); }
function toggleChip(el) { el.classList.toggle('sel'); }

async function saveMeeting() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { alert('Vui lòng nhập tên cuộc họp!'); return; }
  const m = {
    id: API.genId(), name,
    date:      document.getElementById('m-date').value,
    time:      document.getElementById('m-time').value,
    mode:      document.getElementById('m-mode').value,
    loc:       document.getElementById('m-loc').value,
    attendees: [...document.querySelectorAll('#attendee-chips .chip.sel')].map(c=>c.textContent),
    agenda:    document.getElementById('m-agenda').value,
    link:      document.getElementById('m-link').value,
    createdAt: new Date().toISOString(),
  };
  meetings.push(m);
  closeMeetingModal();
  renderMeetings(); renderOverview();
  await syncSheet(() => API.saveMeeting(m), 'Đã thêm lịch họp!');
}

async function deleteMeeting(id) {
  if (!confirm('Xóa cuộc họp này?')) return;
  meetings = meetings.filter(m => m.id !== id);
  renderMeetings(); renderOverview();
  await syncSheet(() => API.deleteMeeting(id), 'Đã xóa lịch họp');
}

// ── DOCS ──────────────────────────────────────────────────────────
const DOC_ICONS = { folder:'📁', doc:'📄', sheet:'📊', pdf:'📕', slide:'📑', other:'📄' };

function mimeToKind(url) {
  if (!url) return 'other';
  if (url.includes('/folders/'))     return 'folder';
  if (url.includes('spreadsheets'))  return 'sheet';
  if (url.includes('presentation'))  return 'slide';
  if (url.includes('document'))      return 'doc';
  if (url.includes('.pdf'))          return 'pdf';
  return 'other';
}

function renderDocs() {
  const q = (document.getElementById('doc-search').value||'').toLowerCase();
  const filtered = docs.filter(d => !q ||
    d.name.toLowerCase().includes(q) ||
    (d.cat||'').toLowerCase().includes(q) ||
    (d.desc||'').toLowerCase().includes(q)
  );
  const grid = document.getElementById('doc-grid');
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div>' +
      (q ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu nào. Nhấn "+ Thêm tài liệu" để bắt đầu.') + '</div>';
    return;
  }
  grid.innerHTML = filtered.map(d => {
    const kind = mimeToKind(d.driveUrl);
    const icon = DOC_ICONS[kind];
    const iconBg = {folder:'rgba(212,169,66,0.12)', sheet:'rgba(16,185,129,0.12)',
                    doc:'rgba(59,130,246,0.12)', pdf:'rgba(239,68,68,0.12)'}[kind] || 'rgba(100,116,139,0.12)';
    return `<div class="doc-card" onclick="${d.driveUrl ? `window.open('${d.driveUrl}','_blank')` : ''}">
      <div class="doc-icon" style="background:${iconBg};font-size:22px">${icon}</div>
      <div class="doc-info">
        <div class="doc-name">${d.name}</div>
        <div class="doc-meta">${d.cat||''}${d.desc?' · '+d.desc:''}</div>
        <div class="doc-url">${d.driveUrl ? '🔗 Mở trong Drive' : '⚠ Chưa có link Drive'}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteDoc('${d.id}')"
        style="flex-shrink:0;align-self:flex-start">✕</button>
    </div>`;
  }).join('');
}

function openDocModal() {
  ['d-name','d-url','d-desc'].forEach(id => document.getElementById(id).value='');
  document.getElementById('modal-doc').classList.add('open');
}
function closeDocModal() { document.getElementById('modal-doc').classList.remove('open'); }

async function saveDoc() {
  const name = document.getElementById('d-name').value.trim();
  if (!name) { alert('Vui lòng nhập tên tài liệu!'); return; }
  const doc = {
    id: API.genId(), name,
    cat:      document.getElementById('d-cat').value,
    driveUrl: document.getElementById('d-url').value.trim(),
    desc:     document.getElementById('d-desc').value,
    createdAt: new Date().toISOString(),
  };
  docs.push(doc);
  closeDocModal();
  renderDocs();
  await syncSheet(() => API.saveDoc(doc), 'Đã thêm tài liệu!');
}

async function deleteDoc(id) {
  if (!confirm('Xóa tài liệu này?')) return;
  docs = docs.filter(d => d.id !== id);
  renderDocs();
  await syncSheet(() => API.deleteDoc(id), 'Đã xóa tài liệu');
}

// ── SYNC HELPER ───────────────────────────────────────────────────
async function syncSheet(fn, successMsg) {
  if (!API.connected) return; // offline — dùng mẫu, không lưu
  setSyncBar('saving', 'Đang lưu vào Sheets...');
  try {
    await fn();
    setSyncBar('saved', '✓ Đã lưu');
    hideSyncBar();
    if (successMsg) showToast(successMsg);
  } catch (e) {
    setSyncBar('error', '✗ Lỗi lưu: ' + e.message);
    showToast('Lỗi: ' + e.message, true);
  }
}

// ── DEFAULT DATA (dùng khi chưa cấu hình GAS) ─────────────────────
function defaultTasks() {
  return [
    { id:'D01', name:'Mời đối tác đồng tổ chức (FPT, Fulbright, NTT, BECAMEX)', phase:'1', owner:'BQL KCNC', due:'2026-04-15', priority:'high', status:'doing', note:'Đã gửi thư mời, đợi phản hồi' },
    { id:'D02', name:'Xác nhận địa điểm tổ chức tại ĐH FPT KCNC', phase:'1', owner:'BQL KCNC', due:'2026-04-10', priority:'high', status:'done', note:'' },
    { id:'D03', name:'Xây dựng Kế hoạch khung (KH số 37/KH-KCNC)', phase:'1', owner:'BQL KCNC', due:'2026-04-15', priority:'high', status:'done', note:'Dự thảo 31/3/2026' },
    { id:'D04', name:'Thành lập các Ban tổ chức thực hiện', phase:'1', owner:'BQL KCNC', due:'2026-04-15', priority:'med', status:'doing', note:'' },
    { id:'D05', name:'Ra mắt website sự kiện chính thức', phase:'2', owner:'ĐH FPT', due:'2026-06-30', priority:'high', status:'todo', note:'' },
    { id:'D06', name:'Thiết kế bộ nhận diện thương hiệu', phase:'2', owner:'ĐH FPT', due:'2026-05-30', priority:'med', status:'todo', note:'' },
    { id:'D07', name:'Mở Call for Papers — kêu gọi bài viết', phase:'2', owner:'Ban Nội dung', due:'2026-06-30', priority:'high', status:'todo', note:'' },
    { id:'D08', name:'Tiếp nhận & thẩm định bài viết', phase:'3', owner:'Ban Nội dung', due:'2026-08-31', priority:'high', status:'todo', note:'' },
    { id:'D09', name:'Xác nhận danh sách diễn giả chính thức 5 phiên', phase:'3', owner:'Ban Nội dung', due:'2026-08-31', priority:'high', status:'todo', note:'TS. Andrew Ng, TS. Tan Sian Wee (NUS) đang liên hệ' },
    { id:'D10', name:'Gửi hồ sơ xin cấp phép HN quốc tế', phase:'3', owner:'BQL KCNC', due:'2026-09-15', priority:'high', status:'todo', note:'' },
    { id:'D11', name:'Gửi thư mời chính thức toàn bộ đại biểu', phase:'4', owner:'Ban Truyền thông', due:'2026-09-30', priority:'high', status:'todo', note:'500–1000 đại biểu' },
    { id:'D12', name:'Triển khai truyền thông báo chí & website đối tác', phase:'4', owner:'Ban Truyền thông', due:'2026-09-30', priority:'med', status:'todo', note:'' },
    { id:'D13', name:'Kiểm tra hệ thống AV & livestream', phase:'5', owner:'ĐH FPT', due:'2026-10-14', priority:'high', status:'todo', note:'Các phiên được livestream song song' },
    { id:'D14', name:'Dựng sảnh triển lãm 50 booth (3×3m)', phase:'5', owner:'ĐH FPT', due:'2026-10-14', priority:'med', status:'todo', note:'' },
    { id:'D15', name:'In kỷ yếu hội nghị (ISBN)', phase:'5', owner:'Ban Nội dung', due:'2026-10-10', priority:'med', status:'todo', note:'' },
  ];
}

function defaultMeetings() {
  return [
    { id:'M1', name:'Họp khởi động — Xác nhận đối tác đồng tổ chức', date:'2026-04-10', time:'09:00',
      mode:'Trực tiếp', loc:'Phòng họp BQL KCNC',
      attendees:['BQL KCNC','ĐH FPT','ĐH Fulbright','ĐH Nguyễn Tất Thành','BECAMEX'],
      agenda:'Xác nhận phân công nhiệm vụ, thống nhất kế hoạch khung, lịch họp định kỳ', link:'' },
    { id:'M2', name:'Họp Ban Nội dung — Review Call for Papers', date:'2026-06-15', time:'14:00',
      mode:'Trực tuyến (Google Meet)', loc:'meet.google.com/kcnc2026',
      attendees:['BQL KCNC','Ban Nội dung','ĐH FPT','ĐH Fulbright'],
      agenda:'Chủ đề phiên thảo luận, tiêu chí chấm bài, quy trình review, template kêu gọi bài', link:'' },
  ];
}

function defaultDocs() {
  return [
    { id:'DOC1', name:'Kế hoạch tổ chức HNQT 2026 (KH số 37/KH-KCNC)', cat:'Kế hoạch tổng thể', driveUrl:'', desc:'Dự thảo 31/3/2026 — 5 giai đoạn + 3 phụ lục' },
    { id:'DOC2', name:'📁 Thư mục Drive tổng — Hội nghị 2026', cat:'Kế hoạch tổng thể', driveUrl:'', desc:'Toàn bộ tài liệu hội nghị' },
    { id:'DOC3', name:'Danh sách diễn giả dự kiến 5 phiên', cat:'Ban Nội dung', driveUrl:'', desc:'Phiên toàn thể + 4 phiên song song' },
    { id:'DOC4', name:'Dự toán ngân sách Hội nghị 2026', cat:'Tài chính', driveUrl:'', desc:'Theo QĐ 496/QĐ-KCNC ngày 30/12/2025' },
    { id:'DOC5', name:'Template Call for Papers', cat:'Call for Papers', driveUrl:'', desc:'Mẫu kêu gọi bài viết 4 phiên song song' },
    { id:'DOC6', name:'Thông tin địa điểm ĐH FPT KCNC (Phụ lục 3)', cat:'Ban Hậu cần', driveUrl:'', desc:'Sức chứa HT A/B, sảnh triển lãm 50 booth 3×3m' },
  ];
}

// BOOT
init();
