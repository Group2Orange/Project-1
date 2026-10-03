const API = 'http://127.0.0.1:3000';
const form = document.getElementById('reset-password-form');
const password = document.getElementById('new-password');
const confirmation = document.getElementById('confirm-password');
const errorBox = document.getElementById('password-error');
const errorText = document.getElementById('password-error-message');
const submitButton = form.querySelector('[type="submit"]');

let session = null;
try { session = JSON.parse(localStorage.getItem('loggedUser') || 'null'); } catch { /* No active session. */ }

function showError(message) {
  errorText.textContent = message;
  errorBox.hidden = !message;
}

function workspaceFor(role) {
  return role === 'HR'
    ? '../../hr/workspace/workspace.html'
    : '../../employee/MyWOrkSpace/MyWOrkSpace.html';
}

async function checkFirstLogin() {
  if (!session?.id) {
    location.replace('../login/login.html');
    return;
  }
  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(session.id)}`);
    if (!response.ok) throw new Error('Could not check this account.');
    const employee = await response.json();
    if (employee.status !== 'Active' && employee.status !== 'Inactive') {

      localStorage.removeItem('loggedUser');
      localStorage.removeItem('currentUserId');
      location.replace('../login/login.html');
      return;
    }
    if (employee.firstAttend !== true) location.replace(workspaceFor(employee.role));
  } catch (error) {
    showError(`${error.message} Make sure the API is running.`);
  }
}

document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.getAttribute('aria-controls'));
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    button.querySelector('span').textContent = reveal ? 'visibility_off' : 'visibility';
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  showError('');
  if (password.value.length < 8 || !/[a-z]/i.test(password.value) || !/\d/.test(password.value)) {
    showError('Use at least 8 characters with letters and numbers.');
    return;
  }
  if (password.value !== confirmation.value) {
    showError('The passwords do not match.');
    return;
  }

  submitButton.disabled = true;
  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(session.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value, firstAttend: false })
    });
    if (!response.ok) throw new Error('Could not save your password.');
    location.replace(workspaceFor(session.role));
  } catch (error) {
    showError(`${error.message} Make sure the API is running.`);
  } finally {
    submitButton.disabled = false;
  }
});

checkFirstLogin();
