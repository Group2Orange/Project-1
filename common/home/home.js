const currentYear =
  document.getElementById(
    "currentYear"
  );

const reduceMotion =
  window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

const autoplayVideos =
  document.querySelectorAll(
    "video[autoplay]"
  );

const feedbackTrack =
  document.getElementById(
    "feedbackTrack"
  );

const feedbackGroup =
  document.getElementById(
    "feedbackGroup"
  );

const companyCarousel =
  document.getElementById(
    "companyCarousel"
  );

const companyTrack =
  document.getElementById(
    "companyTrack"
  );

const companyPrev =
  document.getElementById(
    "companyPrev"
  );

const companyNext =
  document.getElementById(
    "companyNext"
  );

let companyAutoPlay = null;

function updateVideoState() {
  autoplayVideos.forEach(
    (video) => {
      if (
        reduceMotion.matches ||
        document.hidden
      ) {
        video.pause();
        return;
      }

      video
        .play()
        .catch(() => {});
    }
  );
}

function createFeedbackLoop() {
  if (
    !feedbackTrack ||
    !feedbackGroup
  ) {
    return;
  }

  const clone =
    feedbackGroup.cloneNode(true);

  clone.removeAttribute("id");

  clone.setAttribute(
    "aria-hidden",
    "true"
  );

  clone
    .querySelectorAll(
      "[tabindex]"
    )
    .forEach((item) => {
      item.setAttribute(
        "tabindex",
        "-1"
      );
    });

  feedbackTrack.appendChild(
    clone
  );
}

function getCompanyStep() {
  if (!companyTrack) {
    return 0;
  }

  const slide =
    companyTrack.querySelector(
      ".company-slide"
    );

  if (!slide) {
    return 0;
  }

  const styles =
    getComputedStyle(
      companyTrack
    );

  const gap =
    parseFloat(
      styles.columnGap
    ) || 18;

  return (
    slide
      .getBoundingClientRect()
      .width + gap
  );
}

function moveCompanySlider(
  direction
) {
  if (!companyTrack) {
    return;
  }

  const step =
    getCompanyStep();

  if (!step) {
    return;
  }

  const maxScroll =
    companyTrack.scrollWidth -
    companyTrack.clientWidth;

  if (
    direction > 0 &&
    companyTrack.scrollLeft >=
      maxScroll - step * 0.5
  ) {
    companyTrack.scrollTo({
      left: 0,
      behavior: "smooth"
    });

    return;
  }

  if (
    direction < 0 &&
    companyTrack.scrollLeft <=
      step * 0.5
  ) {
    companyTrack.scrollTo({
      left: maxScroll,
      behavior: "smooth"
    });

    return;
  }

  companyTrack.scrollBy({
    left:
      step * direction,
    behavior: "smooth"
  });
}

function stopCompanyAutoPlay() {
  if (!companyAutoPlay) {
    return;
  }

  clearInterval(
    companyAutoPlay
  );

  companyAutoPlay = null;
}

function startCompanyAutoPlay() {
  stopCompanyAutoPlay();

  if (
    reduceMotion.matches ||
    !companyTrack
  ) {
    return;
  }

  companyAutoPlay =
    setInterval(
      () => {
        moveCompanySlider(1);
      },
      4500
    );
}

if (currentYear) {
  currentYear.textContent =
    new Date().getFullYear();
}

createFeedbackLoop();

updateVideoState();

startCompanyAutoPlay();

companyPrev?.addEventListener(
  "click",
  () => {
    moveCompanySlider(-1);
    startCompanyAutoPlay();
  }
);

companyNext?.addEventListener(
  "click",
  () => {
    moveCompanySlider(1);
    startCompanyAutoPlay();
  }
);

companyCarousel?.addEventListener(
  "mouseenter",
  stopCompanyAutoPlay
);

companyCarousel?.addEventListener(
  "mouseleave",
  startCompanyAutoPlay
);

companyCarousel?.addEventListener(
  "focusin",
  stopCompanyAutoPlay
);

companyCarousel?.addEventListener(
  "focusout",
  startCompanyAutoPlay
);

document.addEventListener(
  "visibilitychange",
  () => {
    updateVideoState();

    if (document.hidden) {
      stopCompanyAutoPlay();
      return;
    }

    startCompanyAutoPlay();
  }
);

reduceMotion.addEventListener(
  "change",
  () => {
    updateVideoState();
    startCompanyAutoPlay();
  }
);
// The Home page is shared; its service cards point to the signed-in role's pages.
(function connectHomeModules() {
  let role = null;
  try { role = JSON.parse(localStorage.getItem('loggedUser'))?.role; } catch { /* Public view. */ }
  const cards = [...document.querySelectorAll('.module-card')];
  if (cards.length !== 6) return;

  const hrModules = [
    ['Employee Directory', 'Find employee profiles, departments, and contact details.', '../../hr/employees/employees.html'],
    ['Team Tasks & Workflow', 'Manage assigned work, priorities, and deadlines.', '../../hr/tasks/tasks.html'],
    ['Employee Requests', 'Review requests and follow their status.', '../../hr/requests/requests.html'],
    ['Company Policies', 'Manage internal policies and useful resources.', '../../hr/policies/policies.html'],
    ['Employee Feedback', 'Review suggestions and workplace inquiries.', '../../hr/feedback/feedback.html'],
    ['Task Reviews', 'Review submitted work and track approvals.', '../../hr/task-review/task-review.html']
  ];
  const employeeModules = [
    ['My Workspace', 'See your priorities, schedule, and employee services.', '../../employee/MyWOrkSpace/MyWOrkSpace.html'],
    ['My Tasks', 'Organize your assigned work and deadlines.', '../../employee/my-tasks/my-tasks.html'],
    ['Leave & Time Off', 'Request time off and track approval status.', '../../employee/Leave&TimeOff/Leave&TimeOff.html'],
    ['Company Policies', 'Find policies and useful employee resources.', '../../employee/policies/EMPpolicies.html'],
    ['Feedback & Surveys', 'Share suggestions and workplace feedback.', '../contact/contact.html'],
    ['Helpdesk Support', 'Ask HR a question or schedule a 1:1 meeting.', '../../employee/helpDesk/helpDesk.html']
  ];
  const modules = role === 'HR' ? hrModules : employeeModules;
  cards.forEach((card, index) => {
    card.querySelector('h3').textContent = modules[index][0];
    card.querySelector('p').textContent = modules[index][1];
    card.querySelector('a').href = modules[index][2];
  });
  if (role === 'EMP') {
    document.querySelectorAll('[data-home-policy]').forEach(link => {
      link.href = '../../employee/policies/EMPpolicies.html';
    });
  }
})();
