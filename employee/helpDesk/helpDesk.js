/* =========================================================
   helpDesk.js  –  HR Support & Helpdesk (Employee)
   ========================================================= */

'use strict';

const API = 'http://127.0.0.1:3000';

/* ---------------------------------------------------------
   Auth guard
--------------------------------------------------------- */
const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || 'null');
let employeeId = null;
if (loggedUser && loggedUser.role === 'EMP' && loggedUser.id !== undefined && loggedUser.id !== null) {
  employeeId = String(loggedUser.id);
}
if (!employeeId) window.location.replace('../../common/login/login.html');

/* ---------------------------------------------------------
   State
--------------------------------------------------------- */
let helpdeskRequests = [];
let helpdeskDraft    = null;
let requestType      = 'ticket';
let selectedPlatform = '';
let selectedFile     = '';
let currentTicket    = null; // ticket open in modal

/* ---------------------------------------------------------
   DOM refs
--------------------------------------------------------- */
const typeOptionBtns   = document.querySelectorAll('.type-option');
const meetingBox       = document.getElementById('meetingBox');
const platformBtns     = document.querySelectorAll('.platform-btn');
const meetingDateInput = document.getElementById('meetingDate');
const timeFrom         = document.getElementById('timeFrom');
const timeTo           = document.getElementById('timeTo');
const category         = document.getElementById('category');
const subject          = document.getElementById('subject');
const details          = document.getElementById('details');
const uploadBox        = document.getElementById('uploadBox');
const fileInput        = document.getElementById('fileInput');
const fileText         = document.getElementById('fileText');
const draftBtn         = document.getElementById('draftBtn');
const submitBtn        = document.getElementById('submitBtn');
const messageEl        = document.getElementById('message');
const myRequestsBtn    = document.getElementById('myRequestsBtn');
const viewAllBtn       = document.getElementById('viewAllBtn');
const recentTicketsList= document.getElementById('recentTicketsList');
const meetingCardContent = document.getElementById('meetingCardContent');
const meetingStatusBadge = document.getElementById('meetingStatusBadge');

// Modals
const ticketDetailModal   = document.getElementById('ticketDetailModal');
const ticketDetailBody    = document.getElementById('ticketDetailBody');
const ticketDetailActions = document.getElementById('ticketDetailActions');
const closeDetailModal    = document.getElementById('closeDetailModal');
const rescheduleModal     = document.getElementById('rescheduleModal');
const closeRescheduleModal= document.getElementById('closeRescheduleModal');
const cancelRescheduleBtn = document.getElementById('cancelRescheduleBtn');
const submitRescheduleBtn = document.getElementById('submitRescheduleBtn');
const rescheduleDate      = document.getElementById('rescheduleDate');
const rescheduleFrom      = document.getElementById('rescheduleFrom');
const rescheduleTo        = document.getElementById('rescheduleTo');

// Constraint validation: the date pickers grey out days before today
// (function declarations like todayISO() are hoisted, so it's safe to call here).
meetingDateInput.min = todayISO();
rescheduleDate.min = todayISO();

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
function escapeHtml(str) {
  if (str === undefined || str === null) str = '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadgeClass(status) {
  if (status === 'Approved' || status === 'Confirmed') return 'status-active';
  if (status === 'Rejected')             return 'status-blocked';
  if (status === 'Reschedule Requested') return 'status-reschedule';
  return 'status-inactive'; // Pending
}

