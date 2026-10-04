// My Details reads the signed-in employee directly from the local API.
const API = 'http://127.0.0.1:3000';

async function showEmployeeDetails() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('loggedUser'));
  } catch (error) {
    session = null;
  }
  if (!session || session.role !== 'EMP') {
    if (session && session.role === 'HR') {
      window.location.replace('../../hr/workspace/workspace.html');
    } else {
      window.location.replace('../../common/login/login.html');
    }
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
  } catch (error) {
    console.error(error);
    const message = document.createElement('p');
    message.textContent = error.message;
    document.querySelector('.content').prepend(message);
    return;
  }
  if (!user) return;

  const name = user.name || user.fullName || 'Employee';
  const parts = name.trim().split(/\s+/);
  const lastPart = parts[parts.length - 1];
  const initials = `${parts[0][0] || ''}${parts.length > 1 ? lastPart[0] : ''}`.toUpperCase();
  const status = user.status || user.employmentStatus || '—';

  // Show a dash when a value is missing.
  function value(item) {
    if (item === undefined || item === null || item === '') return '—';
    return String(item);
  }

  // Put text into a normal element (span, p, h1).
  function text(id, item) {
    document.getElementById(id).textContent = value(item);
  }

  // Put a value into a form input (empty when missing).
  function field(id, item) {
    if (item === undefined || item === null) item = '';
    document.getElementById(id).value = item;
  }

  const avatar = document.getElementById('mainAvatar');
  const fallbackImage = '../../common/profile/assets/profile.svg';
  let imageSource = fallbackImage;
  if (typeof user.image === 'string' && user.image.startsWith('data:image/')) {
    imageSource = user.image;
  } else if (typeof user.image === 'string' && user.image.startsWith('assets/')) {
    imageSource = new URL(`../../${user.image}`, document.baseURI).href;
  }

  const avatarImage = document.createElement('img');
  avatarImage.alt = `${name}'s profile photo`;
  avatarImage.addEventListener('error', function () {
    // "this" is the <img> that failed to load.
    if (this.dataset.usingFallback === 'true') {
      this.remove();
      avatar.textContent = initials;
      return;
    }
    this.dataset.usingFallback = 'true';
    this.src = fallbackImage;
  });
  avatarImage.src = imageSource;
  avatar.innerHTML = '';
  avatar.appendChild(avatarImage);

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
  field('inputSalary', user.salary ? user.salary.amount : '');
  text('currency', (user.salary && user.salary.currency) || '');
  field('inputStatus', status);
}

showEmployeeDetails();
