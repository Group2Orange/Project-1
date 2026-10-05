// HR leave requests: look at the requests, approve them or reject them (the data comes from the API).
const API = "http://127.0.0.1:3000";

const list = document.getElementById("requestList");
const message = document.getElementById("requestMessage");
const searchInput = document.getElementById("requestSearch");
const statusSelect = document.getElementById("requestStatus");

// The reject popup
const rejectDialog = document.getElementById("rejectDialog");
const rejectForm = document.getElementById("rejectForm");
const rejectReason = document.getElementById("rejectReason");
const rejectContext = document.getElementById("rejectContext");
const rejectError = document.getElementById("rejectError");
const confirmRejectButton = document.getElementById("confirmReject");

let requests = [];
let employees = [];
let rejectingRequest = null; // the leave request shown in the reject popup

// Leave type -> field name in /leaveBalances
const BALANCE_FIELDS = {
  "Annual PTO": "annualPto",
  "Sick Leave": "sickLeave",
  "Floating Holiday": "floatingHoliday",
  "Unpaid": "unpaid"
};

// Stops text from being read as HTML, so what people type cannot break the page.
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

// ----- Load the requests and the employees from the API -----
async function loadRequests() {
  try {
    const requestsResponse = await fetch(`${API}/leaveRequests`);
    const employeesResponse = await fetch(`${API}/employees`);
    if (!requestsResponse.ok || !employeesResponse.ok) {
      message.textContent = "Could not load leave requests. Start the API with npm run api.";
      return;
    }
    requests = await requestsResponse.json();
    employees = await employeesResponse.json();
    message.textContent = "";
    showRequests();
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

// Finds the name of the employee that sent a request.
function employeeName(id) {
  const person = employees.find(item => String(item.id) === String(id));
  if (person && person.name) {
    return person.name;
  }
  return `Employee #${id}`;
}

// ----- Show the table -----
function showRequests() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;

  // filter() keeps the requests that match the search and the status.
  const visible = requests.filter(function (request) {
    const text = `${employeeName(request.employeeId)} ${request.type} ${request.reason || ""}`.toLowerCase();
    return (!status || request.status === status) && text.includes(search);
  });
  // sort() puts the newest request first.
  visible.sort(function (a, b) {
    return String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""));
  });

  list.innerHTML = "";
  if (visible.length === 0) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--color-secondary);">No leave requests match these filters.</td></tr>`;
    return;
  }
  visible.forEach(function (request) {
    list.appendChild(makeRow(request));
  });
}

