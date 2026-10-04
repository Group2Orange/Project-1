const rows = document.getElementById('employeeRows');
const message = document.getElementById('directoryMessage');
const form = document.getElementById('employeeForm');
const employeeDialog = document.getElementById('employeeDialog');
const blockDialog = document.getElementById('blockDialog');
const API = 'http://127.0.0.1:3000';
const pageSize = 8;
let employees = [];
let page = 1;
let editingId = null;
let blockId = null;
let passwordForNotice = '';

// ── Small helpers ────────────────────────────────────────────────────────────

// Turns null/undefined into an empty string, but keeps real values such as 0.
function emptyIfMissing(value) {
  if (value === null || value === undefined) return '';
  return value;
}

// Makes text safe to put inside an HTML template literal.
function escapeHtml(value) {
  return String(emptyIfMissing(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return parts.map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function detailUrl(id) {
  return `../employee-details/employee-details.html?id=${encodeURIComponent(id)}`;
}

// Existing floating holidays expire on March 31; new balances use the next one.
function nextFloatingHolidayExpiry() {
  const today = new Date();
  let year = today.getFullYear();
  if (today.getMonth() >= 3) year = year + 1;
  return `${year}-03-31`;
}

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value || '—');
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// True when the given id belongs to the HR user who is signed in right now.
function isLoggedInUser(id) {
  const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  return session !== null && String(session.id) === String(id);
}

// ── Load employees from the API ──────────────────────────────────────────────

async function loadEmployees() {
  message.textContent = 'Loading employees…';
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) throw new Error('Could not load employees.');
    employees = await response.json();
    if (!Array.isArray(employees)) throw new Error('Employee data is invalid.');
    render();

    // employees.html?edit=5 opens the edit dialog for employee 5.
    const editId = new URLSearchParams(location.search).get('edit');
    if (editId) {
      history.replaceState(null, '', location.pathname);
      const person = employees.find(item => String(item.id) === editId);
      if (person) openEmployeeDialog(person);
    }
  } catch (error) {
    employees = [];
    rows.innerHTML = '';
    message.textContent = error.message;
  }
}

// ── Search, filter and sort ──────────────────────────────────────────────────

