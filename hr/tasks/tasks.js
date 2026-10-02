// hr/tasks/tasks.js

const API = 'http://127.0.0.1:3000';

const list = document.getElementById('taskList');
const message = document.getElementById('taskMessage');
const resultsMessage = document.getElementById('taskResultsMessage');
const taskToast = document.getElementById('taskToast');

const form = document.getElementById('newTaskForm');
const taskDialog = document.getElementById('taskDialog');
const viewDialog = document.getElementById('viewDialog');
const deleteDialog = document.getElementById('deleteDialog');

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
let deleteGroupId = null;
let toastTimer = null;
let selectedEmployeeIds = new Set();
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
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function employeeById(id) {
  return employees.find(person => String(person.id) === String(id));
}

function employeeName(id) {
  return employeeById(id)?.name || `Employee #${id}`;
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDueDate(value) {
  if (!value) return 'Not set';

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
}

function showToast(text, type = 'success') {
  clearTimeout(toastTimer);

  taskToast.textContent = text;
  taskToast.className = `task-toast ${type} is-visible`;

  toastTimer = setTimeout(() => {
    taskToast.classList.remove('is-visible');
  }, 3200);
}

function setFormError(text = '') {
  formError.textContent = text;
  formError.hidden = !text;
}

function groupKey(task) {
  return String(task.assignmentId || task.id);
}

function getGroups() {
  const groups = new Map();

  tasks.forEach(task => {
    const key = groupKey(task);

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        tasks: []
      });
    }

    groups.get(key).tasks.push(task);
  });

  return [...groups.values()].map(group => {
    const base = group.tasks[0];
    const employeeIds = [...new Set(
      group.tasks
        .map(task => task.employeeId)
        .filter(id => id !== undefined && id !== null && id !== '')
        .map(id => String(id))
    )];

    const statuses = [...new Set(group.tasks.map(task => task.status || 'todo'))];

    return {
      ...group,
      base,
      employeeIds,
      statuses,
      status: statuses.length === 1 ? statuses[0] : 'mixed'
    };
  });
}

function getGroup(id) {
  return getGroups().find(group => String(group.id) === String(id));
}

function sortGroups(a, b) {
  const aDate = String(a.base?.dueDate || '');
  const bDate = String(b.base?.dueDate || '');

  if (!aDate && !bDate) {
    return Number(a.base?.order || 0) - Number(b.base?.order || 0);
  }

  if (!aDate) return 1;
  if (!bDate) return -1;

  return aDate.localeCompare(bDate) || Number(a.base?.order || 0) - Number(b.base?.order || 0);
}

