const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');
const submitButton = loginForm.querySelector('.login-btn');

// Visiting the login page ends the previous local session, including after Logout.
localStorage.removeItem('loggedUser');
localStorage.removeItem('currentUserId');

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
    const response = await fetch('../../Data/employee.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load employees: ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.employees)) throw new Error('Invalid employee data');

    const email = emailInput.value.trim().toLowerCase();
    const employee = data.employees.find((person) =>
      typeof person.email === 'string' && person.email.trim().toLowerCase() === email
    );

    if (!employee || employee.password !== passwordInput.value) {
      setLoginError('Incorrect email or password.');
      return;
    }

    if (employee.status !== 'Active') {
      setLoginError('This account is not active. Please contact HR.');
      return;
    }

    if (employee.role !== 'HR' && employee.role !== 'EMP') {
      setLoginError('This account has no supported role. Please contact HR.');
      return;
    }

    // Other pages use loggedUser. Never save the password to localStorage.
    let edits = {};
    try { edits = JSON.parse(localStorage.getItem(`profileEdits_${employee.id}`)) || {}; } catch { /* Ignore invalid local edits. */ }
    const loggedUser = { ...employee };
    if (typeof edits.name === 'string') loggedUser.name = edits.name;
    if (typeof edits.phone === 'string') loggedUser.phone = edits.phone;
    if (typeof edits.image === 'string') loggedUser.image = edits.image;
    delete loggedUser.password;
    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
    localStorage.setItem('currentUserId', String(employee.id));

    window.location.href = employee.role === 'HR'
      ? '../home/home.html'
      : '../../employee/MyWOrkSpace/MyWOrkSpace.html';
  } catch (error) {
    console.error('Login failed to load employee data:', error);
    setLoginError('Could not load employee data. Please open the project through Live Server.');
  } finally {
    submitButton.disabled = false;
  }
});
