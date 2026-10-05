// HR employee directory: search, add, edit, block and export the employees (the data comes from the API).
const API = "http://127.0.0.1:3000";
const pageSize = 8;

const rows = document.getElementById("employeeRows");
const message = document.getElementById("directoryMessage");
const form = document.getElementById("employeeForm");
const employeeDialog = document.getElementById("employeeDialog");
const blockDialog = document.getElementById("blockDialog");

let employees = [];
let page = 1;
let editingId = null; // the id of the employee in the form (null means we are adding a new one)
let blockId = null; // the id of the employee in the block popup

// ── Small helpers ────────────────────────────────────────────────────────────

// Gives back "" instead of null or undefined, but keeps real values such as 0.
function emptyIfMissing(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

// Stops text from being read as HTML, so what HR types cannot break the page.
function escapeHtml(value) {
  return String(emptyIfMissing(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "Lana Ahmed" becomes "LA".
function getInitials(name) {
  return String(name || "?").trim().split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();
}

function detailUrl(id) {
  return `../employee-details/employee-details.html?id=${id}`;
}

// Existing floating holidays expire on March 31. New balances use the next March 31.
function nextFloatingHolidayExpiry() {
  const today = new Date();
  let year = today.getFullYear();
  if (today.getMonth() >= 3) {
    year = year + 1;
  }
  return `${year}-03-31`;
}

// "2026-03-31" becomes "Mar 31, 2026".
function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) {
    return String(value || "—");
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// True when this id belongs to the HR user who is signed in right now.
function isLoggedInUser(id) {
  const session = JSON.parse(localStorage.getItem("loggedUser"));
  return session !== null && String(session.id) === String(id);
}

// ── Load the employees from the API ──────────────────────────────────────────

function showLoadError(text) {
  employees = [];
  rows.innerHTML = "";
  message.textContent = text;
}

async function loadEmployees() {
  message.textContent = "Loading employees…";
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) {
      showLoadError("Could not load employees.");
      return;
    }
    employees = await response.json();
    showEmployees();

    // employees.html?edit=5 opens the edit form for employee 5.
    const editId = location.search.split("=")[1];
    if (editId) {
      history.replaceState(null, "", location.pathname);
      const person = employees.find(item => String(item.id) === editId);
      if (person) {
        openEmployeeDialog(person);
      }
    }
  } catch (error) {
    showLoadError(error.message);
  }
}

// ── Search, filter and sort ──────────────────────────────────────────────────

function filteredEmployees() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const department = document.getElementById("departmentFilter").value;
  const status = document.getElementById("statusFilter").value;
  const role = document.getElementById("roleFilter").value;
  const sortBy = document.getElementById("sortFilter").value;

  // filter() keeps the employees that match everything the person chose.
  const result = employees.filter(function (person) {
    const name = String(person.name || "").toLowerCase();
    const email = String(person.email || "").toLowerCase();
    const team = String(person.department || "").toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query) || team.includes(query);
    const matchesDepartment = !department || person.department === department;
    const matchesStatus = !status || person.status === status;
    const matchesRole = !role || person.role === role;
    return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
  });

  // sort() puts the newest first, or sorts by name.
  result.sort(function (a, b) {
    if (sortBy === "recent") {
      return String(b.joiningDate || "").localeCompare(String(a.joiningDate || ""));
    }
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  return result;
}

// Every department name once, sorted A–Z.
function departmentNames() {
  const names = [];
  employees.forEach(function (person) {
    if (person.department && !names.includes(person.department)) {
      names.push(person.department);
    }
  });
  return names.sort();
}

// Fills a <select> with a first "empty" option and then one option for every department.
function fillDepartmentSelect(select, firstLabel, departments) {
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  departments.forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// ── Show the page ────────────────────────────────────────────────────────────

// The four numbers on top, and the department lists.
function showStats() {
  const month = new Date().toISOString().slice(0, 7);
  const departments = departmentNames();
  document.getElementById("totalCount").textContent = employees.length;
  document.getElementById("departmentCount").textContent = departments.length;
  document.getElementById("newHireCount").textContent = employees.filter(person => String(person.joiningDate || "").startsWith(month)).length;
  document.getElementById("blockedCount").textContent = employees.filter(person => person.status === "Blocked").length;

  // Department filter: keep what the person had selected.
  const filter = document.getElementById("departmentFilter");
  const selected = filter.value;
  fillDepartmentSelect(filter, "All Departments", departments);
  filter.value = selected;

  // Department list inside the add / edit form.
  const formDepartment = form.elements.department;
  const formValue = formDepartment.value;
  fillDepartmentSelect(formDepartment, "Select a department", departments);
  formDepartment.value = departments.includes(formValue) ? formValue : "";
}

// Builds one table row (a <tr>) for one employee.
function makeRow(person) {
  let status = "Inactive";
  if (["Active", "Inactive", "Blocked"].includes(person.status)) {
    status = person.status;
  }
  const blocked = status === "Blocked";
  const actionLabel = blocked ? "Unblock" : "Block";
  const isCurrentUser = isLoggedInUser(person.id);
  const name = escapeHtml(person.name);

  let accessNote = "Account ready";
  if (blocked) {
    accessNote = "Sign-in blocked";
  } else if (person.firstAttend === true) {
    accessNote = "First sign-in pending";
  }

  // The buttons of the row. The reset button only shows when the first sign-in is still pending.
  const viewButton = `<button type="button" data-action="view" aria-label="View ${name}"><span class="material-symbols-outlined">visibility</span></button>`;
  const editButton = `<button type="button" data-action="edit" aria-label="Edit ${name}"><span class="material-symbols-outlined">edit</span></button>`;
  let resetButton = "";
  if (person.firstAttend === true) {
    resetButton = `<button type="button" data-action="reset-password" aria-label="Reset first-login password for ${name}" title="Reset first-login password"><span class="material-symbols-outlined">key</span></button>`;
  }
  const blockTitle = isCurrentUser ? "You cannot block your own account" : actionLabel;
  const blockDisabled = isCurrentUser ? "disabled" : "";
  const blockIcon = blocked ? "lock_open" : "block";
  const blockButton = `<button type="button" data-action="block" aria-label="${actionLabel} ${name}" title="${blockTitle}" ${blockDisabled}><span class="material-symbols-outlined">${blockIcon}</span></button>`;

  const row = document.createElement("tr");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `View ${emptyIfMissing(person.name)} details`);
  row.innerHTML = `
    <td><div class="identity"><span class="identity-avatar">${escapeHtml(getInitials(person.name))}</span><div><strong>${name} <span class="id-tag">${escapeHtml(person.employeeId || `#${person.id}`)}</span></strong><small>${escapeHtml(person.email)}</small></div></div></td>
    <td class="department-cell"><strong>${escapeHtml(person.position || "—")}</strong><small>${escapeHtml(person.department || "—")} · ${person.role === "HR" ? "HR" : "Employee"}</small></td>
    <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
    <td class="access-note">${accessNote}</td>
    <td class="date-cell">${escapeHtml(dateLabel(person.joiningDate))}</td>
    <td><div class="actions">${viewButton}${editButton}${resetButton}${blockButton}</div></td>
  `;

  // Clicking the row (or pressing Enter on it) opens the details page.
  row.onclick = function () {
    location.href = detailUrl(person.id);
  };
  // "this" is the row. Enter on a button inside the row must not open the details page.
  row.onkeydown = function (event) {
    if (event.target === this && event.key === "Enter") {
      location.href = detailUrl(person.id);
    }
  };

  // The buttons do their own job. stopPropagation() stops the click from reaching the row.
  row.querySelector('[data-action="edit"]').onclick = function (event) {
    event.stopPropagation();
    openEmployeeDialog(person);
  };
  row.querySelector('[data-action="block"]').onclick = function (event) {
    event.stopPropagation();
    openBlockDialog(person);
  };
  const resetPasswordButton = row.querySelector('[data-action="reset-password"]');
  if (resetPasswordButton) {
    resetPasswordButton.onclick = function (event) {
      event.stopPropagation();
      resetFirstPassword(person);
    };
  }
  return row;
}

// The table, the counters and the page buttons.
function showEmployees() {
  showStats();
  const result = filteredEmployees();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);

  rows.innerHTML = "";
  visible.forEach(function (person) {
    rows.appendChild(makeRow(person));
  });

  message.textContent = result.length ? "" : "No employees match your search.";
  const first = visible.length ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, result.length);
  document.getElementById("resultCount").textContent = `Showing ${first}–${last} of ${result.length} employees`;
  document.getElementById("pageLabel").textContent = `${page} / ${pages}`;
  document.getElementById("prevPage").disabled = page <= 1;
  document.getElementById("nextPage").disabled = page >= pages;
}

// ── Add / edit employee (the popup with the form) ────────────────────────────

// A random first password like Team@k3x9ab. The employee must change it at the first sign-in.
function makeInitialPassword() {
  const random = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  random.forEach(function (number) {
    code += (number % 36).toString(36);
  });
  return `Team@${code}`;
}

// Today as text: 2026-10-05
function currentDateInput() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The next free employee id, like EMP-2501.
function nextEmployeeId() {
  let latest = 1000;
  employees.forEach(function (person) {
    const match = String(person.employeeId || "").match(/\d+$/);
    const number = match ? Number(match[0]) : 0;
    if (number > latest) {
      latest = number;
    }
  });
  return `EMP-${latest + 1}`;
}

// Shows or hides the red phone number warning.
function showPhoneError(show) {
  document.getElementById("dialogPhone").className = show ? "error-input" : "";
  document.getElementById("dialogPhoneErrorIcon").style.display = show ? "inline-block" : "none";
  document.getElementById("dialogPhoneErrorMessage").style.display = show ? "block" : "none";
}

function showFormError(text) {
  const formError = document.getElementById("formError");
  formError.textContent = text;
  formError.hidden = false;
}

// Opens the form. Give it an employee to edit that employee, or null to add a new one.
function openEmployeeDialog(person) {
  form.reset();
  editingId = person ? person.id : null;
  document.getElementById("formError").hidden = true;
  document.getElementById("employeeDialogTitle").textContent = person ? `Edit ${person.name}` : "Add New Employee";
  document.getElementById("employeeDialogHint").textContent = person ? "Update the employee record. Leave password empty to keep it." : "Create a record and set the initial password.";
  document.getElementById("passwordHint").textContent = person ? "Optional: enter a new password to reset access." : "Required for new employees. Share it privately.";

  const fields = ["name", "email", "department", "position", "officeLocation", "role", "status"];
  fields.forEach(function (field) {
    if (person && person[field]) {
      form.elements[field].value = person[field];
    }
  });

  // The +962 is shown in front of the box, so the box only has the 9 digits.
  form.elements.phone.value = person && person.phone ? String(person.phone).replace(/^\+962/, "") : "";

  if (person && person.employeeId) {
    form.elements.employeeId.value = person.employeeId;
  } else if (person) {
    form.elements.employeeId.value = `EMP-${person.id}`;
  } else {
    form.elements.employeeId.value = nextEmployeeId();
  }
  form.elements.joiningDate.value = (person && person.joiningDate) || currentDateInput();

  const salary = person && person.salary ? person.salary : {};
  form.elements.salaryAmount.value = emptyIfMissing(salary.amount);
  form.elements.salaryCurrency.value = salary.currency || "JOD";

  // A new employee gets a password already filled in. HR can type another one.
  form.elements.password.value = person ? "" : makeInitialPassword();
  employeeDialog.showModal();
  form.elements.name.focus();
}

// Gives a new employee their starting leave balance. Gives back true when it worked.
async function createLeaveBalance(employeeId) {
  try {
    const response = await fetch(`${API}/leaveBalances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: employeeId,
        employeeId: employeeId,
        annualPto: { used: 0, total: 20 },
        sickLeave: { used: 0, total: 8 },
        floatingHoliday: { used: 0, total: 3, expiresOn: nextFloatingHolidayExpiry() },
        unpaid: { used: 0, total: 30 }
      })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

form.onsubmit = async function (event) {
  event.preventDefault();
  document.getElementById("formError").hidden = true;

  const fields = form.elements;
  const data = {
    name: fields.name.value.trim(),
    email: fields.email.value.trim().toLowerCase(),
    department: fields.department.value.trim(),
    position: fields.position.value.trim(),
    phone: fields.phone.value.trim(),
    joiningDate: fields.joiningDate.value,
    employeeId: fields.employeeId.value,
    officeLocation: fields.officeLocation.value.trim(),
    role: fields.role.value,
    status: fields.status.value
  };
  let password = fields.password.value;

  // The phone number is optional. When it is there it must be exactly 9 digits (Jordan).
  if (data.phone && !/^[0-9]{9}$/.test(data.phone)) {
    showPhoneError(true);
    document.getElementById("dialogPhone").focus();
    return;
  }
  showPhoneError(false);
  if (data.phone) {
    data.phone = "+962" + data.phone; // the country code is added before saving
  }

  const salaryAmount = fields.salaryAmount.value;
  const salaryCurrency = fields.salaryCurrency.value.trim().toUpperCase() || "JOD";
  data.salary = salaryAmount ? { amount: Number(salaryAmount), currency: salaryCurrency } : null;

  // find() gives back the first employee that matches, or nothing.
  const sameEmail = employees.find(person => person.email.toLowerCase() === data.email && String(person.id) !== String(editingId));
  if (sameEmail) {
    showFormError("This email already belongs to another employee.");
    return;
  }
  const sameId = employees.find(person => person.employeeId === data.employeeId && String(person.id) !== String(editingId));
  if (sameId) {
    showFormError("This employee ID is already used.");
    return;
  }
  if (password && password.length < 8) {
    showFormError("Use at least 8 characters for the password.");
    return;
  }
  if (isLoggedInUser(editingId) && data.status === "Blocked") {
    showFormError("You cannot block your own HR account.");
    return;
  }

  // A new employee always gets a password (a random one when HR cleared the box).
  if (!editingId && !password) {
    password = makeInitialPassword();
  }
  // A new password means the employee must choose another one at the first sign-in.
  if (password) {
    data.password = password;
    data.firstAttend = true;
  }
  const passwordForNotice = editingId ? "" : password;

  const saveButton = document.getElementById("saveEmployee");
  saveButton.disabled = true;
  try {
    // POST adds a new employee, PATCH changes the one we are editing.
    const response = await fetch(editingId ? `${API}/employees/${editingId}` : `${API}/employees`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      showFormError("Could not save employee.");
    } else {
      const savedEmployee = await response.json();

      let balanceWarning = "";
      if (!editingId) {
        const balanceCreated = await createLeaveBalance(savedEmployee.id);
        if (!balanceCreated) {
          balanceWarning = " Employee was added, but its leave balance could not be created.";
        }
      }

      employeeDialog.close();
      await loadEmployees();
      message.textContent = (editingId ? "Employee updated." : "Employee added.") + balanceWarning;
      if (passwordForNotice) {
        alert(`Initial password for ${data.name}: ${passwordForNotice}`);
      }
    }
  } catch (error) {
    showFormError(error.message);
  }
  saveButton.disabled = false;
};

// Typing in the phone box clears the warning. "this" is the phone input.
document.getElementById("dialogPhone").addEventListener("input", function () {
  this.className = "";
  document.getElementById("dialogPhoneErrorIcon").style.display = "none";
  document.getElementById("dialogPhoneErrorMessage").style.display = "none";
});

document.getElementById("addButton").onclick = function () {
  openEmployeeDialog(null);
};
document.getElementById("closeEmployeeDialog").onclick = function () {
  employeeDialog.close();
};
document.getElementById("cancelEmployeeDialog").onclick = function () {
  employeeDialog.close();
};

// ── Block / unblock and password reset ───────────────────────────────────────

function openBlockDialog(person) {
  if (isLoggedInUser(person.id)) {
    message.textContent = "You cannot block your own HR account.";
    return;
  }
  blockId = person.id;
  const blocked = person.status === "Blocked";
  document.getElementById("blockTitle").textContent = blocked ? "Unblock employee?" : "Block employee?";
  document.getElementById("blockMessage").textContent = blocked
    ? `${person.name} can sign in again after you confirm. The employee record stays available.`
    : `${person.name} will not be able to sign in. The employee record will be kept.`;
  document.getElementById("confirmBlock").textContent = blocked ? "Unblock Employee" : "Block Employee";
  blockDialog.showModal();
}

document.getElementById("cancelBlock").onclick = function () {
  blockDialog.close();
};

// "this" is the Confirm button inside the block popup.
document.getElementById("confirmBlock").onclick = async function () {
  const person = employees.find(item => item.id === blockId);
  if (!person) {
    return;
  }
  const nextStatus = person.status === "Blocked" ? "Active" : "Blocked";

  this.disabled = true;
  try {
    const response = await fetch(`${API}/employees/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!response.ok) {
      document.getElementById("blockMessage").textContent = "Could not change account status.";
    } else {
      blockDialog.close();
      await loadEmployees();
      message.textContent = `${person.name} is now ${nextStatus.toLowerCase()}.`;
    }
  } catch (error) {
    document.getElementById("blockMessage").textContent = error.message;
  }
  this.disabled = false;
};

// Makes a new first-login password for an employee who has not signed in yet.
async function resetFirstPassword(person) {
  if (person.firstAttend !== true) {
    return;
  }
  if (!confirm(`Create a new first-login password for ${person.name}?`)) {
    return;
  }

  const password = makeInitialPassword();
  try {
    const response = await fetch(`${API}/employees/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password, firstAttend: true })
    });
    if (!response.ok) {
      message.textContent = "Could not reset this password.";
      return;
    }
    await loadEmployees();
    alert(`New first-login password for ${person.name}: ${password}`);
  } catch (error) {
    message.textContent = error.message;
  }
}

