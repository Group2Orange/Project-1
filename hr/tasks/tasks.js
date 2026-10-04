// hr/tasks/tasks.js

const API = 'http://127.0.0.1:3000';

const list = document.getElementById('taskList');
const message = document.getElementById('taskMessage');
const resultsMessage = document.getElementById('taskResultsMessage');
const taskToast = document.getElementById('taskToast');

const form = document.getElementById('newTaskForm');
const taskDialog = document.getElementById('taskDialog');
const viewDialog = document.getElementById('viewDialog');
const blockDialog = document.getElementById('blockDialog');

const formError = document.getElementById('formError');
const saveTaskButton = document.getElementById('saveTaskButton');
const employeeOptions = document.getElementById('employeeOptions');
const employeePicker = document.getElementById('employeePicker');
const employeePickerTrigger = document.getElementById('employeePickerTrigger');
const employeePickerText = document.getElementById('employeePickerText');
const employeePickerCount = document.getElementById('employeePickerCount');
const employeePickerTotal = document.getElementById('employeePickerTotal');

let tasks = [];
let employees = [];
let blockGroupId = null;
let toastTimer = null;
let selectedEmployeeIds = []; // ids (as strings) ticked in the employee picker, never repeated
let editingGroupId = null;

const STATUS_LABELS = {
  todo: 'To do',
  progress: 'In progress',
  review: 'Under review',
  completed: 'Completed'
};

const initialStatus = new URLSearchParams(location.search).get('status');

if (['todo', 'progress', 'review', 'completed'].includes(initialStatus)) {
  document.getElementById('taskStatus').value = initialStatus;
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, char => characters[char]);
}

