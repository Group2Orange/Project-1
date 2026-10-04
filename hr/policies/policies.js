const API = 'http://127.0.0.1:3000';
const container = document.getElementById('policiesContainer');
const links = document.getElementById('policyLinks');
const addBtn = document.getElementById('addBtn');
const dialog = document.getElementById('policyDialog');
const dialogTitle = document.getElementById('policyDialogTitle');
const dialogHint = document.getElementById('policyDialogHint');
const form = document.getElementById('policyForm');
const formError = document.getElementById('policyFormError');
const createPolicyBtn = document.getElementById('createPolicy');
const pageMessage = document.getElementById('policyMessage');
const blockDialog = document.getElementById('policyBlockDialog');
let policies = [];
let editingId = null;
let blockingId = null;

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => characters[character]);
}

function showMessage(text) {
  pageMessage.textContent = text;
  pageMessage.hidden = !text;
}

function showPolicies() {
  container.innerHTML = '';
  links.innerHTML = '';
  const empty = policies.length === 0;
  document.getElementById('main').classList.toggle('is-empty', empty);
  document.getElementById('rightSide').hidden = empty;
  document.getElementById('pdf').disabled = empty;

  if (empty) {
    container.innerHTML = '<div class="policy-empty"><span>No company policies have been added yet.</span><button type="button" id="emptyAddBtn">Add the first policy</button></div>';
    document.getElementById('emptyAddBtn').addEventListener('click', openAddDialog);
    return;
  }

  for (const policy of policies) {
    const id = encodeURIComponent(policy.id);
    const blocked = policy.blocked === true;
    const card = document.createElement('article');
    card.className = `policy${blocked ? ' is-blocked' : ''}`;
    card.id = `policy-${id}`;
    card.dataset.id = policy.id;
    card.innerHTML = `
      <div class="policy-card-top">
        <p class="category">${escapeHtml(policy.category)}${blocked ? '<span class="policy-blocked-badge">Blocked</span>' : ''}</p>
        <div class="policy-card-actions">
          <button type="button" class="policy-card-btn" data-action="edit" aria-label="Edit ${escapeHtml(policy.title)}" title="Edit policy"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>
          <button type="button" class="policy-card-btn${blocked ? ' is-unblock' : ' is-block'}" data-action="block" aria-label="${blocked ? 'Unblock' : 'Block'} ${escapeHtml(policy.title)}" title="${blocked ? 'Unblock policy' : 'Block policy'}"><i class="bi ${blocked ? 'bi-unlock' : 'bi-slash-circle'}" aria-hidden="true"></i></button>
        </div>
      </div>
      <h3 class="title">${escapeHtml(policy.title)}</h3>
      <p class="description">${escapeHtml(policy.description)}</p>`;
    container.appendChild(card);

    const link = document.createElement('a');
    link.className = 'policy-link';
    link.href = `#policy-${id}`;
    link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
    links.appendChild(link);
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

function openAddDialog() {
  editingId = null;
  form.reset();
  formError.hidden = true;
  dialogTitle.textContent = 'Add New Policy';
  dialogHint.textContent = 'Create a policy that employees can read.';
  createPolicyBtn.textContent = 'Add Policy';
  dialog.showModal();
  form.elements.title.focus();
}

function openEditDialog(policy) {
  editingId = policy.id;
  form.reset();
  formError.hidden = true;
  form.elements.title.value = policy.title || '';
  form.elements.category.value = policy.category || '';
  form.elements.description.value = policy.description || '';
  dialogTitle.textContent = 'Edit Policy';
  dialogHint.textContent = 'Update this policy for employees.';
  createPolicyBtn.textContent = 'Save Changes';
  dialog.showModal();
  form.elements.title.focus();
}

addBtn.addEventListener('click', openAddDialog);

document.getElementById('pdf').addEventListener('click', async function () {
  const button = this; // the "pdf" download button that was clicked
  button.disabled = true;
  try {
    // Read again so the download includes the latest policies in api/db.json.
    const response = await fetch(`${API}/policies`);
    if (!response.ok) throw new Error('Could not download policies.');
    const latest = await response.json();
    if (!Array.isArray(latest) || !latest.length) throw new Error('There are no policies to download.');
    const sections = latest.map(policy => `<section><p class="category">${escapeHtml(policy.category)}</p><h2>${escapeHtml(policy.title)}</h2><p>${escapeHtml(policy.description).replaceAll('\n', '<br>')}</p></section>`).join('');
    const documentHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Connectra Policies</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:16px/1.6 Arial,sans-serif;color:#18313a}h1{color:#00626a}section{padding:20px 0;border-top:1px solid #d9e3e9}h2{margin:0 0 8px;font-size:21px}.category{margin:0 0 5px;color:#00626a;font-size:12px;font-weight:bold;text-transform:uppercase}section p:last-child{margin:0}small{color:#587080}@media print{body{margin:0;max-width:none}}</style></head><body><h1>Connectra Policies</h1><small>Downloaded ${escapeHtml(new Date().toLocaleDateString())}</small>${sections}</body></html>`;
    const url = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Connectra-Policies.html';
    document.body.appendChild(link);
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

form.addEventListener('submit', async event => {
  event.preventDefault();
  const policy = {
    title: form.elements.title.value.trim(),
    category: form.elements.category.value.trim(),
    description: form.elements.description.value.trim()
  };
  if (!policy.title || !policy.category || !policy.description) {
    formError.textContent = 'Complete all fields before saving the policy.';
    formError.hidden = false;
    return;
  }
  createPolicyBtn.disabled = true;
  formError.hidden = true;
  try {
    if (editingId) {
      const response = await fetch(`${API}/policies/${encodeURIComponent(editingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      if (!response.ok) throw new Error('Could not save the policy.');
      const updated = await response.json();
      policies = policies.map(item => String(item.id) === String(editingId) ? updated : item);
      showMessage('Policy updated.');
    } else {
      const response = await fetch(`${API}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      if (!response.ok) throw new Error('Could not add the policy.');
      policies.push(await response.json());
      showMessage('Policy added. Employees can now see it on their Policies page.');
    }
    editingId = null;
    dialog.close();
    showPolicies();
  } catch (error) {
    formError.textContent = `${error.message} Make sure the API is running.`;
    formError.hidden = false;
  } finally {
    createPolicyBtn.disabled = false;
  }
});

// The cards are rebuilt on every render, so one listener on the container handles every Edit / Block button.
container.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.policy');
  if (!card) return;
  const policy = policies.find(item => String(item.id) === String(card.dataset.id));
  if (!policy) return;

  if (button.dataset.action === 'edit') {
    openEditDialog(policy);
    return;
  }

  if (button.dataset.action === 'block') {
    blockingId = policy.id;
    const blocked = policy.blocked === true;
    document.getElementById('policyBlockTitle').textContent = blocked ? 'Unblock policy?' : 'Block policy?';
    document.getElementById('policyBlockMessage').textContent = blocked
      ? `Unblock "${policy.title}" so employees can see it again.`
      : `Block "${policy.title}"? It stays on record but is hidden from employees.`;
    document.getElementById('confirmPolicyBlock').textContent = blocked ? 'Unblock Policy' : 'Block Policy';
    blockDialog.showModal();
  }
});

document.getElementById('cancelPolicyBlock').addEventListener('click', () => {
  blockingId = null;
  blockDialog.close();
});

document.getElementById('confirmPolicyBlock').addEventListener('click', async function () {
  const policy = policies.find(item => String(item.id) === String(blockingId));
  if (!policy) return;
  const nextBlocked = !(policy.blocked === true);
  const button = this; // the "confirmPolicyBlock" button that was clicked
  button.disabled = true;
  try {
    const response = await fetch(`${API}/policies/${encodeURIComponent(policy.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: nextBlocked })
    });
    if (!response.ok) throw new Error('Could not update the policy.');
    const updated = await response.json();
    policies = policies.map(item => String(item.id) === String(policy.id) ? updated : item);
    blockingId = null;
    blockDialog.close();
    showPolicies();
    showMessage(nextBlocked ? 'Policy blocked.' : 'Policy unblocked.');
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
  } finally {
    button.disabled = false;
  }
});

loadPolicies();
