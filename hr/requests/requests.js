const API = 'http://127.0.0.1:3000';
const list = document.getElementById('requestList');
const message = document.getElementById('requestMessage');
let requests = [];
let employees = [];

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
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'operations-empty';
    empty.textContent = 'No leave requests match these filters.';
    list.append(empty);
    return;
  }
  for (const request of visible) {
    const card = document.createElement('article');
    card.className = 'operation-card';
    const info = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = `${employeeName(request.employeeId)} · ${request.type}`;
    const dates = document.createElement('p');
    const isEarlyDeparture = request.type === 'Early Departure';
    if (isEarlyDeparture && request.fromTime && request.toTime) {
      dates.textContent = `${request.startDate} · ${request.fromTime} – ${request.toTime}`;
    } else {
      dates.textContent = `${request.startDate} – ${request.endDate} · ${request.days || 0} day(s)`;
    }
    const reason = document.createElement('p');
    reason.textContent = request.reason || 'No reason provided';
    const submitted = document.createElement('small');
    submitted.textContent = `Submitted ${request.submittedAt || 'unknown'} · ${request.status}`;
    info.append(title, dates, reason, submitted);
    const actions = document.createElement('div');
    actions.className = 'operation-actions';
    if (request.status === 'Pending') {
      for (const [status, label] of [['Approved', 'Approve'], ['Rejected', 'Reject']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        if (status === 'Rejected') button.className = 'reject';
        button.addEventListener('click', () => decideRequest(request, status));
        actions.append(button);
      }
    } else {
      const badge = document.createElement('span');
      badge.className = 'operation-status';
      badge.textContent = request.status;
      actions.append(badge);
    }
    card.append(info, actions);
    list.append(card);
  }
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

document.getElementById('requestSearch').addEventListener('input', renderRequests);
document.getElementById('requestStatus').addEventListener('change', renderRequests);
loadRequests();