function renderEmployeeChips(employeeIds, className = '') {
  const ids = [...new Set(employeeIds.map(String))];

  if (!ids.length) {
    return '<span class="task-description">No employee assigned</span>';
  }

  const visible = ids.slice(0, 4);
  const more = ids.length - visible.length;

  return `<div class="task-employees ${className}">
    ${visible.map(id => {
      const person = employeeById(id);
      const name = person?.name || `Employee #${id}`;

      return `<span class="employee-chip" title="${escapeHtml(name)}">
        <span class="employee-chip-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
        ${escapeHtml(name)}
      </span>`;
    }).join('')}
    ${more > 0 ? `<span class="task-employee-more">+${more} more</span>` : ''}
  </div>`;
}

function renderTasks() {
  const search = document.getElementById('taskSearch').value.trim().toLowerCase();
  const statusFilter = document.getElementById('taskStatus').value;

  const groups = getGroups()
    .filter(group => {
      const employeeText = group.employeeIds.map(employeeName).join(' ');

      const searchable = [
        group.base.title,
        group.base.description,
        employeeText
      ].join(' ').toLowerCase();

      const searchMatches =
        !search || searchable.includes(search);

      const statusMatches =
        !statusFilter ||
        group.status === statusFilter ||
        group.statuses.includes(statusFilter);

      return searchMatches && statusMatches;
    })
    .sort(sortGroups);

  resultsMessage.textContent =
    `${groups.length} ${
      groups.length === 1
        ? 'task assignment'
        : 'task assignments'
    } shown`;

  if (!groups.length) {
    list.innerHTML = `
      <tr>
        <td colspan="5" class="task-empty">
          No tasks match these filters.
        </td>
      </tr>
    `;

    return;
  }

  list.innerHTML = groups.map(group => {
    const task = group.base;

    const isHigh =
      String(task.priority || '').toLowerCase() === 'high';

    const description =
      task.description || 'No description provided';

    const status =
      group.status === 'mixed'
        ? 'mixed'
        : (task.status || 'todo');

    return `
      <tr>

        <td>
          <strong class="task-title">
            ${escapeHtml(
              task.title || 'Untitled task'
            )}
          </strong>

          <span
            class="task-description"
            title="${escapeHtml(description)}">
            ${escapeHtml(description)}
          </span>
        </td>

        <td>
          ${renderEmployeeChips(group.employeeIds)}
        </td>

        <td>
          <span
            class="task-priority${isHigh ? ' high' : ''}">
            ${escapeHtml(
              task.priority || 'Normal'
            )} priority
          </span>

          <span class="task-due">
            Due ${escapeHtml(
              formatDueDate(task.dueDate)
            )}
          </span>
        </td>

        <td>

          <select
            data-group-id="${escapeHtml(group.id)}"
            class="task-status-select"
            aria-label="Status for ${escapeHtml(
              task.title || 'task'
            )}"
            ${status === 'mixed' ? 'data-mixed="true"' : ''}>

            ${Object.entries(STATUS_LABELS)
              .map(
                ([value, label]) => `
                  <option
                    value="${value}"
                    ${status === value ? 'selected' : ''}>
                    ${label}
                  </option>
                `
              )
              .join('')}

          </select>

          ${
            status === 'mixed'
              ? '<small class="task-description">Different employees have different statuses</small>'
              : ''
          }

        </td>

        <td>

          <div class="actions">

            <button
              type="button"
              data-action="view"
              data-group-id="${escapeHtml(group.id)}"
              aria-label="View ${escapeHtml(
                task.title || 'task'
              )}"
              title="View task">

              <span
                class="material-symbols-outlined"
                aria-hidden="true">
                visibility
              </span>

            </button>


            <button
              type="button"
              data-action="edit"
              data-group-id="${escapeHtml(group.id)}"
              aria-label="Edit ${escapeHtml(
                task.title || 'task'
              )}"
              title="Edit task">

              <span
                class="material-symbols-outlined"
                aria-hidden="true">
                edit
              </span>

            </button>


            <button
              type="button"
              data-action="delete"
              data-group-id="${escapeHtml(group.id)}"
              aria-label="Delete ${escapeHtml(
                task.title || 'task'
              )}"
              title="Delete task">

              <span
                class="material-symbols-outlined"
                aria-hidden="true">
                delete
              </span>

            </button>

          </div>

        </td>

      </tr>
    `;
  }).join('');
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let detail = '';

    try {
      const data = await response.json();

      detail =
        data?.message
          ? ` ${data.message}`
          : '';
    } catch {
      // Ignore non-JSON error bodies.
    }

    throw new Error(
      `Request failed (${response.status}).${detail}`
    );
  }

  return response.status === 204
    ? null
    : response.json();
}

async function loadData(showLoading = true) {
  if (showLoading) {
    message.textContent = 'Loading tasks…';
  }

  try {
    const [
      tasksResponse,
      employeesResponse
    ] = await Promise.all([
      fetch(`${API}/tasks`),
      fetch(`${API}/employees`)
    ]);

    if (
      !tasksResponse.ok ||
      !employeesResponse.ok
    ) {
      throw new Error(
        'Could not load team tasks.'
      );
    }

    tasks =
      await tasksResponse.json();

    employees =
      await employeesResponse.json();

    if (
      !Array.isArray(tasks) ||
      !Array.isArray(employees)
    ) {
      throw new Error(
        'Task or employee data is invalid.'
      );
    }

    renderEmployeePicker();
    renderTasks();

    if (showLoading) {
      message.textContent = '';
    }

  } catch (error) {

    list.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="task-empty">
          Tasks are unavailable until the API is running.
        </td>
      </tr>
    `;

    resultsMessage.textContent = '';
    message.textContent =
      error.message;

    showToast(
      error.message,
      'error'
    );
  }
}

