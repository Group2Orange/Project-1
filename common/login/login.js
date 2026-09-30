const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');

passwordToggle.addEventListener('click', () => {
  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', String(showPassword));
  passwordToggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
  passwordToggle.querySelector('span').textContent = showPassword ? 'visibility_off' : 'visibility';
});

// Use this after an authentication response: setLoginError(true) for rejected credentials.
function setLoginError(hasError) {
  document.querySelector('#login-error').hidden = !hasError;
  if (hasError) {
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.setAttribute('aria-describedby', 'login-error');
  } else {
    passwordInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-describedby');
  }
}

// Clear the previous error when the user starts correcting their credentials.
for (const input of document.querySelectorAll('#username, #password')) {
  input.addEventListener('input', () => setLoginError(false));
}
