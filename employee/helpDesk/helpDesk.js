// Employee helpdesk: send a support ticket or ask for a meeting with HR (the data comes from the API).
const API = "http://127.0.0.1:3000";

// ── Who is logged in? Only an employee can use this page. ───────────────────
let loggedUser = null;
try {
  loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  loggedUser = null;
}
let employeeId = null;
if (loggedUser && loggedUser.role === "EMP" && loggedUser.id !== undefined && loggedUser.id !== null) {
  employeeId = String(loggedUser.id);
}
if (!employeeId) {
  location.replace("../../common/login/login.html");
}

// ── What the page remembers ─────────────────────────────────────────────────
let helpdeskRequests = [];
let helpdeskDraft = null; // the saved draft of this employee (null when there is none)
let requestType = "ticket";
let selectedPlatform = "";
let selectedFile = "";
let currentTicket = null; // the ticket in the reschedule popup

// ── The parts of the page ───────────────────────────────────────────────────
const typeButtons = document.querySelectorAll(".type-option");
const platformButtons = document.querySelectorAll(".platform-btn");
const meetingBox = document.getElementById("meetingBox");
const meetingDateInput = document.getElementById("meetingDate");
const timeFrom = document.getElementById("timeFrom");
const timeTo = document.getElementById("timeTo");
const category = document.getElementById("category");
const subject = document.getElementById("subject");
const details = document.getElementById("details");
const uploadBox = document.getElementById("uploadBox");
const fileInput = document.getElementById("fileInput");
const fileText = document.getElementById("fileText");
const submitBtn = document.getElementById("submitBtn");
const messageEl = document.getElementById("message");
const recentTicketsList = document.getElementById("recentTicketsList");
const meetingCardContent = document.getElementById("meetingCardContent");
const meetingStatusBadge = document.getElementById("meetingStatusBadge");

// The popups
const ticketDetailModal = document.getElementById("ticketDetailModal");
const ticketDetailBody = document.getElementById("ticketDetailBody");
const ticketDetailActions = document.getElementById("ticketDetailActions");
const rescheduleModal = document.getElementById("rescheduleModal");
const rescheduleDate = document.getElementById("rescheduleDate");
const rescheduleFrom = document.getElementById("rescheduleFrom");
const rescheduleTo = document.getElementById("rescheduleTo");

// ── Small helpers ───────────────────────────────────────────────────────────

// Stops text from being read as HTML, so what people type cannot break the page.
function escapeHtml(text) {
  if (text === undefined || text === null) {
    return "";
  }
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(text) {
  if (!text) {
    return "—";
  }
  const date = new Date(text);
  return isNaN(date) ? text : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// The color of the status label.
function statusBadgeClass(status) {
  if (status === "Approved" || status === "Confirmed") {
    return "status-active";
  }
  if (status === "Rejected") {
    return "status-blocked";
  }
  if (status === "Reschedule Requested") {
    return "status-reschedule";
  }
  return "status-inactive"; // Pending
}

// "Confirmed" is shown as "Approved" and "In Review" is shown as "Pending".
function displayStatus(status) {
  if (status === "Confirmed") {
    return "Approved";
  }
  if (status === "In Review") {
    return "Pending";
  }
  return status || "Pending";
}

// Today as text: 2026-10-05
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The time now as text: 14:30
function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// A meeting of this website opens in the same tab. Another website opens in a new tab.
function openMeeting(link) {
  if (new URL(link).origin === location.origin) {
    location.assign(link);
  } else {
    window.open(link, "_blank", "noopener,noreferrer");
  }
}

// Shows a message under the form for 5 seconds. The type is "success" or "error".
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.style.color = type === "success" ? "var(--color-tertiary)" : "var(--color-danger)";
  setTimeout(function () {
    messageEl.textContent = "";
  }, 5000);
}

// Constraint validation: the date boxes do not allow days before today (the min attribute).
meetingDateInput.min = todayISO();
rescheduleDate.min = todayISO();

// ── Load the data ───────────────────────────────────────────────────────────

async function loadHelpdeskData() {
  try {
    const requestsResponse = await fetch(`${API}/helpdeskRequests?employeeId=${employeeId}`);
    const draftsResponse = await fetch(`${API}/helpdeskDrafts?employeeId=${employeeId}`);
    if (!requestsResponse.ok || !draftsResponse.ok) {
      showMessage("Could not load helpdesk data. — Make sure the API is running (npm run api).", "error");
      return;
    }

    // sort() puts the newest request first.
    helpdeskRequests = await requestsResponse.json();
    helpdeskRequests.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    // Each employee has at most one saved draft.
    const drafts = await draftsResponse.json();
    helpdeskDraft = drafts[0] || null;

    loadDraft();
    showTickets();
    showMeetingCard();
  } catch (error) {
    showMessage(`${error.message} — Make sure the API is running (npm run api).`, "error");
  }
}

// ── The form: type, platform and file ───────────────────────────────────────

// The clicked type button gets the class "selected". The meeting fields only show for a meeting.
typeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    typeButtons.forEach(function (other) {
      other.className = other === button ? "type-option selected" : "type-option";
      other.setAttribute("aria-pressed", String(other === button));
    });
    requestType = this.getAttribute("data-type"); // "this" is the button that was clicked
    meetingBox.hidden = requestType !== "meeting";
    submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:19px;">send</span> Submit Request';
  });
});

platformButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    platformButtons.forEach(function (other) {
      other.className = other === button ? "platform-btn selected-btn" : "platform-btn";
      other.setAttribute("aria-pressed", String(other === button));
    });
    selectedPlatform = this.getAttribute("data-platform");
  });
});

// Click the box to choose a file, or drop a file on it.
uploadBox.addEventListener("click", function () {
  fileInput.click();
});

fileInput.addEventListener("change", function () {
  if (this.files.length > 0) {
    selectedFile = this.files[0].name;
    fileText.textContent = selectedFile;
  }
});

uploadBox.addEventListener("dragover", function (event) {
  event.preventDefault();
  this.className = "dragging";
});

uploadBox.addEventListener("dragleave", function () {
  this.className = "";
});

uploadBox.addEventListener("drop", function (event) {
  event.preventDefault();
  this.className = "";
  if (event.dataTransfer.files.length > 0) {
    selectedFile = event.dataTransfer.files[0].name;
    fileText.textContent = selectedFile;
  }
});

// ── Check the form ──────────────────────────────────────────────────────────

function clearErrors() {
  document.querySelectorAll(".field-error").forEach(function (element) {
    element.textContent = "";
  });
  document.querySelectorAll(".error").forEach(function (element) {
    element.className = "";
  });
}

// Shows the red text under a box and gives the box the class "error".
function showFieldError(input, errorId, text) {
  document.getElementById(errorId).textContent = text;
  if (input) {
    input.className = "error";
  }
}

// Gives back true when everything in the form is fine.
function validateForm() {
  clearErrors();
  let valid = true;

  if (requestType === "meeting") {
    if (!selectedPlatform) {
      document.getElementById("platformError").textContent = "Please select a platform.";
      valid = false;
    }

    const date = meetingDateInput.value;
    if (!date) {
      showFieldError(meetingDateInput, "dateError", "Please select a meeting date.");
      valid = false;
    } else if (date < todayISO()) {
      showFieldError(meetingDateInput, "dateError", "Date cannot be in the past.");
      valid = false;
    }

    if (!timeFrom.value) {
      showFieldError(timeFrom, "timeError", "Please enter the start time.");
      valid = false;
    } else if (!timeTo.value) {
      showFieldError(timeTo, "timeError", "Please enter the end time.");
      valid = false;
    } else if (timeTo.value <= timeFrom.value) {
      showFieldError(timeTo, "timeError", '"To" must be after "From".');
      valid = false;
    } else if (date === todayISO() && timeFrom.value < nowHHMM()) {
      showFieldError(timeFrom, "timeError", "Start time must be in the future for today.");
      valid = false;
    }
  }

  if (!category.value) {
    showFieldError(category, "categoryError", "Please select a category.");
    valid = false;
  }

  if (!subject.value.trim()) {
    showFieldError(subject, "subjectError", "Subject is required.");
    valid = false;
  } else if (subject.value.trim().length < 3) {
    showFieldError(subject, "subjectError", "Subject must be at least 3 characters.");
    valid = false;
  }

  if (!details.value.trim()) {
    showFieldError(details, "detailsError", "Please describe your request.");
    valid = false;
  } else if (details.value.trim().length < 10) {
    showFieldError(details, "detailsError", "Please provide at least 10 characters.");
    valid = false;
  }

  return valid;
}

// ── Submit the request ──────────────────────────────────────────────────────

