const policiesContainer = document.getElementById('policiesContainer');
const policyLinks = document.getElementById('policyLinks');
const API = 'http://127.0.0.1:3000';

// Make text safe before putting it inside an HTML template literal.
function escapeHtml(value) {
  if (value === undefined || value === null) value = '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadPolicies() {
  try {
    const response = await fetch(`${API}/policies`);
    if (!response.ok) throw new Error('Could not load policies.');
    const allPolicies = await response.json();
    if (!Array.isArray(allPolicies)) throw new Error('Policy data is invalid.');

    const policies = allPolicies.filter(policy => policy.blocked !== true);
    policiesContainer.innerHTML = '';
    policyLinks.innerHTML = '';
    if (policies.length === 0) {
      policiesContainer.innerHTML = '<div class="policy"><p>No company policies have been added yet.</p></div>';
      return;
    }

    for (const policy of policies) {
      const id = encodeURIComponent(policy.id);

      const card = document.createElement('article');
      card.className = 'policy';
      card.id = `policy-${id}`;
      card.innerHTML = `<p class="policy-category">${escapeHtml(policy.category)}</p><h3 class="policy-title">${escapeHtml(policy.title)}</h3><p class="policy-description">${escapeHtml(policy.description)}</p>`;
      policiesContainer.appendChild(card);

      const link = document.createElement('a');
      link.className = 'policy-link';
      link.href = `#policy-${id}`;
      link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
      policyLinks.appendChild(link);
    }
  } catch (error) {
    policiesContainer.innerHTML = '';
    const notice = document.createElement('div');
    notice.className = 'policy';
    notice.textContent = `${error.message} Make sure the API is running.`;
    policiesContainer.appendChild(notice);
  }
}

loadPolicies();
