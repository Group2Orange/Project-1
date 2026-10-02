'use strict';
const API = 'http://127.0.0.1:3000';

// Auth guard
const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
const hasHrAccess = session?.role === 'HR';
if (!hasHrAccess) location.replace('../../common/login/login.html');

// State
let allTickets = [];
let employeeMap = new Map(); // id -> employee object
let page = 1;
const pageSize = 15;
let actionTicketId = null; // ID of ticket currently being acted on

// DOM refs
const body = document.getElementById('ticketsBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterType = document.getElementById('filterType');

// Dialogs
const viewDialog = document.getElementById('viewDialog');
const approveDialog = document.getElementById('approveDialog');
const rejectDialog = document.getElementById('rejectDialog');
const rescheduleDialog = document.getElementById('rescheduleDialog');

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(str) {
  if (!str) return '—';
  const [h, m] = str.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Status badge ─────────────────────────────────────────────────────────────

function getStatusBadge(status) {
  const map = {
    'Approved': 'status-active',
    'Confirmed': 'status-active',
    'Rejected': 'status-blocked',
    'Pending': 'status-pending',
    'In Review': 'status-pending',
    'Reschedule Requested': 'status-reschedule'
  };
  const cls = map[status] || 'status-inactive';
  const label = status === 'Confirmed' ? 'Approved' : status === 'In Review' ? 'Pending' : status;
  return `<span class="status ${cls}">${escapeHtml(label)}</span>`;
}

// ── Action buttons ────────────────────────────────────────────────────────────

function buildActions(t) {
  let html = `<button type="button" data-action="view" aria-label="View ticket"><span class="material-symbols-outlined">visibility</span></button>`;
  if (t.status === 'Pending' || t.status === 'In Review') {
    html += `<button type="button" data-action="approve" aria-label="Approve"><span class="material-symbols-outlined">check_circle</span></button>`;
    html += `<button type="button" data-action="reject" aria-label="Reject"><span class="material-symbols-outlined">cancel</span></button>`;
    if (t.type === 'meeting') {
      html += `<button type="button" data-action="reschedule" aria-label="Reschedule"><span class="material-symbols-outlined">event_repeat</span></button>`;
    }
  }
  return html;
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const [ticketsRes, employeesRes] = await Promise.all([
      fetch(`${API}/helpdeskRequests`),
      fetch(`${API}/employees`)
    ]);
    if (!ticketsRes.ok || !employeesRes.ok) throw new Error('Could not load data.');
    allTickets = await ticketsRes.json();
    const employees = await employeesRes.json();
    employeeMap = new Map(employees.map(e => [String(e.id), e]));
    // Sort newest first
    allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    document.getElementById('ticketsBody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--color-secondary)">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function filteredTickets() {
  const q = searchInput.value.trim().toLowerCase();
  const st = filterStatus.value;
  const ty = filterType.value;
  return allTickets.filter(t => {
    const emp = employeeMap.get(String(t.employeeId));
    const name = (emp?.name || '').toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const matchQ = !q || name.includes(q) || subject.includes(q) || (t.ticket || '').toLowerCase().includes(q);
    const normalizedStatus = t.status === 'Confirmed' ? 'Approved' : t.status === 'In Review' ? 'Pending' : t.status;
    const matchSt = !st || normalizedStatus === st;
    const matchTy = !ty || t.type === ty;
    return matchQ && matchSt && matchTy;
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function renderStats() {
  document.getElementById('statTotal').textContent = allTickets.length;
  document.getElementById('statPending').textContent = allTickets.filter(t => ['Pending', 'In Review'].includes(t.status)).length;
  document.getElementById('statMeetings').textContent = allTickets.filter(t => t.type === 'meeting').length;
  document.getElementById('statApproved').textContent = allTickets.filter(t => ['Approved', 'Confirmed'].includes(t.status)).length;
}

// ── Render table ──────────────────────────────────────────────────────────────

function render() {
  const result = filteredTickets();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);

  if (visible.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--color-secondary)">No tickets match your search.</td></tr>`;
  } else {
    body.innerHTML = visible.map(t => {
      const emp = employeeMap.get(String(t.employeeId));
      const empName = escapeHtml(emp?.name || `Employee #${t.employeeId}`);
      const typeBadge = t.type === 'meeting'
        ? `<span class="status" style="background:var(--color-primary-light);color:var(--color-primary-dark)">Meeting</span>`
        : `<span class="status" style="background:var(--color-surface);color:var(--color-secondary);border:1px solid var(--color-border)">Text Ticket</span>`;
      const statusBadge = getStatusBadge(t.status);
      const actions = buildActions(t);
      return `<tr data-id="${t.id}">
        <td><code style="font-size:12px;color:var(--color-secondary)">${escapeHtml(t.ticket || t.id)}</code></td>
        <td>${empName}</td>
        <td>${typeBadge}</td>
        <td>${escapeHtml(t.category || '—')}</td>
        <td>${formatDate(t.createdAt)}</td>
        <td>${statusBadge}</td>
        <td><div class="actions">${actions}</div></td>
      </tr>`;
    }).join('');
  }

  document.getElementById('resultCount').textContent = result.length
    ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, result.length)} of ${result.length} tickets`
    : '0 tickets';
  document.getElementById('pageLabel').textContent = `${page} / ${pages}`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= pages;

  // Wire action buttons
  body.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(btn.closest('tr[data-id]').dataset.id, 10);
      const ticket = allTickets.find(t => t.id === id);
      if (!ticket) return;
      const action = btn.dataset.action;
      if (action === 'view') openViewDialog(ticket);
      else if (action === 'approve') openApproveDialog(ticket);
      else if (action === 'reject') openRejectDialog(ticket);
      else if (action === 'reschedule') openRescheduleDialog(ticket);
    });
  });

  // Row click → view
  body.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.dataset.id, 10);
      const ticket = allTickets.find(t => t.id === id);
      if (ticket) openViewDialog(ticket);
    });
  });
}

// ── View dialog ───────────────────────────────────────────────────────────────

function detailRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${value}</span></div>`;
}

function openViewDialog(ticket) {
  const emp = employeeMap.get(String(ticket.employeeId));
  document.getElementById('viewTitle').textContent = ticket.ticket || `#${ticket.id}`;

  let html = '';
  html += detailRow('Employee', escapeHtml(emp?.name || `Employee #${ticket.employeeId}`));
  html += detailRow('Type', ticket.type === 'meeting' ? 'Meeting Request' : 'Text Ticket');
  html += detailRow('Category', escapeHtml(ticket.category || '—'));
  html += detailRow('Subject', escapeHtml(ticket.subject || '—'));
  html += detailRow('Details', escapeHtml(ticket.details || ticket.message || '—'));
  html += detailRow('Date Submitted', formatDate(ticket.createdAt));
  html += detailRow('Status', getStatusBadge(ticket.status));

  if (ticket.type === 'meeting') {
    const startTime = ticket.timeFrom || ticket.time;
    const endTime = ticket.timeTo || ticket.time;
    html += detailRow('Meeting Date', formatDate(ticket.date));
    html += detailRow('Time', startTime ? `${formatTime(startTime)}${endTime && endTime !== startTime ? ` – ${formatTime(endTime)}` : ''}` : '—');
    html += detailRow('Platform', escapeHtml(ticket.platform || ticket.channel || '—'));
  }

  if (ticket.meetingLink) {
    html += detailRow('Meeting Link', `<a href="${escapeHtml(ticket.meetingLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ticket.meetingLink)}</a>`);
  }

  if (ticket.hrReply) {
    html += `<div class="detail-row detail-reply"><span class="detail-label">HR Reply</span><span class="detail-value">${escapeHtml(ticket.hrReply)}</span></div>`;
  }

  if (ticket.rescheduleRequest) {
    const rs = ticket.rescheduleRequest;
    html += `<div class="detail-row detail-reschedule"><span class="detail-label">Employee Proposed Time</span><span class="detail-value">${formatDate(rs.date)} · ${formatTime(rs.timeFrom)} – ${formatTime(rs.timeTo)}</span></div>`;
  }

  document.getElementById('viewBody').innerHTML = html;
  viewDialog.showModal();
}

// ── Approve dialog ────────────────────────────────────────────────────────────

function openApproveDialog(ticket) {
  actionTicketId = ticket.id;
  const meetingPlatform = ticket.platform || ticket.channel;
  const isGoogleMeet = ticket.type === 'meeting' && meetingPlatform === 'Google Meet';

  const desc = ticket.type === 'meeting'
    ? `Approve this meeting request${meetingPlatform ? ` (${meetingPlatform})` : ''}. The employee will be notified.`
    : 'Approve this support ticket. The employee will be notified.';
  document.getElementById('approveDesc').textContent = desc;

  const meetingLinkField = document.getElementById('meetingLinkField');
  meetingLinkField.hidden = !isGoogleMeet;
  document.getElementById('meetingLinkInput').value = '';
  document.getElementById('meetingLinkError').textContent = '';
  document.getElementById('hrReplyInput').value = '';

  approveDialog.showModal();
}

document.getElementById('confirmApproveBtn').addEventListener('click', async () => {
  const meetingLinkField = document.getElementById('meetingLinkField');
  const meetingLinkInput = document.getElementById('meetingLinkInput');
  const meetingLinkError = document.getElementById('meetingLinkError');
  const hrReply = document.getElementById('hrReplyInput').value.trim() || null;
  let meetingLink = null;

  if (!meetingLinkField.hidden) {
    meetingLink = meetingLinkInput.value.trim();
    if (!meetingLink) {
      meetingLinkError.textContent = 'A Google Meet link is required to approve this meeting.';
      return;
    }
    meetingLinkError.textContent = '';
  }

  const btn = document.getElementById('confirmApproveBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Approved', meetingLink: meetingLink || null, hrReply })
    });
    if (!res.ok) throw new Error('Could not approve ticket.');
    const updated = await res.json();
    const idx = allTickets.findIndex(t => t.id === actionTicketId);
    if (idx !== -1) allTickets[idx] = updated;
    approveDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    meetingLinkError.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ── Reject dialog ─────────────────────────────────────────────────────────────

function openRejectDialog(ticket) {
  actionTicketId = ticket.id;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectError').textContent = '';
  rejectDialog.showModal();
}

document.getElementById('confirmRejectBtn').addEventListener('click', async () => {
  const reason = document.getElementById('rejectReason').value.trim();
  const rejectError = document.getElementById('rejectError');

  if (!reason) {
    rejectError.textContent = 'Please provide a reason for rejection.';
    return;
  }
  rejectError.textContent = '';

  const btn = document.getElementById('confirmRejectBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected', hrReply: reason })
    });
    if (!res.ok) throw new Error('Could not reject ticket.');
    const updated = await res.json();
    const idx = allTickets.findIndex(t => t.id === actionTicketId);
    if (idx !== -1) allTickets[idx] = updated;
    rejectDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    rejectError.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ── Reschedule dialog ─────────────────────────────────────────────────────────

