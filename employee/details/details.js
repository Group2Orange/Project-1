// My Details reads the signed-in employee directly from the local API.
const API = 'http://127.0.0.1:3000';
(async function showEmployeeDetails() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('loggedUser'));
  } catch {
    session = null;
  }
  if (!session || session.role !== 'EMP') {
    window.location.replace(session?.role === 'HR' ? '../../hr/workspace/workspace.html' : '../../common/login/login.html');
    return;
  }

  let user;
  try {
    // OLD WAY: read loggedUser from localStorage and merge this page's data.json.
    // const user = JSON.parse(localStorage.getItem('loggedUser'));
    // NEW WAY: use the session ID to read the latest details from the API.
    const response = await fetch(`${API}/employees/${encodeURIComponent(session.id)}`);
    if (!response.ok) throw new Error('Could not load employee details.');
    user = await response.json();
  }
  catch (error) {
    console.error(error);
    document.querySelector('.content').prepend(Object.assign(document.createElement('p'), { textContent: error.message }));
    return;
  }
  if (!user) return;

  const name = user.name || user.fullName || 'Employee';
  const parts = name.trim().split(/\s+/);
  const initials = `${parts[0][0] || ''}${parts.length > 1 ? parts.at(-1)[0] : ''}`.toUpperCase();
  const status = user.status || user.employmentStatus || '—';
  const value = (item) => item === undefined || item === null || item === '' ? '—' : String(item);
  const text = (id, item) => { document.getElementById(id).textContent = value(item); };
  const field = (id, item) => { document.getElementById(id).value = item ?? ''; };

  const avatar = document.getElementById('mainAvatar');
  const fallbackImage = '../../common/profile/assets/profile.svg';
  const imageSource = typeof user.image === 'string' && user.image.startsWith('data:image/')
    ? user.image
    : typeof user.image === 'string' && user.image.startsWith('assets/')
      ? new URL(`../../${user.image}`, document.baseURI).href
      : fallbackImage;
  const avatarImage = document.createElement('img');
  avatarImage.alt = `${name}'s profile photo`;
  avatarImage.addEventListener('error', () => {
    if (avatarImage.dataset.usingFallback === 'true') {
      avatarImage.remove();
      avatar.textContent = initials;
      return;
    }
    avatarImage.dataset.usingFallback = 'true';
    avatarImage.src = fallbackImage;
  });
  avatarImage.src = imageSource;
  avatar.replaceChildren(avatarImage);
  text('name', name);
  text('position', user.position);
  text('emailText', user.email);
  text('phone', user.phone);
  text('officeLocation', user.officeLocation);
  text('joinDate', user.joiningDate);
  text('headerStatus', status === 'Active' ? 'Active Employee' : status);

  field('inputName', name);
  field('inputEmail', user.email);
  field('inputDate', user.joiningDate);
  field('inputPosition', user.position);
  field('inputID', user.employeeId || user.id);
  field('inputDepartment', user.department);
  field('inputSalary', user.salary?.amount);
  text('currency', user.salary?.currency || '');
  field('inputStatus', status);
})();