// Remove repeated values from an array (keeps the first of each, in order).
function unique(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function employeeById(id) {
  return employees.find(person => String(person.id) === String(id));
}

function employeeName(id) {
  const person = employeeById(id);
  if (person && person.name) return person.name;
  return `Employee #${id}`;
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .filter(letter => letter)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDueDate(value) {
  if (!value) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// type is 'success' (default) or 'error'
function showToast(text, type) {
  clearTimeout(toastTimer);
  taskToast.textContent = text;
  taskToast.className = `task-toast ${type || 'success'} is-visible`;
  toastTimer = setTimeout(() => {
    taskToast.classList.remove('is-visible');
  }, 3200);
}

function setFormError(text) {
  formError.textContent = text || '';
  formError.hidden = !text;
}

function groupKey(task) {
  return String(task.assignmentId || task.id);
}

// A task given to several employees is saved as one record per employee,
// all sharing the same assignmentId. This puts them back together as one
// "group" so the table shows one row per assignment.
function getGroups() {
  const groups = [];

  tasks.forEach(task => {
    const key = groupKey(task);
    let group = groups.find(item => item.id === key);
    if (!group) {
      group = { id: key, tasks: [] };
      groups.push(group);
    }
    group.tasks.push(task);
  });

  return groups.map(group => {
    const employeeIds = unique(
      group.tasks
        .map(task => task.employeeId)
        .filter(id => id !== undefined && id !== null && id !== '')
        .map(id => String(id))
    );
    const statuses = unique(group.tasks.map(task => task.status || 'todo'));
    const blockedTasks = group.tasks.filter(task => task.blocked === true);

    return {
      id: group.id,
      tasks: group.tasks,
      base: group.tasks[0],
      employeeIds: employeeIds,
      statuses: statuses,
      status: statuses.length === 1 ? statuses[0] : 'mixed',
      blocked: blockedTasks.length === group.tasks.length // blocked only when every task in the group is blocked
    };
  });
}

function getGroup(id) {
  return getGroups().find(group => String(group.id) === String(id));
}

function sortGroups(a, b) {
  const aDate = String(a.base.dueDate || '');
  const bDate = String(b.base.dueDate || '');
  const aOrder = Number(a.base.order || 0);
  const bOrder = Number(b.base.order || 0);

  if (!aDate && !bDate) return aOrder - bOrder;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate) || aOrder - bOrder;
}

function renderEmployeeChips(employeeIds, className) {
  const ids = unique(employeeIds.map(String));

  if (!ids.length) {
    return '<span class="task-description">No employee assigned</span>';
  }

  const visible = ids.slice(0, 4);
  const more = ids.length - visible.length;

  const chips = visible.map(id => {
    const name = employeeName(id);
    return `<span class="employee-chip" title="${escapeHtml(name)}">
        <span class="employee-chip-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
        ${escapeHtml(name)}
      </span>`;
  }).join('');

  return `<div class="task-employees ${className || ''}">
    ${chips}
    ${more > 0 ? `<span class="task-employee-more">+${more} more</span>` : ''}
  </div>`;
}

function renderTasks() {
  const search = document.getElementById('taskSearch').value.trim().toLowerCase();
  const statusFilter = document.getElementById('taskStatus').value;

  const groups = getGroups()
    .filter(group => {
      const employeeText = group.employeeIds.map(employeeName).join(' ');
      const searchable = [group.base.title, group.base.description, employeeText].join(' ').toLowerCase();
      const searchMatches = !search || searchable.includes(search);
      const statusMatches = !statusFilter || group.status === statusFilter || group.statuses.includes(statusFilter);
      return searchMatches && statusMatches;
    })
    .sort(sortGroups);

  resultsMessage.textContent = `${groups.length} ${groups.length === 1 ? 'task assignment' : 'task assignments'} shown`;

  if (!groups.length) {
    list.innerHTML = `
      <tr>
        <td colspan="5" class="task-empty">No tasks match these filters.</td>
      </tr>
    `;
    return;
  }

  list.innerHTML = groups.map(group => {
    const task = group.base;
    const isHigh = String(task.priority || '').toLowerCase() === 'high';
    const description = task.description || 'No description provided';
    const status = group.status === 'mixed' ? 'mixed' : (task.status || 'todo');
    const labelTitle = escapeHtml(task.title || 'task');

    const statusOptions = Object.keys(STATUS_LABELS).map(value =>
      `<option value="${value}" ${status === value ? 'selected' : ''}>${STATUS_LABELS[value]}</option>`
    ).join('');

    let statusNote = '';
    if (group.blocked) {
      statusNote = '<span class="task-blocked-badge">Blocked</span>';
    } else if (status === 'mixed') {
      statusNote = '<small class="task-description">Different employees have different statuses</small>';
    }

    return `
      <tr>
        <td>
          <strong class="task-title">${escapeHtml(task.title || 'Untitled task')}</strong>
          <span class="task-description" title="${escapeHtml(description)}">${escapeHtml(description)}</span>
        </td>

        <td>
          ${renderEmployeeChips(group.employeeIds)}
        </td>

        <td>
          <span class="task-priority${isHigh ? ' high' : ''}">${escapeHtml(task.priority || 'Normal')} priority</span>
          <span class="task-due">Due ${escapeHtml(formatDueDate(task.dueDate))}</span>
        </td>

        <td>
          <select data-group-id="${escapeHtml(group.id)}" class="task-status-select" aria-label="Status for ${labelTitle}" ${status === 'mixed' ? 'data-mixed="true"' : ''} ${group.blocked ? 'disabled' : ''}>
            ${statusOptions}
          </select>
          ${statusNote}
        </td>

        <td>
          <div class="actions">
            <button type="button" data-action="view" data-group-id="${escapeHtml(group.id)}" aria-label="View ${labelTitle}" title="View task">
              <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
            </button>
            <button type="button" data-action="edit" data-group-id="${escapeHtml(group.id)}" aria-label="Edit ${labelTitle}" title="Edit task">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <button type="button" data-action="block" data-group-id="${escapeHtml(group.id)}" aria-label="${group.blocked ? 'Unblock' : 'Block'} ${labelTitle}" title="${group.blocked ? 'Unblock task' : 'Block task'}">
              <span class="material-symbols-outlined" aria-hidden="true">${group.blocked ? 'lock_open' : 'block'}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// fetch + check response.ok + read the JSON body, used by every save below.
async function apiJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data && data.message ? ` ${data.message}` : '';
    } catch (error) {
      // Ignore non-JSON error bodies.
    }
    throw new Error(`Request failed (${response.status}).${detail}`);
  }

  return response.status === 204 ? null : response.json();
}

// loadData() shows "Loading tasks…"; loadData(false) reloads quietly after a change.
async function loadData(showLoading) {
  if (showLoading === undefined) showLoading = true;

  if (showLoading) {
    message.textContent = 'Loading tasks…';
  }

  try {
    const responses = await Promise.all([fetch(`${API}/tasks`), fetch(`${API}/employees`)]);
    const tasksResponse = responses[0];
    const employeesResponse = responses[1];

    if (!tasksResponse.ok || !employeesResponse.ok) {
      throw new Error('Could not load team tasks.');
    }

    tasks = await tasksResponse.json();
    employees = await employeesResponse.json();

    if (!Array.isArray(tasks) || !Array.isArray(employees)) {
      throw new Error('Task or employee data is invalid.');
    }

    renderEmployeePicker();
    renderTasks();

    if (showLoading) {
      message.textContent = '';
    }
  } catch (error) {
    list.innerHTML = `
      <tr>
        <td colspan="5" class="task-empty">Tasks are unavailable until the API is running.</td>
      </tr>
    `;
    resultsMessage.textContent = '';
    message.textContent = error.message;
    showToast(error.message, 'error');
  }
}

function renderEmployeePicker() {
  /* List EVERY employee (same total as the Employees page).
     Blocked accounts are shown but cannot be selected. */
  const people = employees.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  employeePickerTotal.textContent = `${people.length} ${people.length === 1 ? 'employee' : 'employees'}`;

  if (!people.length) {
    employeeOptions.innerHTML = '<p class="task-description">No employees available.</p>';
    return;
  }

  employeeOptions.innerHTML = people.map(person => {
    const blocked = person.status === 'Blocked';
    const checked = selectedEmployeeIds.includes(String(person.id));

    return `
      <label class="employee-option${blocked ? ' disabled' : ''}">
        <input type="checkbox" value="${escapeHtml(person.id)}" ${checked ? 'checked' : ''} ${blocked ? 'disabled' : ''}>
        <span class="employee-option-main">
          <span class="employee-option-name">${escapeHtml(person.name)}</span>
          <span class="employee-option-meta">${escapeHtml(person.position || 'Employee')} · ${escapeHtml(person.department || '—')}</span>
        </span>
        <span class="employee-option-status">${escapeHtml(person.status || 'Active')}</span>
      </label>
    `;
  }).join('');

  updateEmployeePickerSummary();
}

function updateEmployeePickerSummary() {
  const ids = selectedEmployeeIds;

  employeePickerCount.textContent = `${ids.length} selected`;

  if (!ids.length) {
    employeePickerText.textContent = 'Select employees';
    employeePickerText.classList.remove('has-selection');
    return;
  }

  const names = ids.map(employeeName);
  const firstNames = names.slice(0, 2).join(', ');
  const remaining = names.length - 2;

  employeePickerText.textContent = remaining > 0 ? `${firstNames} +${remaining} more` : firstNames;
  employeePickerText.classList.add('has-selection');
}

function setSelectedEmployees(ids) {
  selectedEmployeeIds = unique(ids.map(String));
  renderEmployeePicker();
}

function openEmployeePicker() {
  employeePicker.hidden = false;
  employeePickerTrigger.setAttribute('aria-expanded', 'true');
}

function closeEmployeePicker() {
  employeePicker.hidden = true;
  employeePickerTrigger.setAttribute('aria-expanded', 'false');
}

// openTaskDialog() = assign a new task, openTaskDialog(group) = edit that assignment.
function openTaskDialog(group) {
  form.reset();
  setFormError('');
  closeEmployeePicker();

  editingGroupId = group ? group.id : null;
  document.getElementById('editTaskId').value = group ? group.id : '';

  document.getElementById('taskDialogTitle').textContent = group ? 'Edit Task Assignment' : 'Assign a task';
  document.getElementById('taskDialogHint').textContent = group
    ? 'Update the task and the employees who are assigned to it.'
    : 'Set the task details and choose one or more employees.';
  saveTaskButton.textContent = group ? 'Save Changes' : 'Assign Task';

  setSelectedEmployees(group ? group.employeeIds : []);

  if (group) {
    form.elements.title.value = group.base.title || '';
    form.elements.priority.value = group.base.priority || 'Normal';
    form.elements.dueDate.value = group.base.dueDate || '';
    form.elements.description.value = group.base.description || '';
  }

  taskDialog.showModal();
}

function openViewDialog(group) {
  const priority = group.base.priority || 'Normal';

  let statusText = '';
  if (group.status === 'mixed') {
    statusText = 'Mixed';
  } else {
    statusText = STATUS_LABELS[group.status] || group.status || 'Unknown';
  }

  document.getElementById('viewTitle').textContent = group.base.title || 'Untitled task';

  let badges = `<span class="view-badge status-${escapeHtml(group.status)}">${escapeHtml(statusText)}</span>`;
  badges += `<span class="view-badge priority-${escapeHtml(priority.toLowerCase())}">${escapeHtml(priority)} priority</span>`;
  if (group.blocked) {
    badges += '<span class="view-badge is-blocked">Blocked</span>';
  }
  document.getElementById('viewBadges').innerHTML = badges;

  document.getElementById('viewPriority').textContent = priority;
  document.getElementById('viewDueDate').textContent = formatDueDate(group.base.dueDate);
  document.getElementById('viewStatus').textContent = group.status === 'mixed'
    ? 'Employees are at different stages'
    : statusText;
  document.getElementById('viewAssignment').textContent = `${group.employeeIds.length} employee${group.employeeIds.length === 1 ? '' : 's'}`;
  document.getElementById('viewEmployees').innerHTML = renderEmployeeChips(group.employeeIds, 'view-employees');

  const description = document.getElementById('viewDescription');
  description.textContent = group.base.description || 'No description provided.';
  description.className = group.base.description ? 'view-description' : 'view-description is-empty';

  viewDialog.showModal();
}

async function createTaskForEmployees(data, employeeIds, assignmentId) {
  assignmentId = assignmentId || `ASSIGN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  /* One request at a time: json-server keeps everything in a single JSON
     file, so parallel writes collide and silently lose tasks. */
  for (let index = 0; index < employeeIds.length; index++) {
    const employeeId = employeeIds[index];

    const task = {
      id: `TASK-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      assignmentId: assignmentId,
      title: data.title,
      description: data.description,
      employeeId: Number.isNaN(Number(employeeId)) ? employeeId : Number(employeeId),
      priority: data.priority,
      dueDate: data.dueDate,
      category: data.category || 'sprint',
      team: data.team || 'Team',
      status: data.status || 'todo',
      order: tasks.length + index + 1
    };

    await apiJson(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  }
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

  const commonStatus = group.status === 'mixed' ? 'todo' : group.status;

  // Employees who are still selected keep their task (updated);
  // employees who were unticked lose their copy of the task.
  for (const task of group.tasks) {
    if (newIds.includes(String(task.employeeId))) {
      await apiJson(`${API}/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseUpdates)
      });
    } else {
      await apiJson(`${API}/tasks/${encodeURIComponent(task.id)}`, {
        method: 'DELETE'
      });
    }
  }

  // Newly ticked employees get a new task in the same group (same assignment ID).
  const additions = selectedIds.filter(id => !oldIds.includes(String(id)));

  if (additions.length) {
    const newTaskData = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
      category: group.base.category,
      team: group.base.team,
      status: commonStatus
    };
    await createTaskForEmployees(newTaskData, additions, group.id);
  }
}