function filteredEmployees() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const department = document.getElementById('departmentFilter').value;
  const status = document.getElementById('statusFilter').value;
  const role = document.getElementById('roleFilter').value;
  const sortBy = document.getElementById('sortFilter').value;

  const result = employees.filter(person => {
    const name = String(person.name || '').toLowerCase();
    const email = String(person.email || '').toLowerCase();
    const team = String(person.department || '').toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query) || team.includes(query);
    const matchesDepartment = !department || person.department === department;
    const matchesStatus = !status || person.status === status;
    const matchesRole = !role || person.role === role;
    return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
  });

  return result.sort((a, b) => {
    if (sortBy === 'recent') {
      return String(b.joiningDate || '').localeCompare(String(a.joiningDate || ''));
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

// Every department name once, sorted A–Z.
function departmentNames() {
  const names = [];
  employees.forEach(person => {
    if (person.department && !names.includes(person.department)) {
      names.push(person.department);
    }
  });
  return names.sort();
}

// Rebuilds a <select> with a first "empty" option followed by every department.
function fillDepartmentSelect(select, firstLabel, departments) {
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  departments.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// ── Render the page ──────────────────────────────────────────────────────────

function renderStats() {
  const month = new Date().toISOString().slice(0, 7);
  const departments = departmentNames();
  document.getElementById('totalCount').textContent = employees.length;
  document.getElementById('departmentCount').textContent = departments.length;
  document.getElementById('newHireCount').textContent = employees.filter(person => String(person.joiningDate || '').startsWith(month)).length;
  document.getElementById('blockedCount').textContent = employees.filter(person => person.status === 'Blocked').length;

  // Department filter: keep whatever the user had selected.
  const select = document.getElementById('departmentFilter');
  const selected = select.value;
  fillDepartmentSelect(select, 'All Departments', departments);
  select.value = selected;

  // Department field inside the add/edit dialog.
  const formDepartment = form.elements.department;
  const formValue = formDepartment.value;
  fillDepartmentSelect(formDepartment, 'Select a department', departments);
  formDepartment.value = departments.includes(formValue) ? formValue : '';
}

function employeeRow(person) {
  let status = 'Inactive';
  if (['Active', 'Inactive', 'Blocked'].includes(person.status)) status = person.status;
  const blocked = status === 'Blocked';
  const actionLabel = blocked ? 'Unblock' : 'Block';
  const isCurrentUser = isLoggedInUser(person.id);
  const name = escapeHtml(person.name);

  let accessNote = 'Account ready';
  if (blocked) accessNote = 'Sign-in blocked';
  else if (person.firstAttend === true) accessNote = 'First sign-in pending';

  const viewButton = `<button type="button" data-action="view" aria-label="View ${name}"><span class="material-symbols-outlined">visibility</span></button>`;
  const editButton = `<button type="button" data-action="edit" aria-label="Edit ${name}"><span class="material-symbols-outlined">edit</span></button>`;

  let resetButton = '';
  if (person.firstAttend === true) {
    resetButton = `<button type="button" data-action="reset-password" aria-label="Reset first-login password for ${name}" title="Reset first-login password"><span class="material-symbols-outlined">key</span></button>`;
  }

  const blockTitle = isCurrentUser ? 'You cannot block your own account' : actionLabel;
  const blockDisabled = isCurrentUser ? 'disabled' : '';
  const blockIcon = blocked ? 'lock_open' : 'block';
  const blockButton = `<button type="button" data-action="block" aria-label="${actionLabel} ${name}" title="${blockTitle}" ${blockDisabled}><span class="material-symbols-outlined">${blockIcon}</span></button>`;

  return `<tr data-id="${escapeHtml(person.id)}" tabindex="0" aria-label="View ${name} details">
      <td><div class="identity"><span class="identity-avatar">${escapeHtml(initials(person.name))}</span><div><strong>${name} <span class="id-tag">${escapeHtml(person.employeeId || `#${person.id}`)}</span></strong><small>${escapeHtml(person.email)}</small></div></div></td>
      <td class="department-cell"><strong>${escapeHtml(person.position || '—')}</strong><small>${escapeHtml(person.department || '—')} · ${person.role === 'HR' ? 'HR' : 'Employee'}</small></td>
      <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
      <td class="access-note">${accessNote}</td>
      <td class="date-cell">${escapeHtml(dateLabel(person.joiningDate))}</td>
      <td><div class="actions">${viewButton}${editButton}${resetButton}${blockButton}</div></td>
    </tr>`;
}

function render() {
  renderStats();
  const result = filteredEmployees();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);
  rows.innerHTML = visible.map(employeeRow).join('');

  message.textContent = result.length ? '' : 'No employees match your search.';
  const first = visible.length ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, result.length);
  document.getElementById('resultCount').textContent = `Showing ${first}–${last} of ${result.length} employees`;
  document.getElementById('pageLabel').textContent = `${page} / ${pages}`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= pages;
}

// ── Add / edit employee dialog ───────────────────────────────────────────────

function makeInitialPassword() {
  const random = crypto.getRandomValues(new Uint8Array(6));
  let code = '';
  random.forEach(number => {
    code += (number % 36).toString(36);
  });
  return `Team@${code}`;
}

function currentDateInput() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function nextEmployeeId() {
  let latest = 1000;
  employees.forEach(person => {
    const match = String(person.employeeId || '').match(/\d+$/);
    const number = match ? Number(match[0]) : 0;
    if (number > latest) latest = number;
  });
  return `EMP-${latest + 1}`;
}

// Pass an employee to edit them, or nothing to add a new one.
function openEmployeeDialog(person) {
  form.reset();
  editingId = person ? person.id : null;
  document.getElementById('formError').hidden = true;
  document.getElementById('employeeDialogTitle').textContent = person ? `Edit ${person.name}` : 'Add New Employee';
  document.getElementById('employeeDialogHint').textContent = person ? 'Update the employee record. Leave password empty to keep it.' : 'Create a record and set the initial password.';
  document.getElementById('passwordHint').textContent = person ? 'Optional: enter a new password to reset access.' : 'Required for new employees. Share it privately.';

  const fields = ['name', 'email', 'department', 'position', 'officeLocation', 'role', 'status'];
  fields.forEach(field => {
    if (person && person[field]) form.elements[field].value = person[field];
  });

  // Strip +962 prefix so the field shows only the 9-digit local number
  form.elements.phone.value = person && person.phone ? String(person.phone).replace(/^\+962/, '') : '';

  if (person && person.employeeId) form.elements.employeeId.value = person.employeeId;
  else if (person) form.elements.employeeId.value = `EMP-${person.id}`;
  else form.elements.employeeId.value = nextEmployeeId();

  form.elements.joiningDate.value = (person && person.joiningDate) || currentDateInput();

  const salary = person && person.salary ? person.salary : {};
  form.elements.salaryAmount.value = emptyIfMissing(salary.amount);
  form.elements.salaryCurrency.value = salary.currency || 'JOD';

  form.elements.password.value = person ? '' : makeInitialPassword();
  // The generated default is filled automatically; allow clearing it and regenerate on submit.
  form.elements.password.required = false;
  employeeDialog.showModal();
  form.elements.name.focus();
}

function showFormError(text) {
  const formError = document.getElementById('formError');
  formError.textContent = text;
  formError.hidden = false;
}

// Gives a brand-new employee their starting leave balance.
// Returns true when it worked, false when it did not.
async function createLeaveBalance(employeeId) {
  try {
    const response = await fetch(`${API}/leaveBalances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: employeeId,
        employeeId: employeeId,
        annualPto: { used: 0, total: 20 },
        sickLeave: { used: 0, total: 8 },
        floatingHoliday: { used: 0, total: 3, expiresOn: nextFloatingHolidayExpiry() },
        unpaid: { used: 0, total: 30 }
      })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function saveEmployee(event) {
  event.preventDefault();
  document.getElementById('formError').hidden = true;

  const fields = form.elements;
  const data = {
    name: fields.name.value.trim(),
    email: fields.email.value.trim().toLowerCase(),
    department: fields.department.value.trim(),
    position: fields.position.value.trim(),
    phone: fields.phone.value.trim(),
    joiningDate: fields.joiningDate.value,
    employeeId: fields.employeeId.value,
    officeLocation: fields.officeLocation.value.trim(),
    role: fields.role.value,
    status: fields.status.value,
    password: fields.password.value
  };

  // Jordan phone validation: optional field, but if provided must be exactly 9 digits
  const phoneInput = document.getElementById('dialogPhone');
  const phoneErrorIcon = document.getElementById('dialogPhoneErrorIcon');
  const phoneErrorMessage = document.getElementById('dialogPhoneErrorMessage');
  const phoneRegex = /^[0-9]{9}$/;
  if (data.phone && !phoneRegex.test(data.phone)) {
    phoneInput.classList.add('error-input');
    phoneErrorIcon.style.display = 'inline-block';
    phoneErrorMessage.style.display = 'block';
    phoneInput.focus();
    return;
  }
  // Clear any previous phone error
  phoneInput.classList.remove('error-input');
  phoneErrorIcon.style.display = 'none';
  phoneErrorMessage.style.display = 'none';
  // Prepend +962 country code before saving
  if (data.phone) data.phone = '+962' + data.phone;

  const salaryAmount = fields.salaryAmount.value;
  const salaryCurrency = fields.salaryCurrency.value.trim().toUpperCase() || 'JOD';
  data.salary = salaryAmount ? { amount: Number(salaryAmount), currency: salaryCurrency } : null;

  const duplicate = employees.find(person => person.email.toLowerCase() === data.email && String(person.id) !== String(editingId));
  if (duplicate) {
    showFormError('This email already belongs to another employee.');
    return;
  }
  const duplicateId = employees.find(person => person.employeeId === data.employeeId && String(person.id) !== String(editingId));
  if (duplicateId) {
    showFormError('This employee ID is already used.');
    return;
  }
  if (editingId && !data.password) delete data.password;
  if (data.password && data.password.length < 8) {
    showFormError('Use at least 8 characters for the password.');
    return;
  }
  if (isLoggedInUser(editingId) && data.status === 'Blocked') {
    showFormError('You cannot block your own HR account.');
    return;
  }

  if (!editingId) {
    // Keep the generated password visible in the form; if it was cleared, make another automatically.
    if (!data.password) data.password = makeInitialPassword();
    data.firstAttend = true;
  } else if (data.password) {
    data.firstAttend = true;
  }
  passwordForNotice = editingId ? '' : data.password;

  const saveButton = document.getElementById('saveEmployee');
  saveButton.disabled = true;
  try {
    let url = `${API}/employees`;
    let method = 'POST';
    if (editingId) {
      url = `${API}/employees/${encodeURIComponent(editingId)}`;
      method = 'PATCH';
    }
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Could not save employee.');
    const savedEmployee = await response.json();

    let balanceWarning = '';
    if (!editingId) {
      const balanceCreated = await createLeaveBalance(savedEmployee.id);
      if (!balanceCreated) balanceWarning = ' Employee was added, but its leave balance could not be created.';
    }

    employeeDialog.close();
    await loadEmployees();
    message.textContent = (editingId ? 'Employee updated.' : 'Employee added.') + balanceWarning;
    if (passwordForNotice) alert(`Initial password for ${data.name}: ${passwordForNotice}`);
  } catch (error) {
    showFormError(error.message);
  }
  saveButton.disabled = false;
}

// ── Block / unblock and password reset ───────────────────────────────────────

function openBlockDialog(person) {
  if (isLoggedInUser(person.id)) {
    message.textContent = 'You cannot block your own HR account.';
    return;
  }
  blockId = person.id;
  const blocked = person.status === 'Blocked';
  document.getElementById('blockTitle').textContent = blocked ? 'Unblock employee?' : 'Block employee?';
  document.getElementById('blockMessage').textContent = blocked
    ? `${person.name} can sign in again after you confirm. The employee record stays available.`
    : `${person.name} will not be able to sign in. The employee record will be kept.`;
  document.getElementById('confirmBlock').textContent = blocked ? 'Unblock Employee' : 'Block Employee';
  blockDialog.showModal();
}

async function resetFirstPassword(person) {
  if (person.firstAttend !== true) return;
  if (!window.confirm(`Create a new first-login password for ${person.name}?`)) return;
  const password = makeInitialPassword();
  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(person.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password, firstAttend: true })
    });
    if (!response.ok) throw new Error('Could not reset this password.');
    await loadEmployees();
    alert(`New first-login password for ${person.name}: ${password}`);
  } catch (error) {
    message.textContent = error.message;
  }
}

