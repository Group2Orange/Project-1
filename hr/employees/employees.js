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

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => String(name || '?').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
const detailUrl = id => `../employee-details/employee-details.html?id=${encodeURIComponent(id)}`;
// Existing floating holidays expire on March 31; new balances use the next one.
const nextFloatingHolidayExpiry = () => {
  const today = new Date();
  const year = today.getFullYear() + (today.getMonth() >= 3 ? 1 : 0);
  return `${year}-03-31`;
};
const dateLabel = value => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '—') : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

async function loadEmployees() {
  message.textContent = 'Loading employees…';
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) throw new Error('Could not load employees.');
    employees = await response.json();
    if (!Array.isArray(employees)) throw new Error('Employee data is invalid.');
    render();
    const editId = new URLSearchParams(location.search).get('edit');
    if (editId) {
      history.replaceState(null, '', location.pathname);
      const person = employees.find(item => String(item.id) === editId);
      if (person) openEmployeeDialog(person);
    }
  } catch (error) {
    employees = [];
    rows.replaceChildren();
    message.textContent = error.message;
  }
}

function filteredEmployees() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const department = document.getElementById('departmentFilter').value;
  const status = document.getElementById('statusFilter').value;
  const role = document.getElementById('roleFilter').value;
  const result = employees.filter(person =>
    [person.name, person.email, person.department].some(value => String(value || '').toLowerCase().includes(query)) &&
    (!department || person.department === department) &&
    (!status || person.status === status) &&
    (!role || person.role === role)
  );
  return result.sort((a, b) => document.getElementById('sortFilter').value === 'recent'
    ? String(b.joiningDate || '').localeCompare(String(a.joiningDate || ''))
    : String(a.name || '').localeCompare(String(b.name || '')));
}

function renderStats() {
  const month = new Date().toISOString().slice(0, 7);
  document.getElementById('totalCount').textContent = employees.length;
  document.getElementById('departmentCount').textContent = new Set(employees.map(person => person.department).filter(Boolean)).size;
  document.getElementById('newHireCount').textContent = employees.filter(person => String(person.joiningDate || '').startsWith(month)).length;
  document.getElementById('blockedCount').textContent = employees.filter(person => person.status === 'Blocked').length;
  const select = document.getElementById('departmentFilter');
  const selected = select.value;
  const departments = [...new Set(employees.map(person => person.department).filter(Boolean))].sort();
  select.replaceChildren(new Option('All Departments', ''), ...departments.map(name => new Option(name, name)));
  select.value = selected;
  const formDepartment = form.elements.department;
  const formValue = formDepartment.value;
  formDepartment.replaceChildren(new Option('Select a department', ''), ...departments.map(name => new Option(name, name)));
  formDepartment.value = departments.includes(formValue) ? formValue : '';
}

