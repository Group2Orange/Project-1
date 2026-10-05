// Login: asks the API if the email and the password belong to an employee.
// The animation is in login-motion.js. This file only calls its three hooks: LoginMotion.start / error / success.
const API = "http://127.0.0.1:3000";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const passwordToggle = document.querySelector(".password-toggle");
const submitButton = loginForm.querySelector(".login-btn");

// Opening the login page ends the old session (this is what Logout does too).
localStorage.removeItem("loggedUser");

// ----- Show / hide the password -----
// "this" is the toggle button that was clicked.
passwordToggle.addEventListener("click", function () {
  const showPassword = passwordInput.type === "password";
  passwordInput.type = showPassword ? "text" : "password";
  this.setAttribute("aria-pressed", String(showPassword));
  this.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  this.querySelector("span").textContent = showPassword ? "visibility_off" : "visibility";
});

// ----- The red error box (an empty message hides it) -----
function setLoginError(message) {
  message = message || "";
  if (window.LoginMotion) {
    window.LoginMotion.error(message);
  }
  document.getElementById("login-error").hidden = !message;
  if (message) {
    document.getElementById("login-error-message").textContent = message;
    passwordInput.setAttribute("aria-invalid", "true");
    passwordInput.setAttribute("aria-describedby", "login-error");
  } else {
    passwordInput.removeAttribute("aria-invalid");
    passwordInput.removeAttribute("aria-describedby");
  }
}

// The old error disappears when the person starts typing again.
emailInput.addEventListener("input", function () {
  setLoginError("");
});
passwordInput.addEventListener("input", function () {
  setLoginError("");
});

// ----- Check the employee that the API found, then sign in -----
async function signIn(employee) {
  if (!employee) {
    setLoginError("Incorrect email or password.");
    return;
  }
  if (employee.status !== "Active" && employee.status !== "Inactive") {
    setLoginError("This account is not active. Please contact HR.");
    return;
  }
  if (employee.role !== "HR" && employee.role !== "EMP") {
    setLoginError("This account has no supported role. Please contact HR.");
    return;
  }

  // Keep only the details the other screens need, never the whole employee record.
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
  localStorage.setItem("loggedUser", JSON.stringify(loggedUser));

  if (window.LoginMotion) {
    await window.LoginMotion.success();
  }

  // A new employee must choose a new password first.
  if (employee.firstAttend === true) {
    location.href = "../reset-password/reset-password.html";
  } else if (employee.role === "HR") {
    location.href = "../../hr/workspace/workspace.html";
  } else {
    location.href = "../../employee/MyWOrkSpace/MyWOrkSpace.html";
  }
}

// ----- The login form -----
loginForm.onsubmit = async function (event) {
  event.preventDefault();
  setLoginError("");
  submitButton.disabled = true;
  if (window.LoginMotion) {
    window.LoginMotion.start();
  }

  try {
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // json-server gives back the employees whose email and password are the same as in the URL.
    const response = await fetch(`${API}/employees?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    if (!response.ok) {
      setLoginError("Could not check your account.");
    } else {
      const matches = await response.json();
      await signIn(matches[0]);
    }
  } catch (error) {
    setLoginError(error.message || "Could not load employee data.");
  }
  submitButton.disabled = false;
};
