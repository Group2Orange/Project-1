'use strict';
const API = 'http://127.0.0.1:3000';

// Auth guard
const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
const hasHrAccess = session !== null && session.role === 'HR';
if (!hasHrAccess) location.replace('../../common/login/login.html');

// State
let allTickets = [];
let allEmployees = [];
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
  if (str === null || str === undefined) str = '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(str) {
  if (!str) return '—';
  const normalised = HelpdeskMeetings.normaliseTime(str);
  if (!normalised) return str;
  const parts = normalised.split(':');
  const hour = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minutes} ${ampm}`;
}

function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Name of the employee with this id, or '' when they are not found.
function employeeName(employeeId) {
  const employee = allEmployees.find(person => String(person.id) === String(employeeId));
  if (employee && employee.name) return employee.name;
  return '';
}

// "Confirmed" is shown as "Approved" and "In Review" is shown as "Pending".
function displayStatus(status) {
  if (status === 'Confirmed') return 'Approved';
  if (status === 'In Review') return 'Pending';
  return status;
}

// Puts the updated ticket from the API into our list in place of the old one.
function replaceTicket(updatedTicket) {
  allTickets = allTickets.map(ticket => (ticket.id === actionTicketId ? updatedTicket : ticket));
}

// ── Status badge ─────────────────────────────────────────────────────────────

function getStatusBadge(status) {
  const classes = {
    'Approved': 'status-active',
    'Confirmed': 'status-active',
    'Rejected': 'status-blocked',
    'Pending': 'status-pending',
    'In Review': 'status-pending',
    'Reschedule Requested': 'status-reschedule'
  };
  const cls = classes[status] || 'status-inactive';
  return `<span class="status ${cls}">${escapeHtml(displayStatus(status))}</span>`;
}

// ── Action buttons ────────────────────────────────────────────────────────────

function buildActions(ticket) {
  let html = `<button type="button" data-action="view" aria-label="View ticket"><span class="material-symbols-outlined">visibility</span></button>`;

  if (HelpdeskMeetings.canApprove(ticket)) {
    const setupMeeting = ['Approved', 'Confirmed'].includes(ticket.status);
    const label = setupMeeting ? 'Set up meeting' : 'Approve';
    const title = setupMeeting ? 'Set up the approved Jitsi demo meeting' : 'Approve request';
    const icon = setupMeeting ? 'videocam' : 'check_circle';
    html += `<button type="button" data-action="approve" aria-label="${label}" title="${title}"><span class="material-symbols-outlined">${icon}</span></button>`;
  }

  const proposedByHr = ticket.rescheduleRequest && ticket.rescheduleRequest.proposedBy === 'HR';
  const isWaiting = ['Pending', 'In Review'].includes(ticket.status);
  if (isWaiting || (ticket.status === 'Reschedule Requested' && !proposedByHr)) {
    html += `<button type="button" data-action="reject" aria-label="Reject"><span class="material-symbols-outlined">cancel</span></button>`;
  }

  if (HelpdeskMeetings.canReschedule(ticket)) {
    html += `<button type="button" data-action="reschedule" aria-label="Reschedule" title="Propose a new meeting time"><span class="material-symbols-outlined">event_repeat</span></button>`;
  }
  return html;
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const ticketsResponse = await fetch(`${API}/helpdeskRequests`);
    const employeesResponse = await fetch(`${API}/employees`);
    if (!ticketsResponse.ok || !employeesResponse.ok) throw new Error('Could not load data.');
    allTickets = await ticketsResponse.json();
    allEmployees = await employeesResponse.json();
    // Sort newest first
    allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--color-secondary)">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function filteredTickets() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const type = filterType.value;

  return allTickets.filter(ticket => {
    const name = employeeName(ticket.employeeId).toLowerCase();
    const subject = (ticket.subject || '').toLowerCase();
    const ticketNumber = (ticket.ticket || '').toLowerCase();
    const matchQuery = !query || name.includes(query) || subject.includes(query) || ticketNumber.includes(query);
    const matchStatus = !status || displayStatus(ticket.status) === status;
    const matchType = !type || ticket.type === type;
    return matchQuery && matchStatus && matchType;
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

function ticketRow(ticket) {
  const name = escapeHtml(employeeName(ticket.employeeId) || `Employee #${ticket.employeeId}`);
  let typeBadge = `<span class="status" style="background:var(--color-surface);color:var(--color-secondary);border:1px solid var(--color-border)">Text Ticket</span>`;
  if (ticket.type === 'meeting') {
    typeBadge = `<span class="status" style="background:var(--color-primary-light);color:var(--color-primary-dark)">Meeting</span>`;
  }
  return `<tr data-id="${ticket.id}">
        <td><code style="font-size:15px;color:var(--color-secondary)">${escapeHtml(ticket.ticket || ticket.id)}</code></td>
        <td>${name}</td>
        <td>${typeBadge}</td>
        <td>${escapeHtml(ticket.category || '—')}</td>
        <td>${formatDate(ticket.createdAt)}</td>
        <td>${getStatusBadge(ticket.status)}</td>
        <td><div class="actions">${buildActions(ticket)}</div></td>
      </tr>`;
}