function displayStatus(status) {
  if (status === 'Confirmed') return 'Approved';
  if (status === 'In Review') return 'Pending';
  return status || 'Pending';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function openMeeting(link) {
  if (new URL(link).origin === location.origin) location.assign(link);
  else window.open(link, '_blank', 'noopener,noreferrer');
}

function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

/* ---------------------------------------------------------
   Boot — load data
--------------------------------------------------------- */
async function loadHelpdeskData() {
  if (!employeeId) return;
  try {
    const requestsResponse = await fetch(`${API}/helpdeskRequests?employeeId=${encodeURIComponent(employeeId)}`);
    const draftsResponse   = await fetch(`${API}/helpdeskDrafts?employeeId=${encodeURIComponent(employeeId)}`);
    if (!requestsResponse.ok || !draftsResponse.ok) throw new Error('Could not load helpdesk data.');

    // Newest request first.
    helpdeskRequests = await requestsResponse.json();
    helpdeskRequests.sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );

    // Each employee has at most one saved draft.
    const drafts = await draftsResponse.json();
    helpdeskDraft = drafts[0] || null;

    loadDraft();
    renderTickets();
    renderMeetingCard();
  } catch (err) {
    showMessage(`${err.message} — Make sure the API is running (npm run api).`, 'error');
  }
}

/* ---------------------------------------------------------
   Type selection
--------------------------------------------------------- */
typeOptionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    typeOptionBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    typeOptionBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    requestType = btn.dataset.type;

    // The meeting fields only show for a meeting request.
    meetingBox.hidden = requestType !== 'meeting';
    submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:19px;">send</span> Submit Request';
  });
});

/* ---------------------------------------------------------
   Platform selection
--------------------------------------------------------- */
platformBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    platformBtns.forEach(b => b.classList.remove('selected-btn'));
    btn.classList.add('selected-btn');
    platformBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    selectedPlatform = btn.dataset.platform;
  });
});

/* ---------------------------------------------------------
   File upload & drag-drop
--------------------------------------------------------- */
uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    selectedFile = fileInput.files[0].name;
    fileText.textContent = selectedFile;
  }
});

uploadBox.addEventListener('dragover', e => {
  e.preventDefault();
  uploadBox.classList.add('dragging');
});

uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragging'));

uploadBox.addEventListener('drop', e => {
  e.preventDefault();
  uploadBox.classList.remove('dragging');
  if (e.dataTransfer.files.length > 0) {
    selectedFile = e.dataTransfer.files[0].name;
    fileText.textContent = selectedFile;
  }
});

/* ---------------------------------------------------------
   Validation
--------------------------------------------------------- */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function showFieldError(inputEl, errorEl, msg) {
  errorEl.textContent = msg;
  if (inputEl) inputEl.classList.add('error');
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (requestType === 'meeting') {
    // Platform
    if (!selectedPlatform) {
      document.getElementById('platformError').textContent = 'Please select a platform.';
      valid = false;
    }
    // Date
    const dateVal = meetingDateInput.value;
    if (!dateVal) {
      showFieldError(meetingDateInput, document.getElementById('dateError'), 'Please select a meeting date.');
      valid = false;
    } else if (dateVal < todayISO()) {
      showFieldError(meetingDateInput, document.getElementById('dateError'), 'Date cannot be in the past.');
      valid = false;
    }
    // Time From
    if (!timeFrom.value) {
      showFieldError(timeFrom, document.getElementById('timeError'), 'Please enter the start time.');
      valid = false;
    } else if (!timeTo.value) {
      showFieldError(timeTo, document.getElementById('timeError'), 'Please enter the end time.');
      valid = false;
    } else if (timeTo.value <= timeFrom.value) {
      showFieldError(timeTo, document.getElementById('timeError'), '"To" must be after "From".');
      valid = false;
    } else if (dateVal === todayISO() && timeFrom.value < nowHHMM()) {
      showFieldError(timeFrom, document.getElementById('timeError'), 'Start time must be in the future for today.');
      valid = false;
    }
  }

  // Category
  if (!category.value) {
    showFieldError(category, document.getElementById('categoryError'), 'Please select a category.');
    valid = false;
  }
  // Subject
  if (!subject.value.trim()) {
    showFieldError(subject, document.getElementById('subjectError'), 'Subject is required.');
    valid = false;
  } else if (subject.value.trim().length < 3) {
    showFieldError(subject, document.getElementById('subjectError'), 'Subject must be at least 3 characters.');
    valid = false;
  }
  // Details
  if (!details.value.trim()) {
    showFieldError(details, document.getElementById('detailsError'), 'Please describe your request.');
    valid = false;
  } else if (details.value.trim().length < 10) {
    showFieldError(details, document.getElementById('detailsError'), 'Please provide at least 10 characters.');
    valid = false;
  }

  return valid;
}

