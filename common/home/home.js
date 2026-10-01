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