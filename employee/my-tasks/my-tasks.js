// My Tasks: a board with four columns (the data comes from the API).
// The employee drags a task to another column, sends it for review and can attach a PDF.
const API = "http://127.0.0.1:3000";
const MAX_PDF_SIZE = 1024 * 1024; // 1 MB

let tasks = [];
let savedTasks = {}; // how every task looked at the last save, as JSON text. The key is the task id.
let saveQueue = Promise.resolve(); // the saves wait for each other here
let selectedTaskId = null; // the task that is open in the popup
let draggedTaskId = null; // the task that is being dragged
let activeCategory = "all";
let blockCardClick = false;

const taskSearch = document.getElementById("taskSearch");
const priorityFilter = document.getElementById("priorityFilter");
const filterPanel = document.getElementById("filterPanel");
const taskDialog = document.getElementById("taskDialog");
const sendTaskBtn = document.getElementById("sendTaskBtn");
const pdfInput = document.getElementById("pdfInput");

// ── Small helpers ────────────────────────────────────────────────────────────

// Shows an error message above the board.
function showApiMessage(text) {
  document.getElementById("taskApiMessage").textContent = text;
}

// Stops text from being read as HTML, so what people type cannot break the page.
function escapeHtml(value) {
  if (value === undefined) {
    value = "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTask(id) {
  return tasks.find(task => task.id === id);
}

function formatDate(date) {
  if (!date) {
    return "No date";
  }
  return new Date(`${date}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(status) {
  const labels = { todo: "To Do", progress: "In Progress", review: "Under Review", completed: "Completed" };
  return labels[status] || status;
}

function getCategoryLabel(category) {
  const labels = { sprint: "Sprint & Daily Work", onboarding: "Onboarding & Compliance", review: "Review & Sign-offs" };
  return labels[category] || category;
}

// A task is overdue when its due date is before today and it is not completed.
function isOverdue(task) {
  if (!task.dueDate || task.status === "completed") {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`) < today;
}

// The color of the priority label on a card.
function getPriorityClass(task) {
  if (task.status === "completed") {
    return "completed";
  }
  if (task.status === "review") {
    return "review";
  }
  return task.priority.toLowerCase();
}

// ── Load and save the tasks ──────────────────────────────────────────────────

async function loadTasks() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("loggedUser"));
  } catch (error) {
    user = null;
  }
  if (user === null || !user.id || user.role !== "EMP") {
    return;
  }

  try {
    const response = await fetch(`${API}/tasks?employeeId=${user.id}`);
    if (!response.ok) {
      showApiMessage("Could not load tasks. Start the API with npm run api.");
      return;
    }
    tasks = await response.json();
  } catch (error) {
    showApiMessage(error.message);
    return;
  }

  // Remember how every task looks now, so we can see later which ones changed.
  savedTasks = {};
  tasks.forEach(function (task) {
    savedTasks[String(task.id)] = JSON.stringify(task);
  });

  showTasks();
  // my-tasks.html?task=TASK-001 opens that task.
  const requestedTaskId = location.search.split("=")[1];
  if (requestedTaskId) {
    openTask(requestedTaskId);
  }
  updateSidebarTasks();
}

// Sends only the tasks that changed since the last save.
// A Promise is a "later result". The saves wait for each other, one after another.
function saveTasks() {
  // A copy of the changed tasks, made with JSON, so later changes do not mix with this save.
  const changed = tasks
    .filter(task => savedTasks[String(task.id)] !== JSON.stringify(task))
    .map(task => JSON.parse(JSON.stringify(task)));

  saveQueue = saveQueue.then(function () {
    return sendTasks(changed);
  });
}

