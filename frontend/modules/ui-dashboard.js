// ui-dashboard.js (dashboard & scheduler UI logic)
export const TIMEOUT_MS = 180000; // 3 phút

// Cache DOM
const btn       = document.getElementById('btnSync');
const spinner   = document.getElementById('spinner');
const statusEl  = document.getElementById('status');
const inputMinutes = document.getElementById('minutes');
const btnStart  = document.getElementById('btnStart');
const btnStop   = document.getElementById('btnStop');
const btnRefresh= document.getElementById('btnRefresh');
const schedEl   = document.getElementById('sched');

// Public init to bind once
let bound = false;
export function initDashboard() {
  if (bound) return;
  bound = true;
  if (btn)      btn.onclick      = () => syncUsers();
  if (btnStart) btnStart.onclick = () => startSchedule();
  if (btnStop)  btnStop.onclick  = () => stopSchedule();
  if (btnRefresh) btnRefresh.onclick = () => fetchStatus(true);
}

function prettyHeaders(headers) {
  const wanted = ['content-type', 'content-length', 'date', 'server'];
  return wanted.map(h => `${h}: ${headers.get(h) ?? '-'}`).join('\n');
}

export async function syncUsers() {
  if (!btn || !spinner || !statusEl) return;
  btn.disabled = true;
  spinner.style.display = 'inline';
  statusEl.className = 'muted';
  statusEl.textContent = `Đang gửi yêu cầu /api/sync… (timeout ${TIMEOUT_MS / 1000}s)`;

  const started = performance.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'Accept': 'application/json' }, signal: controller.signal });
    clearTimeout(t);
    let bodyText = '';
    let json = null;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        json = await res.json();
        bodyText = '';
      } else {
        bodyText = await res.text();
      }
    } catch (e) {
      bodyText = `(Không đọc được body: ${e})`;
    }
    const elapsed = Math.round(performance.now() - started);
    if (res.ok) {
      statusEl.className = 'ok';
      if (json) {
        statusEl.innerHTML = `<div>OK (${res.status}) sau ${elapsed}ms</div>` + renderSyncResult(json);
      } else {
        statusEl.textContent = `OK (${res.status}) sau ${elapsed}ms\n${bodyText}`;
      }
    } else {
      statusEl.className = 'err';
      statusEl.textContent = `Lỗi ${res.status} ${res.statusText} sau ${elapsed}ms\n${prettyHeaders(res.headers)}\n\n${bodyText}`;
    }
  } catch (e) {
    clearTimeout(t);
    const elapsed = Math.round(performance.now() - started);
    statusEl.className = 'err';
    statusEl.textContent = (e.name === 'AbortError')
      ? `Lỗi: Timeout sau ${TIMEOUT_MS / 1000}s (đợi ${elapsed}ms)`
      : `Lỗi fetch: ${e.message || e} sau ${elapsed}ms`;
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
  }
}

function renderSyncResult(json) {
  if (!json || typeof json !== 'object') return '<pre>Không có dữ liệu.</pre>';
  let html = '';
  if (json.summary) {
    html += `<div class='sync-summary'><b>Kết quả:</b> ${json.summary.message || ''}</div>`;
    html += `<ul class='sync-detail'>`;
    html += `<li>Tổng user: <b>${json.summary.total_licensed_users ?? '-'}</b></li>`;
    html += `<li>Thêm mới: <b style='color:#0a7a2f'>+${json.summary.added_count ?? 0}</b></li>`;
    html += `<li>Bỏ qua: <b style='color:#888'>~${json.summary.skipped_count ?? 0}</b></li>`;
    html += `<li>Lỗi: <b style='color:#b00020'>!${json.summary.failed_count ?? 0}</b></li>`;
    html += `</ul>`;
  }
  if (json.details) {
    html += `<details><summary>Chi tiết user</summary><div class='sync-users'>`;
    ['added_users','skipped_users','failed_users'].forEach(type => {
      if (json.details[type] && json.details[type].length) {
        html += `<div><b>${type.replace('_users','')}</b>: <span>${json.details[type].join(', ')}</span></div>`;
      }
    });
    html += `</div></details>`;
  }
  return html;
}