function renderEmployeePicker() {
  /* List EVERY employee (same total as the Employees page).
     Blocked accounts are shown but cannot be selected. */
  const people =
    [...employees]
      .sort(
        (a, b) =>
          String(a.name || '')
            .localeCompare(
              String(b.name || '')
            )
      );

  employeePickerTotal.textContent =
    `${people.length} ${people.length === 1 ? 'employee' : 'employees'}`;

  if (!people.length) {
    employeeOptions.innerHTML =
      '<p class="task-description">No employees available.</p>';

    return;
  }

  employeeOptions.innerHTML =
    people.map(person => {

      const blocked =
        person.status === 'Blocked';

      const checked =
        selectedEmployeeIds.has(
          String(person.id)
        );

      return `
        <label
          class="employee-option${
            blocked ? ' disabled' : ''
          }">

          <input
            type="checkbox"
            value="${escapeHtml(person.id)}"
            ${checked ? 'checked' : ''}
            ${blocked ? 'disabled' : ''}>

          <span class="employee-option-main">

            <span class="employee-option-name">
              ${escapeHtml(person.name)}
            </span>

            <span class="employee-option-meta">
              ${escapeHtml(
                person.position || 'Employee'
              )}
              ·
              ${escapeHtml(
                person.department || '—'
              )}
            </span>

          </span>

          <span class="employee-option-status">
            ${escapeHtml(
              person.status || 'Active'
            )}
          </span>

        </label>
      `;
    })
    .join('');

  updateEmployeePickerSummary();
}

function updateEmployeePickerSummary() {
  const ids =
    [...selectedEmployeeIds];

  employeePickerCount.textContent =
    `${ids.length} selected`;

  if (!ids.length) {

    employeePickerText.textContent =
      'Select employees';

    employeePickerText.classList.remove(
      'has-selection'
    );

    return;
  }

  const names =
    ids.map(employeeName);

  const firstNames =
    names
      .slice(0, 2)
      .join(', ');

  const remaining =
    names.length - 2;

  employeePickerText.textContent =
    remaining > 0
      ? `${firstNames} +${remaining} more`
      : firstNames;

  employeePickerText.classList.add(
    'has-selection'
  );
}

function setSelectedEmployees(ids) {
  selectedEmployeeIds =
    new Set(
      ids.map(String)
    );

  renderEmployeePicker();
}

function openEmployeePicker() {
  employeePicker.hidden =
    false;

  employeePickerTrigger.setAttribute(
    'aria-expanded',
    'true'
  );
}

function closeEmployeePicker() {
  employeePicker.hidden =
    true;

  employeePickerTrigger.setAttribute(
    'aria-expanded',
    'false'
  );
}

function openTaskDialog(group = null) {

  form.reset();

  setFormError('');
  closeEmployeePicker();

  editingGroupId =
    group?.id || null;

  document.getElementById(
    'editTaskId'
  ).value =
    group?.id || '';

  document.getElementById(
    'taskDialogTitle'
  ).textContent =
    group
      ? 'Edit Task Assignment'
      : 'Assign a task';

  document.getElementById(
    'taskDialogHint'
  ).textContent =
    group
      ? 'Update the task and the employees who are assigned to it.'
      : 'Set the task details and choose one or more employees.';

  saveTaskButton.textContent =
    group
      ? 'Save Changes'
      : 'Assign Task';

  setSelectedEmployees(
    group?.employeeIds || []
  );

  if (group) {

    form.elements.title.value =
      group.base.title || '';

    form.elements.priority.value =
      group.base.priority || 'Normal';

    form.elements.dueDate.value =
      group.base.dueDate || '';

    form.elements.description.value =
      group.base.description || '';
  }

  taskDialog.showModal();
}

function openViewDialog(group) {

  document.getElementById(
    'viewTitle'
  ).value =
    group.base.title
    ||
    'Untitled task';

  document.getElementById(
    'viewEmployees'
  ).innerHTML =
    renderEmployeeChips(
      group.employeeIds,
      'view-employees'
    );

  document.getElementById(
    'viewPriority'
  ).value =
    group.base.priority
    ||
    'Normal';

  document.getElementById(
    'viewDueDate'
  ).value =
    formatDueDate(
      group.base.dueDate
    );

  document.getElementById(
    'viewStatus'
  ).value =
    group.status === 'mixed'
      ? 'Mixed — employees are at different statuses'
      : (
          STATUS_LABELS[
            group.status
          ]
          ||
          group.status
          ||
          'Unknown'
        );

  document.getElementById(
    'viewAssignment'
  ).value =
    `${group.employeeIds.length} employee${
      group.employeeIds.length === 1
        ? ''
        : 's'
    }`;

  document.getElementById(
    'viewDescription'
  ).value =
    group.base.description
    ||
    'No description provided';

  viewDialog.showModal();
}