function openRescheduleDialog(ticket) {
  actionTicketId = ticket.id;
  document.getElementById('rsDate').value = '';
  document.getElementById('rsDate').min = todayIso();
  document.getElementById('rsTimeFrom').value = '';
  document.getElementById('rsTimeTo').value = '';
  document.getElementById('rsDateError').textContent = '';
  document.getElementById('rsTimeError').textContent = '';
  rescheduleDialog.showModal();
}

document.getElementById('confirmRescheduleBtn').addEventListener('click', async () => {
  const rsDate = document.getElementById('rsDate').value;
  const rsTimeFrom = document.getElementById('rsTimeFrom').value;
  const rsTimeTo = document.getElementById('rsTimeTo').value;
  const rsDateError = document.getElementById('rsDateError');
  const rsTimeError = document.getElementById('rsTimeError');

  rsDateError.textContent = '';
  rsTimeError.textContent = '';

  let valid = true;
  if (!rsDate || rsDate < todayIso()) {
    rsDateError.textContent = 'Please select a valid date (today or later).';
    valid = false;
  }
  if (!rsTimeFrom) {
    rsTimeError.textContent = 'Please set a start time.';
    valid = false;
  } else if (!rsTimeTo) {
    rsTimeError.textContent = 'Please set an end time.';
    valid = false;
  } else if (rsTimeTo <= rsTimeFrom) {
    rsTimeError.textContent = 'End time must be after start time.';
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('confirmRescheduleBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Reschedule Requested',
        rescheduleRequest: {
          date: rsDate,
          timeFrom: rsTimeFrom,
          timeTo: rsTimeTo,
          proposedBy: 'HR',
          proposedAt: new Date().toISOString()
        }
      })
    });
    if (!res.ok) throw new Error('Could not propose reschedule.');
    const updated = await res.json();
    const idx = allTickets.findIndex(t => t.id === actionTicketId);
    if (idx !== -1) allTickets[idx] = updated;
    rescheduleDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    document.getElementById('rsDateError').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ── Filters & pagination ──────────────────────────────────────────────────────

searchInput.addEventListener('input', () => { page = 1; render(); });
filterStatus.addEventListener('change', () => { page = 1; render(); });
filterType.addEventListener('change', () => { page = 1; render(); });
document.getElementById('prevPage').addEventListener('click', () => { page--; render(); });
document.getElementById('nextPage').addEventListener('click', () => { page++; render(); });

// ── Init ──────────────────────────────────────────────────────────────────────

if (hasHrAccess) loadData();
