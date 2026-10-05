// HR tasks: assign tasks to employees, follow the progress, edit, block and unblock them (the data comes from the API).
const API = "http://127.0.0.1:3000";

const list = document.getElementById("taskList");
const message = document.getElementById("taskMessage");
const resultsMessage = document.getElementById("taskResultsMessage");
const taskToast = document.getElementById("taskToast");

// The assign / edit popup
const form = document.getElementById("newTaskForm");
const taskDialog = document.getElementById("taskDialog");
const formError = document.getElementById("formError");
const saveTaskButton = document.getElementById("saveTaskButton");

// The employee picker inside the popup
const employeeField = document.querySelector(".dialog-field");
const employeeOptions = document.getElementById("employeeOptions");
const employeePicker = document.getElementById("employeePicker");
const employeePickerTrigger = document.getElementById("employeePickerTrigger");
const employeePickerText = document.getElementById("employeePickerText");
const employeePickerCount = document.getElementById("employeePickerCount");
const employeePickerTotal = document.getElementById("employeePickerTotal");

// The view popup and the block popup
const viewDialog = document.getElementById("viewDialog");
const blockDialog = document.getElementById("blockDialog");

let tasks = [];
let employees = [];
let blockGroupId = null; // the group that waits in the block popup
let toastTimer = null;
let selectedEmployeeIds = []; // the ids (as text) ticked in the employee picker, never repeated
let editingGroupId = null; // the group in the popup (null means we are assigning a new task)

const STATUSES = ["todo", "progress", "review", "completed"];
const STATUS_LABELS = {
  todo: "To do",
  progress: "In progress",
  review: "Under review",
  completed: "Completed"
};

// tasks.html?status=review opens the page with the status filter already chosen.
const initialStatus = location.search.split("=")[1];
if (STATUSES.includes(initialStatus)) {
  document.getElementById("taskStatus").value = initialStatus;
}

// ── Small helpers ────────────────────────────────────────────────────────────

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