async function createTaskForEmployees(
  data,
  employeeIds,
  assignmentId = null
) {

  assignmentId =
    assignmentId
    ||
    `ASSIGN-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  /* One request at a time: json-server keeps everything in a single JSON
     file, so parallel writes collide and silently lose tasks. */
  for (const [index, employeeId] of employeeIds.entries()) {
    await (
      async () => {

        const task = {

          id:
            `TASK-${Date.now()}-${index}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,

          assignmentId,

          title:
            data.title,

          description:
            data.description,

          employeeId:
            Number.isNaN(
              Number(employeeId)
            )
              ? employeeId
              : Number(employeeId),

          priority:
            data.priority,

          dueDate:
            data.dueDate,

          category:
            data.category || 'sprint',

          team:
            data.team || 'Team',

          status:
            data.status || 'todo',

          order:
            tasks.length + index + 1
        };

        await apiJson(
          `${API}/tasks`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(task)
          }
        );
      }
    )();
  }
}

async function updateTaskAssignment(
  group,
  data,
  selectedIds
) {

  const oldIds =
    new Set(
      group.employeeIds.map(String)
    );

  const newIds =
    new Set(
      selectedIds.map(String)
    );

  const baseUpdates = {

    title:
      data.title,

    description:
      data.description,

    priority:
      data.priority,

    dueDate:
      data.dueDate
  };

  const commonStatus =
    group.status === 'mixed'
      ? 'todo'
      : group.status;

  for (const task of group.tasks) {

    const oldEmployeeId =
      String(
        task.employeeId
      );

    if (
      newIds.has(
        oldEmployeeId
      )
    ) {

      await apiJson(
        `${API}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              baseUpdates
            )
        }
      );

    } else {

      await apiJson(
        `${API}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: 'DELETE'
        }
      );
    }
  }

  const additions =
    selectedIds.filter(
      id =>
        !oldIds.has(
          String(id)
        )
    );

  if (additions.length) {

    await createTaskForEmployees(
      {
        ...data,

        category:
          group.base.category,

        team:
          group.base.team,

        status:
          commonStatus

      },
      additions,
      group.id
    );
  }

  // Keep the existing grouped assignment ID on newly-created records.
  // If the group was completely replaced, createTaskForEmployees already assigned its own grouping.
}

async function updateGroupStatus(
  group,
  newStatus
) {

  for (const task of group.tasks) {

    await apiJson(
      `${API}/tasks/${encodeURIComponent(task.id)}`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify({
            status:
              newStatus
          })
      }
    );
  }
}

async function deleteGroup(group) {

  for (const task of group.tasks) {

    await apiJson(
      `${API}/tasks/${encodeURIComponent(task.id)}`,
      {
        method: 'DELETE'
      }
    );
  }
}

employeeOptions.addEventListener(
  'change',
  event => {

    if (
      !event.target.matches(
        'input[type="checkbox"]'
      )
    ) {
      return;
    }

    const id =
      String(
        event.target.value
      );

    if (
      event.target.checked
    ) {

      selectedEmployeeIds.add(id);

    } else {

      selectedEmployeeIds.delete(id);
    }

    updateEmployeePickerSummary();
  }
);

employeePickerTrigger.addEventListener(
  'click',
  () => {

    if (
      employeePicker.hidden
    ) {

      openEmployeePicker();

    } else {

      closeEmployeePicker();
    }
  }
);

document.addEventListener(
  'click',
  event => {

    if (
      !employeePicker.hidden &&
      !event.target.closest('.dialog-field')
    ) {
      closeEmployeePicker();
    }
  }
);

document
  .getElementById(
    'selectAllEmployees'
  )
  .addEventListener(
    'click',
    () => {

      selectedEmployeeIds =
        new Set(
          employees
            .filter(
              person =>
                person.status !== 'Blocked'
            )
            .map(
              person =>
                String(person.id)
            )
        );

      renderEmployeePicker();
    }
  );

document
  .getElementById(
    'clearEmployees'
  )
  .addEventListener(
    'click',
    () => {

      setSelectedEmployees([]);
    }
  );

list.addEventListener(
  'change',
  async event => {

    if (
      !event.target.classList.contains(
        'task-status-select'
      )
    ) {
      return;
    }

    const group =
      getGroup(
        event.target.dataset.groupId
      );

    if (!group) {
      return;
    }

    event.target.disabled =
      true;

    try {

      await updateGroupStatus(
        group,
        event.target.value
      );

      await loadData(false);

      showToast(
        'Task status updated.',
        'success'
      );

    } catch (error) {

      showToast(
        error.message,
        'error'
      );

      renderTasks();
    }
  }
);