// ── Search, filters and page buttons ─────────────────────────────────────────

function showFirstPage() {
  page = 1;
  showEmployees();
}
document.getElementById("searchInput").addEventListener("input", showFirstPage);
document.getElementById("departmentFilter").addEventListener("change", showFirstPage);
document.getElementById("statusFilter").addEventListener("change", showFirstPage);
document.getElementById("roleFilter").addEventListener("change", showFirstPage);
document.getElementById("sortFilter").addEventListener("change", showFirstPage);

document.getElementById("prevPage").onclick = function () {
  page = page - 1;
  showEmployees();
};
document.getElementById("nextPage").onclick = function () {
  page = page + 1;
  showEmployees();
};

// ── CSV export ───────────────────────────────────────────────────────────────

// Puts one value in quotes for the CSV file. A leading = + @ - gets a ' in front,
// so spreadsheet programs do not run it as a formula.
function csvCell(value) {
  const text = String(emptyIfMissing(value))
    .replace(/^[=+@-]/, "'$&")
    .replace(/"/g, '""');
  return `"${text}"`;
}

document.getElementById("exportButton").onclick = function () {
  const headers = ["id", "name", "email", "role", "department", "position", "status", "joiningDate"];
  const lines = [headers.join(",")];
  filteredEmployees().forEach(function (person) {
    // map() turns every header into one cell of the line.
    const cells = headers.map(key => csvCell(person[key]));
    lines.push(cells.join(","));
  });
  const csv = lines.join("\r\n");

  // A link with the file inside it. Clicking the link downloads the file.
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  link.download = "connectra-employees.csv";
  link.click();
};

loadEmployees();
