const API = 'http://127.0.0.1:3000';
const list = document.getElementById('feedbackList');
const message = document.getElementById('feedbackMessage');
const search = document.getElementById('feedbackSearch');
const categoryFilter = document.getElementById('categoryFilter');
const sort = document.getElementById('sortFeedback');
let feedbackItems = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => String(name || '?').trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();

async function loadFeedback() {
  message.textContent = 'Loading feedback…';
  try {
    const response = await fetch(`${API}/feedback?_sort=createdAt&_order=desc`);
    if (!response.ok) throw new Error('Could not load feedback.');
    feedbackItems = await response.json();
    if (!Array.isArray(feedbackItems)) throw new Error('Feedback data is invalid.');
    fillCategories();
    render();
  } catch (error) {
    feedbackItems = [];
    list.replaceChildren();
    message.textContent = `${error.message} Make sure the API is running.`;
  }
}

function fillCategories() {
  const current = categoryFilter.value;
  const categories = ['General Feedback', 'Feature Request', 'HR Support', 'Report Policy Issue' ];
  categoryFilter.replaceChildren(new Option('All categories', ''), ...categories.map(value => new Option(value, value)));
  categoryFilter.value = categories.includes(current) ? current : '';
}

function filteredFeedback() {
  const query = search.value.trim().toLowerCase();
  const filtered = feedbackItems.filter(item => {
    const matchesQuery = [item.name, item.email, item.subject, item.message, item.category]
      .some(value => String(value || '').toLowerCase().includes(query));
    return matchesQuery && (!categoryFilter.value || item.category === categoryFilter.value);
  });
  return filtered.sort((a, b) => {
    const difference = new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0);
    return sort.value === 'oldest' ? difference : -difference;
  });
}

function attachmentMarkup(attachment) {
  if (!attachment?.name || !attachment?.data) return '';
  return `<a class="feedback-attachment" href="${escapeHtml(attachment.data)}" download="${escapeHtml(attachment.name)}"><span class="material-symbols-outlined" aria-hidden="true">attach_file</span>${escapeHtml(attachment.name)}</a>`;
}

function render() {
  const filtered = filteredFeedback();
  const unread = feedbackItems.filter(item => item.read !== true).length;
  const high = feedbackItems.filter(item => item.priority === 'High').length;
  document.getElementById('totalFeedback').textContent = feedbackItems.length;
  document.getElementById('unreadFeedback').textContent = unread;
  document.getElementById('highFeedback').textContent = high;
  message.textContent = feedbackItems.length ? `${filtered.length} submission${filtered.length === 1 ? '' : 's'}` : '';

  if (!filtered.length) {
    list.innerHTML = `<div class="feedback-empty"><span class="material-symbols-outlined" aria-hidden="true">mark_chat_read</span>${feedbackItems.length ? 'No submissions match these filters.' : 'No feedback has been submitted yet.'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    const author = item.anonymous ? 'Anonymous Employee' : item.name || 'Employee';
    const date = new Date(item.createdAt || item.date || '');
    const dateText = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const priority = ['High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Not set';
    return `<article class="feedback-card ${item.read === true ? '' : 'is-unread'}" data-id="${escapeHtml(item.id)}">
      <div class="feedback-card-main">
        <div class="feedback-card-top"><span class="feedback-category">${escapeHtml(item.category || 'General feedback')}</span><span>${escapeHtml(dateText)}</span><span class="feedback-priority ${priority.toLowerCase()}">${escapeHtml(priority)}</span></div>
        <div class="feedback-author"><span class="feedback-avatar" aria-hidden="true">${item.anonymous ? '◌' : escapeHtml(initials(author))}</span><div><strong>${escapeHtml(author)}</strong><small>${item.anonymous ? 'Identity hidden by sender' : escapeHtml(item.email || '')}</small></div></div>
        <h2>${escapeHtml(item.subject || 'No subject')}</h2>
        <p class="feedback-body">${escapeHtml(item.message || '')}</p>
        ${attachmentMarkup(item.attachment)}
      </div>
      <div class="feedback-card-actions">
        <label>Priority<select data-action="priority" aria-label="Set priority for ${escapeHtml(item.subject || 'feedback')}"><option value="">Not set</option><option ${item.priority === 'Low' ? 'selected' : ''}>Low</option><option ${item.priority === 'Medium' ? 'selected' : ''}>Medium</option><option ${item.priority === 'High' ? 'selected' : ''}>High</option></select></label>
        <button type="button" data-action="read" ${item.read === true ? 'disabled' : ''}><span class="material-symbols-outlined" aria-hidden="true">${item.read === true ? 'mark_email_read' : 'mark_email_unread'}</span>${item.read === true ? 'Reviewed' : 'Mark as reviewed'}</button>
      </div>
    </article>`;
  }).join('');
}

async function updateFeedback(id, changes) {
  const response = await fetch(`${API}/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  });
  if (!response.ok) throw new Error('Could not update this submission.');
  const updated = await response.json();
  feedbackItems = feedbackItems.map(item => String(item.id) === String(id) ? updated : item);
  render();
}

list.addEventListener('change', async event => {
  if (event.target.dataset.action !== 'priority') return;
  const card = event.target.closest('[data-id]');
  try { await updateFeedback(card.dataset.id, { priority: event.target.value || null }); }
  catch (error) { message.textContent = error.message; }
});
list.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action="read"]');
  if (!button) return;
  const card = button.closest('[data-id]');
  try { await updateFeedback(card.dataset.id, { read: true }); }
  catch (error) { message.textContent = error.message; }
});
search.addEventListener('input', render);
categoryFilter.addEventListener('change', render);
sort.addEventListener('change', render);
document.getElementById('refreshFeedback').addEventListener('click', loadFeedback);
loadFeedback();