// Removes repeated values from an array (keeps the first of each).
function unique(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function employeeName(id) {
  const person = employees.find(item => String(item.id) === String(id));
  if (person && person.name) {
    return person.name;
  }
  return `Employee #${id}`;
}

// "Lana Ahmed" becomes "LA".
function getInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .filter(letter => letter)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDueDate(value) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Shows a small message at the bottom of the page. The type is "success" or "error".
function showToast(text, type) {
  clearTimeout(toastTimer);
  const kind = type || "success";
  taskToast.textContent = text;
  taskToast.className = `task-toast ${kind} is-visible`;
  toastTimer = setTimeout(function () {
    taskToast.className = `task-toast ${kind}`;
  }, 3200);
}

function setFormError(text) {
  formError.textContent = text || "";
  formError.hidden = !text;
}

// ── Groups ───────────────────────────────────────────────────────────────────
// A task given to several employees is saved as one record for each employee.
// All of them have the same assignmentId. A "group" puts them back together,
// so the table shows one row for each assignment.

function groupKey(task) {
  return String(task.assignmentId || task.id);
}

function getGroups() {
  const groups = [];
  tasks.forEach(function (task) {
    const key = groupKey(task);
    let group = groups.find(item => item.id === key);
    if (!group) {
      group = { id: key, tasks: [] };
      groups.push(group);
    }
    group.tasks.push(task);
  });

  // map() works out the details of every group.
  return groups.map(function (group) {
    const employeeIds = unique(
      group.tasks
        .map(task => task.employeeId)
        .filter(id => id !== undefined && id !== null && id !== "")
        .map(id => String(id))
    );
    const statuses = unique(group.tasks.map(task => task.status || "todo"));
    const blockedTasks = group.tasks.filter(task => task.blocked === true);

    return {
      id: group.id,
      tasks: group.tasks,
      base: group.tasks[0],
      employeeIds: employeeIds,
      statuses: statuses,
      status: statuses.length === 1 ? statuses[0] : "mixed",
      blocked: blockedTasks.length === group.tasks.length // blocked only when every task of the group is blocked
    };
  });
}

function getGroup(id) {
  return getGroups().find(group => String(group.id) === String(id));
}

// Compares two groups: the earliest due date first, tasks without a date at the end.
function sortGroups(a, b) {
  const aDate = String(a.base.dueDate || "");
  const bDate = String(b.base.dueDate || "");
  const aOrder = Number(a.base.order || 0);
  const bOrder = Number(b.base.order || 0);

  if (!aDate && !bDate) {
    return aOrder - bOrder;
  }
  if (!aDate) {
    return 1;
  }
  if (!bDate) {
    return -1;
  }
  return aDate.localeCompare(bDate) || aOrder - bOrder;
}

// ── Send changes to the API ──────────────────────────────────────────────────

// Sends one request. Gives back "" when it worked, or a short error text when it did not.
async function sendRequest(url, method, body) {
  const options = { method: method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (response.ok) {
    return "";
  }
  return `Request failed (${response.status}).`;
}

// Gives the task to every chosen employee. Gives back "" when it worked, or an error text.
async function createTaskForEmployees(data, employeeIds, assignmentId) {
  assignmentId = assignmentId || `ASSIGN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // One request at a time: json-server keeps everything in a single JSON file,
  // so requests sent together can collide and lose tasks.
  for (let index = 0; index < employeeIds.length; index++) {
    const employeeId = employeeIds[index];
    const task = {
      id: `TASK-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      assignmentId: assignmentId,
      title: data.title,
      description: data.description,
      employeeId: isNaN(Number(employeeId)) ? employeeId : Number(employeeId),
      priority: data.priority,
      dueDate: data.dueDate,
      category: data.category || "sprint",
      team: data.team || "Team",
      status: data.status || "todo",
      order: tasks.length + index + 1
    };

    const problem = await sendRequest(`${API}/tasks`, "POST", task);
    if (problem) {
      return problem;
    }
  }
  return "";
}

async function updateTaskAssignment(group, data, selectedIds) {
  const oldIds = group.employeeIds.map(String);
  const newIds = selectedIds.map(String);
  const baseUpdates = {
    title: data.title,
    description: data.description,
    priority: data.priority,
    dueDate: data.dueDate
  };
  const commonStatus = group.status === "mixed" ? "todo" : group.status;

  // Employees who are still selected keep their task (PATCH changes it).
  // Employees who were unticked lose their copy of the task (DELETE).
  for (const task of group.tasks) {
    let problem = "";
    if (newIds.includes(String(task.employeeId))) {
      problem = await sendRequest(`${API}/tasks/${task.id}`, "PATCH", baseUpdates);
    } else {
      problem = await sendRequest(`${API}/tasks/${task.id}`, "DELETE");
    }
    if (problem) {
      return problem;
    }
  }

  // Newly ticked employees get a new task in the same group (the same assignment id).
  const additions = selectedIds.filter(id => !oldIds.includes(String(id)));
  if (additions.length === 0) {
    return "";
  }
  const newTaskData = {
    title: data.title,
    description: data.description,
    priority: data.priority,
    dueDate: data.dueDate,
    category: group.base.category,
    team: group.base.team,
    status: commonStatus
  };
  return await createTaskForEmployees(newTaskData, additions, group.id);
}

// Changes one field in every task of the group (a status, or blocked).
async function updateGroup(group, changes) {
  for (const task of group.tasks) {
    const problem = await sendRequest(`${API}/tasks/${task.id}`, "PATCH", changes);
    if (problem) {
      return problem;
    }
  }
  return "";
}

// ── Load the data and show the table ─────────────────────────────────────────

function showLoadError(text) {
  list.innerHTML = `<tr><td colspan="5" class="task-empty">Tasks are unavailable until the API is running.</td></tr>`;
  resultsMessage.textContent = "";
  message.textContent = text;
  showToast(text, "error");
}

