// HR helpdesk: look at the support tickets and meeting requests, approve, reject or reschedule them (the data comes from the API).
const API = "http://127.0.0.1:3000";

// Only HR can use this page.
let session = null;
try {
  session = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  session = null;
}
const hasHrAccess = session !== null && session.role === "HR";
if (!hasHrAccess) {
  location.replace("../../common/login/login.html");
}

let allTickets = [];
let allEmployees = [];
let page = 1;
const pageSize = 15;
let actionTicketId = null; // the id of the ticket we are working on in a popup

const ticketsBody = document.getElementById("ticketsBody");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterType = document.getElementById("filterType");

// The popups
const viewDialog = document.getElementById("viewDialog");
const approveDialog = document.getElementById("approveDialog");
const rejectDialog = document.getElementById("rejectDialog");
const rescheduleDialog = document.getElementById("rescheduleDialog");

// ── Helpers ──────────────────────────────────────────────────────────────────

// Stops text from being read as HTML, so what people type cannot break the page.
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(text) {
  if (!text) {
    return "—";
  }
  const date = new Date(text);
  if (isNaN(date.getTime())) {
    return text;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// "14:30" becomes "2:30 PM".
function formatTime(text) {
  if (!text) {
    return "—";
  }
  const time = HelpdeskMeetings.normaliseTime(text);
  if (!time) {
    return text;
  }
  const parts = time.split(":");
  const hour = parseInt(parts[0], 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${parts[1]} ${ampm}`;
}

// Today as text: 2026-10-05
function todayIso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The name of the employee with this id, or "" when there is no such employee.
function employeeName(employeeId) {
  const employee = allEmployees.find(person => String(person.id) === String(employeeId));
  if (employee && employee.name) {
    return employee.name;
  }
  return "";
}

// "Confirmed" is shown as "Approved" and "In Review" is shown as "Pending".
function displayStatus(status) {
  if (status === "Confirmed") {
    return "Approved";
  }
  if (status === "In Review") {
    return "Pending";
  }
  return status;
}

// Puts the updated ticket from the API in the list, in place of the old one.
function replaceTicket(updatedTicket) {
  allTickets = allTickets.map(ticket => (ticket.id === actionTicketId ? updatedTicket : ticket));
}

// The colored label of a status.
function getStatusBadge(status) {
  const classes = {
    "Approved": "status-active",
    "Confirmed": "status-active",
    "Rejected": "status-blocked",
    "Pending": "status-pending",
    "In Review": "status-pending",
    "Reschedule Requested": "status-reschedule"
  };
  const cls = classes[status] || "status-inactive";
  return `<span class="status ${cls}">${escapeHtml(displayStatus(status))}</span>`;
}

// ── Load the data ────────────────────────────────────────────────────────────

function showTableMessage(text) {
  ticketsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--color-secondary)">${escapeHtml(text)}</td></tr>`;
}

async function loadData() {
  try {
    const ticketsResponse = await fetch(`${API}/helpdeskRequests`);
    const employeesResponse = await fetch(`${API}/employees`);
    if (!ticketsResponse.ok || !employeesResponse.ok) {
      showTableMessage("Could not load data.");
      return;
    }
    allTickets = await ticketsResponse.json();
    allEmployees = await employeesResponse.json();

    // sort() puts the newest ticket first.
    allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    showTickets();
    showStats();
  } catch (error) {
    showTableMessage(error.message);
  }
}

// ── Filter, numbers and table ────────────────────────────────────────────────

function filteredTickets() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const type = filterType.value;

  // filter() keeps the tickets that match the search, the status and the type.
  return allTickets.filter(function (ticket) {
    const name = employeeName(ticket.employeeId).toLowerCase();
    const subject = (ticket.subject || "").toLowerCase();
    const ticketNumber = (ticket.ticket || "").toLowerCase();
    const matchQuery = !query || name.includes(query) || subject.includes(query) || ticketNumber.includes(query);
    const matchStatus = !status || displayStatus(ticket.status) === status;
    const matchType = !type || ticket.type === type;
    return matchQuery && matchStatus && matchType;
  });
}

// The four numbers on top.
function showStats() {
  document.getElementById("statTotal").textContent = allTickets.length;
  document.getElementById("statPending").textContent = allTickets.filter(t => ["Pending", "In Review"].includes(t.status)).length;
  document.getElementById("statMeetings").textContent = allTickets.filter(t => t.type === "meeting").length;
  document.getElementById("statApproved").textContent = allTickets.filter(t => ["Approved", "Confirmed"].includes(t.status)).length;
}

// Adds one round button to the actions of a row. The click does not open the row.
function addActionButton(actions, action, label, icon, title, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-action", action);
  button.setAttribute("aria-label", label);
  if (title) {
    button.title = title;
  }
  button.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;
  button.onclick = function (event) {
    event.stopPropagation();
    onClick();
  };
  actions.appendChild(button);
}

// Builds one table row (a <tr>) for one ticket.
function makeRow(ticket) {
  const name = escapeHtml(employeeName(ticket.employeeId) || `Employee #${ticket.employeeId}`);
  let typeBadge = `<span class="status" style="background:var(--color-surface);color:var(--color-secondary);border:1px solid var(--color-border)">Text Ticket</span>`;
  if (ticket.type === "meeting") {
    typeBadge = `<span class="status" style="background:var(--color-primary-light);color:var(--color-primary-dark)">Meeting</span>`;
  }

  const row = document.createElement("tr");
  row.innerHTML = `
        <td><code style="font-size:15px;color:var(--color-secondary)">${escapeHtml(ticket.ticket || ticket.id)}</code></td>
        <td>${name}</td>
        <td>${typeBadge}</td>
        <td>${escapeHtml(ticket.category || "—")}</td>
        <td>${formatDate(ticket.createdAt)}</td>
        <td>${getStatusBadge(ticket.status)}</td>
        <td><div class="actions"></div></td>
  `;

  // The buttons. Which ones show depends on the status of the ticket.
  const actions = row.querySelector(".actions");
  addActionButton(actions, "view", "View ticket", "visibility", "", function () {
    openViewDialog(ticket);
  });

  if (HelpdeskMeetings.canApprove(ticket)) {
    const setupMeeting = ["Approved", "Confirmed"].includes(ticket.status);
    addActionButton(
      actions,
      "approve",
      setupMeeting ? "Set up meeting" : "Approve",
      setupMeeting ? "videocam" : "check_circle",
      setupMeeting ? "Set up the approved Jitsi demo meeting" : "Approve request",
      function () {
        openApproveDialog(ticket);
      }
    );
  }

  const proposedByHr = ticket.rescheduleRequest && ticket.rescheduleRequest.proposedBy === "HR";
  const isWaiting = ["Pending", "In Review"].includes(ticket.status);
  if (isWaiting || (ticket.status === "Reschedule Requested" && !proposedByHr)) {
    addActionButton(actions, "reject", "Reject", "cancel", "", function () {
      openRejectDialog(ticket);
    });
  }

  if (HelpdeskMeetings.canReschedule(ticket)) {
    addActionButton(actions, "reschedule", "Reschedule", "event_repeat", "Propose a new meeting time", function () {
      openRescheduleDialog(ticket);
    });
  }

  // Clicking the row opens the details.
  row.onclick = function () {
    openViewDialog(ticket);
  };
  return row;
}

function showTickets() {
  const result = filteredTickets();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);

  ticketsBody.innerHTML = "";
  if (visible.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--color-secondary)">No tickets match your search.</td></tr>`;
  } else {
    visible.forEach(function (ticket) {
      ticketsBody.appendChild(makeRow(ticket));
    });
  }

  let countText = "0 tickets";
  if (result.length) {
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, result.length);
    countText = `Showing ${first}–${last} of ${result.length} tickets`;
  }
  document.getElementById("resultCount").textContent = countText;
  document.getElementById("pageLabel").textContent = `${page} / ${pages}`;
  document.getElementById("prevPage").disabled = page <= 1;
  document.getElementById("nextPage").disabled = page >= pages;
}

