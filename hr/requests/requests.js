const API = 'http://127.0.0.1:3000';
const list = document.getElementById('requestList');
const message = document.getElementById('requestMessage');
let requests = [];
let employees = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function loadRequests() {
  try {
    const [requestsResponse, employeesResponse] = await Promise.all([
      fetch(`${API}/leaveRequests`), fetch(`${API}/employees`)
    ]);
    if (!requestsResponse.ok || !employeesResponse.ok) throw new Error('Could not load leave requests.');
    requests = await requestsResponse.json();
    employees = await employeesResponse.json();
    message.textContent = '';
    renderRequests();
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

function employeeName(id) {
  return employees.find(person => String(person.id) === String(id))?.name || `Employee #${id}`;
}

function renderRequests() {
  const search = document.getElementById('requestSearch').value.trim().toLowerCase();
  const status = document.getElementById('requestStatus').value;
  const visible = requests.filter(request =>
    (!status || request.status === status) &&
    `${employeeName(request.employeeId)} ${request.type} ${request.reason || ''}`.toLowerCase().includes(search)
  ).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  
  if (!visible.length) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--color-secondary);">No leave requests match these filters.</td></tr>`;
    return;
  }
  
  list.innerHTML = visible.map(request => {
    const name = employeeName(request.employeeId);
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    
    const isEarlyDeparture = request.type === 'Early Departure';
    let datesHtml = '';
    if (isEarlyDeparture && request.fromTime && request.toTime) {
      datesHtml = `<strong>${escapeHtml(request.startDate)}</strong><small>${escapeHtml(request.fromTime)} – ${escapeHtml(request.toTime)}</small>`;
    } else {
      datesHtml = `<strong>${escapeHtml(request.startDate)} to ${escapeHtml(request.endDate)}</strong><small>${request.days || 0} day(s)</small>`;
    }

    const badgeClass = request.status === 'Approved' ? 'active' : request.status === 'Rejected' ? 'blocked' : 'inactive';
    
    let actions = '';
    if (request.status === 'Pending') {
      actions = `
        <button type="button" data-action="approve" aria-label="Approve" title="Approve"><span class="material-symbols-outlined" style="color:#087847">check_circle</span></button>
        <button type="button" class="reject" data-action="reject" aria-label="Reject" title="Reject"><span class="material-symbols-outlined">cancel</span></button>
      `;
    }

    return `
      <tr data-id="${escapeHtml(request.id)}">
        <td>
          <div class="identity">
            <span class="identity-avatar">${escapeHtml(initials)}</span>
            <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(request.type)}</small></div>
          </div>
        </td>
        <td class="department-cell">${datesHtml}</td>
        <td class="department-cell"><small style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;" title="${escapeHtml(request.reason || 'No reason provided')}">${escapeHtml(request.reason || 'No reason provided')}</small></td>
        <td><span class="status status-${badgeClass}">${escapeHtml(request.status)}</span></td>
        <td><div class="actions">${actions}</div></td>
      </tr>
    `;
  }).join('');
}

async function decideRequest(request, status) {
  if (request.status !== 'Pending') return;
  const session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
  if (session?.role !== 'HR') return;
  try {
    const response = await fetch(`${API}/leaveRequests/${encodeURIComponent(request.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer: session.name, ...(status === 'Approved' ? { approvedBy: session.name, approvedAt: new Date().toISOString().slice(0, 10) } : {}) })
    });
    if (!response.ok) throw new Error('Could not update request.');
    if (status === 'Approved' && request.days > 0) {
      const field = { 'Annual PTO': 'annualPto', 'Sick Leave': 'sickLeave', 'Floating Holiday': 'floatingHoliday', 'Unpaid': 'unpaid' }[request.type];
      if (field) {
        const balanceResponse = await fetch(`${API}/leaveBalances?employeeId=${encodeURIComponent(request.employeeId)}`);
        if (!balanceResponse.ok) throw new Error('Request approved, but balance could not be loaded.');
        const balance = (await balanceResponse.json())[0];
        if (balance?.[field]) {
          const updated = { ...balance[field], used: balance[field].used + Number(request.days) };
          const updateResponse = await fetch(`${API}/leaveBalances/${encodeURIComponent(balance.id)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: updated })
          });
          if (!updateResponse.ok) throw new Error('Request approved, but balance could not be updated.');
        }
      }
    }
    await loadRequests();
    message.textContent = `${employeeName(request.employeeId)}'s request ${status.toLowerCase()}.`;
  } catch (error) {
    await loadRequests();
    message.textContent = error.message;
  }
}

list.addEventListener('click', event => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const row = event.target.closest('tr[data-id]');
  if (!row) return;
  const requestId = parseInt(row.dataset.id, 10);
  const request = requests.find(r => r.id === requestId);
  if (!request) return;
  
  if (btn.dataset.action === 'approve') {
    decideRequest(request, 'Approved');
  } else if (btn.dataset.action === 'reject') {
    decideRequest(request, 'Rejected');
  }
});

document.getElementById('requestSearch').addEventListener('input', renderRequests);
document.getElementById('requestStatus').addEventListener('change', renderRequests);
loadRequests();