export async function startSchedule() {
  const m = Math.max(1, parseInt((inputMinutes?.value || '5'), 10));
  const res = await fetch('/api/schedule/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval_minutes: m })
  });
  const data = await res.json().catch(() => ({}));
  renderSchedule(data);
  fetchStatus(true);
}

export async function stopSchedule() {
  const res = await fetch('/api/schedule/stop', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  renderSchedule({ running: false });
}

let serverRemaining = null;
let lastServerSync = 0;
let statusTimer = null;
let pollTimer = null;

function renderSchedule(status) {
  if (!schedEl) return;
  if (!status || typeof status !== 'object') {
    schedEl.className = 'mono err';
    schedEl.textContent = 'Không lấy được trạng thái scheduler.';
    return;
  }
  const { running, remaining_seconds } = status;
  serverRemaining = typeof remaining_seconds === 'number' ? remaining_seconds : null;
  lastServerSync = performance.now();
  if (running && serverRemaining != null) {
    schedEl.className = 'mono ok';
    schedEl.textContent = `Đồng bộ tiếp theo sau: ${fmtSeconds(serverRemaining)}`;
  } else {
    schedEl.className = 'mono muted';
    schedEl.textContent = 'Scheduler đang tắt.';
  }
}

function fmtSeconds(s) {
  s = Math.max(0, Math.floor(s));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${ss}s`;
}

export async function fetchStatus(force = false) {
  if (!schedEl) return;
  if (!force && pollTimer) return;
  try {
    const res = await fetch('/api/schedule/status');
    const data = await res.json().catch(() => ({}));
    renderSchedule(data);
  } catch (e) {}
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = setInterval(() => {
    if (serverRemaining == null) return;
    const deltaSec = Math.round((performance.now() - lastServerSync) / 1000);
    const remain = Math.max(0, serverRemaining - deltaSec);
    schedEl.textContent = `Đồng bộ tiếp theo sau: ${fmtSeconds(remain)}`;
  }, 1000);
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => fetchStatus(true), 5000);
}

export async function fetchHistory() {
  const el = document.getElementById('historyList');
  if (!el) return;
  try {
    const res = await fetch('/api/sync/runs');
    const data = await res.json();
    renderHistory(data);
  } catch (e) {
    renderHistory([]);
  }
}

function renderHistory(list) {
  const el = document.getElementById('historyList');
  if (!el) return;
  if (!list || !list.length) {
    el.textContent = 'Chưa có lịch sử.';
    return;
  }
  let max = 10;
  el.innerHTML = '';
  function renderList(showAll) {
    const items = showAll ? list : list.slice(0, max);
    el.innerHTML = '<ul>' + items.map(item =>
      `<li>${item.started_at} - <span class="${item.status === 'success' ? 'ok' : 'err'}">${item.status}</span> - ${item.summary || ''} (${item.total_users ?? '-'} users, +${item.added_count}, ~${item.skipped_count}, !${item.failed_count})</li>`
    ).join('') + '</ul>';
    if (list.length > max && !showAll) {
      const btn = document.createElement('button');
      btn.textContent = `Xem thêm (${list.length - max})`;
      btn.className = 'show-more';
      btn.onclick = () => renderList(true);
      el.appendChild(btn);
    }
    if (showAll && list.length > max) {
      const btn = document.createElement('button');
      btn.textContent = 'Ẩn bớt';
      btn.className = 'show-less';
      btn.onclick = () => renderList(false);
      el.appendChild(btn);
    }
  }
  renderList(false);
}

export async function fetchSchedules() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  try {
    const res = await fetch('/api/schedule/list');
    const data = await res.json();
    renderSchedules(data);
  } catch (e) {
    renderSchedules([]);
  }
}

function renderSchedules(list) {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  if (!list || !list.length) {
    el.textContent = 'Không có schedule nào.';
    return;
  }
  el.innerHTML = '<ul>' + list.map(item =>
    `<li>ID: ${item.id}, Interval: ${item.interval_minutes || item.interval} phút, Next: ${item.next || item.next_run_at || '-'}${item.enabled === 0 ? ' (disabled)' : ''}</li>`
  ).join('') + '</ul>';
}