// PUT replaces a whole task in the API.
async function sendTasks(changed) {
  try {
    for (const task of changed) {
      const response = await fetch(`${API}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task)
      });
      if (!response.ok) {
        showApiMessage("Could not save task changes.");
        return;
      }
      savedTasks[String(task.id)] = JSON.stringify(task);
    }
    updateSidebarTasks();
  } catch (error) {
    showApiMessage(error.message);
  }
}

// ── The board ────────────────────────────────────────────────────────────────

// Does the task match the search, the category and the priority the person chose?
function matchesFilters(task) {
  const search = taskSearch.value.trim().toLowerCase();
  const priority = priorityFilter.value;

  const text = [task.title, task.description, task.team].join(" ").toLowerCase();
  const matchesSearch = !search || text.includes(search);
  const matchesCategory = activeCategory === "all" || task.category === activeCategory;

  let matchesPriority = true;
  if (priority === "overdue") {
    matchesPriority = isOverdue(task);
  } else if (priority !== "all") {
    matchesPriority = task.priority === priority;
  }
  return matchesSearch && matchesCategory && matchesPriority;
}

// Builds the card (an <article>) of one task.
function makeTaskCard(task) {
  const overdue = isOverdue(task) ? `<div class="overdue-badge">⚠ Overdue</div>` : "";
  const attachment = task.attachment ? `<div class="pdf-badge">📎 PDF Attached</div>` : "";

  // A card that does not match the filters is hidden.
  let baseClass = "task-card";
  if (task.status === "completed") {
    baseClass += " completed";
  }
  if (!matchesFilters(task)) {
    baseClass += " hidden";
  }

  const card = document.createElement("article");
  card.className = baseClass;
  card.draggable = true;
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

  // Clicking the card opens the details (but not right after a drag).
  card.onclick = function () {
    if (!blockCardClick) {
      openTask(task.id);
    }
  };

  // "this" is the card that is dragged.
  card.ondragstart = function (event) {
    blockCardClick = true;
    draggedTaskId = task.id;
    this.className = baseClass + " dragging";
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  };

  card.ondragend = function () {
    this.className = baseClass;
    draggedTaskId = null;
    document.querySelectorAll(".drop-zone").forEach(function (zone) {
      zone.className = "drop-zone";
    });
    setTimeout(function () {
      blockCardClick = false;
    }, 100);
  };

  return card;
}

// Puts every task in the column of its status, and shows the numbers.
function showTasks() {
  document.querySelectorAll(".drop-zone").forEach(function (zone) {
    zone.innerHTML = "";
  });

  // sort() puts the tasks in their saved order.
  tasks
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(function (task) {
      const zone = document.querySelector(`.drop-zone[data-status="${task.status}"]`);
      if (zone) {
        zone.appendChild(makeTaskCard(task));
      }
    });

  showStats();
}

// The numbers: tasks in every column, active, completed and due soon.
function showStats() {
  ["todo", "progress", "review", "completed"].forEach(function (status) {
    const count = tasks.filter(task => task.status === status).length;
    document.querySelector(`[data-count="${status}"]`).textContent = count;
  });

  const active = tasks.filter(task => task.status !== "completed");
  const completed = tasks.filter(task => task.status === "completed");
  document.getElementById("totalActiveCount").textContent = active.length;
  document.getElementById("completedCount").textContent = completed.length;

  // Due soon: not completed, and due today or in the next 48 hours.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 48 * 60 * 60 * 1000);
  const dueSoon = active.filter(function (task) {
    if (!task.dueDate) {
      return false;
    }
    const dueDate = new Date(`${task.dueDate}T00:00:00`);
    return dueDate >= today && dueDate <= limit;
  });
  document.getElementById("dueSoonCount").textContent = dueSoon.length;
}

// ── Drag a task to another column ────────────────────────────────────────────

document.querySelectorAll(".drop-zone").forEach(function (zone) {
  // "this" is the column. preventDefault() allows a task to be dropped here.
  zone.addEventListener("dragover", function (event) {
    event.preventDefault();
    this.className = "drop-zone drag-over";
  });

  zone.addEventListener("dragleave", function () {
    this.className = "drop-zone";
  });

  zone.addEventListener("drop", function (event) {
    event.preventDefault();
    this.className = "drop-zone";

    const id = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const task = getTask(id);
    if (!task) {
      return;
    }

    // The task gets the status of the column, and goes to the end of it.
    task.status = this.getAttribute("data-status");
    if (task.status === "completed") {
      task.completedAt = new Date().toISOString();
    } else {
      delete task.completedAt;
    }
    task.order = tasks.filter(item => item.status === task.status).length;

    saveTasks();
    showTasks();
  });
});

// ── The task popup ───────────────────────────────────────────────────────────

// Puts a text in an element, or a dash when there is no text.
function setText(id, value) {
  document.getElementById(id).textContent = value || "-";
}

function openTask(id) {
  const task = getTask(id);
  if (!task) {
    return;
  }
  selectedTaskId = id;

  setText("taskTitle", task.title);
  setText("taskDescription", task.description);
  setText("taskId", task.id);
  setText("taskTeam", task.team);
  setText("taskCategory", getCategoryLabel(task.category));
  setText("taskDueDate", formatDate(task.dueDate));
  setText("taskStatus", getStatusLabel(task.status));
  setText("taskPriority", task.priority);
  document.getElementById("taskPriority").className = task.priority === "High" ? "priority-badge high" : "priority-badge";
  document.getElementById("dialogMessage").textContent = "";

  updateSendButton(task);
  showAttachment(task);
  taskDialog.showModal();
}

// The Send button: "Send Task", or "Task Sent" / "Completed" (then it is disabled).
function updateSendButton(task) {
  sendTaskBtn.disabled = task.status === "review" || task.status === "completed";

  if (task.status === "review") {
    sendTaskBtn.innerHTML = `
      <span class="material-symbols-outlined">check</span>
      Task Sent
    `;
  } else if (task.status === "completed") {
    sendTaskBtn.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      Completed
    `;
  } else {
    sendTaskBtn.innerHTML = `
      <span class="material-symbols-outlined">send</span>
      Send Task
    `;
  }
}

sendTaskBtn.onclick = function () {
  const task = getTask(selectedTaskId);
  if (!task || task.status === "review" || task.status === "completed") {
    return;
  }

  task.status = "review";
  task.sentAt = new Date().toISOString();
  task.order = tasks.filter(item => item.status === "review").length;

  saveTasks();
  showTasks();
  setText("taskStatus", "Under Review");
  document.getElementById("dialogMessage").textContent = "Task sent successfully.";
  updateSendButton(task);
};

// Shows the attached PDF in the popup (or "No PDF attached.").
function showAttachment(task) {
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

document.getElementById("attachPdfBtn").onclick = function () {
  pdfInput.click();
};

// "this" is the file input that changed.
pdfInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file || !selectedTaskId) {
    return;
  }
  const message = document.getElementById("dialogMessage");

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    message.textContent = "Please select a PDF file.";
    this.value = "";
    return;
  }
  if (file.size > MAX_PDF_SIZE) {
    message.textContent = "PDF must be 1 MB or smaller.";
    this.value = "";
    return;
  }

  // FileReader turns the PDF into text, so it can be saved in the API.
  const reader = new FileReader();
  reader.onload = function () {
    const task = getTask(selectedTaskId);
    if (!task) {
      return;
    }
    task.attachment = { name: file.name, size: file.size, data: reader.result };

    saveTasks();
    showAttachment(task);
    showTasks();
    message.textContent = "PDF attached successfully.";
    pdfInput.value = "";
  };
  reader.readAsDataURL(file);
});