async function updateGroupStatus(group, newStatus) {
  for (const task of group.tasks) {
    await apiJson(`${API}/tasks/${encodeURIComponent(task.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  }
}

async function setGroupBlocked(group, blocked) {
  for (const task of group.tasks) {
    await apiJson(`${API}/tasks/${encodeURIComponent(task.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: blocked })
    });
  }
}

// The checkboxes are rebuilt by renderEmployeePicker, so one listener on their container handles them all.
employeeOptions.addEventListener('change', event => {
  const checkbox = event.target;
  if (!checkbox.matches('input[type="checkbox"]')) {
    return;
  }

  const id = String(checkbox.value);

  if (checkbox.checked) {
    if (!selectedEmployeeIds.includes(id)) {
      selectedEmployeeIds.push(id);
    }
  } else {
    selectedEmployeeIds = selectedEmployeeIds.filter(item => item !== id);
  }

  updateEmployeePickerSummary();
});

employeePickerTrigger.addEventListener('click', () => {
  if (employeePicker.hidden) {
    openEmployeePicker();
  } else {
    closeEmployeePicker();
  }
});

document.addEventListener('click', event => {
  if (!employeePicker.hidden && !event.target.closest('.dialog-field')) {
    closeEmployeePicker();
  }
});

document.getElementById('selectAllEmployees').addEventListener('click', () => {
  const selectable = employees.filter(person => person.status !== 'Blocked');
  selectedEmployeeIds = unique(selectable.map(person => String(person.id)));
  renderEmployeePicker();
});