// loadData(true) shows "Loading tasks…". loadData(false) loads quietly after a change.
async function loadData(showLoading) {
  if (showLoading) {
    message.textContent = "Loading tasks…";
  }

  try {
    const tasksResponse = await fetch(`${API}/tasks`);
    const employeesResponse = await fetch(`${API}/employees`);
    if (!tasksResponse.ok || !employeesResponse.ok) {
      showLoadError("Could not load team tasks.");
      return;
    }
    tasks = await tasksResponse.json();
    employees = await employeesResponse.json();

    showEmployeePicker();
    showTasks();
    if (showLoading) {
      message.textContent = "";
    }
  } catch (error) {
    showLoadError(error.message);
  }
}

// The employee chips of a task (small round names).
function makeEmployeeChips(employeeIds, className) {
  const ids = unique(employeeIds.map(String));
  if (ids.length === 0) {
    return '<span class="task-description">No employee assigned</span>';
  }

  const visible = ids.slice(0, 4);
  const more = ids.length - visible.length;
  const chips = visible.map(function (id) {
    const name = employeeName(id);
    return `<span class="employee-chip" title="${escapeHtml(name)}">
        <span class="employee-chip-avatar" aria-hidden="true">${escapeHtml(getInitials(name))}</span>
        ${escapeHtml(name)}
      </span>`;
  }).join("");

  return `<div class="task-employees ${className || ""}">
    ${chips}
    ${more > 0 ? `<span class="task-employee-more">+${more} more</span>` : ""}
  </div>`;
}

// Builds one table row (a <tr>) for one group.
function makeTaskRow(group) {
  const task = group.base;
  const isHigh = String(task.priority || "").toLowerCase() === "high";
  const description = task.description || "No description provided";
  const status = group.status === "mixed" ? "mixed" : (task.status || "todo");
  const labelTitle = escapeHtml(task.title || "task");

  // One <option> for every status. The current status is selected.
  const statusOptions = STATUSES.map(function (value) {
    return `<option value="${value}" ${status === value ? "selected" : ""}>${STATUS_LABELS[value]}</option>`;
  }).join("");

  let statusNote = "";
  if (group.blocked) {
    statusNote = '<span class="task-blocked-badge">Blocked</span>';
  } else if (status === "mixed") {
    statusNote = '<small class="task-description">Different employees have different statuses</small>';
  }

  const row = document.createElement("tr");
  row.innerHTML = `
        <td>
          <strong class="task-title">${escapeHtml(task.title || "Untitled task")}</strong>
          <span class="task-description" title="${escapeHtml(description)}">${escapeHtml(description)}</span>
        </td>

        <td>
          ${makeEmployeeChips(group.employeeIds, "")}
        </td>

        <td>
          <span class="task-priority${isHigh ? " high" : ""}">${escapeHtml(task.priority || "Normal")} priority</span>
          <span class="task-due">Due ${escapeHtml(formatDueDate(task.dueDate))}</span>
        </td>

        <td>
          <select class="task-status-select" aria-label="Status for ${labelTitle}" ${group.blocked ? "disabled" : ""}>
            ${statusOptions}
          </select>
          ${statusNote}
        </td>

        <td>
          <div class="actions">
            <button type="button" data-action="view" aria-label="View ${labelTitle}" title="View task">
              <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
            </button>
            <button type="button" data-action="edit" aria-label="Edit ${labelTitle}" title="Edit task">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <button type="button" data-action="block" aria-label="${group.blocked ? "Unblock" : "Block"} ${labelTitle}" title="${group.blocked ? "Unblock task" : "Block task"}">
              <span class="material-symbols-outlined" aria-hidden="true">${group.blocked ? "lock_open" : "block"}</span>
            </button>
          </div>
        </td>
  `;

  // "this" is the select that changed.
  row.querySelector("select").onchange = function () {
    changeStatus(group, this);
  };

  // The three buttons: view, edit and block.
  const buttons = row.querySelectorAll("button");
  buttons[0].onclick = function () {
    openViewDialog(group);
  };
  buttons[1].onclick = function () {
    openTaskDialog(group);
  };
  buttons[2].onclick = function () {
    openBlockDialog(group);
  };
  return row;
}

