const API = 'http://127.0.0.1:3000';
const list = document.getElementById('taskList');
const message = document.getElementById('taskMessage');
const form = document.getElementById('newTaskForm');
const taskDialog = document.getElementById('taskDialog');

const initialStatus = new URLSearchParams(location.search).get('status');
if (['todo', 'progress', 'review', 'completed'].includes(initialStatus)) {
  document.getElementById('taskStatus').value = initialStatus;
}

let tasks = [];
let employees = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function loadTasks() {
  try {
    const [tasksResponse, employeesResponse] = await Promise.all([
      fetch(`${API}/tasks`), fetch(`${API}/employees`)
    ]);
    if (!tasksResponse.ok || !employeesResponse.ok) throw new Error('Could not load team tasks.');
    tasks = await tasksResponse.json();
    employees = await employeesResponse.json();
    const select = form.elements.employeeId;
    const selected = select.value;
    select.replaceChildren(new Option('Choose employee', ''), ...employees.filter(person => person.role === 'EMP' && person.status !== 'Blocked').map(person => new Option(person.name, person.id)));
    select.value = selected;
    renderTasks();
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

function employeeName(id) {
  return employees.find(person => String(person.id) === String(id))?.name || `Employee #${id}`;
}

function renderTasks() {
  const search = document.getElementById('taskSearch').value.trim().toLowerCase();
  const status = document.getElementById('taskStatus').value;
  const visible = tasks.filter(task =>
    (!status || task.status === status) && `${task.title} ${employeeName(task.employeeId)}`.toLowerCase().includes(search)
  ).sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  
  if (!visible.length) {
    list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 30px; color: var(--color-secondary);">No tasks match these filters.</td></tr>`;
    return;
  }

  list.innerHTML = visible.map(task => {
    const name = employeeName(task.employeeId);
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    
    let dueHtml = 'not set';
    if (task.dueDate) {
      const date = new Date(`${task.dueDate}T00:00:00`);
      dueHtml = Number.isNaN(date.getTime()) ? escapeHtml(task.dueDate) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    
    const isHigh = task.priority === 'High';
    
    return `
      <tr>
        <td>
          <div class="identity" style="align-items:flex-start;">
            <div>
              <strong style="font-size:13px; color:#1a3039; margin-bottom:2px;">${escapeHtml(task.title)}</strong>
              <small style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(task.description || '')}">${escapeHtml(task.description || 'No description provided')}</small>
            </div>
          </div>
        </td>
        <td>
          <div class="identity">
            <span class="identity-avatar">${escapeHtml(initials)}</span>
            <strong>${escapeHtml(name)}</strong>
          </div>
        </td>
        <td class="department-cell">
          <strong style="${isHigh ? 'color:#b63742;' : ''}">${escapeHtml(task.priority)} priority</strong>
          <small>Due ${dueHtml}</small>
        </td>
        <td>
          <select data-task-id="${escapeHtml(task.id)}" class="task-status-select" aria-label="Status for ${escapeHtml(task.title)}">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To do</option>
            <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>In progress</option>
            <option value="review" ${task.status === 'review' ? 'selected' : ''}>Under review</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td style="text-align:right;">
          <div class="actions">
            <button type="button" data-action="view" data-id="${escapeHtml(task.id)}" aria-label="View"><span class="material-symbols-outlined">visibility</span></button>
            <button type="button" data-action="edit" data-id="${escapeHtml(task.id)}" aria-label="Edit"><span class="material-symbols-outlined">edit</span></button>
            <button type="button" data-action="delete" data-id="${escapeHtml(task.id)}" aria-label="Delete"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

list.addEventListener('change', async event => {
  if (event.target.classList.contains('task-status-select')) {
    const select = event.target;
    const taskId = select.dataset.taskId;
    const newStatus = select.value;
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;
    
    const oldStatus = task.status;
    select.disabled = true;
    try {
      const response = await fetch(`${API}/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error();
      task.status = newStatus;
      message.textContent = 'Task status updated.';
    } catch {
      select.value = oldStatus;
      message.textContent = 'Could not change task status.';
    } finally {
      select.disabled = false;
      renderTasks();
    }
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = new FormData(form);
  const editId = document.getElementById('editTaskId').value;
  
  const taskData = {
    title: String(fields.get('title')).trim(),
    description: String(fields.get('description')).trim(),
    employeeId: Number(fields.get('employeeId')),
    priority: fields.get('priority'),
    dueDate: fields.get('dueDate')
  };
  
  if (!taskData.title || !taskData.employeeId) return;
  
  try {
    if (editId) {
      const response = await fetch(`${API}/tasks/${encodeURIComponent(editId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error('Could not update task.');
      message.textContent = 'Task updated.';
    } else {
      const task = {
        id: `TASK-${Date.now()}`,
        ...taskData,
        category: 'sprint', team: 'Team', status: 'todo', order: tasks.length + 1
      };
      const response = await fetch(`${API}/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task)
      });
      if (!response.ok) throw new Error('Could not assign task.');
      message.textContent = 'Task assigned.';
    }
    
    form.reset();
    document.getElementById('editTaskId').value = '';
    taskDialog.close();
    await loadTasks();
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById('addTaskButton').addEventListener('click', () => {
  form.reset();
  document.getElementById('editTaskId').value = '';
  document.getElementById('taskDialogTitle').textContent = 'Assign a task';
  taskDialog.showModal();
});
document.getElementById('closeTaskDialog').addEventListener('click', () => taskDialog.close());
document.getElementById('cancelTaskDialog').addEventListener('click', () => taskDialog.close());

document.getElementById('taskSearch').addEventListener('input', renderTasks);
document.getElementById('taskStatus').addEventListener('change', renderTasks);
loadTasks();

// Actions logic
const viewDialog = document.getElementById('viewDialog');
const deleteDialog = document.getElementById('deleteDialog');
let deleteTaskId = null;

list.addEventListener('click', event => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  
  const taskId = btn.dataset.id;
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;
  
  const action = btn.dataset.action;
  
  if (action === 'view') {
    document.getElementById('viewTitle').value = task.title;
    document.getElementById('viewEmployee').value = employeeName(task.employeeId);
    document.getElementById('viewPriority').value = task.priority;
    document.getElementById('viewDueDate').value = task.dueDate || 'not set';
    document.getElementById('viewStatus').value = task.status;
    document.getElementById('viewDescription').value = task.description || 'No description';
    viewDialog.showModal();
  } 
  else if (action === 'edit') {
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('taskDialogTitle').textContent = 'Edit Task';
    
    form.elements.title.value = task.title;
    form.elements.employeeId.value = task.employeeId;
    form.elements.priority.value = task.priority || 'Normal';
    form.elements.dueDate.value = task.dueDate || '';
    form.elements.description.value = task.description || '';
    
    taskDialog.showModal();
  }
  else if (action === 'delete') {
    deleteTaskId = task.id;
    deleteDialog.showModal();
  }
});

document.getElementById('closeViewDialog').addEventListener('click', () => viewDialog.close());

document.getElementById('cancelDelete').addEventListener('click', () => {
  deleteTaskId = null;
  deleteDialog.close();
});

document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deleteTaskId) return;
  try {
    const response = await fetch(`${API}/tasks/${encodeURIComponent(deleteTaskId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error('Could not delete task.');
    message.textContent = 'Task deleted.';
    deleteTaskId = null;
    deleteDialog.close();
    await loadTasks();
  } catch (error) {
    message.textContent = error.message;
  }
});