function render() {
  renderStats();
  const result = filteredEmployees();
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  page = Math.min(page, pages);
  const visible = result.slice((page - 1) * pageSize, page * pageSize);
  rows.innerHTML = visible.map(person => {
    const status = ['Active', 'Inactive', 'Blocked'].includes(person.status) ? person.status : 'Inactive';
    const blocked = status === 'Blocked';
    const actionLabel = blocked ? 'Unblock' : 'Block';
    const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
    const isCurrentUser = String(session?.id) === String(person.id);
    return `<tr data-id="${escapeHtml(person.id)}" tabindex="0" aria-label="View ${escapeHtml(person.name)} details">
      <td><div class="identity"><span class="identity-avatar">${escapeHtml(initials(person.name))}</span><div><strong>${escapeHtml(person.name)} <span class="id-tag">${escapeHtml(person.employeeId || `#${person.id}`)}</span></strong><small>${escapeHtml(person.email)}</small></div></div></td>
      <td class="department-cell"><strong>${escapeHtml(person.position || '—')}</strong><small>${escapeHtml(person.department || '—')} · ${person.role === 'HR' ? 'HR' : 'Employee'}</small></td>
      <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
      <td class="access-note">${blocked ? 'Sign-in blocked' : person.firstAttend === true ? 'First sign-in pending' : 'Account ready'}</td>
      <td class="date-cell">${escapeHtml(dateLabel(person.joiningDate))}</td>
      <td><div class="actions"><button type="button" data-action="view" aria-label="View ${escapeHtml(person.name)}"><span class="material-symbols-outlined">visibility</span></button><button type="button" data-action="edit" aria-label="Edit ${escapeHtml(person.name)}"><span class="material-symbols-outlined">edit</span></button>${person.firstAttend === true ? `<button type="button" data-action="reset-password" aria-label="Reset first-login password for ${escapeHtml(person.name)}" title="Reset first-login password"><span class="material-symbols-outlined">key</span></button>` : ''}<button type="button" data-action="block" aria-label="${actionLabel} ${escapeHtml(person.name)}" title="${isCurrentUser ? 'You cannot block your own account' : actionLabel}" ${isCurrentUser ? 'disabled' : ''}><span class="material-symbols-outlined">${blocked ? 'lock_open' : 'block'}</span></button></div></td>
    </tr>`;
  }).join('');
  message.textContent = result.length ? '' : 'No employees match your search.';
  document.getElementById('resultCount').textContent = `Showing ${visible.length ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, result.length)} of ${result.length} employees`;
  document.getElementById('pageLabel').textContent = `${page} / ${pages}`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= pages;
}

function makeInitialPassword() {
  const random = crypto.getRandomValues(new Uint8Array(6));
  return `Team@${[...random].map(number => (number % 36).toString(36)).join('')}`;
}

function currentDateInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextEmployeeId() {
  const latest = Math.max(1000, ...employees.map(person => Number(String(person.employeeId || '').match(/\d+$/)?.[0]) || 0));
  return `EMP-${latest + 1}`;
}

function openEmployeeDialog(person = null) {
  form.reset();
  editingId = person?.id ?? null;
  document.getElementById('formError').hidden = true;
  document.getElementById('employeeDialogTitle').textContent = person ? `Edit ${person.name}` : 'Add New Employee';
  document.getElementById('employeeDialogHint').textContent = person ? 'Update the employee record. Leave password empty to keep it.' : 'Create a record and set the initial password.';
  document.getElementById('passwordHint').textContent = person ? 'Optional: enter a new password to reset access.' : 'Required for new employees. Share it privately.';
  for (const field of ['name', 'email', 'department', 'position', 'phone', 'officeLocation', 'role', 'status']) {
    form.elements[field].value = person?.[field] || form.elements[field].value;
  }
  form.elements.employeeId.value = person?.employeeId || (person ? `EMP-${person.id}` : nextEmployeeId());
  form.elements.joiningDate.value = person?.joiningDate || currentDateInput();
  form.elements.salaryAmount.value = person?.salary?.amount ?? '';
  form.elements.salaryCurrency.value = person?.salary?.currency || 'JOD';
  form.elements.password.value = person ? '' : makeInitialPassword();
  // The generated default is filled automatically; allow clearing it and regenerate on submit.
  form.elements.password.required = false;
  employeeDialog.showModal();
  form.elements.name.focus();
}

async function saveEmployee(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const error = document.getElementById('formError');
  error.hidden = true;
  data.name = data.name.trim();
  data.email = data.email.trim().toLowerCase();
  data.department = data.department.trim();
  data.position = data.position.trim();
  data.phone = data.phone.trim();
  data.officeLocation = data.officeLocation.trim();
  data.employeeId = form.elements.employeeId.value;
  const salaryAmount = data.salaryAmount;
  const salaryCurrency = data.salaryCurrency.trim().toUpperCase() || 'JOD';
  delete data.salaryAmount;
  delete data.salaryCurrency;
  data.salary = salaryAmount ? { amount: Number(salaryAmount), currency: salaryCurrency } : null;
  const duplicate = employees.find(person => person.email.toLowerCase() === data.email && String(person.id) !== String(editingId));
  if (duplicate) { error.textContent = 'This email already belongs to another employee.'; error.hidden = false; return; }
  const duplicateId = employees.find(person => person.employeeId === data.employeeId && String(person.id) !== String(editingId));
  if (duplicateId) { error.textContent = 'This employee ID is already used.'; error.hidden = false; return; }
  if (editingId && !data.password) delete data.password;
  if (data.password && data.password.length < 8) { error.textContent = 'Use at least 8 characters for the password.'; error.hidden = false; return; }
  const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  if (String(session?.id) === String(editingId) && data.status === 'Blocked') {
    error.textContent = 'You cannot block your own HR account.';
    error.hidden = false;
    return;
  }
  if (!editingId) {
    // Keep the generated password visible in the form; if it was cleared, make another automatically.
    if (!data.password) data.password = makeInitialPassword();
    data.firstAttend = true;
  } else if (data.password) {
    data.firstAttend = true;
  }
  passwordForNotice = !editingId ? data.password : '';
  const saveButton = document.getElementById('saveEmployee');
  saveButton.disabled = true;
  try {
    const url = editingId ? `${API}/employees/${encodeURIComponent(editingId)}` : `${API}/employees`;
    const response = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Could not save employee.');
    const savedEmployee = await response.json();
    let balanceWarning = '';
    if (!editingId) {
      const balanceResponse = await fetch(`${API}/leaveBalances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: savedEmployee.id, employeeId: savedEmployee.id,
          annualPto: { used: 0, total: 20 }, sickLeave: { used: 0, total: 8 },
          floatingHoliday: { used: 0, total: 3, expiresOn: nextFloatingHolidayExpiry() }, unpaid: { used: 0, total: 30 }
        })
      }).catch(() => null);
      if (!balanceResponse?.ok) balanceWarning = ' Employee was added, but its leave balance could not be created.';
    }
    employeeDialog.close();
    await loadEmployees();
    message.textContent = (editingId ? 'Employee updated.' : 'Employee added.') + balanceWarning;
    if (passwordForNotice) alert(`Initial password for ${data.name}: ${passwordForNotice}`);
  } catch (caught) {
    error.textContent = caught.message;
    error.hidden = false;
  } finally {
    saveButton.disabled = false;
  }
}

