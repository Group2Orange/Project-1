const workspaceTaskList = document.getElementById('workspaceTaskList');
const workspaceMeetingList = document.getElementById('workspaceMeetingList');
const API = 'http://127.0.0.1:3000';

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

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMeetingTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return raw || 'Time not set';

  let hour = Number(match[1]);
  const minute = match[2];
  if (match[3]) {
    const period = match[3].toUpperCase();
    hour = hour % 12 + (period === 'PM' ? 12 : 0);
  }
  const date = new Date();
  date.setHours(hour, Number(minute), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function meetingMinutes(value) {
  const normalized = window.HelpdeskMeetings?.normaliseTime(value) || String(value || '');
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
}

function isScheduledMeeting(meeting) {
  if (['Approved', 'Confirmed'].includes(meeting.status)) return true;
  return meeting.status === 'Reschedule Requested' && Boolean(meeting.meetingLink || meeting.meetingRoom);
}

function meetingRow(meeting) {
  const item = document.createElement('li');
  const start = formatMeetingTime(meeting.timeFrom || meeting.time);
  const end = meeting.timeTo ? formatMeetingTime(meeting.timeTo) : '';
  const date = meeting.date === localDateString(new Date())
    ? 'Today'
    : new Date(`${meeting.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = document.createElement('time');
  const timeRange = end ? `${start} – ${end}` : `${start}${meeting.duration ? ` · ${meeting.duration}` : ''}`;
  time.textContent = `${date} · ${timeRange}`;

  const title = document.createElement('strong');
  title.textContent = meeting.subject || 'Helpdesk meeting';

  const details = document.createElement('span');
  const platform = window.HelpdeskMeetings?.platformLabel(meeting) || meeting.platform || meeting.channel || 'Meeting';
  details.textContent = `${platform} · ${meeting.status}`;
  item.append(time, title, details);

  const joinUrl = window.HelpdeskMeetings?.joinLink(meeting);
  if (joinUrl && ['Approved', 'Confirmed', 'Reschedule Requested'].includes(meeting.status)) {
    const join = document.createElement('a');
    join.href = joinUrl;
    join.target = '_blank';
    join.rel = 'noopener noreferrer';
    join.textContent = 'Join meeting';
    item.append(join);
  }
  return item;
}

function showMeetingMessage(message) {
  const item = document.createElement('li');
  item.className = 'workspace-meeting-empty';
  item.textContent = message;
  workspaceMeetingList.replaceChildren(item);
}

async function renderWorkspaceAgenda() {
  const total = document.getElementById('workspaceMeetingTotal');
  const count = document.getElementById('workspaceMeetingCount');
  const summary = document.getElementById('workspaceMeetingSummary');
  try {
    const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
    if (!user?.id) throw new Error('Sign in to see your meetings.');

    const query = new URLSearchParams({ employeeId: String(user.id), type: 'meeting' });
    const response = await fetch(`${API}/helpdeskRequests?${query}`);
    if (!response.ok) throw new Error('Could not load your meetings.');

    const now = new Date();
    const today = localDateString(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const upcomingMeetings = (await response.json())
      .filter(meeting => String(meeting.employeeId) === String(user.id) &&
        meeting.type === 'meeting' && meeting.date >= today && isScheduledMeeting(meeting) &&
        (meeting.date > today || meetingMinutes(meeting.timeTo || meeting.time || meeting.timeFrom) >= currentMinutes))
      .sort((left, right) => left.date.localeCompare(right.date) ||
        meetingMinutes(left.timeFrom || left.time) - meetingMinutes(right.timeFrom || right.time));
    const meetings = upcomingMeetings.slice(0, 3);

    total.textContent = String(upcomingMeetings.length);
    count.textContent = upcomingMeetings.length > meetings.length
      ? `Next ${meetings.length} of ${upcomingMeetings.length}`
      : `${upcomingMeetings.length} upcoming`;
    summary.textContent = upcomingMeetings.length
      ? `Your next ${Math.min(3, upcomingMeetings.length)} scheduled meeting${upcomingMeetings.length === 1 ? '' : 's'}`
      : 'No upcoming approved meetings';
    if (!meetings.length) {
      showMeetingMessage('No upcoming approved or confirmed meetings.');
      return;
    }
    workspaceMeetingList.replaceChildren(...meetings.map(meetingRow));
  } catch (error) {
    console.error('Could not load the workspace agenda:', error);
    total.textContent = '—';
    count.textContent = 'Unavailable';
    summary.textContent = 'Meeting schedule unavailable';
    showMeetingMessage(`${error.message} Start the API with npm run api.`);
  }
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
renderWorkspaceAgenda();
window.addEventListener('teamspace:tasks-changed', renderWorkspaceTasks);
window.addEventListener('pageshow', renderWorkspaceTasks);
window.addEventListener('pageshow', renderWorkspaceAgenda);
window.setInterval(renderWorkspaceAgenda, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderWorkspaceAgenda();
});
