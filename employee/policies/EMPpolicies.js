// Employee policies: shows the company policies that HR did not block (the data comes from the API).
const API = "http://127.0.0.1:3000";

const policiesContainer = document.getElementById("policiesContainer");
const policyLinks = document.getElementById("policyLinks");

// Stops text from being read as HTML before it goes inside a backtick template.
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

// Shows a message in a small card.
function showMessage(text) {
  policiesContainer.innerHTML = "";
  const notice = document.createElement("div");
  notice.className = "policy";
  notice.textContent = text;
  policiesContainer.appendChild(notice);
}

async function loadPolicies() {
  try {
    const response = await fetch(`${API}/policies`);
    if (!response.ok) {
      showMessage("Could not load policies. Make sure the API is running.");
      return;
    }
    const allPolicies = await response.json();

    // filter() keeps only the policies that are not blocked.
    const policies = allPolicies.filter(policy => policy.blocked !== true);
    policiesContainer.innerHTML = "";
    policyLinks.innerHTML = "";
    if (policies.length === 0) {
      policiesContainer.innerHTML = '<div class="policy"><p>No company policies have been added yet.</p></div>';
      return;
    }

    policies.forEach(function (policy) {
      const card = document.createElement("article");
      card.className = "policy";
      card.id = `policy-${policy.id}`;
      card.innerHTML = `<p class="policy-category">${escapeHtml(policy.category)}</p><h3 class="policy-title">${escapeHtml(policy.title)}</h3><p class="policy-description">${escapeHtml(policy.description)}</p>`;
      policiesContainer.appendChild(card);

      const link = document.createElement("a");
      link.className = "policy-link";
      link.href = `#policy-${policy.id}`;
      link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
      policyLinks.appendChild(link);
    });
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
  }
}

loadPolicies();