// ── Event listeners ──────────────────────────────────────────────────────────

// One click listener on the table body handles every row and button.
rows.addEventListener('click', event => {
  const row = event.target.closest('tr[data-id]');
  if (!row) return;
  const person = employees.find(item => String(item.id) === row.dataset.id);
  if (!person) return;
  const button = event.target.closest('button[data-action]');
  const action = button ? button.dataset.action : '';
  if (action === 'edit') openEmployeeDialog(person);
  else if (action === 'block') openBlockDialog(person);
  else if (action === 'reset-password') resetFirstPassword(person);
  else location.href = detailUrl(person.id);
});

rows.addEventListener('keydown', event => {
  if (event.target.matches('tr[data-id]') && event.key === 'Enter') {
    location.href = detailUrl(event.target.dataset.id);
  }
});

function showFirstPage() {
  page = 1;
  render();
}
document.getElementById('searchInput').addEventListener('input', showFirstPage);
['departmentFilter', 'statusFilter', 'roleFilter', 'sortFilter'].forEach(id => {
  document.getElementById(id).addEventListener('change', showFirstPage);
});

document.getElementById('prevPage').addEventListener('click', () => {
  page--;
  render();
});
document.getElementById('nextPage').addEventListener('click', () => {
  page++;
  render();
});