document.getElementById('clearEmployees').addEventListener('click', () => {
  setSelectedEmployees([]);
});

list.addEventListener('change', async event => {
  const select = event.target;
  if (!select.classList.contains('task-status-select')) {
    return;
  }

  const group = getGroup(select.dataset.groupId);
  if (!group) {
    return;
  }

  select.disabled = true;

  try {
    await updateGroupStatus(group, select.value);
    await loadData(false);
    showToast('Task status updated.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    renderTasks();
  }
});

list.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const group = getGroup(button.dataset.groupId);
  if (!group) {
    return;
  }

  if (button.dataset.action === 'view') {
    openViewDialog(group);
    return;
  }

  if (button.dataset.action === 'edit') {
    openTaskDialog(group);
    return;
  }

  if (button.dataset.action === 'block') {
    blockGroupId = group.id;
    const nextBlocked = !group.blocked;
    const count = group.employeeIds.length;

    document.getElementById('blockTitle').textContent = nextBlocked ? 'Block task?' : 'Unblock task?';
    document.getElementById('blockMessage').textContent = nextBlocked
      ? `Block “${group.base.title}”? It stays on record but is paused for all ${count} assigned employee${count === 1 ? '' : 's'}.`
      : `Unblock “${group.base.title}” so work can continue.`;
    document.getElementById('confirmBlock').textContent = nextBlocked ? 'Block Task' : 'Unblock Task';

    blockDialog.showModal();
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();

  setFormError('');
  closeEmployeePicker();

  const title = form.elements.title.value.trim();
  const selectedIds = selectedEmployeeIds.slice(); // a copy: closing the dialog clears the selection

  if (!title) {
    setFormError('Enter a task title.');
    return;
  }

  if (!selectedIds.length) {
    setFormError('Choose at least one employee.');
    return;
  }

  const data = {
    title: title,
    description: form.elements.description.value.trim(),
    priority: form.elements.priority.value || 'Normal',
    dueDate: form.elements.dueDate.value
  };

  saveTaskButton.disabled = true;

  try {
    if (editingGroupId) {
      const group = getGroup(editingGroupId);
      if (!group) {
        throw new Error('The task assignment could not be found.');
      }
      await updateTaskAssignment(group, data, selectedIds);
      showToast('Task assignment updated.', 'success');
    } else {
      await createTaskForEmployees(data, selectedIds);
      showToast(`Task assigned to ${selectedIds.length} employee${selectedIds.length === 1 ? '' : 's'}.`, 'success');
    }

    taskDialog.close();
    await loadData(false);
  } catch (error) {
    setFormError(error.message);
    showToast(error.message, 'error');
  } finally {
    saveTaskButton.disabled = false;
  }
});

