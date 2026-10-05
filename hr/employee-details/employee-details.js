// HR: details of one employee (the data comes from the API).
const API = "http://127.0.0.1:3000";
const fallbackImage = "../../common/profile/assets/profile.svg";

// Puts a value into an element, or "—" when the value is missing.
function showText(elementId, value) {
  if (value === null || value === undefined) {
    value = "—";
  }
  document.getElementById(elementId).textContent = value;
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

async function showEmployee() {
  // The link looks like employee-details.html?id=3, so the id is after the "=".
  const id = location.search.split("=")[1];
  const message = document.getElementById("detailMessage");
  if (!id) {
    message.textContent = "Choose an employee from the directory.";
    return;
  }

  try {
    const response = await fetch(`${API}/employees/${id}`);
    if (!response.ok) {
      message.textContent = "Could not load employee.";
      return;
    }
    const employee = await response.json();

    const name = employee.name || "Employee";
    showText("detailName", name);
    const initials = name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();

    // Profile photo: try the saved image, then the default picture, then the initials.
    const avatar = document.getElementById("detailAvatar");
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
    avatarImage.src = getImageSource(employee.image);
    avatar.innerHTML = "";
    avatar.appendChild(avatarImage);

    const status = employee.status || "Inactive";
    showText("detailPosition", employee.position);
    showText("detailStatus", status);
    document.getElementById("detailStatus").className = `detail-status ${status.toLowerCase()}`;
    showText("detailId", employee.employeeId || `#${employee.id}`);
    showText("detailDepartment", employee.department);
    showText("detailRole", employee.role === "HR" ? "HR" : "Employee");
    showText("detailDate", employee.joiningDate);
    showText("detailOffice", employee.officeLocation);
    showText("detailFirstLogin", employee.firstAttend === true ? "Pending first sign-in" : "Completed");
    showText("detailEmail", employee.email);
    showText("detailPhone", employee.phone);
    showText("detailSalary", employee.salary ? `${employee.salary.amount} ${employee.salary.currency || ""}` : "—");

    document.getElementById("editLink").href = `../employees/employees.html?edit=${id}`;
    document.getElementById("detailContent").hidden = false;
    message.remove();
  } catch (error) {
    message.textContent = error.message;
  }
}

showEmployee();
