const API = 'http://127.0.0.1:3000';
const container = document.getElementById('policiesContainer');
const links = document.getElementById('policyLinks');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const addBtn = document.getElementById('addBtn');
const dialog = document.getElementById('policyDialog');
const form = document.getElementById('policyForm');
const formError = document.getElementById('policyFormError');
const pageMessage = document.getElementById('policyMessage');
let policies = [];
let editing = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function showMessage(text) {
  pageMessage.textContent = text;
  pageMessage.hidden = !text;
}

function showPolicies() {
  container.replaceChildren();
  links.replaceChildren();
  const empty = policies.length === 0;
  document.getElementById('main').classList.toggle('is-empty', empty);
  document.getElementById('rightSide').hidden = empty;
  editBtn.disabled = empty;
  document.getElementById('pdf').disabled = empty;

  if (empty) {
    container.innerHTML = '<div class="policy-empty"><span>No company policies have been added yet.</span><button type="button" id="emptyAddBtn">Add the first policy</button></div>';
    document.getElementById('emptyAddBtn').addEventListener('click', openAddDialog);
    return;
  }

  for (const policy of policies) {
    const id = encodeURIComponent(policy.id);
    const card = document.createElement('article');
    card.className = 'policy';
    card.id = `policy-${id}`;
    card.dataset.id = policy.id;
    card.innerHTML = `<p class="category editable">${escapeHtml(policy.category)}</p><h3 class="title editable">${escapeHtml(policy.title)}</h3><p class="description editable">${escapeHtml(policy.description)}</p>`;
    container.append(card);

    const link = document.createElement('a');
    link.className = 'policy-link';
    link.href = `#policy-${id}`;
    link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
    links.append(link);
  }
}

async function loadPolicies() {
  showMessage('');
  try {
    const response = await fetch(`${API}/policies`);
    if (!response.ok) throw new Error('Could not load policies.');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Policy data is invalid.');
    policies = data;
    showPolicies();
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
    policies = [];
    showPolicies();
  }
}

function setEditing(enabled) {
  editing = enabled;
  editBtn.classList.toggle('hidden', enabled);
  saveBtn.classList.toggle('hidden', !enabled);
  cancelBtn.classList.toggle('hidden', !enabled);
  addBtn.disabled = enabled;
  if (enabled) {
    container.querySelectorAll('.editable').forEach(item => {
      item.contentEditable = 'true';
      item.classList.add('editing');
    });
  } else {
    showPolicies();
  }
}

function openAddDialog() {
  form.reset();
  formError.hidden = true;
  dialog.showModal();
  form.elements.title.focus();
}

addBtn.addEventListener('click', openAddDialog);
document.getElementById('pdf').addEventListener('click', async () => {
  const button = document.getElementById('pdf');
  button.disabled = true;
  try {
    // Read again so the download includes the latest policies in api/db.json.
    const response = await fetch(`${API}/policies`);
    if (!response.ok) throw new Error('Could not download policies.');
    const latest = await response.json();
    if (!Array.isArray(latest) || !latest.length) throw new Error('There are no policies to download.');
    const sections = latest.map(policy => `<section><p class="category">${escapeHtml(policy.category)}</p><h2>${escapeHtml(policy.title)}</h2><p>${escapeHtml(policy.description).replaceAll('\n', '<br>')}</p></section>`).join('');
    const documentHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TeamSpace HR Policies</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:16px/1.6 Arial,sans-serif;color:#18313a}h1{color:#00626a}section{padding:20px 0;border-top:1px solid #d9e3e9}h2{margin:0 0 8px;font-size:21px}.category{margin:0 0 5px;color:#00626a;font-size:12px;font-weight:bold;text-transform:uppercase}section p:last-child{margin:0}small{color:#587080}@media print{body{margin:0;max-width:none}}</style></head><body><h1>TeamSpace HR Policies</h1><small>Downloaded ${escapeHtml(new Date().toLocaleDateString())}</small>${sections}</body></html>`;
    const url = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TeamSpace-HR-Policies.html';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage('Downloaded the latest policies.');
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
  } finally {
    button.disabled = policies.length === 0;
  }
});
document.getElementById('closePolicyDialog').addEventListener('click', () => dialog.close());
document.getElementById('cancelPolicyDialog').addEventListener('click', () => dialog.close());
editBtn.addEventListener('click', () => setEditing(true));
cancelBtn.addEventListener('click', () => { setEditing(false); showMessage(''); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  const policy = {
    title: form.elements.title.value.trim(),
    category: form.elements.category.value.trim(),
    description: form.elements.description.value.trim()
  };
  if (!policy.title || !policy.category || !policy.description) {
    formError.textContent = 'Complete all fields before adding the policy.';
    formError.hidden = false;
    return;
  }
  const button = document.getElementById('createPolicy');
  button.disabled = true;
  formError.hidden = true;
  try {
    const response = await fetch(`${API}/policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    if (!response.ok) throw new Error('Could not add the policy.');
    policies.push(await response.json());
    dialog.close();
    showPolicies();
    showMessage('Policy added. Employees can now see it on their Policies page.');
  } catch (error) {
    formError.textContent = `${error.message} Make sure the API is running.`;
    formError.hidden = false;
  } finally {
    button.disabled = false;
  }
});

saveBtn.addEventListener('click', async () => {
  const changes = [...container.querySelectorAll('.policy')].map(card => ({
    id: card.dataset.id,
    title: card.querySelector('.title').innerText.trim(),
    category: card.querySelector('.category').innerText.trim(),
    description: card.querySelector('.description').innerText.trim()
  }));
  if (changes.some(policy => !policy.title || !policy.category || !policy.description)) {
    showMessage('Every policy needs a title, category, and description.');
    return;
  }
  saveBtn.disabled = true;
  try {
    for (const change of changes) {
      const previous = policies.find(item => String(item.id) === String(change.id));
      if (previous.title === change.title && previous.category === change.category && previous.description === change.description) continue;
      const response = await fetch(`${API}/policies/${encodeURIComponent(change.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: change.title, category: change.category, description: change.description })
      });
      if (!response.ok) throw new Error('Could not save all policy changes.');
      const updated = await response.json();
      policies = policies.map(item => String(item.id) === String(change.id) ? updated : item);
    }
    setEditing(false);
    showMessage('Policies saved.');
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
  } finally {
    saveBtn.disabled = false;
  }
});

loadPolicies();