document.getElementById('addTaskButton').addEventListener('click', () => openTaskDialog());
document.getElementById('closeTaskDialog').addEventListener('click', () => taskDialog.close());
document.getElementById('cancelTaskDialog').addEventListener('click', () => taskDialog.close());
document.getElementById('closeViewDialog').addEventListener('click', () => viewDialog.close());
document.getElementById('closeViewDialogFooter').addEventListener('click', () => viewDialog.close());

document.getElementById('cancelBlock').addEventListener('click', () => {
  blockGroupId = null;
  blockDialog.close();
});

document.getElementById('confirmBlock').addEventListener('click', async function () {
  if (!blockGroupId) {
    return;
  }

  const group = getGroup(blockGroupId);
  if (!group) {
    return;
  }

  const nextBlocked = !group.blocked;
  const button = this; // the "confirmBlock" button that was clicked
  button.disabled = true;

  try {
    await setGroupBlocked(group, nextBlocked);
    blockGroupId = null;
    blockDialog.close();
    await loadData(false);
    showToast(nextBlocked ? 'Task blocked.' : 'Task unblocked.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('taskSearch').addEventListener('input', renderTasks);
document.getElementById('taskStatus').addEventListener('change', renderTasks);

taskDialog.addEventListener('close', () => {
  editingGroupId = null;
  selectedEmployeeIds = [];
  setFormError('');
  closeEmployeePicker();
});

loadData();
