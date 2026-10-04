const API = "http://127.0.0.1:3000";
const MAX_PDF_SIZE = 1024 * 1024;

let tasks = [];
// Last saved JSON text of every task, keyed by task id, e.g. { "1": "<task as JSON text>" }
let persistedTasks = {};
let taskSaveQueue = Promise.resolve();
let selectedTaskId = null;
let draggedTaskId = null;
let activeCategory = "all";
let blockCardClick = false;

const taskSearch = document.getElementById("taskSearch");
const priorityFilter = document.getElementById("priorityFilter");
const categoryTabs = document.getElementById("categoryTabs");
const filterPanel = document.getElementById("filterPanel");
const taskDialog = document.getElementById("taskDialog");
const sendTaskBtn = document.getElementById("sendTaskBtn");
const pdfInput = document.getElementById("pdfInput");

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

async function initializeTasks() {
  const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  if (!user || !user.id || user.role !== 'EMP') return;
  try {
    const response = await fetch(`${API}/tasks?employeeId=${encodeURIComponent(user.id)}`);
    if (!response.ok) throw new Error('Could not load tasks. Start the API with npm run api.');
    tasks = await response.json();
    persistedTasks = {};
    tasks.forEach(task => {
      persistedTasks[String(task.id)] = JSON.stringify(task);
    });
  } catch (error) {
    console.error(error);
    document.getElementById('taskApiMessage').textContent = error.message;
    return;
  }
  renderTasks();
  const requestedTaskId = new URLSearchParams(window.location.search).get('task');
  if (requestedTaskId) openTask(requestedTaskId);
  window.dispatchEvent(new Event('teamspace:tasks-changed'));
}

