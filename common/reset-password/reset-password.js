const API = 'http://127.0.0.1:3000';

const form = document.getElementById('reset-password-form');
const password = document.getElementById('new-password');
const confirmation = document.getElementById('confirm-password');
const errorBox = document.getElementById('password-error');
const errorText = document.getElementById('password-error-message');
const submitButton = form?.querySelector('[type="submit"]');
const submitLabel = submitButton?.querySelector('.btn-label');
const contextText = document.getElementById('reset-context');
const title = document.getElementById('reset-title');
const intro = document.getElementById('reset-intro');
const requirementItems = [...document.querySelectorAll('[data-requirement]')];

if (!form || !password || !confirmation || !errorBox || !errorText || !submitButton) {
  throw new Error('Reset Password page is missing required form elements.');
}

let session = null;
try {
  session = JSON.parse(localStorage.getItem('loggedUser') || 'null');
} catch {
  session = null;
}

const params = new URLSearchParams(window.location.search);
const recoverMode = params.get('mode') === 'recover';
const recoverEmail = sessionStorage.getItem('recoverEmail');

let recoverEmployee = null;
let accountReady = false;

function workspaceFor(role) {
  return role === 'HR'
    ? '../../hr/workspace/workspace.html'
    : '../../employee/MyWOrkSpace/MyWOrkSpace.html';
}

function showError(message = '') {
  errorText.textContent = message;
  errorBox.hidden = !message;
}

function setBusy(state, label = '') {
  submitButton.disabled = state || !accountReady;
  submitButton.setAttribute('aria-busy', String(state));
  form.setAttribute('aria-busy', String(state));

  if (submitLabel) {
    submitLabel.textContent = label || (recoverMode ? 'Reset Password' : 'Save Password');
  }
}

function setAccountReady(state) {
  accountReady = state;
  form.dataset.accountReady = String(state);
  submitButton.disabled = !state;
}

function goToLogin() {
  localStorage.removeItem('loggedUser');
  localStorage.removeItem('currentUserId');
  sessionStorage.removeItem('recoverEmail');
  location.replace('../login/login.html');
}

function accountCanReset(employee) {
  return employee && (employee.status === 'Active' || employee.status === 'Inactive');
}

function applyModeCopy() {
  if (!recoverMode) return;

  if (title) title.textContent = 'Reset Your Password';
  if (intro) intro.textContent = 'Create a new password to recover access to your Connectra account.';
  if (contextText) contextText.textContent = recoverEmail ? `Recovery · ${recoverEmail}` : 'Secure account recovery';
  if (submitLabel) submitLabel.textContent = 'Reset Password';
}

function updateRequirements() {
  const value = password.value;
  const checks = {
    length: value.length >= 8,
    letters: /[a-z]/i.test(value),
    number: /\d/.test(value)
  };

  requirementItems.forEach(item => {
    const key = item.dataset.requirement;
    item.classList.toggle('valid', Boolean(checks[key]));
  });
}

function setFieldState() {
  const matches = !confirmation.value || password.value === confirmation.value;
  password.closest('.password-field')?.classList.remove('invalid');
  confirmation.closest('.password-field')?.classList.toggle('invalid', !matches);
}

function validatePassword() {
  if (!password.value || !confirmation.value) {
    showError('Enter and confirm your new password.');
    return false;
  }

  if (password.value.length < 8 || !/[a-z]/i.test(password.value) || !/\d/.test(password.value)) {
    showError('Use at least 8 characters with letters and numbers.');
    return false;
  }

  if (password.value !== confirmation.value) {
    showError('The passwords do not match.');
    confirmation.closest('.password-field')?.classList.add('invalid');
    return false;
  }

  showError('');
  return true;
}

async function checkAccount() {
  setAccountReady(false);
  showError('');

  try {
    if (recoverMode) {
      if (!recoverEmail) {
        goToLogin();
        return;
      }

      const response = await fetch(`${API}/employees`);
      if (!response.ok) throw new Error('Could not check this account.');

      const employees = await response.json();
      const wantedEmail = recoverEmail.trim().toLowerCase();

      recoverEmployee = employees.find(employee =>
        String(employee.email || '').trim().toLowerCase() === wantedEmail
      ) || null;

      if (!recoverEmployee) {
        showError('No account was found for that email.');
        return;
      }

      if (!accountCanReset(recoverEmployee)) {
        showError('This account cannot reset its password. Please contact HR.');
        return;
      }

      setAccountReady(true);
      return;
    }

    if (!session?.id) {
      goToLogin();
      return;
    }

    const response = await fetch(`${API}/employees/${encodeURIComponent(session.id)}`);
    if (!response.ok) throw new Error('Could not check this account.');

    const employee = await response.json();

    if (!accountCanReset(employee)) {
      goToLogin();
      return;
    }

    if (employee.firstAttend !== true) {
      location.replace(workspaceFor(employee.role));
      return;
    }

    session = { ...session, role: employee.role };
    setAccountReady(true);
  } catch (error) {
    setAccountReady(false);
    showError(`${error.message} Make sure the API is running.`);
  }
}

document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.getAttribute('aria-controls'));
    if (!input) return;

    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');

    const icon = button.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = reveal ? 'visibility_off' : 'visibility';
  });
});

[password, confirmation].forEach(input => {
  input.addEventListener('input', () => {
    showError('');
    updateRequirements();
    setFieldState();
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (!accountReady) {
    showError('Your account is still being verified. Please try again.');
    return;
  }

  if (!validatePassword()) return;

  const employeeId = recoverMode ? recoverEmployee?.id : session?.id;

  if (!employeeId) {
    showError('Could not identify the account.');
    return;
  }

  setBusy(true, 'Saving…');

  try {
    const response = await fetch(`${API}/employees/${encodeURIComponent(employeeId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password.value,
        firstAttend: false
      })
    });

    if (!response.ok) throw new Error('Could not save your password.');

    document.dispatchEvent(new CustomEvent('password-reset:success'));

    if (window.RouterReset?.finish) {
      await window.RouterReset.finish();
    }

    if (recoverMode) {
      sessionStorage.removeItem('recoverEmail');
      localStorage.removeItem('loggedUser');
      localStorage.removeItem('currentUserId');
      location.replace('../login/login.html');
      return;
    }

    location.replace(workspaceFor(session.role));
  } catch (error) {
    document.dispatchEvent(new CustomEvent('password-reset:error'));
    showError(`${error.message} Make sure the API is running.`);
    setBusy(false);
  }
});

applyModeCopy();
updateRequirements();
setFieldState();
setBusy(false);
checkAccount();
