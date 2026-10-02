const API = 'http://127.0.0.1:3000';
const list = document.getElementById('taskList');
const message = document.getElementById('taskMessage');
const form = document.getElementById('newTaskForm');
let tasks = [];
let employees = [];

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
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'operations-empty';
    empty.textContent = 'No tasks match these filters.';
    list.append(empty);
    return;
  }
  for (const task of visible) {
    const card = document.createElement('article');
    card.className = 'operation-card';
    const info = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = task.title;
    const detail = document.createElement('p');
    detail.textContent = task.description || 'No description';
    const meta = document.createElement('small');
    meta.textContent = `${employeeName(task.employeeId)} · ${task.priority} priority · Due ${task.dueDate || 'not set'}`;
    info.append(title, detail, meta);
    const actions = document.createElement('div');
    actions.className = 'operation-actions';
    const statusSelect = document.createElement('select');
    statusSelect.setAttribute('aria-label', `Status for ${task.title}`);
    for (const [value, label] of [['todo', 'To do'], ['progress', 'In progress'], ['review', 'Under review'], ['completed', 'Completed']]) {
      statusSelect.append(new Option(label, value));
    }
    statusSelect.value = task.status;
    statusSelect.addEventListener('change', async () => {
      const response = await fetch(`${API}/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusSelect.value })
      }).catch(() => null);
      if (!response?.ok) {
        statusSelect.value = task.status;
        message.textContent = 'Could not change task status.';
        return;
      }
      task.status = statusSelect.value;
      message.textContent = 'Task updated.';
      renderTasks();
    });
    actions.append(statusSelect);
    card.append(info, actions);
    list.append(card);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = new FormData(form);
  const task = {
    id: `TASK-${Date.now()}`,
    title: String(fields.get('title')).trim(),
    description: String(fields.get('description')).trim(),
    employeeId: Number(fields.get('employeeId')),
    priority: fields.get('priority'),
    dueDate: fields.get('dueDate'),
    category: 'sprint', team: 'Team', status: 'todo', order: tasks.length + 1
  };
  if (!task.title || !task.employeeId) return;
  try {
    const response = await fetch(`${API}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Could not assign task.');
    form.reset();
    message.textContent = 'Task assigned.';
    await loadTasks();
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById('taskSearch').addEventListener('input', renderTasks);
document.getElementById('taskStatus').addEventListener('change', renderTasks);
loadTasks();
