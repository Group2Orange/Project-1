// HR policies: show, add, edit, block and download the company policies (the data comes from the API).
const API = "http://127.0.0.1:3000";

const container = document.getElementById("policiesContainer");
const links = document.getElementById("policyLinks");
const pageMessage = document.getElementById("policyMessage");
const downloadButton = document.getElementById("pdf");

// The add / edit popup
const dialog = document.getElementById("policyDialog");
const dialogTitle = document.getElementById("policyDialogTitle");
const dialogHint = document.getElementById("policyDialogHint");
const form = document.getElementById("policyForm");
const titleInput = document.getElementById("policyTitle");
const categoryInput = document.getElementById("policyCategory");
const descriptionInput = document.getElementById("policyDescription");
const formError = document.getElementById("policyFormError");
const saveButton = document.getElementById("createPolicy");

// The block / unblock popup
const blockDialog = document.getElementById("policyBlockDialog");
const confirmBlockButton = document.getElementById("confirmPolicyBlock");

let policies = [];
let editingId = null; // the id of the policy in the popup (null means we are adding a new one)
let blockingId = null; // the id of the policy that is waiting to be blocked or unblocked

// Stops text from being read as HTML, so what HR types cannot break the page.
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

function showMessage(text) {
  pageMessage.textContent = text;
  pageMessage.hidden = !text;
}

function showFormError(text) {
  formError.textContent = `${text} Make sure the API is running.`;
  formError.hidden = false;
}

// ----- Show the policies -----
function showPolicies() {
  container.innerHTML = "";
  links.innerHTML = "";
  const empty = policies.length === 0;
  document.getElementById("main").className = empty ? "is-empty" : "";
  document.getElementById("rightSide").hidden = empty;
  downloadButton.disabled = empty;

  if (empty) {
    container.innerHTML = `<div class="policy-empty"><span>No company policies have been added yet.</span><button type="button" id="emptyAddBtn">Add the first policy</button></div>`;
    document.getElementById("emptyAddBtn").onclick = openAddDialog;
    return;
  }

  policies.forEach(function (policy) {
    container.appendChild(makeCard(policy));

    const link = document.createElement("a");
    link.className = "policy-link";
    link.href = `#policy-${policy.id}`;
    link.innerHTML = `<span>${escapeHtml(policy.id)}</span>${escapeHtml(policy.title)}`;
    links.appendChild(link);
  });
}

// Builds one card (an <article>) for one policy.
function makeCard(policy) {
  const blocked = policy.blocked === true;
  const card = document.createElement("article");
  card.className = blocked ? "policy is-blocked" : "policy";
  card.id = `policy-${policy.id}`;
  card.innerHTML = `
    <div class="policy-card-top">
      <p class="category">${escapeHtml(policy.category)}${blocked ? '<span class="policy-blocked-badge">Blocked</span>' : ""}</p>
      <div class="policy-card-actions">
        <button type="button" class="policy-card-btn" aria-label="Edit ${escapeHtml(policy.title)}" title="Edit policy"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>
        <button type="button" class="policy-card-btn ${blocked ? "is-unblock" : "is-block"}" aria-label="${blocked ? "Unblock" : "Block"} ${escapeHtml(policy.title)}" title="${blocked ? "Unblock policy" : "Block policy"}"><i class="bi ${blocked ? "bi-unlock" : "bi-slash-circle"}" aria-hidden="true"></i></button>
      </div>
    </div>
    <h3 class="title">${escapeHtml(policy.title)}</h3>
    <p class="description">${escapeHtml(policy.description)}</p>`;

  // The first button edits the policy, the second one blocks (or unblocks) it.
  const buttons = card.querySelectorAll("button");
  buttons[0].onclick = function () {
    openEditDialog(policy);
  };
  buttons[1].onclick = function () {
    openBlockDialog(policy);
  };
  return card;
}

// ----- Load the policies from the API -----
async function loadPolicies() {
  showMessage("");
  try {
    const response = await fetch(`${API}/policies`);
    if (response.ok) {
      policies = await response.json();
    } else {
      policies = [];
      showMessage("Could not load policies. Make sure the API is running.");
    }
  } catch (error) {
    policies = [];
    showMessage(`${error.message} Make sure the API is running.`);
  }
  showPolicies();
}

// ----- Add and edit (the popup with the form) -----
function openAddDialog() {
  editingId = null;
  form.reset();
  formError.hidden = true;
  dialogTitle.textContent = "Add New Policy";
  dialogHint.textContent = "Create a policy that employees can read.";
  saveButton.textContent = "Add Policy";
  dialog.showModal();
  titleInput.focus();
}

function openEditDialog(policy) {
  editingId = policy.id;
  form.reset();
  formError.hidden = true;
  titleInput.value = policy.title || "";
  categoryInput.value = policy.category || "";
  descriptionInput.value = policy.description || "";
  dialogTitle.textContent = "Edit Policy";
  dialogHint.textContent = "Update this policy for employees.";
  saveButton.textContent = "Save Changes";
  dialog.showModal();
  titleInput.focus();
}