// Builds one table row (a <tr>) for one request.
function makeRow(request) {
  const name = employeeName(request.employeeId);
  const initials = name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();

  let dates = `<strong>${escapeHtml(request.startDate)} to ${escapeHtml(request.endDate)}</strong><small>${request.days || 0} day(s)</small>`;
  if (request.type === "Early Departure" && request.fromTime && request.toTime) {
    dates = `<strong>${escapeHtml(request.startDate)}</strong><small>${escapeHtml(request.fromTime)} – ${escapeHtml(request.toTime)}</small>`;
  }

  let badge = "inactive";
  if (request.status === "Approved") {
    badge = "active";
  } else if (request.status === "Rejected") {
    badge = "blocked";
  }

  // Only a pending request can be approved or rejected.
  let actions = "";
  if (request.status === "Pending") {
    actions = `
      <button type="button" aria-label="Approve" title="Approve"><span class="material-symbols-outlined" style="color:#087847">check_circle</span></button>
      <button type="button" class="reject" aria-label="Reject" title="Reject"><span class="material-symbols-outlined">cancel</span></button>
    `;
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>
      <div class="identity">
        <span class="identity-avatar">${escapeHtml(initials)}</span>
        <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(request.type)}</small></div>
      </div>
    </td>
    <td class="department-cell">${dates}</td>
    <td class="department-cell"><small style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;" title="${escapeHtml(request.reason || "No reason provided")}">${escapeHtml(request.reason || "No reason provided")}</small></td>
    <td><span class="status status-${badge}">${escapeHtml(request.status)}</span></td>
    <td><div class="actions">${actions}</div></td>
  `;

  if (request.status === "Pending") {
    // The first button approves, the second one opens the reject popup.
    const buttons = row.querySelectorAll("button");
    buttons[0].onclick = function () {
      decideRequest(request, "Approved", "");
    };
    buttons[1].onclick = function () {
      openRejectDialog(request);
    };
  }
  return row;
}

// ----- Approve or reject (PATCH changes only the fields we send) -----
// The reason is only used when the request is rejected.
async function decideRequest(request, status, reason) {
  if (request.status !== "Pending") {
    return;
  }

  try {
    const session = JSON.parse(localStorage.getItem("loggedUser"));
    if (session === null || session.role !== "HR") {
      return;
    }

    const changes = { status: status, reviewer: session.name };
    if (status === "Approved") {
      changes.approvedBy = session.name;
      changes.approvedAt = new Date().toISOString().slice(0, 10);
    }
    if (status === "Rejected" && reason) {
      changes.rejectionReason = reason;
    }

    const response = await fetch(`${API}/leaveRequests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });
    if (!response.ok) {
      await loadRequests();
      message.textContent = "Could not update request.";
      return;
    }

    // An approved request uses up some days of the employee's balance.
    let problem = "";
    if (status === "Approved" && request.days > 0) {
      problem = await addUsedDays(request);
    }
    await loadRequests();
    message.textContent = problem || `${employeeName(request.employeeId)}'s request ${status.toLowerCase()}.`;
  } catch (error) {
    await loadRequests();
    message.textContent = error.message;
  }
}

// Adds the approved days to the "used" days of the employee. Gives back an error text ("" when all went well).
async function addUsedDays(request) {
  const field = BALANCE_FIELDS[request.type];
  if (!field) {
    return "";
  }
  const response = await fetch(`${API}/leaveBalances?employeeId=${request.employeeId}`);
  if (!response.ok) {
    return "Request approved, but balance could not be loaded.";
  }
  const balances = await response.json();
  const balance = balances[0];
  if (!balance || !balance[field]) {
    return "";
  }

  // The entry keeps its other values (total, expiresOn, ...). Only "used" grows.
  balance[field].used = balance[field].used + Number(request.days);
  const changes = {};
  changes[field] = balance[field];
  const update = await fetch(`${API}/leaveBalances/${balance.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });
  if (!update.ok) {
    return "Request approved, but balance could not be updated.";
  }
  return "";
}

// ----- The reject popup -----
function openRejectDialog(request) {
  rejectingRequest = request;
  rejectForm.reset();
  rejectError.hidden = true;
  rejectError.textContent = "";
  rejectContext.textContent = `${employeeName(request.employeeId)} · ${request.type}`;
  rejectDialog.showModal();
}

// "required" and maxlength="300" on the textarea are checked by the browser
// before this submit event runs, so here we only block a reason made of spaces.
rejectForm.onsubmit = async function (event) {
  event.preventDefault();
  const reason = rejectReason.value.trim();
  if (!reason) {
    rejectError.textContent = "Please write a reason for rejecting this request.";
    rejectError.hidden = false;
    return;
  }
  if (!rejectingRequest) {
    return;
  }

  const request = rejectingRequest;
  confirmRejectButton.disabled = true;
  rejectDialog.close();
  await decideRequest(request, "Rejected", reason);
  confirmRejectButton.disabled = false;
};

document.getElementById("cancelReject").onclick = function () {
  rejectDialog.close();
};

rejectDialog.addEventListener("close", function () {
  rejectingRequest = null;
});

searchInput.addEventListener("input", showRequests);
statusSelect.addEventListener("change", showRequests);
loadRequests();
