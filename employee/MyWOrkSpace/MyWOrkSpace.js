const workspaceTaskList = document.getElementById('workspaceTaskList');

const now = new Date();
const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
let firstName = 'Marcus';
try {
  const user = JSON.parse(localStorage.getItem('loggedUser'));
  if (user?.name) firstName = user.name.trim().split(/\s+/)[0];
} catch (error) {
  console.warn('Could not read the logged-in user for My Workspace:', error);
}
document.getElementById('workspaceGreeting').textContent = `${greeting}, ${firstName} 👋`;
document.getElementById('workspaceDate').textContent = now.toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric'
});

function taskRow(task) {
  const row = document.createElement('a');
  row.className = 'workspace-task';
  row.href = `../my-tasks/my-tasks.html${task.id ? `?task=${encodeURIComponent(task.id)}` : ''}`;

  const marker = document.createElement('span');
  marker.className = 'workspace-task-marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.innerHTML = '<span class="material-symbols-outlined">check</span>';

  const info = document.createElement('div');
  info.className = 'workspace-task-info';
  const title = document.createElement('strong');
  title.textContent = task.title || 'Untitled task';
  const meta = document.createElement('div');
  meta.className = 'workspace-task-meta';
  const tag = document.createElement('span');
  const label = task.priority === 'High' ? 'High priority' : task.status === 'review' ? 'Under review' : task.status === 'progress' ? 'In progress' : 'To do';
  tag.className = `workspace-task-tag${task.priority === 'High' ? ' is-high' : task.status === 'review' ? ' is-review' : ''}`;
  tag.textContent = label;
  const team = document.createElement('span');
  team.textContent = task.team || 'Team task';
  meta.append(tag, team);
  info.append(title, meta);
  row.append(marker, info);

  if (task.dueDate) {
    const due = document.createElement('span');
    due.className = 'workspace-task-due';
    const date = new Date(`${task.dueDate}T00:00:00`);
    due.textContent = Number.isNaN(date.getTime()) ? '' : `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    row.append(due);
  }

  return row;
}

async function renderWorkspaceTasks() {
  let tasks = [];
  try {
    const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
    if (user?.id) {
      const response = await fetch(`http://127.0.0.1:3000/tasks?employeeId=${encodeURIComponent(user.id)}`);
      if (!response.ok) throw new Error('Could not load your tasks.');
      tasks = await response.json();
    }
  } catch (error) {
    console.error(error);
    document.getElementById('workspaceTasksNote').textContent = `${error.message} Start the API with npm run api.`;
    return;
  }
  const active = tasks.filter(task => task && task.status !== 'completed');
  const priorityOrder = { High: 0, Normal: 1, Routine: 2 };
  const preview = [...active].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)).slice(0, 3);

  document.getElementById('workspaceActiveTasks').textContent = String(active.length);
  document.getElementById('workspaceTaskSummary').textContent = `${active.length} tasks in your task list`;
  document.getElementById('workspaceTasksNote').textContent = 'Your top open tasks from My Tasks.';
  document.getElementById('workspaceTasksLink').firstChild.textContent = `Go to My Tasks (${active.length}) `;

  workspaceTaskList.replaceChildren();
  if (!preview.length) {
    const empty = document.createElement('p');
    empty.className = 'workspace-task-empty';
    empty.textContent = 'No open tasks right now.';
    workspaceTaskList.append(empty);
    return;
  }
  workspaceTaskList.append(...preview.map(taskRow));
}

renderWorkspaceTasks();
window.addEventListener('teamspace:tasks-changed', renderWorkspaceTasks);
window.addEventListener('pageshow', renderWorkspaceTasks);
