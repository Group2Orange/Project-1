document.addEventListener("DOMContentLoaded", () => {
  const userData = localStorage.getItem("loggedUser");
  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const subjectInput = document.querySelector("input[placeholder*='hybrid']");
  const messageInput = document.querySelector("textarea");
  const anonymousInput = document.getElementById("anonymous");
  const sendBtn = document.querySelector(".submit");
  const uploadBox = document.querySelector(".upload");
  const categoryButtons = document.querySelectorAll(".tags button");
  const noticeClose = document.querySelector(".notice .close");

  let user = null;
  let selectedCategory = "General Feedback";
  let uploadedFile = "";

  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch {
      user = null;
    }
  }

  nameInput.value = user?.name || "Guest User";
  emailInput.value = user?.email || "";
  nameInput.readOnly = true;
  emailInput.readOnly = true;

  categoryButtons.forEach((button) => {
    button.type = "button";
    button.addEventListener("click", () => {
      categoryButtons.forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      selectedCategory = button.innerText.trim();
    });
  });

  noticeClose?.addEventListener("click", () => {
    noticeClose.closest(".notice")?.remove();
  });

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".png,.jpg,.jpeg,.pdf,.docx";
  fileInput.hidden = true;
  uploadBox.appendChild(fileInput);

  uploadBox.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      fileInput.value = "";
      return;
    }

    uploadedFile = file.name;
    uploadBox.querySelector("p").textContent = file.name;
  });

  const overlay = document.getElementById("feedbackSuccess");
  const successTitle = document.getElementById("feedbackSuccessTitle");
  const successDescription = document.getElementById("feedbackSuccessDescription");
  const successEyebrow = overlay.querySelector("[data-success-eyebrow]");
  const successIcon = overlay.querySelector("[data-success-icon]");
  const closeSuccess = document.getElementById("closeFeedbackSuccess");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let previousFocus = null;

  const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, reduceMotion.matches ? 60 : ms);
  });

  function resetSuccessAnimation() {
    overlay.classList.remove("is-delivered");
    overlay.classList.add("is-sending");
    successEyebrow.textContent = "Secure delivery";
    successIcon.textContent = "send";
    successTitle.textContent = "Sending your feedback...";
    successDescription.textContent = "Your message is being securely delivered to People Operations.";
    closeSuccess.hidden = true;
  }

  function openSuccessAnimation() {
    previousFocus = document.activeElement;
    resetSuccessAnimation();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("feedback-success-open");
  }

  function showDelivered(feedback) {
    overlay.classList.remove("is-sending");
    overlay.classList.add("is-delivered");
    successEyebrow.textContent = "Feedback received";
    successIcon.textContent = "check_circle";
    successTitle.textContent = "Thank you — your feedback is in.";
    successDescription.textContent = feedback.name === "Anonymous"
      ? "Your feedback was delivered anonymously to People Operations."
      : "Your feedback was delivered successfully to People Operations.";
    closeSuccess.hidden = false;
    closeSuccess.focus({ preventScroll: true });
  }

  function closeSuccessAnimation() {
    overlay.classList.remove("is-open", "is-sending", "is-delivered");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("feedback-success-open");
    sendBtn.classList.remove("is-sending");
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
  }

  async function runSuccessAnimation(feedback) {
    openSuccessAnimation();
    await wait(1650);
    showDelivered(feedback);
  }

  function clearForm() {
    subjectInput.value = "";
    messageInput.value = "";
    anonymousInput.checked = false;
    uploadedFile = "";
    fileInput.value = "";
    uploadBox.querySelector("p").textContent = "Click to upload files";
  }

  sendBtn.addEventListener("click", async () => {
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    const anonymous = anonymousInput.checked;

    if (!subject || !message) {
      alert("Please fill subject and message.");
      return;
    }

    const feedback = {
      id: Date.now(),
      name: anonymous ? "Anonymous" : (user?.name || "Guest User"),
      email: anonymous ? "Hidden" : (user?.email || ""),
      category: selectedCategory,
      subject,
      message,
      attachment: uploadedFile || null,
      date: new Date().toLocaleString(),
      status: "New"
    };

    let feedbacks = [];

    try {
      feedbacks = JSON.parse(localStorage.getItem("feedbacks")) || [];
    } catch {
      feedbacks = [];
    }

    feedbacks.push(feedback);
    localStorage.setItem("feedbacks", JSON.stringify(feedbacks));

    sendBtn.classList.add("is-sending");
    clearForm();

    try {
      await runSuccessAnimation(feedback);
    } catch (error) {
      console.error("Feedback success animation failed:", error);
      closeSuccessAnimation();
      alert("Feedback was saved successfully.");
    }
  });

  closeSuccess.addEventListener("click", closeSuccessAnimation);

  overlay.querySelector("[data-feedback-close]")?.addEventListener("click", () => {
    if (overlay.classList.contains("is-delivered")) closeSuccessAnimation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-delivered")) {
      closeSuccessAnimation();
    }
  });

});
