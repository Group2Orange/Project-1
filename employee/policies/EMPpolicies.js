const policiesContainer = document.getElementById('policiesContainer');
const policyLinks = document.getElementById('policyLinks');
const API = 'http://127.0.0.1:3000';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function loadPolicies() {
  try {
    const response = await fetch(`${API}/policies`);
    if (!response.ok) throw new Error('Could not load policies.');
    const policies = await response.json();
    if (!Array.isArray(policies)) throw new Error('Policy data is invalid.');
    policiesContainer.replaceChildren();
    policyLinks.replaceChildren();
    if (!policies.length) {
      policiesContainer.innerHTML = '<div class="policy"><p>No company policies have been added yet.</p></div>';
      return;
    }
    for (const policy of policies) {
      const id = encodeURIComponent(policy.id);
      const card = document.createElement('article');
      card.className = 'policy';
      card.id = `policy-${id}`;
      card.innerHTML = `<p class="policy-category">${escapeHtml(policy.category)}</p><h3 class="policy-title">${escapeHtml(policy.title)}</h3><p class="policy-description">${escapeHtml(policy.description)}</p>`;
      policiesContainer.append(card);
      const link = document.createElement('a');
      link.className = 'policy-link';
      link.href = `#policy-${id}`;
      link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
      policyLinks.append(link);
    }
  } catch (error) {
    policiesContainer.replaceChildren();
    const notice = document.createElement('div');
    notice.className = 'policy';
    notice.textContent = `${error.message} Make sure the API is running.`;
    policiesContainer.append(notice);
  }
}

loadPolicies();