// ── View popup ───────────────────────────────────────────────────────────────

// One line of the details: a label and a value.
function detailRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${value}</span></div>`;
}

function openViewDialog(ticket) {
  document.getElementById("viewTitle").textContent = ticket.ticket || `#${ticket.id}`;

  let html = "";
  html += detailRow("Employee", escapeHtml(employeeName(ticket.employeeId) || `Employee #${ticket.employeeId}`));
  html += detailRow("Type", ticket.type === "meeting" ? "Meeting Request" : "Text Ticket");
  html += detailRow("Category", escapeHtml(ticket.category || "—"));
  html += detailRow("Subject", escapeHtml(ticket.subject || "—"));
  html += detailRow("Details", escapeHtml(ticket.details || ticket.message || "—"));
  html += detailRow("Date Submitted", formatDate(ticket.createdAt));
  html += detailRow("Status", getStatusBadge(ticket.status));

  if (ticket.type === "meeting") {
    const startTime = ticket.timeFrom || ticket.time;
    const endTime = ticket.timeTo || ticket.time;
    let timeText = "—";
    if (startTime) {
      timeText = formatTime(startTime);
      if (endTime && endTime !== startTime) {
        timeText += ` – ${formatTime(endTime)}`;
      }
    }
    html += detailRow("Meeting Date", formatDate(ticket.date));
    html += detailRow("Time", timeText);
    html += detailRow("Platform", escapeHtml(HelpdeskMeetings.platformLabel(ticket)));
  }

  // The meeting link shows for approved meetings. A link to another website opens in a new tab.
  const meetingLink = HelpdeskMeetings.joinLink(ticket);
  if (meetingLink && ["Approved", "Confirmed"].includes(ticket.status)) {
    const external = new URL(meetingLink).origin !== location.origin;
    const newTab = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    html += detailRow("Meeting Link", `<a href="${escapeHtml(meetingLink)}"${newTab}>Open meeting ↗</a>`);
  }

  if (ticket.hrReply) {
    html += `<div class="detail-row detail-reply"><span class="detail-label">HR Reply</span><span class="detail-value">${escapeHtml(ticket.hrReply)}</span></div>`;
  }

  if (ticket.rescheduleRequest) {
    const proposal = ticket.rescheduleRequest;
    const label = proposal.proposedBy === "HR" ? "HR Proposed Time" : "Employee Proposed Time";
    html += `<div class="detail-row detail-reschedule"><span class="detail-label">${label}</span><span class="detail-value">${formatDate(proposal.date)} · ${formatTime(proposal.timeFrom)} – ${formatTime(proposal.timeTo)}</span></div>`;
  }

  document.getElementById("viewBody").innerHTML = html;
  viewDialog.showModal();
}