document.getElementById('addButton').addEventListener('click', () => openEmployeeDialog(null));
document.getElementById('closeEmployeeDialog').addEventListener('click', () => employeeDialog.close());
document.getElementById('cancelEmployeeDialog').addEventListener('click', () => employeeDialog.close());
form.addEventListener('submit', saveEmployee);

// Typing in the phone field clears its error. "this" is the phone input.
document.getElementById('dialogPhone').addEventListener('input', function () {
  this.classList.remove('error-input');
  document.getElementById('dialogPhoneErrorIcon').style.display = 'none';
  document.getElementById('dialogPhoneErrorMessage').style.display = 'none';
});

document.getElementById('cancelBlock').addEventListener('click', () => blockDialog.close());

// "this" is the Confirm button inside the block dialog.
document.getElementById('confirmBlock').addEventListener('click', async function () {
  const person = employees.find(item => String(item.id) === String(blockId));
  if (!person) return;
  const nextStatus = person.status === 'Blocked' ? 'Active' : 'Blocked';
  const button = this;
  button.disabled = true;
  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(person.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!response.ok) throw new Error('Could not change account status.');
    blockDialog.close();
    await loadEmployees();
    message.textContent = `${person.name} is now ${nextStatus.toLowerCase()}.`;
  } catch (error) {
    document.getElementById('blockMessage').textContent = error.message;
  }
  button.disabled = false;
});

// ── CSV export ───────────────────────────────────────────────────────────────

// Wraps one value in quotes for CSV. A leading = + @ - gets a ' so
// spreadsheet apps do not run it as a formula.
function csvCell(value) {
  const text = String(emptyIfMissing(value))
    .replace(/^[=+@-]/, "'$&")
    .replace(/"/g, '""');
  return `"${text}"`;
}

document.getElementById('exportButton').addEventListener('click', () => {
  const headers = ['id', 'name', 'email', 'role', 'department', 'position', 'status', 'joiningDate'];
  const lines = [headers.join(',')];
  filteredEmployees().forEach(person => {
    const cells = headers.map(key => csvCell(person[key]));
    lines.push(cells.join(','));
  });
  const csv = lines.join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'connectra-employees.csv';
  link.click();
  URL.revokeObjectURL(url);
});

loadEmployees();
