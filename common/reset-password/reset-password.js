// Reset password: a new employee chooses a new password on the first login.
// The animation is in reset-animation.js. This file only calls its hooks: RouterReset.success / finish / error.
const API = "http://127.0.0.1:3000";

const form = document.getElementById("reset-password-form");
const password = document.getElementById("new-password");
const confirmation = document.getElementById("confirm-password");
const errorBox = document.getElementById("password-error");
const errorText = document.getElementById("password-error-message");
const submitButton = form.querySelector('[type="submit"]');

// Who is logged in?
let session = null;
try {
  session = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  session = null;
}

// Shows the red error box (an empty message hides it).
function showError(message) {
  errorText.textContent = message;
  errorBox.hidden = !message;
}

// Where does each role start?
function workspaceFor(role) {
  if (role === "HR") {
    return "../../hr/workspace/workspace.html";
  }
  return "../../employee/MyWOrkSpace/MyWOrkSpace.html";
}

// Only a person on the first login can use this page.
async function checkFirstLogin() {
  if (session === null || !session.id) {
    location.replace("../login/login.html");
    return;
  }

  try {
    const response = await fetch(`${API}/employees/${session.id}`);
    if (!response.ok) {
      showError("Could not check this account. Make sure the API is running.");
      return;
    }
    const employee = await response.json();
    if (employee.status !== "Active" && employee.status !== "Inactive") {
      localStorage.removeItem("loggedUser");
      location.replace("../login/login.html");
    } else if (employee.firstAttend !== true) {
      // This person already chose a password.
      location.replace(workspaceFor(employee.role));
    }
  } catch (error) {
    showError(`${error.message} Make sure the API is running.`);
  }
}

// ----- Show / hide the password (there is one button for each password box) -----
document.querySelectorAll(".password-toggle").forEach(function (button) {
  // "this" is the toggle button that was clicked.
  button.addEventListener("click", function () {
    const input = document.getElementById(this.getAttribute("aria-controls"));
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    this.setAttribute("aria-pressed", String(reveal));
    this.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    this.querySelector("span").textContent = reveal ? "visibility_off" : "visibility";
  });
});

// ----- Save the new password -----
form.onsubmit = async function (event) {
  event.preventDefault();
  showError("");

  const newPassword = password.value;
  if (newPassword.length < 8 || !/[a-z]/i.test(newPassword) || !/\d/.test(newPassword)) {
    showError("Use at least 8 characters with letters and numbers.");
    return;
  }
  if (newPassword !== confirmation.value) {
    showError("The passwords do not match.");
    return;
  }

  submitButton.disabled = true;
  let problem = "";
  try {
    // PATCH changes only the fields we send. firstAttend false means: the password was chosen.
    const response = await fetch(`${API}/employees/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword, firstAttend: false })
    });
    if (response.ok) {
      if (window.RouterReset) {
        window.RouterReset.success();
        await window.RouterReset.finish();
      }
      location.replace(workspaceFor(session.role));
    } else {
      problem = "Could not save your password.";
    }
  } catch (error) {
    problem = error.message;
  }

  if (problem) {
    if (window.RouterReset) {
      window.RouterReset.error();
    }
    showError(`${problem} Make sure the API is running.`);
  }
  submitButton.disabled = false;
};

checkFirstLogin();
