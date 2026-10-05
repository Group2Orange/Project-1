// Employee workspace: a greeting, the top open tasks and the upcoming meetings (the data comes from the API).
const API = "http://127.0.0.1:3000";

const taskList = document.getElementById("workspaceTaskList");
const meetingList = document.getElementById("workspaceMeetingList");

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

// Reads the logged-in user (null when nobody is logged in).
function getUser() {
  return JSON.parse(localStorage.getItem("loggedUser"));
}

// ----- Greeting and date -----
const now = new Date();
let greeting = "Good evening";
if (now.getHours() < 12) {
  greeting = "Good morning";
} else if (now.getHours() < 18) {
  greeting = "Good afternoon";
}

let firstName = "Marcus";
try {
  const user = getUser();
  if (user && user.name) {
    firstName = user.name.trim().split(/\s+/)[0];
  }
} catch (error) {
  console.warn("Could not read the logged-in user:", error);
}
document.getElementById("workspaceGreeting").textContent = `${greeting}, ${firstName} 👋`;
document.getElementById("workspaceDate").textContent = now.toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});

// ================= TASKS =================

// Builds one task row (a link to the task in My Tasks).
function makeTaskRow(task) {
  let label = "To do";
  let tagClass = "workspace-task-tag";
  if (task.priority === "High") {
    label = "High priority";
    tagClass = "workspace-task-tag is-high";
  } else if (task.status === "review") {
    label = "Under review";
    tagClass = "workspace-task-tag is-review";
  } else if (task.status === "progress") {
    label = "In progress";
  }

  let due = "";
  if (task.dueDate) {
    const date = new Date(`${task.dueDate}T00:00:00`);
    const dueText = isNaN(date.getTime()) ? "" : `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    due = `<span class="workspace-task-due">${escapeHtml(dueText)}</span>`;
  }

  const row = document.createElement("a");
  row.className = "workspace-task";
  row.href = task.id ? `../my-tasks/my-tasks.html?task=${task.id}` : "../my-tasks/my-tasks.html";
  row.innerHTML = `<span class="workspace-task-marker" aria-hidden="true"><span class="material-symbols-outlined">check</span></span><div class="workspace-task-info"><strong>${escapeHtml(task.title || "Untitled task")}</strong><div class="workspace-task-meta"><span class="${tagClass}">${label}</span><span>${escapeHtml(task.team || "Team task")}</span></div></div>${due}`;
  return row;
}

// Gives each priority a number, so the most important tasks come first.
function priorityRank(task) {
  const order = { High: 0, Normal: 1, Routine: 2 };
  if (order[task.priority] === undefined) {
    return 3; // unknown priorities go to the end of the list
  }
  return order[task.priority];
}

async function showTasks() {
  const note = document.getElementById("workspaceTasksNote");
  let tasks = [];
  try {
    const user = getUser();
    if (user && user.id) {
      const response = await fetch(`${API}/tasks?employeeId=${user.id}`);
      if (!response.ok) {
        note.textContent = "Could not load your tasks. Start the API with npm run api.";
        return;
      }
      tasks = await response.json();
    }
  } catch (error) {
    note.textContent = `${error.message} Start the API with npm run api.`;
    return;
  }

  // filter() keeps the open tasks, sort() puts the important ones first, slice() keeps the first three.
  const open = tasks.filter(task => task && task.status !== "completed");
  const preview = open.slice().sort((a, b) => priorityRank(a) - priorityRank(b)).slice(0, 3);

  document.getElementById("workspaceActiveTasks").textContent = String(open.length);
  document.getElementById("workspaceTaskSummary").textContent = `${open.length} tasks in your task list`;
  note.textContent = "Your top open tasks from My Tasks.";
  document.getElementById("workspaceTasksLink").firstChild.textContent = `Go to My Tasks (${open.length}) `;

  taskList.innerHTML = "";
  if (preview.length === 0) {
    const empty = document.createElement("p");
    empty.className = "workspace-task-empty";
    empty.textContent = "No open tasks right now.";
    taskList.appendChild(empty);
    return;
  }
  preview.forEach(function (task) {
    taskList.appendChild(makeTaskRow(task));
  });
}

// ================= MEETINGS =================

// Today as text: 2026-10-05
function todayText(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Turns "14:30" or "02:30 PM" into the time format of the browser.
function formatMeetingTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) {
    return text || "Time not set";
  }
  let hour = Number(match[1]);
  if (match[3]) {
    hour = (hour % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  }
  const date = new Date();
  date.setHours(hour, Number(match[2]), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Turns a time into minutes after midnight (14:30 becomes 870), so two times can be compared.
function meetingMinutes(value) {
  let time = "";
  if (window.HelpdeskMeetings) {
    time = window.HelpdeskMeetings.normaliseTime(value);
  }
  if (!time) {
    time = String(value || "");
  }
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return Infinity;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

// A meeting is scheduled when HR approved it (or when a new time was asked and the room already exists).
function isScheduledMeeting(meeting) {
  if (meeting.status === "Approved" || meeting.status === "Confirmed") {
    return true;
  }
  const hasRoom = Boolean(meeting.meetingLink || meeting.meetingRoom);
  return meeting.status === "Reschedule Requested" && hasRoom;
}

// Builds one meeting row (a list item).
function makeMeetingRow(meeting) {
  const start = formatMeetingTime(meeting.timeFrom || meeting.time);
  const end = meeting.timeTo ? formatMeetingTime(meeting.timeTo) : "";
  let day = "Today";
  if (meeting.date !== todayText(new Date())) {
    day = new Date(`${meeting.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  const duration = meeting.duration ? ` · ${meeting.duration}` : "";
  const timeRange = end ? `${start} – ${end}` : `${start}${duration}`;

  let platform = "";
  if (window.HelpdeskMeetings) {
    platform = window.HelpdeskMeetings.platformLabel(meeting);
  }
  if (!platform) {
    platform = meeting.platform || meeting.channel || "Meeting";
  }

  // The Join link only shows for meetings that are approved.
  let join = "";
  let joinUrl = "";
  if (window.HelpdeskMeetings) {
    joinUrl = window.HelpdeskMeetings.joinLink(meeting);
  }
  if (joinUrl && ["Approved", "Confirmed", "Reschedule Requested"].includes(meeting.status)) {
    join = `<a href="${escapeHtml(joinUrl)}" target="_blank" rel="noopener noreferrer">Join meeting</a>`;
  }

  const item = document.createElement("li");
  item.innerHTML = `<time>${escapeHtml(`${day} · ${timeRange}`)}</time><strong>${escapeHtml(meeting.subject || "Helpdesk meeting")}</strong><span>${escapeHtml(`${platform} · ${meeting.status}`)}</span>${join}`;
  return item;
}

// Shows one message in the meeting list.
function showMeetingMessage(message) {
  const item = document.createElement("li");
  item.className = "workspace-meeting-empty";
  item.textContent = message;
  meetingList.innerHTML = "";
  meetingList.appendChild(item);
}

// Something went wrong: the numbers show that the schedule is not available.
function showAgendaProblem(message) {
  document.getElementById("workspaceMeetingTotal").textContent = "—";
  document.getElementById("workspaceMeetingCount").textContent = "Unavailable";
  document.getElementById("workspaceMeetingSummary").textContent = "Meeting schedule unavailable";
  showMeetingMessage(`${message} Start the API with npm run api.`);
}

async function showAgenda() {
  try {
    const user = getUser();
    if (!user || !user.id) {
      showAgendaProblem("Sign in to see your meetings.");
      return;
    }
    const response = await fetch(`${API}/helpdeskRequests?employeeId=${user.id}&type=meeting`);
    if (!response.ok) {
      showAgendaProblem("Could not load your meetings.");
      return;
    }
    const allMeetings = await response.json();

    const current = new Date();
    const today = todayText(current);
    const currentMinutes = current.getHours() * 60 + current.getMinutes();

    // filter() keeps the scheduled meetings that have not finished yet.
    const upcoming = allMeetings.filter(function (meeting) {
      const notFinishedYet = meeting.date > today || meetingMinutes(meeting.timeTo || meeting.time || meeting.timeFrom) >= currentMinutes;
      return meeting.date >= today && isScheduledMeeting(meeting) && notFinishedYet;
    });

    // sort() puts the earliest date first, then the earliest start time.
    upcoming.sort(function (a, b) {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return meetingMinutes(a.timeFrom || a.time) - meetingMinutes(b.timeFrom || b.time);
    });
    const shown = upcoming.slice(0, 3);

    document.getElementById("workspaceMeetingTotal").textContent = String(upcoming.length);
    document.getElementById("workspaceMeetingCount").textContent = upcoming.length > shown.length ? `Next ${shown.length} of ${upcoming.length}` : `${upcoming.length} upcoming`;
    document.getElementById("workspaceMeetingSummary").textContent = upcoming.length
      ? `Your next ${Math.min(3, upcoming.length)} scheduled meeting${upcoming.length === 1 ? "" : "s"}`
      : "No upcoming approved meetings";

    if (shown.length === 0) {
      showMeetingMessage("No upcoming approved or confirmed meetings.");
      return;
    }
    meetingList.innerHTML = "";
    shown.forEach(function (meeting) {
      meetingList.appendChild(makeMeetingRow(meeting));
    });
  } catch (error) {
    showAgendaProblem(error.message);
  }
}

// ================= START =================
showTasks();
showAgenda();
window.addEventListener("pageshow", showTasks);
window.addEventListener("pageshow", showAgenda);

// The agenda checks the time again every minute, and when the person comes back to the tab.
setInterval(showAgenda, 60 * 1000);
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    showAgenda();
  }
});
