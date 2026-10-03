/* Delivery animation only. contact.js continues to save feedback through the API. */
(() => {
  const sendBtn = document.querySelector('.submit');
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


  window.FeedbackMotion = { async show(feedback) {
    sendBtn.classList.add('is-sending');
    try { await runSuccessAnimation(feedback); }
    catch (error) { closeSuccessAnimation(); console.warn('Feedback animation unavailable:', error); }
  } };
  closeSuccess.addEventListener("click", closeSuccessAnimation);

  overlay.querySelector("[data-feedback-close]")?.addEventListener("click", () => {
    if (overlay.classList.contains("is-delivered")) closeSuccessAnimation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-delivered")) {
      closeSuccessAnimation();
    }
  });

})();
