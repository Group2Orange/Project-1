// My Details uses the profile saved by login. Extra optional fields come from
// this page's sample data until they are added to Data/employee.json.
(async function showEmployeeDetails() {
  let user;
  try {
    user = JSON.parse(localStorage.getItem('loggedUser'));
  } catch {
    user = null;
  }
  if (!user || user.role !== 'EMP') {
    window.location.replace(user?.role === 'HR' ? '../../common/home/home.html' : '../../common/login/login.html');
    return;
  }

  let extra = {};
  try {
    const response = await fetch('data.json');
    if (response.ok) {
      const data = await response.json();
      extra = data.employees?.find(employee => Number(employee.id) === Number(user.id)) || {};
    }
  } catch (error) {
    console.warn('Optional details are unavailable:', error);
  }

  const name = user.name || user.fullName || 'Employee';
  const parts = name.trim().split(/\s+/);
  const initials = `${parts[0][0] || ''}${parts.length > 1 ? parts.at(-1)[0] : ''}`.toUpperCase();
  const status = user.status || user.employmentStatus || '—';
  const value = (item) => item === undefined || item === null || item === '' ? '—' : String(item);
  const text = (id, item) => { document.getElementById(id).textContent = value(item); };
  const field = (id, item) => { document.getElementById(id).value = item ?? ''; };

  text('mainAvatar', initials);
  text('name', name);
  text('position', user.position);
  text('emailText', user.email);
  text('phone', user.phone);
  text('officeLocation', user.officeLocation || extra.officeLocation);
  text('joinDate', user.joiningDate);
  text('headerStatus', status === 'Active' ? 'Active Employee' : status);

  field('inputName', name);
  field('inputEmail', user.email);
  field('inputDate', user.joiningDate);
  field('inputPosition', user.position);
  field('inputID', user.employeeId || extra.employeeId || user.id);
  field('inputDepartment', user.department);
  field('inputSalary', user.salary?.amount ?? extra.salary?.amount);
  text('currency', user.salary?.currency || extra.salary?.currency || '');
  field('inputStatus', status);
})();