submitBtn.onclick = async function () {
  if (!validateForm()) {
    return;
  }

  const isMeeting = requestType === "meeting";
  const request = {
    employeeId: employeeId,
    ticket: "TKT-" + Math.floor(1000 + Math.random() * 9000),
    type: requestType,
    platform: isMeeting ? selectedPlatform : null,
    category: category.value,
    subject: subject.value.trim(),
    details: details.value.trim(),
    file: selectedFile,
    status: "Pending",
    date: isMeeting ? meetingDateInput.value : null,
    timeFrom: isMeeting ? timeFrom.value : null,
    timeTo: isMeeting ? timeTo.value : null,
    meetingLink: null,
    hrReply: null,
    rescheduleRequest: null,
    createdAt: new Date().toISOString()
  };

  let problem = "";
  try {
    // POST adds the request to the API.
    const response = await fetch(`${API}/helpdeskRequests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      problem = "Could not submit request.";
    } else {
      helpdeskRequests.unshift(await response.json());

      // The saved draft is not needed any more.
      if (helpdeskDraft) {
        await fetch(`${API}/helpdeskDrafts/${helpdeskDraft.id}`, { method: "DELETE" });
        helpdeskDraft = null;
      }
    }
  } catch (error) {
    problem = error.message;
  }
  if (problem) {
    showMessage(problem, "error");
    return;
  }

  showMessage("Request submitted successfully!", "success");
  clearForm();
  showTickets();
  showMeetingCard();
};

// ── Save a draft ────────────────────────────────────────────────────────────

document.getElementById("draftBtn").onclick = async function () {
  const draft = {
    employeeId: employeeId,
    type: requestType,
    platform: selectedPlatform,
    category: category.value,
    subject: subject.value,
    details: details.value,
    date: meetingDateInput.value,
    timeFrom: timeFrom.value,
    timeTo: timeTo.value,
    file: selectedFile
  };

  // PATCH changes the draft that exists. POST makes the first draft.
  let url = `${API}/helpdeskDrafts`;
  let method = "POST";
  if (helpdeskDraft) {
    url = `${API}/helpdeskDrafts/${helpdeskDraft.id}`;
    method = "PATCH";
  }

  let problem = "";
  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    if (!response.ok) {
      problem = "Could not save draft.";
    } else {
      helpdeskDraft = await response.json();
    }
  } catch (error) {
    problem = error.message;
  }

  if (problem) {
    showMessage(problem, "error");
  } else {
    showMessage("Draft saved successfully.", "success");
  }
};

// Puts the saved draft back in the form.
function loadDraft() {
  if (!helpdeskDraft) {
    return;
  }
  const draft = helpdeskDraft;

  if (draft.type) {
    requestType = draft.type;
    typeButtons.forEach(function (button) {
      const isChosen = button.getAttribute("data-type") === draft.type;
      button.className = isChosen ? "type-option selected" : "type-option";
      button.setAttribute("aria-pressed", String(isChosen));
    });
    meetingBox.hidden = draft.type !== "meeting";
  }

  if (draft.platform) {
    selectedPlatform = draft.platform;
    platformButtons.forEach(function (button) {
      const isChosen = button.getAttribute("data-platform") === draft.platform;
      button.className = isChosen ? "platform-btn selected-btn" : "platform-btn";
      button.setAttribute("aria-pressed", String(isChosen));
    });
  }

  if (draft.category) {
    category.value = draft.category;
  }
  if (draft.subject) {
    subject.value = draft.subject;
  }
  if (draft.details) {
    details.value = draft.details;
  }
  if (draft.date) {
    meetingDateInput.value = draft.date;
  }
  if (draft.timeFrom) {
    timeFrom.value = draft.timeFrom;
  }
  if (draft.timeTo) {
    timeTo.value = draft.timeTo;
  }
  if (draft.file) {
    selectedFile = draft.file;
    fileText.textContent = draft.file;
  }
}

// Empties the form after a request was sent.
function clearForm() {
  clearErrors();
  requestType = "ticket";
  typeButtons.forEach(function (button) {
    const isTicket = button.getAttribute("data-type") === "ticket";
    button.className = isTicket ? "type-option selected" : "type-option";
    button.setAttribute("aria-pressed", String(isTicket));
  });
  meetingBox.hidden = true;
  selectedPlatform = "";
  platformButtons.forEach(function (button) {
    button.className = "platform-btn";
    button.setAttribute("aria-pressed", "false");
  });
  meetingDateInput.value = "";
  timeFrom.value = "";
  timeTo.value = "";
  category.value = "";
  subject.value = "";
  details.value = "";
  selectedFile = "";
  fileInput.value = "";
  fileText.textContent = "Click to upload or drag and drop files";
}

// ── The right side: recent requests and the meeting card ────────────────────

// Builds one small card for one request. Clicking it opens the details.
function makeTicketItem(ticket) {
  const item = document.createElement("div");
  item.className = "ticket-item";
  item.innerHTML = `
      <div class="ticket-id">${escapeHtml(ticket.ticket)}</div>
      <div class="ticket-subject">${escapeHtml(ticket.subject)}</div>
      <div class="ticket-meta">
        <span class="type-badge ${escapeHtml(ticket.type)}">${escapeHtml(ticket.type === "meeting" ? "Meeting" : "Ticket")}</span>
        <span class="status-badge ${statusBadgeClass(ticket.status)}">${escapeHtml(displayStatus(ticket.status))}</span>
      </div>
  `;
  item.onclick = function () {
    openDetailModal(ticket);
  };
  return item;
}

function showTickets() {
  const shown = helpdeskRequests.slice(0, 6);
  if (shown.length === 0) {
    recentTicketsList.innerHTML = '<p class="meeting-empty">No requests yet.</p>';
    return;
  }

  recentTicketsList.innerHTML = "";
  shown.forEach(function (ticket) {
    recentTicketsList.appendChild(makeTicketItem(ticket));
  });
}

// Gives each status a number, so the meeting that matters most is shown first.
function meetingStatusRank(status) {
  const order = { Approved: 0, Confirmed: 0, "Reschedule Requested": 1, Pending: 2, "In Review": 2 };
  if (order[status] === undefined) {
    return 3;
  }
  return order[status];
}

// The "Upcoming Meeting" card shows the most important meeting (approved ones first).
function showMeetingCard() {
  const meetings = helpdeskRequests.filter(ticket => ticket.type === "meeting");
  meetings.sort((a, b) => meetingStatusRank(a.status) - meetingStatusRank(b.status));
  const meeting = meetings[0] || null;

  if (!meeting) {
    meetingStatusBadge.hidden = true;
    meetingCardContent.innerHTML = '<p class="meeting-empty">No confirmed meetings yet.</p>';
    return;
  }

  meetingStatusBadge.className = `status-badge ${statusBadgeClass(meeting.status)}`;
  meetingStatusBadge.textContent = displayStatus(meeting.status);
  meetingStatusBadge.hidden = false;

  // The Join button only shows for an approved meeting that has a link.
  const meetingLink = HelpdeskMeetings.joinLink(meeting);
  const hasJoin = meetingLink && ["Approved", "Confirmed"].includes(meeting.status);
  const joinHtml = hasJoin
    ? `<div class="meeting-btns"><button type="button" class="btn-join">
         <span class="material-symbols-outlined" style="font-size:19px;">videocam</span> Join
       </button></div>`
    : "";

  meetingCardContent.innerHTML = `
    <div class="meeting-detail">
      <div class="meeting-subject">${escapeHtml(meeting.subject)}</div>
      <div class="meeting-meta">
        <p><span class="material-symbols-outlined" style="font-size:19px;">calendar_today</span> ${escapeHtml(formatDate(meeting.date))}</p>
        <p><span class="material-symbols-outlined" style="font-size:19px;">schedule</span> ${escapeHtml(meeting.timeFrom || meeting.time || "—")}${meeting.timeTo ? ` – ${escapeHtml(meeting.timeTo)}` : ""}</p>
        <p><span class="material-symbols-outlined" style="font-size:19px;">videocam</span> ${escapeHtml(HelpdeskMeetings.platformLabel(meeting))}</p>
      </div>
      ${joinHtml}
    </div>
  `;

  if (hasJoin) {
    meetingCardContent.querySelector(".btn-join").onclick = function () {
      openMeeting(meetingLink);
    };
  }
}

// ── The details popup ───────────────────────────────────────────────────────

// One line of the details: a label and a value.
function detailLine(label, valueHtml) {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${valueHtml}</span></div>`;
}

function buildDetailBody(ticket) {
  let html = `
    ${detailLine("Ticket ID", escapeHtml(ticket.ticket))}
    ${detailLine("Type", escapeHtml(ticket.type === "meeting" ? "Meeting" : "Ticket"))}
    ${detailLine("Category", escapeHtml(ticket.category))}
    ${detailLine("Subject", escapeHtml(ticket.subject))}
    ${detailLine("Details", escapeHtml(ticket.details))}
    ${detailLine("Status", `<span class="status-badge ${statusBadgeClass(ticket.status)}">${escapeHtml(displayStatus(ticket.status))}</span>`)}
    ${detailLine("Date Submitted", escapeHtml(formatDate(ticket.createdAt)))}
  `;

  if (ticket.type === "meeting") {
    html += `
      ${detailLine("Platform", escapeHtml(HelpdeskMeetings.platformLabel(ticket)))}
      ${detailLine("Meeting Date", escapeHtml(formatDate(ticket.date)))}
      ${detailLine("Time Range", `${escapeHtml(ticket.timeFrom || ticket.time || "—")}${ticket.timeTo ? ` – ${escapeHtml(ticket.timeTo)}` : ""}`)}
    `;
  }

  if (ticket.hrReply) {
    html += `
      <div class="hr-reply-box">
        <strong style="font-size:15px;color:var(--color-primary);">HR Reply</strong>
        <p>${escapeHtml(ticket.hrReply)}</p>
      </div>
    `;
  }

  if (ticket.status === "Reschedule Requested" && ticket.rescheduleRequest) {
    const proposal = ticket.rescheduleRequest;
    html += `
      <div class="reschedule-box">
        <h4>Reschedule Proposed by ${proposal.proposedBy === "HR" ? "HR" : "You"}</h4>
        <p><strong>New Date:</strong> ${escapeHtml(formatDate(proposal.date))}</p>
        <p><strong>Time:</strong> ${escapeHtml(proposal.timeFrom || "—")} – ${escapeHtml(proposal.timeTo || "—")}</p>
      </div>
    `;
  }
  return html;
}

// Adds one button to the bottom of the details popup.
function addDetailButton(className, id, html, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (id) {
    button.id = id;
  }
  button.innerHTML = html;
  button.onclick = onClick;
  ticketDetailActions.appendChild(button);
}

// Which buttons the popup has depends on the status of the request.
function addDetailButtons(ticket) {
  ticketDetailActions.innerHTML = "";

  // Join: an approved meeting with a link
  const meetingLink = HelpdeskMeetings.joinLink(ticket);
  if (ticket.type === "meeting" && meetingLink && ["Approved", "Confirmed"].includes(ticket.status)) {
    addDetailButton("btn-join", "", `<span class="material-symbols-outlined" style="font-size:19px;">videocam</span> Join`, function () {
      openMeeting(meetingLink);
    });
  }

  // Accept: HR proposed a new time. The employee accepts it or proposes another time.
  if (ticket.status === "Reschedule Requested" && ticket.rescheduleRequest && ticket.rescheduleRequest.proposedBy === "HR") {
    addDetailButton("btn-success", "acceptRescheduleBtn", "Accept", function () {
      acceptReschedule(ticket);
    });
    addDetailButton("btn-secondary", "proposeNewTimeBtn", "Propose New Time", function () {
      ticketDetailModal.close();
      openRescheduleModal(ticket);
    });
  }

  // Withdraw: only a request that is still pending
  if (ticket.status === "Pending" || ticket.status === "In Review") {
    addDetailButton("btn-danger", "withdrawBtn", "Withdraw", function () {
      withdrawTicket(ticket);
    });
  }

  addDetailButton("btn-secondary", "closeDetailBtn", "Close", function () {
    ticketDetailModal.close();
  });
}

function openDetailModal(ticket) {
  ticketDetailBody.innerHTML = buildDetailBody(ticket);
  addDetailButtons(ticket);
  ticketDetailModal.showModal();
}

// DELETE removes the request from the API.
async function withdrawTicket(ticket) {
  if (!confirm("Withdraw this request?")) {
    return;
  }
  try {
    const response = await fetch(`${API}/helpdeskRequests/${ticket.id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Could not withdraw request.");
      return;
    }
    helpdeskRequests = helpdeskRequests.filter(item => item.id !== ticket.id);
    ticketDetailModal.close();
    showTickets();
    showMeetingCard();
  } catch (error) {
    alert(error.message);
  }
}

// The employee accepts the new time that HR proposed.
async function acceptReschedule(ticket) {
  const proposal = ticket.rescheduleRequest;
  const changes = {
    status: "Approved",
    date: proposal.date,
    timeFrom: proposal.timeFrom,
    timeTo: proposal.timeTo,
    rescheduleRequest: null
  };
  // A Zoom meeting also needs its room. roomPatch() gives the room of the meeting.
  const room = HelpdeskMeetings.roomPatch(ticket);
  if (room.meetingRoom) {
    changes.meetingProvider = room.meetingProvider;
    changes.meetingRoom = room.meetingRoom;
    changes.meetingLink = room.meetingLink;
  }

  try {
    const response = await fetch(`${API}/helpdeskRequests/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });
    if (!response.ok) {
      alert("Could not accept reschedule.");
      return;
    }
    const updated = await response.json();
    helpdeskRequests = helpdeskRequests.map(item => (item.id === updated.id ? updated : item));
    ticketDetailModal.close();
    showTickets();
    showMeetingCard();
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById("closeDetailModal").onclick = function () {
  ticketDetailModal.close();
};

// A click on the dark area around a popup closes it.
ticketDetailModal.addEventListener("click", function (event) {
  if (event.target === ticketDetailModal) {
    ticketDetailModal.close();
  }
});

// ── The reschedule popup (the employee proposes a new time) ─────────────────

function openRescheduleModal(ticket) {
  currentTicket = ticket;
  const proposed = ticket.rescheduleRequest || ticket;
  rescheduleDate.value = proposed.date || "";
  rescheduleFrom.value = HelpdeskMeetings.normaliseTime(proposed.timeFrom || proposed.time);
  rescheduleTo.value = HelpdeskMeetings.normaliseTime(proposed.timeTo);
  document.getElementById("rescheduleDateError").textContent = "";
  document.getElementById("rescheduleTimeError").textContent = "";
  rescheduleModal.showModal();
}

document.getElementById("closeRescheduleModal").onclick = function () {
  rescheduleModal.close();
};
document.getElementById("cancelRescheduleBtn").onclick = function () {
  rescheduleModal.close();
};
rescheduleModal.addEventListener("click", function (event) {
  if (event.target === rescheduleModal) {
    rescheduleModal.close();
  }
});

document.getElementById("submitRescheduleBtn").onclick = async function () {
  const dateError = document.getElementById("rescheduleDateError");
  const timeError = document.getElementById("rescheduleTimeError");
  dateError.textContent = "";
  timeError.textContent = "";

  let valid = true;
  if (!rescheduleDate.value) {
    dateError.textContent = "Please select a date.";
    valid = false;
  } else if (rescheduleDate.value < todayISO()) {
    dateError.textContent = "Date cannot be in the past.";
    valid = false;
  }
  if (!rescheduleFrom.value || !rescheduleTo.value) {
    timeError.textContent = "Please enter both times.";
    valid = false;
  } else if (rescheduleTo.value <= rescheduleFrom.value) {
    timeError.textContent = '"To" must be after "From".';
    valid = false;
  }
  if (!valid) {
    return;
  }

  const payload = {
    rescheduleRequest: {
      date: rescheduleDate.value,
      timeFrom: rescheduleFrom.value,
      timeTo: rescheduleTo.value,
      proposedBy: "Employee",
      proposedAt: new Date().toISOString()
    },
    status: "Pending"
  };

  try {
    const response = await fetch(`${API}/helpdeskRequests/${currentTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      alert("Could not submit reschedule proposal.");
      return;
    }
    const updated = await response.json();
    helpdeskRequests = helpdeskRequests.map(item => (item.id === updated.id ? updated : item));
    rescheduleModal.close();
    ticketDetailModal.close();
    showTickets();
    showMeetingCard();
  } catch (error) {
    alert(error.message);
  }
};

// ── The two buttons at the top and on the right ─────────────────────────────

// "My Requests" scrolls down to the list of requests.
document.getElementById("myRequestsBtn").onclick = function () {
  document.getElementById("recentTicketsCard").scrollIntoView({ behavior: "smooth" });
};

// "View All" shows every request in the details popup.
document.getElementById("viewAllBtn").onclick = function () {
  if (helpdeskRequests.length === 0) {
    return;
  }

  ticketDetailBody.innerHTML = `<p style="font-size:16px;color:var(--color-secondary);margin:0 0 12px;">All ${helpdeskRequests.length} request(s)</p>`;
  helpdeskRequests.forEach(function (ticket) {
    const item = makeTicketItem(ticket);
    item.style.cursor = "pointer";
    // Clicking a request closes the list and opens that request.
    item.onclick = function () {
      ticketDetailModal.close();
      setTimeout(function () {
        openDetailModal(ticket);
      }, 100);
    };
    ticketDetailBody.appendChild(item);
  });

  ticketDetailActions.innerHTML = "";
  addDetailButton("btn-secondary", "closeDetailBtn", "Close", function () {
    ticketDetailModal.close();
  });
  ticketDetailModal.showModal();
};

if (employeeId) {
  loadHelpdeskData();
}