document.getElementById("addBtn").onclick = openAddDialog;

form.onsubmit = async function (event) {
  event.preventDefault();
  const policy = {
    title: titleInput.value.trim(),
    category: categoryInput.value.trim(),
    description: descriptionInput.value.trim()
  };
  if (!policy.title || !policy.category || !policy.description) {
    formError.textContent = "Complete all fields before saving the policy.";
    formError.hidden = false;
    return;
  }

  saveButton.disabled = true;
  formError.hidden = true;
  const adding = editingId === null;
  try {
    // POST adds a new policy, PATCH changes the one we are editing.
    const response = await fetch(adding ? `${API}/policies` : `${API}/policies/${editingId}`, {
      method: adding ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy)
    });
    if (!response.ok) {
      showFormError(adding ? "Could not add the policy." : "Could not save the policy.");
    } else {
      const saved = await response.json();
      if (adding) {
        policies.push(saved);
        showMessage("Policy added. Employees can now see it on their Policies page.");
      } else {
        policies = policies.map(item => (item.id === editingId ? saved : item));
        showMessage("Policy updated.");
      }
      editingId = null;
      dialog.close();
      showPolicies();
    }
  } catch (error) {
    showFormError(error.message);
  }
  saveButton.disabled = false;
};

document.getElementById("closePolicyDialog").onclick = function () {
  dialog.close();
};
document.getElementById("cancelPolicyDialog").onclick = function () {
  dialog.close();
};

// ----- Block and unblock (the confirmation popup) -----
function openBlockDialog(policy) {
  blockingId = policy.id;
  const blocked = policy.blocked === true;
  document.getElementById("policyBlockTitle").textContent = blocked ? "Unblock policy?" : "Block policy?";
  document.getElementById("policyBlockMessage").textContent = blocked
    ? `Unblock "${policy.title}" so employees can see it again.`
    : `Block "${policy.title}"? It stays on record but is hidden from employees.`;
  confirmBlockButton.textContent = blocked ? "Unblock Policy" : "Block Policy";
  blockDialog.showModal();
}

document.getElementById("cancelPolicyBlock").onclick = function () {
  blockingId = null;
  blockDialog.close();
};

confirmBlockButton.onclick = async function () {
  const policy = policies.find(item => item.id === blockingId);
  if (!policy) {
    return;
  }
  const nextBlocked = policy.blocked !== true;

  this.disabled = true; // "this" is the confirm button that was clicked
  try {
    const response = await fetch(`${API}/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: nextBlocked })
    });
    if (!response.ok) {
      showMessage("Could not update the policy. Make sure the API is running.");
    } else {
      const updated = await response.json();
      policies = policies.map(item => (item.id === policy.id ? updated : item));
      blockingId = null;
      blockDialog.close();
      showPolicies();
      showMessage(nextBlocked ? "Policy blocked." : "Policy unblocked.");
    }
  } catch (error) {
    showMessage(`${error.message} Make sure the API is running.`);
  }
  this.disabled = false;
};

// ----- Download the policies as a file -----
// Builds a small web page with all the policies and downloads it.
function downloadFile(latest) {
  // map() turns every policy into a piece of HTML and join() glues the pieces together.
  const sections = latest
    .map(policy => `<section><p class="category">${escapeHtml(policy.category)}</p><h2>${escapeHtml(policy.title)}</h2><p>${escapeHtml(policy.description).replace(/\n/g, "<br>")}</p></section>`)
    .join("");
  const documentHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Connectra Policies</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:16px/1.6 Arial,sans-serif;color:#18313a}h1{color:#00626a}section{padding:20px 0;border-top:1px solid #d9e3e9}h2{margin:0 0 8px;font-size:21px}.category{margin:0 0 5px;color:#00626a;font-size:12px;font-weight:bold;text-transform:uppercase}section p:last-child{margin:0}small{color:#587080}@media print{body{margin:0;max-width:none}}</style></head><body><h1>Connectra Policies</h1><small>Downloaded ${escapeHtml(new Date().toLocaleDateString())}</small>${sections}</body></html>`;

  // A link with the file inside it. Clicking the link downloads the file.
  const link = document.createElement("a");
  link.href = "data:text/html;charset=utf-8," + encodeURIComponent(documentHtml);
  link.download = "Connectra-Policies.html";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

downloadButton.onclick = async function () {
  this.disabled = true; // "this" is the download button that was clicked
  let text = "Downloaded the latest policies.";
  try {
    // Read the policies again so the file has the latest ones.
    const response = await fetch(`${API}/policies`);
    if (!response.ok) {
      text = "Could not download policies. Make sure the API is running.";
    } else {
      const latest = await response.json();
      if (latest.length === 0) {
        text = "There are no policies to download. Make sure the API is running.";
      } else {
        downloadFile(latest);
      }
    }
  } catch (error) {
    text = `${error.message} Make sure the API is running.`;
  }
  showMessage(text);
  this.disabled = policies.length === 0;
};

loadPolicies();