// Send only the tasks that changed since the last save.
// Saves run one after another (each waits for the previous promise).
function saveTasks() {
  const changed = tasks
    .filter(task => persistedTasks[String(task.id)] !== JSON.stringify(task))
    .map(clone);
  taskSaveQueue = taskSaveQueue.then(async () => {
    for (const task of changed) {
      const response = await fetch(`${API}/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!response.ok) throw new Error('Could not save task changes.');
      persistedTasks[String(task.id)] = JSON.stringify(task);
    }
    window.dispatchEvent(new Event('teamspace:tasks-changed'));
  }).catch(error => {
    console.error(error);
    document.getElementById('taskApiMessage').textContent = error.message;
  });
  return taskSaveQueue;
}

function getTask(id) {
  return tasks.find(task => task.id === id);
}

function escapeHtml(value) {
  if (value === undefined) value = "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  if (!date) return "No date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(status) {
  const labels = {
    todo: "To Do",
    progress: "In Progress",
    review: "Under Review",
    completed: "Completed"
  };

  return labels[status] || status;
}

function getCategoryLabel(category) {
  const labels = {
    sprint: "Sprint & Daily Work",
    onboarding: "Onboarding & Compliance",
    review: "Review & Sign-offs"
  };

  return labels[category] || category;
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "completed") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${task.dueDate}T00:00:00`);

  return dueDate < today;
}

function getPriorityClass(task) {
  if (task.status === "completed") return "completed";
  if (task.status === "review") return "review";
  return task.priority.toLowerCase();
}

function createTaskCard(task) {
  const card = document.createElement("article");

  card.className = `task-card ${task.status === "completed" ? "completed" : ""}`;
  card.dataset.id = task.id;
  card.draggable = true;

  const overdue = isOverdue(task)
    ? `<div class="overdue-badge">⚠ Overdue</div>`
    : "";

  const attachment = task.attachment
    ? `<div class="pdf-badge">📎 PDF Attached</div>`
    : "";

  card.innerHTML = `
    <div class="task-top">
      <span class="priority ${getPriorityClass(task)}">
        ${escapeHtml(task.priority)}
      </span>

      <span class="material-symbols-outlined drag-icon">
        drag_indicator
      </span>
    </div>

    <h3>${escapeHtml(task.title)}</h3>
    <p>${escapeHtml(task.description)}</p>

    ${overdue}
    ${attachment}

    <div class="task-footer">
      <span class="team">${escapeHtml(task.team)}</span>

      <span class="due-date">
        <span class="material-symbols-outlined">schedule</span>
        ${formatDate(task.dueDate)}
      </span>
    </div>
  `;

  card.addEventListener("click", () => {
    if (!blockCardClick) openTask(task.id);
  });

  card.addEventListener("dragstart", event => {
    blockCardClick = true;
    draggedTaskId = task.id;

    card.classList.add("dragging");

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    draggedTaskId = null;

    document.querySelectorAll(".drop-zone").forEach(zone => {
      zone.classList.remove("drag-over");
    });

    setTimeout(() => {
      blockCardClick = false;
    }, 100);
  });

  return card;
}

function renderTasks() {
  document.querySelectorAll(".drop-zone").forEach(zone => {
    zone.innerHTML = "";
  });

  tasks
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(task => {
      const zone = document.querySelector(
        `.drop-zone[data-status="${task.status}"]`
      );

      if (zone) zone.appendChild(createTaskCard(task));
    });

  updateStats();
  applyFilters();
}

document.querySelectorAll(".drop-zone").forEach(zone => {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", event => {
    event.preventDefault();

    zone.classList.remove("drag-over");

    const id =
      event.dataTransfer.getData("text/plain") ||
      draggedTaskId;

    const task = getTask(id);

    if (!task) return;

    task.status = zone.dataset.status;

    if (task.status === "completed") {
      task.completedAt = new Date().toISOString();
    } else {
      delete task.completedAt;
    }

    task.order =
      tasks.filter(item => item.status === task.status).length;

    saveTasks();
    renderTasks();
  });
});

function updateStats() {
  ["todo", "progress", "review", "completed"].forEach(status => {
    const count = tasks.filter(task => task.status === status).length;

    const element = document.querySelector(
      `[data-count="${status}"]`
    );

    if (element) element.textContent = count;
  });

  const active = tasks.filter(task => task.status !== "completed");
  const completed = tasks.filter(task => task.status === "completed");

  document.getElementById("totalActiveCount").textContent = active.length;
  document.getElementById("completedCount").textContent = completed.length;
  const sidebarTaskCount = document.getElementById("sidebarTaskCount");
  if (sidebarTaskCount) sidebarTaskCount.textContent = active.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(
    today.getTime() + 48 * 60 * 60 * 1000
  );

  const dueSoon = active.filter(task => {
    if (!task.dueDate) return false;

    const dueDate = new Date(`${task.dueDate}T00:00:00`);

    return dueDate >= today && dueDate <= limit;
  });

  document.getElementById("dueSoonCount").textContent = dueSoon.length;

  const progress = tasks.length
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;

  const progressText = document.getElementById("weeklyProgressText");
  if (progressText) progressText.textContent = `${progress}%`;

  const progressBar = document.getElementById("weeklyProgressBar");
  if (progressBar) progressBar.style.width = `${progress}%`;
  const progressMeter = document.querySelector('.employee-sidebar [role="progressbar"]');
  if (progressMeter) progressMeter.setAttribute('aria-valuenow', String(progress));
}

function applyFilters() {
  const search = taskSearch.value.trim().toLowerCase();
  const priority = priorityFilter.value;

  document.querySelectorAll(".task-card").forEach(card => {
    const task = getTask(card.dataset.id);

    if (!task) return;

    const text = [
      task.title,
      task.description,
      task.team
    ].join(" ").toLowerCase();

    const matchesSearch =
      !search ||
      text.includes(search);

    const matchesCategory =
      activeCategory === "all" ||
      task.category === activeCategory;

    const matchesPriority =
      priority === "all"
        ? true
        : priority === "overdue"
          ? isOverdue(task)
          : task.priority === priority;

    card.classList.toggle(
      "hidden",
      !(matchesSearch && matchesCategory && matchesPriority)
    );
  });
}

function setText(id, value) {
  document.getElementById(id).textContent = value || "-";
}

function openTask(id) {
  const task = getTask(id);

  if (!task) return;

  selectedTaskId = id;

  setText("taskTitle", task.title);
  setText("taskDescription", task.description);
  setText("taskId", task.id);
  setText("taskTeam", task.team);
  setText("taskCategory", getCategoryLabel(task.category));
  setText("taskDueDate", formatDate(task.dueDate));
  setText("taskStatus", getStatusLabel(task.status));
  setText("taskPriority", task.priority);

  document
    .getElementById("taskPriority")
    .classList.toggle("high", task.priority === "High");

  document.getElementById("dialogMessage").textContent = "";

  updateSendButton(task);
  renderAttachment(task);

  taskDialog.showModal();
}

function updateSendButton(task) {
  const disabled =
    task.status === "review" ||
    task.status === "completed";

  sendTaskBtn.disabled = disabled;

  if (task.status === "review") {
    sendTaskBtn.innerHTML = `
      <span class="material-symbols-outlined">check</span>
      Task Sent
    `;
    return;
  }

  if (task.status === "completed") {
    sendTaskBtn.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      Completed
    `;
    return;
  }

  sendTaskBtn.innerHTML = `
    <span class="material-symbols-outlined">send</span>
    Send Task
  `;
}

sendTaskBtn.addEventListener("click", () => {
  const task = getTask(selectedTaskId);

  if (
    !task ||
    task.status === "review" ||
    task.status === "completed"
  ) {
    return;
  }

  task.status = "review";
  task.sentAt = new Date().toISOString();
  task.order = tasks.filter(item => item.status === "review").length;

  saveTasks();
  renderTasks();

  setText("taskStatus", "Under Review");

  document.getElementById("dialogMessage").textContent =
    "Task sent successfully.";

  updateSendButton(task);
});

document.getElementById("attachPdfBtn").addEventListener("click", () => {
  pdfInput.click();
});

pdfInput.addEventListener("change", () => {
  const file = pdfInput.files[0];

  if (!file || !selectedTaskId) return;

  const message = document.getElementById("dialogMessage");

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    message.textContent = "Please select a PDF file.";
    pdfInput.value = "";
    return;
  }

  if (file.size > MAX_PDF_SIZE) {
    message.textContent = "PDF must be 1 MB or smaller.";
    pdfInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const task = getTask(selectedTaskId);

    if (!task) return;

    task.attachment = {
      name: file.name,
      size: file.size,
      data: reader.result
    };

    try {
      saveTasks();

      renderAttachment(task);
      renderTasks();

      message.textContent = "PDF attached successfully.";
    } catch (error) {
      delete task.attachment;
      message.textContent = "Unable to save the PDF.";
    }

    pdfInput.value = "";
  };

  reader.readAsDataURL(file);
});

function renderAttachment(task) {
  const empty = document.getElementById("noAttachment");
  const fileBox = document.getElementById("attachmentFile");
  const openLink = document.getElementById("openAttachment");

  if (!task.attachment) {
    empty.hidden = false;
    fileBox.hidden = true;
    openLink.removeAttribute("href");
    return;
  }

  empty.hidden = true;
  fileBox.hidden = false;

  setText("attachmentName", task.attachment.name);
  setText("attachmentSize", formatFileSize(task.attachment.size));

  openLink.href = task.attachment.data;
}

document.getElementById("removeAttachmentBtn").addEventListener(
  "click",
  () => {
    const task = getTask(selectedTaskId);

    if (!task || !task.attachment) return;

    delete task.attachment;

    saveTasks();
    renderAttachment(task);
    renderTasks();

    document.getElementById("dialogMessage").textContent =
      "Attachment removed.";
  }
);

document.getElementById("closeDialogBtn").addEventListener(
  "click",
  () => taskDialog.close()
);

taskDialog.addEventListener("click", event => {
  if (event.target === taskDialog) {
    taskDialog.close();
  }
});

taskSearch.addEventListener("input", applyFilters);

priorityFilter.addEventListener("change", applyFilters);

document.getElementById("toggleFiltersBtn").addEventListener(
  "click",
  () => {
    filterPanel.hidden = !filterPanel.hidden;
  }
);

document.getElementById("clearFiltersBtn").addEventListener(
  "click",
  () => {
    taskSearch.value = "";
    priorityFilter.value = "all";
    activeCategory = "all";

    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.toggle(
        "active",
        tab.dataset.category === "all"
      );
    });

    applyFilters();
  }
);

categoryTabs.addEventListener("click", event => {
  const tab = event.target.closest(".tab");

  if (!tab) return;

  activeCategory = tab.dataset.category;

  document.querySelectorAll(".tab").forEach(item => {
    item.classList.toggle("active", item === tab);
  });

  applyFilters();
});

initializeTasks();
