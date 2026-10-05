// Leave & Time Off (employee): balances, upcoming requests, history, and a form to ask for leave (the data comes from the API).
const API = "http://127.0.0.1:3000";

let balance = null; // the leave balance of this employee
let leaveRequests = []; // the leave requests of this employee
let searchText = ""; // what the person typed in the search box

// ── Who is logged in? ───────────────────────────────────────────────────────
let loggedUser = null;
try {
  loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  loggedUser = null;
}
const currentEmployeeId = loggedUser ? String(loggedUser.id || loggedUser.employeeId) : null;

// ── Load the data ───────────────────────────────────────────────────────────

// Reads the employee, the balance and the requests from the API. When all is loaded, it calls the callback.
async function loadData(callback) {
  if (!loggedUser || loggedUser.role !== "EMP") {
    alert("Please sign in with an employee account to view leave information.");
    location.href = "../../common/login/login.html";
    return;
  }

  try {
    const urls = [
      `${API}/employees/${currentEmployeeId}`,
      `${API}/leaveBalances?employeeId=${currentEmployeeId}`,
      `${API}/leaveRequests?employeeId=${currentEmployeeId}`
    ];
    const responses = [];
    for (const url of urls) {
      responses.push(await fetch(url));
    }

    // The first answer that is not ok is the problem.
    for (let i = 0; i < responses.length; i++) {
      if (responses[i].ok) {
        continue;
      }
      if (responses[i].status === 404 && i === 0) {
        alert("Your account no longer exists in the database. You will be logged out.");
        localStorage.removeItem("loggedUser");
        location.href = "../../common/login/login.html";
      } else {
        alert(`Error: HTTP ${responses[i].status} on ${urls[i]}`);
      }
      return;
    }

    const balances = await responses[1].json();
    balance = balances[0] || null;
    leaveRequests = await responses[2].json();
    callback();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// ── Small helpers ───────────────────────────────────────────────────────────

// Stops text from being read as HTML before it goes inside a backtick template.
function escapeHtml(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function padZero(number) {
  return number < 10 ? "0" + number : "" + number;
}

// Today as text: 2026-10-05
function getTodayString() {
  const today = new Date();
  return `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-03-31" becomes "Mar 31, 2026".
function formatDate(dateText) {
  const parts = String(dateText).split("-");
  return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
}

// "2026-03-31" becomes "Mar 31".
function formatShortDate(dateText) {
  const parts = String(dateText).split("-");
  return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

// Gives back true when the text is a real date like 2026-03-31.
function isValidDateString(dateText) {
  if (typeof dateText !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return false;
  }
  const date = new Date(dateText + "T00:00:00Z");
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateText;
}

// "Mar 30 — Apr 2, 2026", or one date when the leave is only one day.
function formatRange(startText, endText) {
  if (!startText) {
    return "";
  }
  if (!endText || startText === endText) {
    return formatDate(startText);
  }
  return `${formatShortDate(startText)} — ${formatShortDate(endText)}, ${String(endText).split("-")[0]}`;
}

// The number of days from the first day to the last day (both count).
function daysBetween(startText, endText) {
  const difference = Math.abs(new Date(endText) - new Date(startText));
  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

// The hours between two times: "09:00" and "11:30" give 2.5.
function timeDiffHours(fromTime, toTime) {
  const fromParts = String(fromTime).split(":");
  const toParts = String(toTime).split(":");
  const fromMinutes = parseInt(fromParts[0], 10) * 60 + parseInt(fromParts[1], 10);
  const toMinutes = parseInt(toParts[0], 10) * 60 + parseInt(toParts[1], 10);
  return (toMinutes - fromMinutes) / 60;
}

// A request stays current until its last day is over. Then it moves to the history.
function isRequestEnded(request) {
  const endDate = request.endDate || request.startDate;
  if (!endDate) {
    return false;
  }

  const today = getTodayString();
  if (endDate < today) {
    return true;
  }
  if (endDate > today) {
    return false;
  }

  // An early departure that ends today is over at its end time, not at midnight.
  if (request.type === "Early Departure" && request.toTime) {
    const now = new Date();
    const currentTime = padZero(now.getHours()) + ":" + padZero(now.getMinutes());
    return currentTime >= request.toTime;
  }
  return false;
}

// The icon of every leave type.
function getTypeIcon(type) {
  const icons = {
    "Annual PTO": "event_available",
    "Sick Leave": "medical_services",
    "Floating Holiday": "celebration",
    "Unpaid": "event_busy",
    "Early Departure": "schedule"
  };
  return icons[type] || "event";
}

// ── Check the form ──────────────────────────────────────────────────────────

// Two boxes already have a class of their own. A box with an error gets "input-error" too.
const baseClasses = { leaveType: "form-select", reason: "form-textarea" };

function showFieldError(fieldId, message) {
  const base = baseClasses[fieldId] || "";
  document.getElementById(fieldId).className = (base + " input-error").trim();

  const errorBox = document.getElementById(fieldId + "Error");
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

function clearFieldError(fieldId) {
  document.getElementById(fieldId).className = baseClasses[fieldId] || "";

  const errorBox = document.getElementById(fieldId + "Error");
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

function clearAllErrors() {
  ["leaveType", "startDate", "endDate", "reason", "departureDate", "fromTime", "toTime"].forEach(clearFieldError);
}

// ── The four balance cards ──────────────────────────────────────────────────

// Fills one card: the days left, the total, the bar and the small text below.
function showBalanceCard(prefix, entry, footerText) {
  const left = entry.total - entry.used;
  document.getElementById(prefix + "Used").textContent = left;
  document.getElementById(prefix + "Total").textContent = entry.total;
  document.getElementById(prefix + "Fill").style.width = (entry.total > 0 ? (left / entry.total) * 100 : 0) + "%";
  document.getElementById(prefix + "Footer").textContent = footerText;
}

function showBalances() {
  if (!balance) {
    return;
  }
  // A missing kind of leave counts as 0 days.
  if (!balance.annualPto) {
    balance.annualPto = { total: 0, used: 0 };
  }
  if (!balance.sickLeave) {
    balance.sickLeave = { total: 0, used: 0 };
  }
  if (!balance.floatingHoliday) {
    balance.floatingHoliday = { total: 0, used: 0 };
  }
  if (!balance.unpaid) {
    balance.unpaid = { total: 0, used: 0 };
  }

  const expiresOn = balance.floatingHoliday.expiresOn;
  showBalanceCard("annualPto", balance.annualPto, `${balance.annualPto.used} days used / ${balance.annualPto.total} total`);
  showBalanceCard("sick", balance.sickLeave, `${balance.sickLeave.used} days used this fiscal year`);
  showBalanceCard("floating", balance.floatingHoliday, isValidDateString(expiresOn) ? `Expires ${formatDate(expiresOn)}` : "Expiration date unavailable");
  showBalanceCard("unpaid", balance.unpaid, "Discretionary / unpaid days");
}

// ── Upcoming requests (cards) ───────────────────────────────────────────────

// A request is upcoming when it is not over yet and it is pending or approved.
function isUpcoming(request) {
  return !isRequestEnded(request) && (request.status === "Pending" || request.status === "Approved");
}

// One small line of the card: a label and a value.
function metaItem(label, value) {
  return `<div class="upcoming-meta-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

// Builds the card of one upcoming request.
function makeUpcomingCard(request) {
  const isEarly = request.type === "Early Departure";
  const isPending = request.status === "Pending";
  const statusClass = isPending ? "pending" : "approved";

  const days = isEarly ? `${request.fromTime} - ${request.toTime}` : request.days;
  const pill = isEarly
    ? `<span class="material-symbols-outlined">schedule</span>${escapeHtml(formatDate(request.startDate))}`
    : `<span class="material-symbols-outlined">calendar_today</span>${escapeHtml(formatRange(request.startDate, request.endDate))}`;

  let meta = metaItem("Type", request.type);
  if (isPending) {
    meta += metaItem("Reviewer", request.reviewer || "—");
    meta += metaItem("Submitted", formatDate(request.submittedAt));
  } else {
    meta += metaItem("Approved By", request.approvedBy || request.reviewer || "—");
    if (request.handoverPartner) {
      meta += metaItem("Handover Partner", request.handoverPartner);
    }
  }

  const card = document.createElement("div");
  card.className = `upcoming-card ${statusClass}`;
  card.innerHTML = `
    <div class="upcoming-card-header">
      <div class="upcoming-card-title"><span class="status-dot ${statusClass}"></span>${isPending ? "Pending Manager Review" : "Approved"}</div>
      <div class="upcoming-days"><strong>${escapeHtml(days)}</strong>${isEarly ? "Hours" : "Working days"}</div>
    </div>
    <div class="date-pill">${pill}</div>
    <div class="upcoming-meta">${meta}</div>
  `;

  // Only a pending request can be withdrawn.
  if (isPending) {
    const button = document.createElement("button");
    button.className = "btn-withdraw";
    button.textContent = "Withdraw Request";
    button.onclick = function () {
      withdrawRequest(request);
    };
    card.appendChild(button);
  }
  return card;
}

function showUpcomingCards() {
  const container = document.getElementById("upcomingCards");
  container.innerHTML = "";

  // filter() keeps the upcoming requests.
  const upcoming = leaveRequests.filter(isUpcoming);
  if (upcoming.length === 0) {
    container.innerHTML = '<p class="empty-message">No upcoming time off scheduled.</p>';
    document.getElementById("upcomingMeta").textContent = "0 Scheduled Periods";
    return;
  }

  document.getElementById("upcomingMeta").textContent = `${upcoming.length} Scheduled Period${upcoming.length > 1 ? "s" : ""}`;
  upcoming.forEach(function (request) {
    container.appendChild(makeUpcomingCard(request));
  });
}

// ── The history table ───────────────────────────────────────────────────────

// Builds one row of the history table.
function makeHistoryRow(request) {
  const isEarly = request.type === "Early Departure";

  let range = formatRange(request.startDate, request.endDate);
  let duration = `${request.days} day${request.days > 1 ? "s" : ""}`;
  if (isEarly) {
    range = `${formatDate(request.startDate)} (${request.fromTime} - ${request.toTime})`;
    const hours = timeDiffHours(request.fromTime, request.toTime);
    duration = `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  // A rejected request shows the reason when the mouse is over its status.
  const tip = request.status === "Rejected" && request.rejectionReason ? ` title="Reason: ${escapeHtml(request.rejectionReason)}"` : "";
  const icon = request.status === "Approved" ? "check_circle" : "cancel";

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><div class="leave-type-cell"><span class="material-symbols-outlined">${getTypeIcon(request.type)}</span>${escapeHtml(request.type)}</div></td>
    <td>${escapeHtml(range)}</td>
    <td>${escapeHtml(duration)}</td>
    <td>${escapeHtml(request.reason || "—")}</td>
    <td><span class="status-badge ${escapeHtml(request.status.toLowerCase())}"${tip}><span class="material-symbols-outlined">${icon}</span>${escapeHtml(request.status)}</span></td>
  `;
  return row;
}

function showHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  // The history has the requests that are over, and the rejected ones.
  const history = leaveRequests.filter(request => isRequestEnded(request) || request.status === "Rejected");

  // filter() keeps the history rows that match the search text.
  const shown = history.filter(function (request) {
    const text = `${request.type} ${request.reason || ""} ${request.status} ${request.startDate}`.toLowerCase();
    return searchText === "" || text.includes(searchText);
  });

  if (shown.length === 0) {
    const row = document.createElement("tr");
    const message = searchText !== "" ? `No results found for "${searchText}"` : "No leave history yet.";
    row.innerHTML = `<td colspan="5" class="empty-message">${escapeHtml(message)}</td>`;
    tbody.appendChild(row);
  } else {
    shown.forEach(function (request) {
      tbody.appendChild(makeHistoryRow(request));
    });
  }

  document.getElementById("paginationInfo").textContent = `Showing ${shown.length} of ${history.length} total leave events`;
}

// ── The numbers on the tabs ─────────────────────────────────────────────────

function showTabCounts() {
  const upcomingCount = leaveRequests.filter(isUpcoming).length;
  document.getElementById("tabCountAll").textContent = leaveRequests.length;
  document.getElementById("tabCountUpcoming").textContent = upcomingCount;
  document.getElementById("tabCountHistory").textContent = leaveRequests.length - upcomingCount;
}

// ── The popup: open, close ──────────────────────────────────────────────────

function openModal() {
  document.getElementById("requestModal").className = "modal-overlay open";
  document.getElementById("departureDate").value = getTodayString(); // an early departure is always for today
  document.querySelector('input[name="requestKind"][value="fullDay"]').checked = true;
  toggleRequestKind();
  clearAllErrors();
}

function closeModal() {
  document.getElementById("requestModal").className = "modal-overlay";

  // Empty the form.
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("reason").value = "";
  document.getElementById("halfDay").checked = false;
  document.getElementById("leaveType").selectedIndex = 0;
  document.getElementById("fromTime").value = "";
  document.getElementById("toTime").value = "";
  clearAllErrors();
}

// Shows the fields of the chosen kind: Full Day or Early Departure.
function toggleRequestKind() {
  const kind = document.querySelector('input[name="requestKind"]:checked').value;
  clearAllErrors();
  document.getElementById("fullDayBlock").className = kind === "fullDay" ? "" : "hidden";
  document.getElementById("earlyDepartureBlock").className = kind === "fullDay" ? "hidden" : "";
}

// ── Send a request ──────────────────────────────────────────────────────────

// POST adds the request to the API. Gives back "" when it worked, or an error text.
async function createRequest(request) {
  const response = await fetch(`${API}/leaveRequests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    return "Could not submit leave request.";
  }
  leaveRequests.push(await response.json());
  return "";
}

// Sends the request. When it worked, the popup closes and the page shows the new request.
async function sendRequest(request, successMessage) {
  let problem = "";
  try {
    problem = await createRequest(request);
  } catch (error) {
    problem = error.message;
  }
  if (problem) {
    alert(problem + " Start the API with npm run api.");
    return;
  }

  closeModal();
  showAll();
  alert(successMessage);
}

async function submitFullDayRequest() {
  const type = document.getElementById("leaveType").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const reason = document.getElementById("reason").value.trim();
  const halfDay = document.getElementById("halfDay").checked;

  let hasError = false;
  if (!type) {
    showFieldError("leaveType", "Please select a leave type.");
    hasError = true;
  }
  if (!startDate) {
    showFieldError("startDate", "Start date is required.");
    hasError = true;
  } else if (startDate < getTodayString()) {
    showFieldError("startDate", "Start date cannot be in the past.");
    hasError = true;
  }
  if (!endDate) {
    showFieldError("endDate", "End date is required.");
    hasError = true;
  } else if (startDate && endDate < startDate) {
    showFieldError("endDate", "End date must be after start date.");
    hasError = true;
  }
  if (reason !== "" && reason.length < 5) {
    showFieldError("reason", "Reason must be at least 5 characters.");
    hasError = true;
  }
  if (hasError) {
    return;
  }

  await sendRequest({
    employeeId: currentEmployeeId,
    type: type,
    startDate: startDate,
    endDate: endDate,
    days: daysBetween(startDate, endDate),
    halfDay: halfDay,
    reason: reason,
    status: "Pending",
    reviewer: "Sarah Jenkins",
    submittedAt: getTodayString()
  }, "✅ Request submitted successfully!");
}

async function submitEarlyDepartureRequest() {
  const departureDate = document.getElementById("departureDate").value;
  const fromTime = document.getElementById("fromTime").value;
  const toTime = document.getElementById("toTime").value;
  const reason = document.getElementById("reason").value.trim();

  let hasError = false;
  if (!departureDate) {
    showFieldError("departureDate", "Departure date is missing.");
    hasError = true;
  }
  if (!fromTime) {
    showFieldError("fromTime", "From time is required.");
    hasError = true;
  }
  if (!toTime) {
    showFieldError("toTime", "To time is required.");
    hasError = true;
  }
  if (fromTime && toTime && toTime <= fromTime) {
    showFieldError("toTime", "To time must be after from time.");
    hasError = true;
  }
  if (reason !== "" && reason.length < 5) {
    showFieldError("reason", "Reason must be at least 5 characters.");
    hasError = true;
  }
  if (hasError) {
    return;
  }

  if (timeDiffHours(fromTime, toTime) > 8) {
    showFieldError("toTime", "Early departure cannot exceed 8 hours.");
    return;
  }

  await sendRequest({
    employeeId: currentEmployeeId,
    type: "Early Departure",
    startDate: departureDate,
    endDate: departureDate,
    days: 0,
    halfDay: true,
    fromTime: fromTime,
    toTime: toTime,
    reason: reason,
    status: "Pending",
    reviewer: "Sarah Jenkins",
    submittedAt: getTodayString()
  }, "✅ Early departure request submitted successfully!");
}

// The Submit button: checks the kind that is chosen.
async function handleSubmitRequest() {
  clearAllErrors();
  const kind = document.querySelector('input[name="requestKind"]:checked').value;
  if (kind === "fullDay") {
    await submitFullDayRequest();
  } else {
    await submitEarlyDepartureRequest();
  }
}

// ── Withdraw a request ──────────────────────────────────────────────────────

// DELETE removes the request from the API.
async function withdrawRequest(request) {
  if (!confirm("Are you sure you want to withdraw this request?")) {
    return;
  }
  try {
    const response = await fetch(`${API}/leaveRequests/${request.id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Could not withdraw request. Start the API with npm run api.");
      return;
    }
    leaveRequests = leaveRequests.filter(item => item.id !== request.id);
  } catch (error) {
    alert(`${error.message} Start the API with npm run api.`);
    return;
  }
  showAll();
}

// ── The tabs ────────────────────────────────────────────────────────────────

// The chosen tab gets the class "active". The sections show or hide.
function switchTab(tabName) {
  document.getElementById("tabAll").className = tabName === "all" ? "tab active" : "tab";
  document.getElementById("tabUpcoming").className = tabName === "upcoming" ? "tab active" : "tab";
  document.getElementById("tabHistory").className = tabName === "history" ? "tab active" : "tab";

  document.getElementById("upcomingSection").className = tabName === "history" ? "section hidden" : "section";
  document.getElementById("historySection").className = tabName === "upcoming" ? "section hidden" : "section";
}

// ── Show everything ─────────────────────────────────────────────────────────

function showAll() {
  showBalances();
  showUpcomingCards();
  showHistoryTable();
  showTabCounts();
}

// ── Buttons and boxes ───────────────────────────────────────────────────────

document.getElementById("btnRequestTimeOff").onclick = openModal;
document.getElementById("btnCloseModal").onclick = closeModal;
document.getElementById("btnCancelRequest").onclick = closeModal;
document.getElementById("btnSubmitRequest").onclick = handleSubmitRequest;

// The two radio buttons: Full Day / Early Departure
document.querySelectorAll('input[name="requestKind"]').forEach(function (radio) {
  radio.addEventListener("change", toggleRequestKind);
});

document.getElementById("tabAll").onclick = function () {
  switchTab("all");
};
document.getElementById("tabUpcoming").onclick = function () {
  switchTab("upcoming");
};
document.getElementById("tabHistory").onclick = function () {
  switchTab("history");
};

// The search box looks in the history. "this" is the search input.
document.getElementById("searchInput").addEventListener("input", function () {
  searchText = this.value.trim().toLowerCase();
  showHistoryTable();
  if (searchText !== "") {
    switchTab("history");
  }
});

// The red error disappears when the person changes the box again.
document.getElementById("leaveType").addEventListener("change", function () {
  clearFieldError("leaveType");
});
document.getElementById("startDate").addEventListener("input", function () {
  clearFieldError("startDate");
  const endDate = document.getElementById("endDate").value;
  if (endDate && endDate < this.value) {
    showFieldError("endDate", "End date must be after start date.");
  } else {
    clearFieldError("endDate");
  }
});
document.getElementById("endDate").addEventListener("input", function () {
  clearFieldError("endDate");
});
document.getElementById("reason").addEventListener("input", function () {
  clearFieldError("reason");
});
document.getElementById("fromTime").addEventListener("input", function () {
  clearFieldError("fromTime");
});
document.getElementById("toTime").addEventListener("input", function () {
  clearFieldError("toTime");
});

// Constraint validation: the date boxes do not allow days before today (the min attribute).
document.getElementById("startDate").min = getTodayString();
document.getElementById("endDate").min = getTodayString();

// ── Start ───────────────────────────────────────────────────────────────────

loadData(function () {
  showAll();
  // An early departure that ends today moves to the history, so check again every minute.
  setInterval(showAll, 60 * 1000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      showAll();
    }
  });
  if (location.hash === "#request-time-off") {
    openModal();
  }
});