function showTasks() {
  const search = document.getElementById("taskSearch").value.trim().toLowerCase();
  const statusFilter = document.getElementById("taskStatus").value;

  // filter() keeps the groups that match the search and the status. sort() orders them.
  const groups = getGroups()
    .filter(function (group) {
      const employeeText = group.employeeIds.map(employeeName).join(" ");
      const searchable = [group.base.title, group.base.description, employeeText].join(" ").toLowerCase();
      const searchMatches = !search || searchable.includes(search);
      const statusMatches = !statusFilter || group.status === statusFilter || group.statuses.includes(statusFilter);
      return searchMatches && statusMatches;
    })
    .sort(sortGroups);

  resultsMessage.textContent = `${groups.length} ${groups.length === 1 ? "task assignment" : "task assignments"} shown`;

  list.innerHTML = "";
  if (groups.length === 0) {
    list.innerHTML = `<tr><td colspan="5" class="task-empty">No tasks match these filters.</td></tr>`;
    return;
  }
  groups.forEach(function (group) {
    list.appendChild(makeTaskRow(group));
  });
}

// The person chose another status in the table.
async function changeStatus(group, select) {
  select.disabled = true;

  let problem = "";
  try {
    problem = await updateGroup(group, { status: select.value });
  } catch (error) {
    problem = error.message;
  }
  if (problem) {
    showToast(problem, "error");
    showTasks();
    return;
  }
  await loadData(false);
  showToast("Task status updated.", "success");
}

// ── The employee picker (a list with checkboxes) ────────────────────────────

function showEmployeePicker() {
  // Every employee is listed (the same number as on the Employees page).
  // Blocked accounts are shown, but they cannot be chosen.
  const people = employees.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  employeePickerTotal.textContent = `${people.length} ${people.length === 1 ? "employee" : "employees"}`;

  employeeOptions.innerHTML = "";
  if (people.length === 0) {
    employeeOptions.innerHTML = '<p class="task-description">No employees available.</p>';
    return;
  }

  people.forEach(function (person) {
    const blocked = person.status === "Blocked";
    const checked = selectedEmployeeIds.includes(String(person.id));

    const option = document.createElement("label");
    option.className = blocked ? "employee-option disabled" : "employee-option";
    option.innerHTML = `
        <input type="checkbox" value="${escapeHtml(person.id)}" ${checked ? "checked" : ""} ${blocked ? "disabled" : ""}>
        <span class="employee-option-main">
          <span class="employee-option-name">${escapeHtml(person.name)}</span>
          <span class="employee-option-meta">${escapeHtml(person.position || "Employee")} · ${escapeHtml(person.department || "—")}</span>
        </span>
        <span class="employee-option-status">${escapeHtml(person.status || "Active")}</span>
    `;

    // "this" is the checkbox that was ticked or unticked.
    option.querySelector("input").onchange = function () {
      const id = String(this.value);
      if (this.checked) {
        if (!selectedEmployeeIds.includes(id)) {
          selectedEmployeeIds.push(id);
        }
      } else {
        selectedEmployeeIds = selectedEmployeeIds.filter(item => item !== id);
      }
      showPickerSummary();
    };
    employeeOptions.appendChild(option);
  });

  showPickerSummary();
}

// The text on the picker button: "2 selected", the first names, ...
function showPickerSummary() {
  const ids = selectedEmployeeIds;
  employeePickerCount.textContent = `${ids.length} selected`;

  if (ids.length === 0) {
    employeePickerText.textContent = "Select employees";
    employeePickerText.className = "employee-picker-trigger-text";
    return;
  }

  const names = ids.map(employeeName);
  const firstNames = names.slice(0, 2).join(", ");
  const remaining = names.length - 2;
  employeePickerText.textContent = remaining > 0 ? `${firstNames} +${remaining} more` : firstNames;
  employeePickerText.className = "employee-picker-trigger-text has-selection";
}