function render() {
  const result = filteredTickets();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);

  if (visible.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--color-secondary)">No tickets match your search.</td></tr>`;
  } else {
    body.innerHTML = visible.map(ticketRow).join('');
  }

  let countText = '0 tickets';
  if (result.length) {
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, result.length);
    countText = `Showing ${first}–${last} of ${result.length} tickets`;
  }
  document.getElementById('resultCount').textContent = countText;
  document.getElementById('pageLabel').textContent = `${page} / ${pages}`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= pages;

  // Wire action buttons. "this" is the button that was clicked.
  body.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      const id = parseInt(this.closest('tr[data-id]').dataset.id, 10);
      const ticket = allTickets.find(t => t.id === id);
      if (!ticket) return;
      const action = this.dataset.action;
      if (action === 'view') openViewDialog(ticket);
      else if (action === 'approve') openApproveDialog(ticket);
      else if (action === 'reject') openRejectDialog(ticket);
      else if (action === 'reschedule') openRescheduleDialog(ticket);
    });
  });

  // Row click → view. "this" is the clicked row.
  body.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', function () {
      const id = parseInt(this.dataset.id, 10);
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
  document.getElementById('viewTitle').textContent = ticket.ticket || `#${ticket.id}`;

  let html = '';
  html += detailRow('Employee', escapeHtml(employeeName(ticket.employeeId) || `Employee #${ticket.employeeId}`));
  html += detailRow('Type', ticket.type === 'meeting' ? 'Meeting Request' : 'Text Ticket');
  html += detailRow('Category', escapeHtml(ticket.category || '—'));
  html += detailRow('Subject', escapeHtml(ticket.subject || '—'));
  html += detailRow('Details', escapeHtml(ticket.details || ticket.message || '—'));
  html += detailRow('Date Submitted', formatDate(ticket.createdAt));
  html += detailRow('Status', getStatusBadge(ticket.status));

  if (ticket.type === 'meeting') {
    const startTime = ticket.timeFrom || ticket.time;
    const endTime = ticket.timeTo || ticket.time;
    let timeText = '—';
    if (startTime) {
      timeText = formatTime(startTime);
      if (endTime && endTime !== startTime) timeText += ` – ${formatTime(endTime)}`;
    }
    html += detailRow('Meeting Date', formatDate(ticket.date));
    html += detailRow('Time', timeText);
    html += detailRow('Platform', escapeHtml(HelpdeskMeetings.platformLabel(ticket)));
  }

  const meetingLink = HelpdeskMeetings.joinLink(ticket);
  if (meetingLink && ['Approved', 'Confirmed'].includes(ticket.status)) {
    const external = new URL(meetingLink).origin !== location.origin;
    const newTab = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    html += detailRow('Meeting Link', `<a href="${escapeHtml(meetingLink)}"${newTab}>Open meeting ↗</a>`);
  }

  if (ticket.hrReply) {
    html += `<div class="detail-row detail-reply"><span class="detail-label">HR Reply</span><span class="detail-value">${escapeHtml(ticket.hrReply)}</span></div>`;
  }

  if (ticket.rescheduleRequest) {
    const rs = ticket.rescheduleRequest;
    const label = rs.proposedBy === 'HR' ? 'HR Proposed Time' : 'Employee Proposed Time';
    html += `<div class="detail-row detail-reschedule"><span class="detail-label">${label}</span><span class="detail-value">${formatDate(rs.date)} · ${formatTime(rs.timeFrom)} – ${formatTime(rs.timeTo)}</span></div>`;
  }

  document.getElementById('viewBody').innerHTML = html;
  viewDialog.showModal();
}

// ── Approve dialog ────────────────────────────────────────────────────────────