function openBlockDialog(person) {
  const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  if (String(session?.id) === String(person.id)) {
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
      body: JSON.stringify({ password, firstAttend: true })
    });
    if (!response.ok) throw new Error('Could not reset this password.');
    await loadEmployees();
    alert(`New first-login password for ${person.name}: ${password}`);
  } catch (error) {
    message.textContent = error.message;
  }
}

rows.addEventListener('click', event => {
  const row = event.target.closest('tr[data-id]');
  if (!row) return;
  const person = employees.find(item => String(item.id) === row.dataset.id);
  if (!person) return;
  const action = event.target.closest('button[data-action]')?.dataset.action;
  if (action === 'edit') openEmployeeDialog(person);
  else if (action === 'block') openBlockDialog(person);
  else if (action === 'reset-password') resetFirstPassword(person);
  else location.href = detailUrl(person.id);
});
rows.addEventListener('keydown', event => {
  if (event.target.matches('tr[data-id]') && event.key === 'Enter') location.href = detailUrl(event.target.dataset.id);
});
for (const id of ['searchInput', 'departmentFilter', 'statusFilter', 'roleFilter', 'sortFilter']) {
  document.getElementById(id).addEventListener(id === 'searchInput' ? 'input' : 'change', () => { page = 1; render(); });
}
document.getElementById('prevPage').addEventListener('click', () => { page--; render(); });
document.getElementById('nextPage').addEventListener('click', () => { page++; render(); });
document.getElementById('addButton').addEventListener('click', () => openEmployeeDialog());
document.getElementById('closeEmployeeDialog').addEventListener('click', () => employeeDialog.close());
document.getElementById('cancelEmployeeDialog').addEventListener('click', () => employeeDialog.close());
form.addEventListener('submit', saveEmployee);
document.getElementById('cancelBlock').addEventListener('click', () => blockDialog.close());
document.getElementById('confirmBlock').addEventListener('click', async () => {
  const person = employees.find(item => String(item.id) === String(blockId));
  if (!person) return;
  const nextStatus = person.status === 'Blocked' ? 'Active' : 'Blocked';
  const button = document.getElementById('confirmBlock');
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
  } finally {
    button.disabled = false;
  }
});
document.getElementById('exportButton').addEventListener('click', () => {
  const headers = ['id', 'name', 'email', 'role', 'department', 'position', 'status', 'joiningDate'];
  const cell = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...filteredEmployees().map(person => headers.map(key => cell(person[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'connectra-employees.csv';
  link.click();
  URL.revokeObjectURL(url);
});

loadEmployees();