list.addEventListener(
  'click',
  event => {

    const button =
      event.target.closest(
        'button[data-action]'
      );

    if (!button) {
      return;
    }

    const group =
      getGroup(
        button.dataset.groupId
      );

    if (!group) {
      return;
    }

    if (
      button.dataset.action ===
      'view'
    ) {

      openViewDialog(group);
      return;
    }

    if (
      button.dataset.action ===
      'edit'
    ) {

      openTaskDialog(group);
      return;
    }

    if (
      button.dataset.action ===
      'delete'
    ) {

      deleteGroupId =
        group.id;

      document.getElementById(
        'deleteMessage'
      ).textContent =
        `Delete “${group.base.title}”? This will remove the task for all ${group.employeeIds.length} assigned employee${
          group.employeeIds.length === 1
            ? ''
            : 's'
        }.`;

      deleteDialog.showModal();
    }
  }
);

form.addEventListener(
  'submit',
  async event => {

    event.preventDefault();

    setFormError('');
    closeEmployeePicker();

    const fields =
      new FormData(form);

    const title =
      String(
        fields.get('title')
        ||
        ''
      ).trim();

    const selectedIds =
      [...selectedEmployeeIds];

    if (!title) {

      setFormError(
        'Enter a task title.'
      );

      return;
    }

    if (!selectedIds.length) {

      setFormError(
        'Choose at least one employee.'
      );

      return;
    }

    const data = {

      title,

      description:
        String(
          fields.get('description')
          ||
          ''
        ).trim(),

      priority:
        String(
          fields.get('priority')
          ||
          'Normal'
        ),

      dueDate:
        String(
          fields.get('dueDate')
          ||
          ''
        )
    };

    saveTaskButton.disabled =
      true;

    try {

      if (editingGroupId) {

        const group =
          getGroup(
            editingGroupId
          );

        if (!group) {
          throw new Error(
            'The task assignment could not be found.'
          );
        }

        await updateTaskAssignment(
          group,
          data,
          selectedIds
        );

        showToast(
          'Task assignment updated.',
          'success'
        );

      } else {

        await createTaskForEmployees(
          data,
          selectedIds
        );

        showToast(
          `Task assigned to ${selectedIds.length} employee${
            selectedIds.length === 1
              ? ''
              : 's'
          }.`,
          'success'
        );
      }

      taskDialog.close();

      await loadData(false);

    } catch (error) {

      setFormError(
        error.message
      );

      showToast(
        error.message,
        'error'
      );

    } finally {

      saveTaskButton.disabled =
        false;
    }
  }
);

document
  .getElementById(
    'addTaskButton'
  )
  .addEventListener(
    'click',
    () =>
      openTaskDialog()
  );

document
  .getElementById(
    'closeTaskDialog'
  )
  .addEventListener(
    'click',
    () =>
      taskDialog.close()
  );

document
  .getElementById(
    'cancelTaskDialog'
  )
  .addEventListener(
    'click',
    () =>
      taskDialog.close()
  );

document
  .getElementById(
    'closeViewDialog'
  )
  .addEventListener(
    'click',
    () =>
      viewDialog.close()
  );

document
  .getElementById(
    'closeViewDialogFooter'
  )
  .addEventListener(
    'click',
    () =>
      viewDialog.close()
  );

document
  .getElementById(
    'cancelDelete'
  )
  .addEventListener(
    'click',
    () => {

      deleteGroupId =
        null;

      deleteDialog.close();
    }
  );

document
  .getElementById(
    'confirmDelete'
  )
  .addEventListener(
    'click',
    async () => {

      if (!deleteGroupId) {
        return;
      }

      const group =
        getGroup(
          deleteGroupId
        );

      if (!group) {
        return;
      }

      const button =
        document.getElementById(
          'confirmDelete'
        );

      button.disabled =
        true;

      try {

        await deleteGroup(group);

        deleteGroupId =
          null;

        deleteDialog.close();

        await loadData(false);

        showToast(
          'Task deleted.',
          'success'
        );

      } catch (error) {

        showToast(
          error.message,
          'error'
        );

      } finally {

        button.disabled =
          false;
      }
    }
  );

document
  .getElementById(
    'taskSearch'
  )
  .addEventListener(
    'input',
    renderTasks
  );

document
  .getElementById(
    'taskStatus'
  )
  .addEventListener(
    'change',
    renderTasks
  );

taskDialog.addEventListener(
  'close',
  () => {

    editingGroupId =
      null;

    selectedEmployeeIds.clear();

    setFormError('');

    closeEmployeePicker();
  }
);

loadData();