function setSelectedEmployees(ids) {
  selectedEmployeeIds = unique(ids.map(String));
  showEmployeePicker();
}

function openEmployeePicker() {
  employeePicker.hidden = false;
  employeePickerTrigger.setAttribute("aria-expanded", "true");
}

function closeEmployeePicker() {
  employeePicker.hidden = true;
  employeePickerTrigger.setAttribute("aria-expanded", "false");
}

employeePickerTrigger.addEventListener("click", function () {
  if (employeePicker.hidden) {
    openEmployeePicker();
  } else {
    closeEmployeePicker();
  }
});

// A click anywhere outside the employee field closes the picker.
document.addEventListener("click", function (event) {
  if (!employeePicker.hidden && !employeeField.contains(event.target)) {
    closeEmployeePicker();
  }
});

document.getElementById("selectAllEmployees").onclick = function () {
  const selectable = employees.filter(person => person.status !== "Blocked");
  selectedEmployeeIds = unique(selectable.map(person => String(person.id)));
  showEmployeePicker();
};

document.getElementById("clearEmployees").onclick = function () {
  setSelectedEmployees([]);
};

// ── Assign / edit a task (the popup with the form) ──────────────────────────

// openTaskDialog(null) assigns a new task. openTaskDialog(group) edits that assignment.
function openTaskDialog(group) {
  form.reset();
  setFormError("");
  closeEmployeePicker();

  editingGroupId = group ? group.id : null;
  document.getElementById("editTaskId").value = group ? group.id : "";

  document.getElementById("taskDialogTitle").textContent = group ? "Edit Task Assignment" : "Assign a task";
  document.getElementById("taskDialogHint").textContent = group
    ? "Update the task and the employees who are assigned to it."
    : "Set the task details and choose one or more employees.";
  saveTaskButton.textContent = group ? "Save Changes" : "Assign Task";

  setSelectedEmployees(group ? group.employeeIds : []);

  if (group) {
    form.elements.title.value = group.base.title || "";
    form.elements.priority.value = group.base.priority || "Normal";
    form.elements.dueDate.value = group.base.dueDate || "";
    form.elements.description.value = group.base.description || "";
  }
  taskDialog.showModal();
}

form.onsubmit = async function (event) {
  event.preventDefault();
  setFormError("");
  closeEmployeePicker();

  const title = form.elements.title.value.trim();
  const selectedIds = selectedEmployeeIds.slice(); // a copy, because closing the popup clears the selection
  if (!title) {
    setFormError("Enter a task title.");
    return;
  }
  if (selectedIds.length === 0) {
    setFormError("Choose at least one employee.");
    return;
  }

  const data = {
    title: title,
    description: form.elements.description.value.trim(),
    priority: form.elements.priority.value || "Normal",
    dueDate: form.elements.dueDate.value
  };

  saveTaskButton.disabled = true;
  let problem = "";
  try {
    if (editingGroupId) {
      const group = getGroup(editingGroupId);
      if (!group) {
        problem = "The task assignment could not be found.";
      } else {
        problem = await updateTaskAssignment(group, data, selectedIds);
        if (!problem) {
          showToast("Task assignment updated.", "success");
        }
      }
    } else {
      problem = await createTaskForEmployees(data, selectedIds, "");
      if (!problem) {
        showToast(`Task assigned to ${selectedIds.length} employee${selectedIds.length === 1 ? "" : "s"}.`, "success");
      }
    }

    if (!problem) {
      taskDialog.close();
      await loadData(false);
    }
  } catch (error) {
    problem = error.message;
  }

  if (problem) {
    setFormError(problem);
    showToast(problem, "error");
  }
  saveTaskButton.disabled = false;
};

