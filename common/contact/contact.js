// Contact: a person sends feedback to HR (the feedback is saved in the API).
// The "thank you" animation is in contact-motion.js. This file only calls its hook: FeedbackMotion.show.
const API = "http://127.0.0.1:3000";

const nameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");
const anonymousBox = document.getElementById("anonymous");
const uploadBox = document.querySelector(".upload");
const uploadText = uploadBox.querySelector("p");

let selectedCategory = "General Feedback";
let uploadedFile = null; // the file the person picked (null means no file)

// ----- Who is sending the feedback? -----
let user = null;
try {
  user = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  user = null;
}
if (user !== null) {
  nameInput.value = user.name;
  emailInput.value = user.email;
} else {
  nameInput.value = "Guest User";
  emailInput.value = "";
}

// ----- Feedback categories (the clicked button gets the class "selected") -----
const categoryButtons = document.querySelectorAll(".tags button");
categoryButtons.forEach(function (button) {
  // "this" is the category button that was clicked.
  button.addEventListener("click", function () {
    categoryButtons.forEach(function (other) {
      other.className = "";
    });
    this.className = "selected";
    selectedCategory = this.textContent.trim();
  });
});

// ----- Upload a file -----
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".png,.jpg,.jpeg,.pdf,.docx";
fileInput.hidden = true;
uploadBox.appendChild(fileInput);

uploadBox.addEventListener("click", function () {
  fileInput.click();
});

// "this" is the file input that changed.
fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) {
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("File size must be less than 10MB");
    this.value = "";
    return;
  }

  // FileReader turns the file into text, so it can be saved in the API.
  const reader = new FileReader();
  reader.onload = function () {
    uploadedFile = { name: file.name, type: file.type, data: reader.result };
  };
  reader.readAsDataURL(file);
  uploadText.textContent = file.name;
});

// ----- Send the feedback -----
document.querySelector(".submit").addEventListener("click", async function () {
  const subject = subjectInput.value.trim();
  const message = messageInput.value.trim();
  const anonymous = anonymousBox.checked;

  if (subject === "" || message === "") {
    alert("Please fill subject and message.");
    return;
  }

  // An anonymous message hides the name and the email.
  const feedback = {
    employeeId: user && user.id ? String(user.id) : null,
    name: anonymous ? "Anonymous" : (user ? user.name : "Guest User"),
    email: anonymous ? "Hidden" : (user ? user.email : ""),
    anonymous: anonymous,
    category: selectedCategory,
    subject: subject,
    message: message,
    attachment: uploadedFile,
    createdAt: new Date().toISOString(),
    priority: null,
    read: false
  };

  // POST adds the feedback to the API.
  let saved = false;
  try {
    const response = await fetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback)
    });
    saved = response.ok;
  } catch (error) {
    saved = false;
  }
  if (!saved) {
    alert("Could not send feedback. Make sure the API is running, then try again.");
    return;
  }

  // The thank you message
  if (window.FeedbackMotion) {
    await window.FeedbackMotion.show(feedback);
  } else {
    alert("Feedback sent successfully!");
  }

  // Clear the form
  subjectInput.value = "";
  messageInput.value = "";
  anonymousBox.checked = false;
  uploadedFile = null;
  fileInput.value = "";
  uploadText.textContent = "Click to upload files";
});