document.getElementById("removeAttachmentBtn").onclick = function () {
  const task = getTask(selectedTaskId);
  if (!task || !task.attachment) {
    return;
  }
  delete task.attachment;

  saveTasks();
  showAttachment(task);
  showTasks();
  document.getElementById("dialogMessage").textContent = "Attachment removed.";
};

document.getElementById("closeDialogBtn").onclick = function () {
  taskDialog.close();
};

// A click on the dark area around the popup closes it.
taskDialog.addEventListener("click", function (event) {
  if (event.target === taskDialog) {
    taskDialog.close();
  }
});

// ── Search and filters ───────────────────────────────────────────────────────

taskSearch.addEventListener("input", showTasks);
priorityFilter.addEventListener("change", showTasks);

document.getElementById("toggleFiltersBtn").onclick = function () {
  filterPanel.hidden = !filterPanel.hidden;
};

// The tabs: the clicked tab gets the class "active".
document.querySelectorAll(".tab").forEach(function (tab) {
  tab.onclick = function () {
    activeCategory = this.getAttribute("data-category");
    document.querySelectorAll(".tab").forEach(function (other) {
      other.className = other === tab ? "tab active" : "tab";
    });
    showTasks();
  };
});

document.getElementById("clearFiltersBtn").onclick = function () {
  taskSearch.value = "";
  priorityFilter.value = "all";
  activeCategory = "all";
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.className = tab.getAttribute("data-category") === "all" ? "tab active" : "tab";
  });
  showTasks();
};

loadTasks();