// When the popup closes, everything in it starts again.
taskDialog.addEventListener("close", function () {
  editingGroupId = null;
  selectedEmployeeIds = [];
  setFormError("");
  closeEmployeePicker();
});

document.getElementById("addTaskButton").onclick = function () {
  openTaskDialog(null);
};
document.getElementById("closeTaskDialog").onclick = function () {
  taskDialog.close();
};
document.getElementById("cancelTaskDialog").onclick = function () {
  taskDialog.close();
};

// ── View a task (the popup with the details) ────────────────────────────────

function openViewDialog(group) {
  const priority = group.base.priority || "Normal";

  let statusText = "Mixed";
  if (group.status !== "mixed") {
    statusText = STATUS_LABELS[group.status] || group.status || "Unknown";
  }

  document.getElementById("viewTitle").textContent = group.base.title || "Untitled task";

  let badges = `<span class="view-badge status-${escapeHtml(group.status)}">${escapeHtml(statusText)}</span>`;
  badges += `<span class="view-badge priority-${escapeHtml(priority.toLowerCase())}">${escapeHtml(priority)} priority</span>`;
  if (group.blocked) {
    badges += '<span class="view-badge is-blocked">Blocked</span>';
  }
  document.getElementById("viewBadges").innerHTML = badges;

  document.getElementById("viewPriority").textContent = priority;
  document.getElementById("viewDueDate").textContent = formatDueDate(group.base.dueDate);
  document.getElementById("viewStatus").textContent = group.status === "mixed" ? "Employees are at different stages" : statusText;
  document.getElementById("viewAssignment").textContent = `${group.employeeIds.length} employee${group.employeeIds.length === 1 ? "" : "s"}`;
  document.getElementById("viewEmployees").innerHTML = makeEmployeeChips(group.employeeIds, "view-employees");

  const description = document.getElementById("viewDescription");
  description.textContent = group.base.description || "No description provided.";
  description.className = group.base.description ? "view-description" : "view-description is-empty";

  viewDialog.showModal();
}

document.getElementById("closeViewDialog").onclick = function () {
  viewDialog.close();
};
document.getElementById("closeViewDialogFooter").onclick = function () {
  viewDialog.close();
};

// ── Block / unblock a task (the confirmation popup) ─────────────────────────

function openBlockDialog(group) {
  blockGroupId = group.id;
  const nextBlocked = !group.blocked;
  const count = group.employeeIds.length;

  document.getElementById("blockTitle").textContent = nextBlocked ? "Block task?" : "Unblock task?";
  document.getElementById("blockMessage").textContent = nextBlocked
    ? `Block “${group.base.title}”? It stays on record but is paused for all ${count} assigned employee${count === 1 ? "" : "s"}.`
    : `Unblock “${group.base.title}” so work can continue.`;
  document.getElementById("confirmBlock").textContent = nextBlocked ? "Block Task" : "Unblock Task";
  blockDialog.showModal();
}

document.getElementById("cancelBlock").onclick = function () {
  blockGroupId = null;
  blockDialog.close();
};

// "this" is the Confirm button inside the block popup.
document.getElementById("confirmBlock").onclick = async function () {
  if (!blockGroupId) {
    return;
  }
  const group = getGroup(blockGroupId);
  if (!group) {
    return;
  }
  const nextBlocked = !group.blocked;

  this.disabled = true;
  let problem = "";
  try {
    problem = await updateGroup(group, { blocked: nextBlocked });
    if (!problem) {
      blockGroupId = null;
      blockDialog.close();
      await loadData(false);
      showToast(nextBlocked ? "Task blocked." : "Task unblocked.", "success");
    }
  } catch (error) {
    problem = error.message;
  }
  if (problem) {
    showToast(problem, "error");
  }
  this.disabled = false;
};

// ── Search and filter ────────────────────────────────────────────────────────

document.getElementById("taskSearch").addEventListener("input", showTasks);
document.getElementById("taskStatus").addEventListener("change", showTasks);

loadData(true);
