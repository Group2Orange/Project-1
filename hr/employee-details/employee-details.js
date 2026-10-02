const API = 'http://127.0.0.1:3000';

(async function showEmployee() {
  const id = new URLSearchParams(location.search).get('id');
  const message = document.getElementById('detailMessage');
  if (!id) { message.textContent = 'Choose an employee from the directory.'; return; }
  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Could not load employee.');
    const employee = await response.json();
    if (!employee) { message.textContent = 'Employee not found.'; return; }
    const text = (element, value) => { document.getElementById(element).textContent = value ?? '—'; };
    const name = employee.name || 'Employee';
    text('detailName', name);
    text('detailAvatar', name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase());
    text('detailPosition', employee.position);
    text('detailStatus', employee.status || 'Inactive');
    document.getElementById('detailStatus').classList.add(String(employee.status || 'Inactive').toLowerCase());
    text('detailId', employee.employeeId || `#${employee.id}`);
    text('detailDepartment', employee.department);
    text('detailRole', employee.role === 'HR' ? 'HR' : 'Employee');
    text('detailDate', employee.joiningDate);
    text('detailOffice', employee.officeLocation);
    text('detailFirstLogin', employee.firstAttend === true ? 'Pending first sign-in' : 'Completed');
    text('detailEmail', employee.email);
    text('detailPhone', employee.phone);
    text('detailSalary', employee.salary ? `${employee.salary.amount} ${employee.salary.currency || ''}` : '—');
    document.getElementById('editLink').href = `../employees/employees.html?edit=${encodeURIComponent(id)}`;
    document.getElementById('detailContent').hidden = false;
    message.remove();
  } catch (error) {
    message.textContent = error.message;
  }
})();