/* ---------------------------------------------------------
   Submit
--------------------------------------------------------- */
submitBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  const request = {
    employeeId: employeeId,
    ticket:   'TKT-' + Math.floor(1000 + Math.random() * 9000),
    type:      requestType,
    platform:  requestType === 'meeting' ? selectedPlatform : null,
    category:  category.value,
    subject:   subject.value.trim(),
    details:   details.value.trim(),
    file:      selectedFile,
    status:    'Pending',
    date:      requestType === 'meeting' ? meetingDateInput.value : null,
    timeFrom:  requestType === 'meeting' ? timeFrom.value : null,
    timeTo:    requestType === 'meeting' ? timeTo.value : null,
    meetingLink: null,
    hrReply:   null,
    rescheduleRequest: null,
    createdAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`${API}/helpdeskRequests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) throw new Error('Could not submit request.');
    const saved = await res.json();
    helpdeskRequests.unshift(saved);

    // Delete draft if it exists
    if (helpdeskDraft) {
      await fetch(`${API}/helpdeskDrafts/${encodeURIComponent(helpdeskDraft.id)}`, { method: 'DELETE' });
      helpdeskDraft = null;
    }
  } catch (err) {
    showMessage(err.message, 'error');
    return;
  }

  showMessage('Request submitted successfully!', 'success');
  clearForm();
  renderTickets();
  renderMeetingCard();
});

/* ---------------------------------------------------------
   Draft
--------------------------------------------------------- */
draftBtn.addEventListener('click', async () => {
  const draft = {
    employeeId: employeeId,
    type:     requestType,
    platform:  selectedPlatform,
    category:  category.value,
    subject:   subject.value,
    details:   details.value,
    date:      meetingDateInput.value,
    timeFrom:  timeFrom.value,
    timeTo:    timeTo.value,
    file:      selectedFile
  };

  try {
    // Update the existing draft (PATCH) or create a new one (POST).
    let url    = `${API}/helpdeskDrafts`;
    let method = 'POST';
    if (helpdeskDraft) {
      url    = `${API}/helpdeskDrafts/${encodeURIComponent(helpdeskDraft.id)}`;
      method = 'PATCH';
    }
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    if (!res.ok) throw new Error('Could not save draft.');
    helpdeskDraft = await res.json();
  } catch (err) {
    showMessage(err.message, 'error');
    return;
  }

  showMessage('Draft saved successfully.', 'success');
});

/* ---------------------------------------------------------
   Load draft into form
--------------------------------------------------------- */
function loadDraft() {
  if (!helpdeskDraft) return;
  const d = helpdeskDraft;

  if (d.type) {
    requestType = d.type;
    typeOptionBtns.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.type === d.type);
      btn.setAttribute('aria-pressed', String(btn.dataset.type === d.type));
    });
    meetingBox.hidden = d.type !== 'meeting';
  }

  if (d.platform) {
    selectedPlatform = d.platform;
    platformBtns.forEach(btn => {
      btn.classList.toggle('selected-btn', btn.dataset.platform === d.platform);
      btn.setAttribute('aria-pressed', String(btn.dataset.platform === d.platform));
    });
  }

  if (d.category)  category.value = d.category;
  if (d.subject)   subject.value  = d.subject;
  if (d.details)   details.value  = d.details;
  if (d.date)      meetingDateInput.value = d.date;
  if (d.timeFrom)  timeFrom.value = d.timeFrom;
  if (d.timeTo)    timeTo.value   = d.timeTo;
  if (d.file) {
    selectedFile = d.file;
    fileText.textContent = d.file;
  }
}

/* ---------------------------------------------------------
   Clear form
--------------------------------------------------------- */
function clearForm() {
  clearErrors();
  requestType = 'ticket';
  typeOptionBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === 'ticket');
    btn.setAttribute('aria-pressed', String(btn.dataset.type === 'ticket'));
  });
  meetingBox.hidden = true;
  selectedPlatform = '';
  platformBtns.forEach(b => {
    b.classList.remove('selected-btn');
    b.setAttribute('aria-pressed', 'false');
  });
  meetingDateInput.value = '';
  timeFrom.value  = '';
  timeTo.value    = '';
  category.value  = '';
  subject.value   = '';
  details.value   = '';
  selectedFile    = '';
  fileInput.value = '';
  fileText.textContent = 'Click to upload or drag and drop files';
}

/* ---------------------------------------------------------
   Show message
--------------------------------------------------------- */
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.style.color = type === 'success' ? 'var(--color-tertiary)' : 'var(--color-danger)';
  setTimeout(() => { messageEl.textContent = ''; }, 5000);
}

/* ---------------------------------------------------------
   Render recent tickets (right panel)
--------------------------------------------------------- */
function renderTickets() {
  const shown = helpdeskRequests.slice(0, 6);
  if (shown.length === 0) {
    recentTicketsList.innerHTML = '<p class="meeting-empty">No requests yet.</p>';
    return;
  }

  recentTicketsList.innerHTML = shown.map(t => `
    <div class="ticket-item" data-id="${escapeHtml(t.id)}">
      <div class="ticket-id">${escapeHtml(t.ticket)}</div>
      <div class="ticket-subject">${escapeHtml(t.subject)}</div>
      <div class="ticket-meta">
        <span class="type-badge ${escapeHtml(t.type)}">${escapeHtml(t.type === 'meeting' ? 'Meeting' : 'Ticket')}</span>
        <span class="status-badge ${statusBadgeClass(t.status)}">${escapeHtml(displayStatus(t.status))}</span>
      </div>
    </div>
  `).join('');

  recentTicketsList.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', function () {
      // "this" is the .ticket-item that was clicked.
      const id = this.dataset.id;
      const ticket = helpdeskRequests.find(t => String(t.id) === String(id));
      if (ticket) openDetailModal(ticket);
    });
  });
}

// Meeting status order for the meeting card (lower number shows first).
function meetingStatusRank(status) {
  const order = { Approved: 0, Confirmed: 0, 'Reschedule Requested': 1, Pending: 2, 'In Review': 2 };
  const rank = order[status];
  return rank === undefined ? 3 : rank;
}

/* ---------------------------------------------------------
   Render upcoming meeting card (right panel)
   Shows first Approved meeting with a meetingLink
   OR first Approved meeting without link
   OR first Pending meeting
--------------------------------------------------------- */
function renderMeetingCard() {
  // Priority: Approved meetings first
  const meetings = helpdeskRequests.filter(t => t.type === 'meeting');
  meetings.sort((a, b) => meetingStatusRank(a.status) - meetingStatusRank(b.status));
  const meeting = meetings[0] || null;

  if (!meeting) {
    meetingStatusBadge.hidden = true;
    meetingCardContent.innerHTML = '<p class="meeting-empty">No confirmed meetings yet.</p>';
    return;
  }

  const cls = statusBadgeClass(meeting.status);
  meetingStatusBadge.className = `status-badge ${cls}`;
  meetingStatusBadge.textContent = displayStatus(meeting.status);
  meetingStatusBadge.hidden = false;

  const meetingLink = HelpdeskMeetings.joinLink(meeting);
  const joinBtn = meetingLink && ['Approved', 'Confirmed'].includes(meeting.status)
    ? `<button type="button" class="btn-join" data-meeting-link="${escapeHtml(meetingLink)}">
         <span class="material-symbols-outlined" style="font-size:19px;">videocam</span> Join
       </button>`
    : '';

  meetingCardContent.innerHTML = `
    <div class="meeting-detail">
      <div class="meeting-subject">${escapeHtml(meeting.subject)}</div>
      <div class="meeting-meta">
        <p><span class="material-symbols-outlined" style="font-size:19px;">calendar_today</span> ${escapeHtml(formatDate(meeting.date))}</p>
        <p><span class="material-symbols-outlined" style="font-size:19px;">schedule</span> ${escapeHtml(meeting.timeFrom || meeting.time || '—')}${meeting.timeTo ? ` – ${escapeHtml(meeting.timeTo)}` : ''}</p>
        <p><span class="material-symbols-outlined" style="font-size:19px;">videocam</span> ${escapeHtml(HelpdeskMeetings.platformLabel(meeting))}</p>
      </div>
      ${joinBtn ? `<div class="meeting-btns">${joinBtn}</div>` : ''}
    </div>
  `;
  const cardJoinBtn = meetingCardContent.querySelector('[data-meeting-link]');
  if (cardJoinBtn) {
    cardJoinBtn.addEventListener('click', function () {
      // "this" is the Join button that was clicked.
      openMeeting(this.dataset.meetingLink);
    });
  }
}

/* ---------------------------------------------------------
   Detail Modal
--------------------------------------------------------- */
function openDetailModal(ticket) {
  currentTicket = ticket;
  ticketDetailBody.innerHTML = buildDetailBody(ticket);
  ticketDetailActions.innerHTML = buildDetailActions(ticket);
  // The action buttons were just created, so give them their click handlers now.
  attachDetailActions(ticket);
  ticketDetailModal.showModal();
}

function buildDetailBody(t) {
  let html = `
    <div class="detail-row"><span class="detail-label">Ticket ID</span><span class="detail-value">${escapeHtml(t.ticket)}</span></div>
    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${escapeHtml(t.type === 'meeting' ? 'Meeting' : 'Ticket')}</span></div>
    <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(t.category)}</span></div>
    <div class="detail-row"><span class="detail-label">Subject</span><span class="detail-value">${escapeHtml(t.subject)}</span></div>
    <div class="detail-row"><span class="detail-label">Details</span><span class="detail-value">${escapeHtml(t.details)}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${statusBadgeClass(t.status)}">${escapeHtml(displayStatus(t.status))}</span></span></div>
    <div class="detail-row"><span class="detail-label">Date Submitted</span><span class="detail-value">${escapeHtml(formatDate(t.createdAt))}</span></div>
  `;

  if (t.type === 'meeting') {
    html += `
      <div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${escapeHtml(HelpdeskMeetings.platformLabel(t))}</span></div>
      <div class="detail-row"><span class="detail-label">Meeting Date</span><span class="detail-value">${escapeHtml(formatDate(t.date))}</span></div>
      <div class="detail-row"><span class="detail-label">Time Range</span><span class="detail-value">${escapeHtml(t.timeFrom || t.time || '—')}${t.timeTo ? ` – ${escapeHtml(t.timeTo)}` : ''}</span></div>
    `;
  }

  if (t.hrReply) {
    html += `
      <div class="hr-reply-box">
        <strong style="font-size:15px;color:var(--color-primary);">HR Reply</strong>
        <p>${escapeHtml(t.hrReply)}</p>
      </div>
    `;
  }

  if (t.status === 'Reschedule Requested' && t.rescheduleRequest) {
    const rr = t.rescheduleRequest;
    html += `
      <div class="reschedule-box">
        <h4>Reschedule Proposed by ${rr.proposedBy === 'HR' ? 'HR' : 'You'}</h4>
        <p><strong>New Date:</strong> ${escapeHtml(formatDate(rr.date))}</p>
        <p><strong>Time:</strong> ${escapeHtml(rr.timeFrom || '—')} – ${escapeHtml(rr.timeTo || '—')}</p>
      </div>
    `;
  }

  return html;
}

function buildDetailActions(t) {
  const actions = [];

  // Join button (Approved meeting with link)
  const meetingLink = HelpdeskMeetings.joinLink(t);
  if (t.type === 'meeting' && meetingLink && ['Approved', 'Confirmed'].includes(t.status)) {
    actions.push(`<button type="button" class="btn-join" data-meeting-link="${escapeHtml(meetingLink)}"><span class="material-symbols-outlined" style="font-size:19px;">videocam</span> Join</button>`);
  }

  // Reschedule Requested: Accept or Propose new time
  if (t.status === 'Reschedule Requested' && t.rescheduleRequest && t.rescheduleRequest.proposedBy === 'HR') {
    actions.push(`<button type="button" class="btn-success" id="acceptRescheduleBtn">Accept</button>`);
    actions.push(`<button type="button" class="btn-secondary" id="proposeNewTimeBtn">Propose New Time</button>`);
  }

  // Withdraw (only if Pending)
  if (t.status === 'Pending' || t.status === 'In Review') {
    actions.push(`<button type="button" class="btn-danger" id="withdrawBtn">Withdraw</button>`);
  }

  actions.push(`<button type="button" class="btn-secondary" id="closeDetailBtn">Close</button>`);

  return actions.join('');
}

function attachDetailActions(ticket) {
  const joinBtn = ticketDetailActions.querySelector('[data-meeting-link]');
  if (joinBtn) {
    joinBtn.addEventListener('click', function () {
      // "this" is the Join button that was clicked.
      openMeeting(this.dataset.meetingLink);
    }, { once: true });
  }

  const closeBtn = ticketDetailActions.querySelector('#closeDetailBtn');
  if (closeBtn) closeBtn.addEventListener('click', () => ticketDetailModal.close());

  const withdrawBtn = ticketDetailActions.querySelector('#withdrawBtn');
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', async () => {
      if (!confirm('Withdraw this request?')) return;
      try {
        const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(ticket.id)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Could not withdraw request.');
        helpdeskRequests = helpdeskRequests.filter(t => t.id !== ticket.id);
        ticketDetailModal.close();
        renderTickets();
        renderMeetingCard();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const acceptBtn = ticketDetailActions.querySelector('#acceptRescheduleBtn');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      const rr = ticket.rescheduleRequest;
      try {
        const changes = {
          status:   'Approved',
          date:     rr.date,
          timeFrom: rr.timeFrom,
          timeTo:   rr.timeTo,
          rescheduleRequest: null
        };
        // Add the meeting room fields (if this meeting needs one) to the same object.
        Object.assign(changes, HelpdeskMeetings.roomPatch(ticket));

        const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(ticket.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        });
        if (!res.ok) throw new Error('Could not accept reschedule.');
        const updated = await res.json();
        helpdeskRequests = helpdeskRequests.map(t => t.id === updated.id ? updated : t);
        ticketDetailModal.close();
        renderTickets();
        renderMeetingCard();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const proposeBtn = ticketDetailActions.querySelector('#proposeNewTimeBtn');
  if (proposeBtn) {
    proposeBtn.addEventListener('click', () => {
      ticketDetailModal.close();
      openRescheduleModal(ticket);
    });
  }
}

closeDetailModal.addEventListener('click', () => ticketDetailModal.close());
ticketDetailModal.addEventListener('click', e => {
  if (e.target === ticketDetailModal) ticketDetailModal.close();
});

/* ---------------------------------------------------------
   Reschedule Modal
--------------------------------------------------------- */
function openRescheduleModal(ticket) {
  currentTicket = ticket;
  const proposed = ticket.rescheduleRequest || ticket;
  rescheduleDate.value  = proposed.date || '';
  rescheduleFrom.value  = HelpdeskMeetings.normaliseTime(proposed.timeFrom || proposed.time);
  rescheduleTo.value    = HelpdeskMeetings.normaliseTime(proposed.timeTo);
  document.getElementById('rescheduleDateError').textContent  = '';
  document.getElementById('rescheduleTimeError').textContent  = '';
  rescheduleModal.showModal();
}

closeRescheduleModal.addEventListener('click', () => rescheduleModal.close());
cancelRescheduleBtn.addEventListener('click', () => rescheduleModal.close());
rescheduleModal.addEventListener('click', e => {
  if (e.target === rescheduleModal) rescheduleModal.close();
});

submitRescheduleBtn.addEventListener('click', async () => {
  let valid = true;

  document.getElementById('rescheduleDateError').textContent  = '';
  document.getElementById('rescheduleTimeError').textContent  = '';

  if (!rescheduleDate.value) {
    document.getElementById('rescheduleDateError').textContent = 'Please select a date.';
    valid = false;
  } else if (rescheduleDate.value < todayISO()) {
    document.getElementById('rescheduleDateError').textContent = 'Date cannot be in the past.';
    valid = false;
  }

  if (!rescheduleFrom.value || !rescheduleTo.value) {
    document.getElementById('rescheduleTimeError').textContent = 'Please enter both times.';
    valid = false;
  } else if (rescheduleTo.value <= rescheduleFrom.value) {
    document.getElementById('rescheduleTimeError').textContent = '"To" must be after "From".';
    valid = false;
  }

  if (!valid) return;

  const payload = {
    rescheduleRequest: {
      date:       rescheduleDate.value,
      timeFrom:   rescheduleFrom.value,
      timeTo:     rescheduleTo.value,
      proposedBy: 'Employee',
      proposedAt: new Date().toISOString()
    },
    status: 'Pending'
  };

  try {
    const res = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(currentTicket.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Could not submit reschedule proposal.');
    const updated = await res.json();
    helpdeskRequests = helpdeskRequests.map(t => t.id === updated.id ? updated : t);
    rescheduleModal.close();
    ticketDetailModal.close();
    renderTickets();
    renderMeetingCard();
  } catch (err) {
    alert(err.message);
  }
});

/* ---------------------------------------------------------
   My Requests button → scroll to right card
--------------------------------------------------------- */
myRequestsBtn.addEventListener('click', () => {
  document.getElementById('recentTicketsCard').scrollIntoView({ behavior: 'smooth' });
});

/* ---------------------------------------------------------
   View All → opens most recent ticket or no-op
--------------------------------------------------------- */
viewAllBtn.addEventListener('click', () => {
  // Show all tickets in modal using the first one as reference,
  // or simply scroll into view. For now, render a lightweight
  // all-tickets modal by re-using detail modal with a list.
  if (helpdeskRequests.length === 0) return;
  // If there are more than 6, just render all in a quick list in the detail modal
  ticketDetailBody.innerHTML = `
    <p style="font-size:16px;color:var(--color-secondary);margin:0 0 12px;">All ${helpdeskRequests.length} request(s)</p>
    ${helpdeskRequests.map(t => `
      <div class="ticket-item" data-id="${escapeHtml(t.id)}" style="cursor:pointer;">
        <div class="ticket-id">${escapeHtml(t.ticket)}</div>
        <div class="ticket-subject">${escapeHtml(t.subject)}</div>
        <div class="ticket-meta">
          <span class="type-badge ${escapeHtml(t.type)}">${escapeHtml(t.type === 'meeting' ? 'Meeting' : 'Ticket')}</span>
          <span class="status-badge ${statusBadgeClass(t.status)}">${escapeHtml(displayStatus(t.status))}</span>
        </div>
      </div>
    `).join('')}
  `;
  ticketDetailActions.innerHTML = `<button type="button" class="btn-secondary" id="closeDetailBtn">Close</button>`;
  ticketDetailActions.querySelector('#closeDetailBtn').addEventListener('click', function () {
    ticketDetailModal.close();
  });
  currentTicket = null;
  ticketDetailModal.showModal();

  // Attach item click handlers
  ticketDetailBody.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', function () {
      // "this" is the .ticket-item that was clicked.
      const id = this.dataset.id;
      const ticket = helpdeskRequests.find(t => String(t.id) === String(id));
      if (ticket) {
        ticketDetailModal.close();
        setTimeout(() => openDetailModal(ticket), 100);
      }
    });
  });
});

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
if (employeeId) loadHelpdeskData();
