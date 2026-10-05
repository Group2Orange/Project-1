// Edit profile: the person changes their name, phone number and photo (the data comes from the API).
const API = "http://127.0.0.1:3000";

const form = document.getElementById("editProfileForm");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const photo = document.getElementById("profileImage");
let newImage = null; // the photo the person picked (null means no new photo)

// Who is logged in?
let user = null;
try {
  user = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  user = null;
}
if (user === null) {
  location.replace("../login/login.html");
}

// ----- Fill the form with the latest data from the API -----
async function showProfile() {
  try {
    const response = await fetch(`${API}/employees/${user.id}`);
    if (!response.ok) {
      document.getElementById("employeeName").textContent = "Could not load profile.";
      return;
    }
    const current = await response.json();

    document.getElementById("employeeName").textContent = current.name;
    fullName.value = current.name || "";
    phone.value = current.phone ? current.phone.replace("+962", "") : "";
    document.getElementById("position").value = current.position || "";
    document.getElementById("department").value = current.department || "";
    document.getElementById("email").value = current.email || "";
    document.getElementById("employeeId").value = current.id || "";
    if (current.image && current.image.startsWith("data:")) {
      photo.style.backgroundImage = `url("${current.image}")`;
    } else {
      photo.style.backgroundImage = 'url("../profile/assets/profile.svg")';
    }
  } catch (error) {
    document.getElementById("employeeName").textContent = error.message;
  }
}

// Shows or hides the red phone number warning.
function showPhoneError(show) {
  phone.className = show ? "form-control error-input" : "form-control";
  document.getElementById("phoneErrorIcon").style.display = show ? "inline-block" : "none";
  document.getElementById("phoneErrorMessage").style.display = show ? "block" : "none";
  document.getElementById("phoneValidationText").style.display = show ? "inline" : "none";
}

// ----- Save the changes -----
form.onsubmit = async function (event) {
  event.preventDefault();
  const name = fullName.value.trim();
  const number = phone.value.trim();

  // The phone number must be exactly 9 digits (the +962 is added by the page).
  const invalidPhone = !/^[0-9]{9}$/.test(number);
  fullName.className = name ? "form-control" : "form-control error-input";
  showPhoneError(invalidPhone);
  if (!name || invalidPhone) {
    return;
  }

  // Only send the photo when the person picked a new one.
  const changes = { name: name, phone: "+962" + number };
  if (newImage) {
    changes.image = newImage;
  }

  try {
    // PATCH changes only the fields we send.
    const response = await fetch(`${API}/employees/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });
    if (!response.ok) {
      alert("Could not update profile.");
      return;
    }
    const updated = await response.json();

    // Keep the new details in the session, so the other screens show them too.
    const session = {
      id: updated.id,
      role: updated.role,
      name: updated.name,
      email: updated.email,
      department: updated.department,
      position: updated.position,
      employeeId: updated.employeeId,
      phone: updated.phone,
      image: updated.image
    };
    localStorage.setItem("loggedUser", JSON.stringify(session));
    newImage = null;
    await showProfile();
    window.updateNavbarIdentity(); // shows the new name and photo in the navbar
    alert("Profile updated successfully.");
  } catch (error) {
    alert(error.message || "Could not save the profile. Try a smaller photo.");
  }
};

// Cancel leaves the page without saving.
document.getElementById("btnCancel").onclick = function () {
  location.href = "../profile/profile.html";
};

// ----- Choose a new photo -----
// "this" is the file input that changed.
document.getElementById("photoInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file || !file.type.startsWith("image/")) {
    return;
  }
  if (file.size > 1024 * 1024) {
    alert("Choose a photo smaller than 1 MB.");
    return;
  }
  // FileReader turns the picture into text, so it can be saved in the API.
  const reader = new FileReader();
  reader.onload = function () {
    newImage = reader.result;
    photo.style.backgroundImage = `url("${newImage}")`;
  };
  reader.readAsDataURL(file);
});

// The warning disappears when the person starts typing again.
phone.addEventListener("input", function () {
  showPhoneError(false);
});

if (user !== null) {
  showProfile();
}