// ── Approve popup ────────────────────────────────────────────────────────────

function openApproveDialog(ticket) {
  actionTicketId = ticket.id;
  const setupMeeting = ["Approved", "Confirmed"].includes(ticket.status);
  document.getElementById("approveTitle").textContent = setupMeeting ? "Set up meeting" : "Approve Ticket";
  document.getElementById("confirmApproveBtn").textContent = setupMeeting ? "Save meeting" : "Approve";
  const meetingPlatform = HelpdeskMeetings.platformLabel(ticket);
  const isGoogleMeet = ticket.type === "meeting" && meetingPlatform === "Google Meet";

  let description = "Approve this support ticket. The employee will be notified.";
  if (HelpdeskMeetings.isZoomDemo(ticket)) {
    description = "Approval saves a unique Jitsi demo room. You and the employee can open the same room from the meeting link.";
  } else if (ticket.type === "meeting") {
    const platformText = meetingPlatform ? ` (${meetingPlatform})` : "";
    description = `Approve this meeting request${platformText}. The employee will be notified.`;
  }
  document.getElementById("approveDesc").textContent = description;

  // Only a Google Meet request needs the link.
  document.getElementById("meetingLinkField").hidden = !isGoogleMeet;
  document.getElementById("meetingLinkInput").value = isGoogleMeet ? (ticket.meetingLink || "") : "";
  document.getElementById("meetingLinkError").textContent = "";
  document.getElementById("approveError").textContent = "";
  document.getElementById("hrReplyInput").value = ticket.hrReply || "";

  approveDialog.showModal();
}

