// HR feedback inbox: shows the feedback that employees sent (the data comes from the API).
const API = "http://127.0.0.1:3000";

const list = document.getElementById("feedbackList");
const message = document.getElementById("feedbackMessage");
const search = document.getElementById("feedbackSearch");
const categoryFilter = document.getElementById("categoryFilter");
const sort = document.getElementById("sortFeedback");

let feedbackItems = [];

// Stops text from being read as HTML, so what employees type cannot break the page.
function escapeHtml(text) {
  if (text === undefined || text === null) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "Lana Ahmed" becomes "LA".
function getInitials(name) {
  return String(name || "?").trim().split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();
}

// ----- Load the feedback from the API -----
async function loadFeedback() {
  message.textContent = "Loading feedback…";
  try {
    const response = await fetch(`${API}/feedback?_sort=createdAt&_order=desc`);
    if (!response.ok) {
      showLoadError("Could not load feedback.");
      return;
    }
    feedbackItems = await response.json();
    fillCategories();
    showFeedback();
  } catch (error) {
    showLoadError(error.message);
  }
}

function showLoadError(text) {
  feedbackItems = [];
  list.innerHTML = "";
  message.textContent = `${text} Make sure the API is running.`;
}

// Fills the category list and keeps the category that was selected.
function fillCategories() {
  const current = categoryFilter.value;
  const categories = ["General Feedback", "Feature Request", "HR Support", "Report Policy Issue"];
  categoryFilter.innerHTML = '<option value="">All categories</option>';
  categories.forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categoryFilter.appendChild(option);
  });
  categoryFilter.value = categories.includes(current) ? current : "";
}

// ----- Search, filter and sort -----
function getVisibleFeedback() {
  const query = search.value.trim().toLowerCase();

  const visible = feedbackItems.filter(function (item) {
    const fields = [item.name, item.email, item.subject, item.message, item.category];
    const matchesQuery = fields.some(function (value) {
      return String(value || "").toLowerCase().includes(query);
    });
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value;
    return matchesQuery && matchesCategory;
  });

  // sort() puts the newest first (or the oldest first) by comparing the dates.
  visible.sort(function (a, b) {
    const difference = new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0);
    return sort.value === "oldest" ? difference : -difference;
  });
  return visible;
}

// ----- Show the numbers and the cards -----
function showFeedback() {
  const visible = getVisibleFeedback();
  const unread = feedbackItems.filter(item => item.read !== true).length;
  const high = feedbackItems.filter(item => item.priority === "High").length;

  document.getElementById("totalFeedback").textContent = feedbackItems.length;
  document.getElementById("unreadFeedback").textContent = unread;
  document.getElementById("highFeedback").textContent = high;
  message.textContent = feedbackItems.length ? `${visible.length} submission${visible.length === 1 ? "" : "s"}` : "";

  list.innerHTML = "";
  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "feedback-empty";
    empty.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">mark_chat_read</span>${feedbackItems.length ? "No submissions match these filters." : "No feedback has been submitted yet."}`;
    list.appendChild(empty);
    return;
  }

  visible.forEach(function (item) {
    list.appendChild(makeCard(item));
  });
}

// Builds one card (an <article>) for one piece of feedback.
function makeCard(item) {
  const author = item.anonymous ? "Anonymous Employee" : item.name || "Employee";
  const date = new Date(item.createdAt || item.date || "");
  const dateText = isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const priority = ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Not set";
  const isRead = item.read === true;

  let attachment = "";
  if (item.attachment && item.attachment.name && item.attachment.data) {
    attachment = `<a class="feedback-attachment" href="${escapeHtml(item.attachment.data)}" download="${escapeHtml(item.attachment.name)}"><span class="material-symbols-outlined" aria-hidden="true">attach_file</span>${escapeHtml(item.attachment.name)}</a>`;
  }

  const card = document.createElement("article");
  card.className = isRead ? "feedback-card" : "feedback-card is-unread";
  card.innerHTML = `<div class="feedback-card-main">
        <div class="feedback-card-top"><span class="feedback-category">${escapeHtml(item.category || "General feedback")}</span><span>${escapeHtml(dateText)}</span><span class="feedback-priority ${priority.toLowerCase()}">${escapeHtml(priority)}</span></div>
        <div class="feedback-author"><span class="feedback-avatar" aria-hidden="true">${item.anonymous ? "◌" : escapeHtml(getInitials(author))}</span><div><strong>${escapeHtml(author)}</strong><small>${item.anonymous ? "Identity hidden by sender" : escapeHtml(item.email || "")}</small></div></div>
        <h2>${escapeHtml(item.subject || "No subject")}</h2>
        <p class="feedback-body">${escapeHtml(item.message || "")}</p>
        ${attachment}
      </div>
      <div class="feedback-card-actions">
        <label>Priority<select aria-label="Set priority for ${escapeHtml(item.subject || "feedback")}"><option value="">Not set</option><option ${item.priority === "Low" ? "selected" : ""}>Low</option><option ${item.priority === "Medium" ? "selected" : ""}>Medium</option><option ${item.priority === "High" ? "selected" : ""}>High</option></select></label>
        <button type="button" ${isRead ? "disabled" : ""}><span class="material-symbols-outlined" aria-hidden="true">${isRead ? "mark_email_read" : "mark_email_unread"}</span>${isRead ? "Reviewed" : "Mark as reviewed"}</button>
      </div>`;

  // "this" is the select that HR changed.
  card.querySelector("select").onchange = function () {
    updateFeedback(item.id, { priority: this.value || null });
  };
  card.querySelector("button").onclick = function () {
    updateFeedback(item.id, { read: true });
  };
  return card;
}

// ----- Save a change in the API (PATCH changes only the fields we send) -----
async function updateFeedback(id, changes) {
  try {
    const response = await fetch(`${API}/feedback/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });
    if (!response.ok) {
      message.textContent = "Could not update this submission.";
      return;
    }
    const updated = await response.json();
    feedbackItems = feedbackItems.map(function (item) {
      return String(item.id) === String(id) ? updated : item;
    });
    showFeedback();
  } catch (error) {
    message.textContent = error.message;
  }
}

search.addEventListener("input", showFeedback);
categoryFilter.addEventListener("change", showFeedback);
sort.addEventListener("change", showFeedback);
document.getElementById("refreshFeedback").addEventListener("click", loadFeedback);

loadFeedback();
