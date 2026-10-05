// My profile: shows the signed-in person (the session keeps the id, the API gives the latest data).
const API = "http://127.0.0.1:3000";

// Puts a value into an element, or a fallback text ("-" if none is given) when the value is empty.
function setText(id, value, fallback) {
  const element = document.getElementById(id);
  if (value === undefined || value === null || value === "") {
    element.textContent = fallback || "-";
  } else {
    element.textContent = value;
  }
}

function showProfile(employee) {
  // The top part of the card
  setText("profileName", employee.name, "Employee");
  setText("employeeId", employee.employeeId || employee.id);
  setText("profilePosition", employee.position);
  setText("profileDepartment", employee.department);

  // Personal and employment information
  setText("fullName", employee.name);
  setText("email", employee.email);
  setText("phone", employee.phone);
  setText("position", employee.position);
  setText("department", employee.department);
  setText("joiningDate", employee.joiningDate);
  setText("employmentStatus", employee.status, "Active");
  setText("officeLocation", employee.officeLocation || "—");

  // Profile picture
  const image = document.getElementById("profileImage");
  if (employee.image && employee.image.startsWith("data:")) {
    image.src = employee.image;
  } else {
    image.src = "assets/profile.svg";
  }
  image.alt = employee.name || "Employee profile";

  // "this" is the <img> that failed to load, so we show the default picture instead.
  image.onerror = function () {
    this.onerror = null;
    this.src = "assets/profile.svg";
  };
}

async function loadProfile() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("loggedUser"));
  } catch (error) {
    user = null;
  }
  if (user === null) {
    location.replace("../login/login.html");
    return;
  }

  try {
    const response = await fetch(`${API}/employees/${user.id}`);
    if (!response.ok) {
      console.error("Profile could not be loaded.");
      return;
    }
    showProfile(await response.json());
  } catch (error) {
    console.error("Profile could not be loaded:", error);
  }
}

loadProfile();