// "this" is the Approve button inside the approve popup.
document.getElementById("confirmApproveBtn").onclick = async function () {
  const meetingLinkError = document.getElementById("meetingLinkError");
  const approveError = document.getElementById("approveError");
  const hrReply = document.getElementById("hrReplyInput").value.trim() || null;
  let meetingLink = null;

  if (!document.getElementById("meetingLinkField").hidden) {
    meetingLink = document.getElementById("meetingLinkInput").value.trim();
    if (!meetingLink) {
      meetingLinkError.textContent = "A Google Meet link is required to approve this meeting.";
      return;
    }
    meetingLinkError.textContent = "";
  }

  this.disabled = true;
  try {
    // Read the ticket again first, so a retry keeps the room that was saved before.
    const currentResponse = await fetch(`${API}/helpdeskRequests/${actionTicketId}`);
    if (!currentResponse.ok) {
      approveError.textContent = "This ticket could not be found. Refresh the page.";
    } else {
      const current = await currentResponse.json();
      // approvalPatch() works out what to save. It gives an error when the ticket cannot be approved any more.
      const patch = HelpdeskMeetings.approvalPatch(current, hrReply, meetingLink);

      const response = await fetch(`${API}/helpdeskRequests/${actionTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) {
        approveError.textContent = "Could not approve ticket.";
      } else {
        replaceTicket(await response.json());
        approveDialog.close();
        showTickets();
        showStats();
      }
    }
  } catch (error) {
    approveError.textContent = error.message;
  }
  this.disabled = false;
};

// ── Reject popup ─────────────────────────────────────────────────────────────

function openRejectDialog(ticket) {
  actionTicketId = ticket.id;
  document.getElementById("rejectReason").value = "";
  document.getElementById("rejectError").textContent = "";
  rejectDialog.showModal();
}

// "this" is the Reject button inside the reject popup.
document.getElementById("confirmRejectBtn").onclick = async function () {
  const reason = document.getElementById("rejectReason").value.trim();
  const rejectError = document.getElementById("rejectError");
  if (!reason) {
    rejectError.textContent = "Please provide a reason for rejection.";
    return;
  }
  rejectError.textContent = "";

  this.disabled = true;
  try {
    const response = await fetch(`${API}/helpdeskRequests/${actionTicketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Rejected", hrReply: reason })
    });
    if (!response.ok) {
      rejectError.textContent = "Could not reject ticket.";
    } else {
      replaceTicket(await response.json());
      rejectDialog.close();
      showTickets();
      showStats();
    }
  } catch (error) {
    rejectError.textContent = error.message;
  }
  this.disabled = false;
};

// ── Reschedule popup ─────────────────────────────────────────────────────────

function openRescheduleDialog(ticket) {
  actionTicketId = ticket.id;
  const proposed = ticket.rescheduleRequest || ticket;
  document.getElementById("rsDate").value = proposed.date || "";
  document.getElementById("rsDate").min = todayIso(); // the date cannot be in the past
  document.getElementById("rsTimeFrom").value = HelpdeskMeetings.normaliseTime(proposed.timeFrom || proposed.time);
  document.getElementById("rsTimeTo").value = HelpdeskMeetings.normaliseTime(proposed.timeTo);
  document.getElementById("rsDateError").textContent = "";
  document.getElementById("rsTimeError").textContent = "";
  rescheduleDialog.showModal();
}

// "this" is the Propose Reschedule button inside the reschedule popup.
document.getElementById("confirmRescheduleBtn").onclick = async function () {
  const rsDate = document.getElementById("rsDate").value;
  const rsTimeFrom = document.getElementById("rsTimeFrom").value;
  const rsTimeTo = document.getElementById("rsTimeTo").value;
  const rsDateError = document.getElementById("rsDateError");
  const rsTimeError = document.getElementById("rsTimeError");
  rsDateError.textContent = "";
  rsTimeError.textContent = "";

  // Check the date and the two times.
  let valid = true;
  if (!rsDate || rsDate < todayIso()) {
    rsDateError.textContent = "Please select a valid date (today or later).";
    valid = false;
  }
  if (!rsTimeFrom) {
    rsTimeError.textContent = "Please set a start time.";
    valid = false;
  } else if (!rsTimeTo) {
    rsTimeError.textContent = "Please set an end time.";
    valid = false;
  } else if (rsTimeTo <= rsTimeFrom) {
    rsTimeError.textContent = "End time must be after start time.";
    valid = false;
  }
  if (!valid) {
    return;
  }

  this.disabled = true;
  try {
    const response = await fetch(`${API}/helpdeskRequests/${actionTicketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Reschedule Requested",
        rescheduleRequest: {
          date: rsDate,
          timeFrom: rsTimeFrom,
          timeTo: rsTimeTo,
          proposedBy: "HR",
          proposedAt: new Date().toISOString()
        }
      })
    });
    if (!response.ok) {
      rsDateError.textContent = "Could not propose reschedule.";
    } else {
      replaceTicket(await response.json());
      rescheduleDialog.close();
      showTickets();
      showStats();
    }
  } catch (error) {
    rsDateError.textContent = error.message;
  }
  this.disabled = false;
};

// ── Filters and page buttons ─────────────────────────────────────────────────

function showFirstPage() {
  page = 1;
  showTickets();
}
searchInput.addEventListener("input", showFirstPage);
filterStatus.addEventListener("change", showFirstPage);
filterType.addEventListener("change", showFirstPage);

document.getElementById("prevPage").onclick = function () {
  page = page - 1;
  showTickets();
};
document.getElementById("nextPage").onclick = function () {
  page = page + 1;
  showTickets();
};

if (hasHrAccess) {
  loadData();
}
