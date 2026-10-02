const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');
const submitButton = loginForm.querySelector('.login-btn');
const API = 'http://127.0.0.1:3000';

// Visiting the login page ends the previous local session, including after Logout.
localStorage.removeItem('loggedUser');
localStorage.removeItem('currentUserId');
localStorage.removeItem('currentUser');

passwordToggle.addEventListener('click', () => {
  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', String(showPassword));
  passwordToggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
  passwordToggle.querySelector('span').textContent = showPassword ? 'visibility_off' : 'visibility';
});

function setLoginError(message = '') {
  document.querySelector('#login-error').hidden = !message;
  if (message) {
    document.querySelector('#login-error-message').textContent = message;
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.setAttribute('aria-describedby', 'login-error');
  } else {
    passwordInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-describedby');
  }
}

// Clear the previous error when the user starts correcting their credentials.
for (const input of [emailInput, passwordInput]) {
  input.addEventListener('input', () => setLoginError());
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginError();
  submitButton.disabled = true;

  try {
    const email = emailInput.value.trim().toLowerCase();
    // OLD WAY (JSON + localStorage), kept here to compare with the API call below:
    // const response = await fetch('../../Data/employee.json');
    // const data = await response.json();
    // const employee = data.employees.find(person =>
    //   person.email.toLowerCase() === email && person.password === passwordInput.value
    // );
    // This read the bundled file; changes to it were not shared between browsers.

    // NEW WAY: ask json-server for matching employees in api/db.json.
    const query = new URLSearchParams({ email, password: passwordInput.value });
    const response = await fetch(`${API}/employees?${query}`);
    if (!response.ok) throw new Error('Could not check your account.');
    const matches = await response.json();
    const employee = matches[0];
    if (!employee) {
      setLoginError('Incorrect email or password.');
      return;
    }

    if (employee.status !== 'Active' && employee.status !== 'Inactive') {
      setLoginError('This account is not active. Please contact HR.');
      return;
    }

    if (employee.role !== 'HR' && employee.role !== 'EMP') {
      setLoginError('This account has no supported role. Please contact HR.');
      return;
    }

    // Keep only the identity details other screens need, never the whole employee record.
    const loggedUser = {
      id: employee.id,
      role: employee.role,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      employeeId: employee.employeeId,
      image: employee.image
    };
    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
    localStorage.removeItem('currentUser');
    localStorage.setItem('currentUserId', String(employee.id));

    if (employee.firstAttend === true) {
      window.location.href = '../reset-password/reset-password.html';
      return;
    }

    window.location.href = employee.role === 'HR'
      ? '../../hr/workspace/workspace.html'
      : '../../employee/MyWOrkSpace/MyWOrkSpace.html';
  } catch (error) {
    console.error('Login failed to load employee data:', error);
    setLoginError(error.message || 'Could not load employee data.');
  } finally {
    submitButton.disabled = false;
  }
});
