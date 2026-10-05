// My Details: shows the signed-in employee (the data comes from the API).
const API = "http://127.0.0.1:3000";
const fallbackImage = "../../common/profile/assets/profile.svg";

// Gives back a dash when a value is missing.
function valueOrDash(item) {
  if (item === undefined || item === null || item === "") {
    return "—";
  }
  return String(item);
}

// Puts text into a normal element (span, p, h1).
function showText(id, item) {
  document.getElementById(id).textContent = valueOrDash(item);
}

// Puts a value into a form input (empty when missing).
function fillInput(id, item) {
  if (item === undefined || item === null) {
    item = "";
  }
  document.getElementById(id).value = item;
}

// Works out which picture to show for the employee.
function getImageSource(image) {
  if (typeof image === "string" && image.startsWith("data:image/")) {
    return image;
  }
  if (typeof image === "string" && image.startsWith("assets/")) {
    return `../../${image}`;
  }
  return fallbackImage;
}

// Shows an error message at the top of the page.
function showMessage(text) {
  const message = document.getElementById("detailsMessage");
  message.textContent = text;
  message.hidden = false;
}

async function loadEmployee() {
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem("loggedUser"));
  } catch (error) {
    session = null;
  }
  // navbar.js already sends everyone without an employee session to the right page.
  if (session === null || session.role !== "EMP") {
    return;
  }

  try {
    const response = await fetch(`${API}/employees/${session.id}`);
    if (!response.ok) {
      showMessage("Could not load employee details.");
      return;
    }
    showEmployee(await response.json());
  } catch (error) {
    showMessage(error.message);
  }
}

function showEmployee(user) {
  const name = user.name || user.fullName || "Employee";
  const words = name.trim().split(/\s+/);
  let initials = words[0][0] || "";
  if (words.length > 1) {
    initials = initials + words[words.length - 1][0];
  }
  initials = initials.toUpperCase();
  const status = user.status || user.employmentStatus || "—";

  // Profile photo: try the saved image, then the default picture, then the initials.
  const avatar = document.getElementById("mainAvatar");
  const avatarImage = document.createElement("img");
  avatarImage.alt = `${name}'s profile photo`;
  let usingFallback = false;
  // "this" is the <img> element that failed to load.
  avatarImage.addEventListener("error", function () {
    if (usingFallback) {
      this.remove();
      avatar.textContent = initials;
      return;
    }
    usingFallback = true;
    this.src = fallbackImage;
  });
  avatarImage.src = getImageSource(user.image);
  avatar.innerHTML = "";
  avatar.appendChild(avatarImage);

  showText("name", name);
  showText("position", user.position);
  showText("emailText", user.email);
  showText("phone", user.phone);
  showText("officeLocation", user.officeLocation);
  showText("joinDate", user.joiningDate);
  showText("headerStatus", status === "Active" ? "Active Employee" : status);

  fillInput("inputName", name);
  fillInput("inputEmail", user.email);
  fillInput("inputDate", user.joiningDate);
  fillInput("inputPosition", user.position);
  fillInput("inputID", user.employeeId || user.id);
  fillInput("inputDepartment", user.department);
  fillInput("inputSalary", user.salary ? user.salary.amount : "");
  showText("currency", (user.salary && user.salary.currency) || "");
  fillInput("inputStatus", status);
}

loadEmployee();