function openApproveDialog(ticket) {
  actionTicketId = ticket.id;
  const setupMeeting = ['Approved', 'Confirmed'].includes(ticket.status);
  document.getElementById('approveTitle').textContent = setupMeeting ? 'Set up meeting' : 'Approve Ticket';
  document.getElementById('confirmApproveBtn').textContent = setupMeeting ? 'Save meeting' : 'Approve';
  const meetingPlatform = HelpdeskMeetings.platformLabel(ticket);
  const isGoogleMeet = ticket.type === 'meeting' && meetingPlatform === 'Google Meet';

  let desc = 'Approve this support ticket. The employee will be notified.';
  if (HelpdeskMeetings.isZoomDemo(ticket)) {
    desc = 'Approval saves a unique Jitsi demo room. You and the employee can open the same room from the meeting link.';
  } else if (ticket.type === 'meeting') {
    const platformText = meetingPlatform ? ` (${meetingPlatform})` : '';
    desc = `Approve this meeting request${platformText}. The employee will be notified.`;
  }
  document.getElementById('approveDesc').textContent = desc;

  const meetingLinkField = document.getElementById('meetingLinkField');
  meetingLinkField.hidden = !isGoogleMeet;
  document.getElementById('meetingLinkInput').value = isGoogleMeet ? (ticket.meetingLink || '') : '';
  document.getElementById('meetingLinkError').textContent = '';
  document.getElementById('approveError').textContent = '';
  document.getElementById('hrReplyInput').value = ticket.hrReply || '';

  approveDialog.showModal();
}

// "this" is the Approve button inside the approve dialog.
document.getElementById('confirmApproveBtn').addEventListener('click', async function () {
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

  const button = this;
  button.disabled = true;
  try {
    // Read the current record before approval so a retry reuses its saved room.
    const currentResponse = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`);
    if (!currentResponse.ok) throw new Error('This ticket could not be found. Refresh the page.');
    const current = await currentResponse.json();
    const patch = HelpdeskMeetings.approvalPatch(current, hrReply, meetingLink);

    const response = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error('Could not approve ticket.');
    replaceTicket(await response.json());
    approveDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    document.getElementById('approveError').textContent = err.message;
  }
  button.disabled = false;
});

// ── Reject dialog ─────────────────────────────────────────────────────────────

function openRejectDialog(ticket) {
  actionTicketId = ticket.id;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectError').textContent = '';
  rejectDialog.showModal();
}

// "this" is the Reject button inside the reject dialog.
document.getElementById('confirmRejectBtn').addEventListener('click', async function () {
  const reason = document.getElementById('rejectReason').value.trim();
  const rejectError = document.getElementById('rejectError');

  if (!reason) {
    rejectError.textContent = 'Please provide a reason for rejection.';
    return;
  }
  rejectError.textContent = '';

  const button = this;
  button.disabled = true;
  try {
    const response = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected', hrReply: reason })
    });
    if (!response.ok) throw new Error('Could not reject ticket.');
    replaceTicket(await response.json());
    rejectDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    rejectError.textContent = err.message;
  }
  button.disabled = false;
});

// ── Reschedule dialog ─────────────────────────────────────────────────────────

function openRescheduleDialog(ticket) {
  actionTicketId = ticket.id;
  const proposed = ticket.rescheduleRequest || ticket;
  document.getElementById('rsDate').value = proposed.date || '';
  document.getElementById('rsDate').min = todayIso();
  document.getElementById('rsTimeFrom').value = HelpdeskMeetings.normaliseTime(proposed.timeFrom || proposed.time);
  document.getElementById('rsTimeTo').value = HelpdeskMeetings.normaliseTime(proposed.timeTo);
  document.getElementById('rsDateError').textContent = '';
  document.getElementById('rsTimeError').textContent = '';
  rescheduleDialog.showModal();
}

// "this" is the Propose Reschedule button inside the reschedule dialog.
document.getElementById('confirmRescheduleBtn').addEventListener('click', async function () {
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

  const button = this;
  button.disabled = true;
  try {
    const response = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(actionTicketId)}`, {
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
    if (!response.ok) throw new Error('Could not propose reschedule.');
    replaceTicket(await response.json());
    rescheduleDialog.close();
    render();
    renderStats();
  } catch (err) {
    console.error(err);
    rsDateError.textContent = err.message;
  }
  button.disabled = false;
});

// ── Filters & pagination ──────────────────────────────────────────────────────

function showFirstPage() {
  page = 1;
  render();
}
searchInput.addEventListener('input', showFirstPage);
filterStatus.addEventListener('change', showFirstPage);
filterType.addEventListener('change', showFirstPage);
document.getElementById('prevPage').addEventListener('click', () => {
  page--;
  render();
});
document.getElementById('nextPage').addEventListener('click', () => {
  page++;
  render();
});

// ── Init ──────────────────────────────────────────────────────────────────────

if (hasHrAccess) loadData();
