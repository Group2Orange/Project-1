/* Visual layer imported from Project 2; stable login.js owns authentication. */
(() => {
const loginForm = document.querySelector("#login-form");



const emailInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");

const passwordToggle = document.querySelector(".password-toggle");

const loginButton = document.querySelector("#loginButton");
const buttonLabel = document.querySelector("#buttonLabel");

const shell = document.querySelector("#accessShell");
const mouseGlow = document.querySelector("#mouseGlow");

const fiberPath = document.querySelector("#fiberPath");
const returnPath = document.querySelector("#returnPath");

const packetLayer = document.querySelector("#packetLayer");
const binaryLayer = document.querySelector("#binaryLayer");

const emailGroup = document.querySelector("#emailGroup");
const passwordGroup = document.querySelector("#passwordGroup");

const emailState = document.querySelector("#emailState");
const passwordState = document.querySelector("#passwordState");

const emailResult = document.querySelector("#emailResult");

const emailMessage = document.querySelector("#emailMessage");
const passwordMessage = document.querySelector("#passwordMessage");

const securityMeter = document.querySelector("#securityMeter");

const loginError = document.querySelector("#login-error");
const errorTitle = document.querySelector("#errorTitle");
const loginErrorMessage = document.querySelector("#login-error-message");

const identityStep = document.querySelector("#identityStep");
const credentialStep = document.querySelector("#credentialStep");
const connectStep = document.querySelector("#connectStep");

const systemStatus = document.querySelector("#systemStatus");
const channelStatus = document.querySelector("#channelStatus");

const streamState = document.querySelector("#streamState");
const streamMessage = document.querySelector("#streamMessage");
const dataWave = document.querySelector("#dataWave");

const latencyValue = document.querySelector("#latencyValue");
const uplinkValue = document.querySelector("#uplinkValue");
const throughputValue = document.querySelector("#throughputValue");
const authValue = document.querySelector("#authValue");
const sessionValue = document.querySelector("#sessionValue");

const nodes = {
  client: document.querySelector("#clientNode"),
  edge: document.querySelector("#edgeNode"),
  identity: document.querySelector("#identityNode"),
  core: document.querySelector("#coreNode")
};

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);



let packetLock = false;
let typingTimer = null;

const EDGE = .333;
const IDENT = .667;

const cursorSpot = document.querySelector("#cursorSpot");
const fiberProgress = document.querySelector("#fiberProgress");

const routeLength = fiberProgress.getTotalLength();

fiberProgress.style.strokeDasharray = routeLength;
fiberProgress.style.strokeDashoffset = routeLength;

const sleeveLayer = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "g"
);

sleeveLayer.style.transition = "opacity 1.2s ease";
sleeveLayer.style.opacity = reduceMotion.matches ? 1 : 0;

[.17, .5, .83].forEach((t) => {
  const a = fiberPath.getPointAtLength(routeLength * t);
  const b = fiberPath.getPointAtLength(routeLength * (t + .004));
  const deg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${deg}) scale(2.2 3.4)`);
  g.innerHTML =
    '<rect x="-12" y="-5.5" width="24" height="11" rx="3" fill="#0b2a32" stroke="rgba(85,221,212,.38)" stroke-width=".8"/>' +
    '<rect x="-9" y="-3.6" width="18" height="2" rx="1" fill="rgba(255,255,255,.14)"/>' +
    '<rect x="-12" y="-5.5" width="3" height="11" rx="1.5" fill="rgba(0,0,0,.35)"/>' +
    '<rect x="9" y="-5.5" width="3" height="11" rx="1.5" fill="rgba(0,0,0,.35)"/>';
  sleeveLayer.appendChild(g);
});

packetLayer.parentNode.insertBefore(sleeveLayer, packetLayer);

function markTyping() {
  shell.classList.add("typing");
  clearTimeout(typingTimer);

  typingTimer = setTimeout(() => {
    if (!loginButton.disabled && !shell.classList.contains("success") && !shell.classList.contains("error")) {
      shell.classList.remove("typing");
    }
  }, 520);
}

function growRoute(fraction) {
  fiberProgress.style.strokeDashoffset =
    routeLength * (1 - fraction);
}

function sleep(ms) {
  return new Promise((r) =>
    setTimeout(r, reduceMotion.matches ? 0 : ms)
  );
}

function networkBusy() {
  return (
    document.hidden ||
    shell.classList.contains("booting") ||
    loginButton.disabled ||
    shell.classList.contains("typing") ||
    shell.classList.contains("error") ||
    shell.classList.contains("success")
  );
}

/* Calm idle Ethernet traffic along the cable path */
setInterval(() => {
  if (networkBusy()) return;
  animatePacket({
    start: 0,
    end: 1,
    duration: 3400 + Math.random() * 2600,
    color: Math.random() > .8 ? "#8298ff" : "#55ddd4",
    radius: 1.6 + Math.random() * 1.4
  });
}, 1900 + Math.random() * 1600);

function setNode(name, state, label) {
  const node = nodes[name];

  if (!node) return;

  node.classList.remove(
    "active",
    "success",
    "rejected"
  );

  if (state) {
    node.classList.add(state);
  }

  if (label) {
    node.querySelector(".node-status").textContent = label;
  }
}

function resetNodes() {
  setNode("client", "", "READY");
  setNode("edge", "", "STANDBY");
  setNode("identity", "", "WAITING");
  setNode("core", "", "LOCKED");
}

function setStep(step, state) {
  step.classList.remove(
    "active",
    "complete"
  );

  if (state) {
    step.classList.add(state);
  }
}

function setStream(state, message, active = false) {
  streamState.textContent = state;
  streamMessage.textContent = message;

  dataWave.classList.toggle(
    "active",
    active
  );
}

function animatePacket({
  path = fiberPath,
  start = 0,
  end = 1,
  duration = 850,
  color = "#55ddd4",
  radius = 4,
  length = null
} = {}) {
  radius = radius * 1.6;
  return new Promise((resolve) => {

    if (reduceMotion.matches) {
      resolve();
      return;
    }

    const NS = "http://www.w3.org/2000/svg";
    const total = path.getTotalLength();
    const from = total * start;
    const to = total * end;
    const d = path.getAttribute("d");
    const baseLength = length || Math.max(26, radius * 10);

    /* light pulse = three stacked streaks hugging the real curve:
       wide faint halo, body, hot white core */
    const streak = (width, opacity, stroke) => {
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", d);
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", stroke);
      el.setAttribute("stroke-width", width);
      el.setAttribute("stroke-linecap", "round");
      el.dataset.base = opacity;
      el.style.opacity = 0;
      packetLayer.appendChild(el);
      return el;
    };

    const halo = streak(radius * 3.4, .22, color);
    const body = streak(radius * 1.5, .6, color);
    const core = streak(radius * .65, .95, "#eafffd");

    const head = document.createElementNS(NS, "circle");
    head.setAttribute("r", radius * .8);
    head.setAttribute("fill", "#ffffff");
    head.setAttribute("filter", "url(#softGlow)");
    packetLayer.appendChild(head);

    const parts = [halo, body, core];
    const started = performance.now();

    function frame(now) {
      const progress = Math.min((now - started) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const headAt = from + (to - from) * ease;

      /* dispersion: the pulse stretches as it travels */
      const pulseLen = baseLength * (1 + progress * .6);
      const tailAt = Math.max(from, headAt - pulseLen);
      const seg = Math.max(.1, headAt - tailAt);

      /* attenuation + fade at both ends */
      const life =
        Math.min(1, progress * 8, (1 - progress) * 7) *
        (1 - .25 * ease);

      parts.forEach((el) => {
        el.setAttribute("stroke-dasharray", `${seg} ${total * 2}`);
        el.setAttribute("stroke-dashoffset", -tailAt);
        el.style.opacity = el.dataset.base * life;
      });

      const pt = path.getPointAtLength(headAt);
      head.setAttribute("cx", pt.x);
      head.setAttribute("cy", pt.y);
      head.style.opacity = life;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        parts.forEach((el) => el.remove());
        head.remove();
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}


function animateEthernetFrame({
  start = 0,
  end = 1,
  duration = 650,
  color = "#55ddd4",
  label = "DATA"
} = {}) {
  if (reduceMotion.matches) return Promise.resolve();

  return new Promise((resolve) => {
    const NS = "http://www.w3.org/2000/svg";
    const total = fiberPath.getTotalLength();
    const from = total * start;
    const to = total * end;

    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", "ethernet-frame");

    const shellRect = document.createElementNS(NS, "rect");
    shellRect.setAttribute("class", "frame-shell");
    shellRect.setAttribute("x", "-18");
    shellRect.setAttribute("y", "-7");
    shellRect.setAttribute("width", "36");
    shellRect.setAttribute("height", "14");
    shellRect.setAttribute("rx", "3.5");
    shellRect.setAttribute("stroke", color);

    const header = document.createElementNS(NS, "rect");
    header.setAttribute("class", "frame-cell");
    header.setAttribute("x", "-15");
    header.setAttribute("y", "-4");
    header.setAttribute("width", "5");
    header.setAttribute("height", "8");
    header.setAttribute("rx", "1");
    header.setAttribute("fill", color);

    const payload = document.createElementNS(NS, "rect");
    payload.setAttribute("class", "frame-cell");
    payload.setAttribute("x", "-7");
    payload.setAttribute("y", "-4");
    payload.setAttribute("width", "8");
    payload.setAttribute("height", "8");
    payload.setAttribute("rx", "1");
    payload.setAttribute("fill", color);
    payload.setAttribute("opacity", ".5");

    const crc = document.createElementNS(NS, "rect");
    crc.setAttribute("class", "frame-cell");
    crc.setAttribute("x", "11");
    crc.setAttribute("y", "-4");
    crc.setAttribute("width", "4");
    crc.setAttribute("height", "8");
    crc.setAttribute("rx", "1");
    crc.setAttribute("fill", color);
    crc.setAttribute("opacity", ".72");

    const textEl = document.createElementNS(NS, "text");
    textEl.setAttribute("class", "frame-label");
    textEl.setAttribute("x", "6");
    textEl.setAttribute("y", ".5");
    textEl.textContent = label;

    group.append(shellRect, header, payload, crc, textEl);
    packetLayer.appendChild(group);

    const started = performance.now();

    function frame(now) {
      const progress = Math.min((now - started) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const at = from + (to - from) * ease;
      const p = fiberPath.getPointAtLength(at);
      const q = fiberPath.getPointAtLength(Math.min(total, at + 2));
      const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      const life = Math.min(1, progress * 8, (1 - progress) * 8);

      group.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
      group.style.opacity = life;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        group.remove();
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

function spawnDataBurst(type = "email") {
  if (reduceMotion.matches) return;

  const NS = "http://www.w3.org/2000/svg";
  const total = fiberPath.getTotalLength();
  const isPassword = type === "password";
  const palette = isPassword
    ? ["#8498ff", "#55ddd4", "#42dc91"]
    : ["#55ddd4", "#42dc91", "#25e6df"];

  const start = .018;
  const end = isPassword ? .79 : .66;
  const count = isPassword ? 6 : 5;

  for (let i = 0; i < count; i += 1) {
    const bit = document.createElementNS(NS, "rect");
    const width = 8 + (i % 3) * 3;
    const height = 3.2;
    const color = palette[i % palette.length];

    bit.setAttribute("class", "data-bit");
    bit.setAttribute("width", width);
    bit.setAttribute("height", height);
    bit.setAttribute("rx", height / 2);
    bit.setAttribute("x", -width / 2);
    bit.setAttribute("y", -height / 2);
    bit.setAttribute("fill", color);
    bit.style.color = color;
    bit.style.opacity = "0";
    packetLayer.appendChild(bit);

    const started = performance.now() + i * 48;
    const duration = (isPassword ? 720 : 790) + i * 24;

    function frame(now) {
      if (now < started) {
        requestAnimationFrame(frame);
        return;
      }

      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2.6);
      const distance = total * (start + (end - start) * eased);
      const point = fiberPath.getPointAtLength(distance);
      const tangent = fiberPath.getPointAtLength(Math.min(total, distance + 2));
      const angle = Math.atan2(tangent.y - point.y, tangent.x - point.x) * 180 / Math.PI;
      const laneOffset = ((i % 4) - 1.5) * 3.0;
      const life = Math.min(1, progress * 9, (1 - progress) * 9);

      bit.setAttribute(
        "transform",
        `translate(${point.x} ${point.y + laneOffset}) rotate(${angle})`
      );
      bit.style.opacity = String(life * .92);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        bit.remove();
      }
    }

    requestAnimationFrame(frame);
  }
}

function createBinaryPacket() {
  if (reduceMotion.matches) return;

  const values = [
    "01",
    "10",
    "A7",
    "3F",
    "8C",
    "11",
    "D4",
    "6B"
  ];

  const token = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

  token.textContent =
    values[
      Math.floor(
        Math.random() *
        values.length
      )
    ];

  token.setAttribute(
    "class",
    "binary-token"
  );

  token.setAttribute(
    "fill",
    "#8298ff"
  );

  binaryLayer.appendChild(token);

  const total = fiberPath.getTotalLength();

  const started = performance.now();

  const duration =
    1000 +
    Math.random() * 350;

  function frame(now) {
    const progress = Math.min(
      (now - started) /
      duration,
      1
    );

    const point =
      fiberPath.getPointAtLength(
        total *
        (
          .1 +
          progress * .75
        )
      );

    token.setAttribute(
      "x",
      point.x + 5
    );

    token.setAttribute(
      "y",
      point.y - 9
    );

    token.style.opacity =
      progress > .82
        ? (1 - progress) * 5
        : .75;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      token.remove();
    }
  }

  requestAnimationFrame(frame);
}

function fireTypingPacket(type) {
  if (packetLock) return;

  packetLock = true;

  setTimeout(() => {
    packetLock = false;
  }, 85);

  spawnDataBurst(type);

  if (type === "email") {
    animatePacket({
      start: .02,
      end: .66,
      duration: 620,
      color: "#55ddd4",
      radius: 2.8,
      length: 72
    });

    animateEthernetFrame({
      start: .015,
      end: .66,
      duration: 560,
      color: "#55ddd4",
      label: "ID"
    });
  } else {
    animatePacket({
      start: .02,
      end: .79,
      duration: 610,
      color: "#8298ff",
      radius: 2.8,
      length: 82
    });

    animateEthernetFrame({
      start: .02,
      end: .79,
      duration: 560,
      color: "#8298ff",
      label: "ENC"
    });

    createBinaryPacket();
  }
}

function rejectPacket(position = .7) {
  animatePacket({
    path: returnPath,
    start: 1 - position,
    end: 1,
    duration: 620,
    color: "#ec5364",
    radius: 5
  });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function settleAfterError() {
  if (!shell.dataset.rejected) return;

  delete shell.dataset.rejected;

  systemStatus.textContent = "SYSTEM ONLINE";
  channelStatus.textContent = "Standby";
  authValue.textContent = "STANDBY";
  sessionValue.textContent = "IDLE";

  resetNodes();
  setStream("IDLE", "Awaiting identity packet...", false);
}

function clearError() {
  settleAfterError();

  loginError.hidden = true;

  shell.classList.remove("error");

  emailGroup.classList.remove("invalid");
  passwordGroup.classList.remove("invalid");
}

function updateEmail() {
  const email = emailInput.value.trim();

  clearError();

  emailGroup.classList.remove("valid");

  emailResult.textContent = "";

  growRoute(0);

  if (!email) {
    shell.classList.remove("typing");

    emailState.textContent = "Waiting";
    emailMessage.textContent = "";

    channelStatus.textContent = "Standby";
    authValue.textContent = "STANDBY";

    resetNodes();

    setStream(
      "IDLE",
      "Awaiting identity packet...",
      false
    );

    setStep(identityStep, "active");
    setStep(credentialStep, "");
    setStep(connectStep, "");

    return;
  }

  markTyping();

  fireTypingPacket("email");

  setNode(
    "client",
    "active",
    "TX"
  );

  setNode(
    "edge",
    "active",
    "ROUTING"
  );

  emailState.textContent = "Resolving";
  channelStatus.textContent = "Identity";
  authValue.textContent = "IDENTITY";

  setStream(
    "TX",
    "Transmitting identity packet...",
    true
  );

  if (!isValidEmail(email)) {
    emailState.textContent = "Incomplete";

    emailMessage.textContent =
      "Complete your corporate email address.";

    return;
  }

  emailGroup.classList.add("valid");

  growRoute(EDGE);

  emailResult.textContent = "check_circle";

  emailState.textContent = "Ready";

  emailMessage.textContent =
    "";

  setNode(
    "client",
    "success",
    "SENT"
  );

  setNode(
    "edge",
    "success",
    "ROUTED"
  );

  setNode(
    "identity",
    "active",
    "LISTEN"
  );

  setStream(
    "READY",
    "Identity packet ready for verification.",
    true
  );

  setStep(identityStep, "complete");
  setStep(credentialStep, "active");
}

function updatePassword() {
  const length = passwordInput.value.length;

  clearError();

  const bars = [
    ...securityMeter.querySelectorAll("span")
  ];

  bars.forEach((bar) => {
    bar.classList.remove("on");
  });

  securityMeter.classList.remove("complete");

  if (!length) {
    passwordState.textContent = "Required";
    passwordMessage.textContent = "";

    setStep(credentialStep, "active");
    setStep(connectStep, "");

    return;
  }

  markTyping();

  fireTypingPacket("password");

  passwordState.textContent = "Encrypting";

  passwordMessage.textContent =
    "";

  channelStatus.textContent = "Encrypted";
  authValue.textContent = "ENCRYPTING";

  setNode(
    "identity",
    "active",
    "AUTH"
  );

  setStream(
    "ENC",
    "Encrypting credential stream...",
    true
  );

  const activeBars = Math.min(
    bars.length,
    Math.max(
      1,
      Math.ceil(length / 2)
    )
  );

  bars.forEach((bar, index) => {
    if (index < activeBars) {
      bar.classList.add("on");
    }
  });

  setStep(credentialStep, "complete");
  setStep(connectStep, "active");
}

function showError(
  title,
  message,
  field,
  position
) {
  const gateway = position >= IDENT;

  errorTitle.textContent = title;

  shell.dataset.rejected = "1";

  if (field === "email" || field === "both") {
    setStep(identityStep, "active");
    setStep(credentialStep, "");
    setStep(connectStep, "");
  } else {
    setStep(identityStep, "complete");
    setStep(credentialStep, "active");
    setStep(connectStep, "");
  }
  loginErrorMessage.textContent = message;

  loginError.hidden = false;

  shell.classList.remove("success");
  shell.classList.add("error");

  systemStatus.textContent =
    gateway ? "AUTHENTICATION REJECTED" : "INPUT REQUIRED";

  channelStatus.textContent =
    gateway ? "Rejected" : "Standby";

  authValue.textContent =
    gateway ? "REJECTED" : "STANDBY";

  sessionValue.textContent =
    gateway ? "DENIED" : "IDLE";

  setStream(
    gateway ? "REJECT" : "INVALID",
    gateway
      ? "Authentication packet rejected."
      : "Packet held at the client until the input is fixed.",
    true
  );

  if (
    field === "email" ||
    field === "both"
  ) {
    emailGroup.classList.add("invalid");

    emailState.textContent =
      "Rejected";

    emailResult.textContent =
      "error";
  }

  if (
    field === "password" ||
    field === "both"
  ) {
    passwordGroup.classList.add("invalid");

    passwordState.textContent =
      "Rejected";
  }

  if (gateway) {
    setNode("identity", "rejected", "REJECT");
  } else {
    setNode("client", "rejected", "INVALID");
  }

  rejectPacket(position);


}

function setLoading(state) {
  loginButton.disabled = state;

  loginButton.classList.toggle(
    "loading",
    state
  );
}

function bindFocus(input, group) {
  input.addEventListener("focus", () => {
    group.classList.add("focused");
  });

  input.addEventListener("blur", () => {
    group.classList.remove("focused");
  });
}

emailInput.addEventListener("focus", () => {
  if (!emailInput.value.trim()) {
    setNode("client", "active", "READY");
    setNode("edge", "active", "ROUTING");
    setStream("LINK", "Client linked to access node.", true);
  }
});

emailInput.addEventListener("blur", () => {
  if (!emailInput.value.trim()) updateEmail();
});

bindFocus(emailInput, emailGroup);
bindFocus(passwordInput, passwordGroup);

function handlePointerMove(event) {
  if (reduceMotion.matches) return;

  const rect =
    shell.getBoundingClientRect();

  const x =
    (
      event.clientX -
      rect.left
    ) /
    rect.width;

  const y =
    (
      event.clientY -
      rect.top
    ) /
    rect.height;

  shell.style.setProperty(
    "--mouse-x",
    ((x - .5) * 2).toFixed(3)
  );

  shell.style.setProperty(
    "--mouse-y",
    ((y - .5) * 2).toFixed(3)
  );

  const svg = document.querySelector(".network-svg");
  const sr = svg.getBoundingClientRect();
  const inside =
    event.clientX >= sr.left && event.clientX <= sr.right &&
    event.clientY >= sr.top && event.clientY <= sr.bottom;

  cursorSpot.setAttribute("r", inside ? 95 : 0);

  if (inside) {
    cursorSpot.setAttribute("cx", ((event.clientX - sr.left) / sr.width) * 1000);
    cursorSpot.setAttribute("cy", ((event.clientY - sr.top) / sr.height) * 370);
  }

  mouseGlow.style.left =
    `${event.clientX}px`;

  mouseGlow.style.top =
    `${event.clientY}px`;
}

function resetPointer() {
  cursorSpot.setAttribute("r", 0);

  shell.style.setProperty(
    "--mouse-x",
    "0"
  );

  shell.style.setProperty(
    "--mouse-y",
    "0"
  );
}

shell.addEventListener(
  "pointermove",
  handlePointerMove
);

shell.addEventListener(
  "pointerleave",
  resetPointer
);

function simulateTelemetry() {
  if (document.hidden) return;

  const latency =
    18 +
    Math.floor(
      Math.random() * 9
    );

  const uplink =
    (
      1.12 +
      Math.random() * .15
    ).toFixed(2);

  latencyValue.textContent =
    `${latency} ms`;

  uplinkValue.textContent =
    `${uplink} Gbps`;

  if (throughputValue) {
    throughputValue.textContent = `${uplink} Gbps`;
  }
}

setInterval(
  simulateTelemetry,
  3000
);

emailInput.addEventListener(
  "input",
  updateEmail
);

passwordInput.addEventListener(
  "input",
  updatePassword
);

/* Presentation hooks only: no API calls, storage, or redirects in this file. */
window.LoginMotion = {
  start() {
    clearError();
    setLoading(true);
    shell.classList.remove('booting');
    systemStatus.textContent = 'AUTHENTICATING';
    channelStatus.textContent = 'Verifying';
    authValue.textContent = 'HANDSHAKE';
    sessionValue.textContent = 'VERIFYING';
    setStream('VERIFY', 'Checking your account...', true);
    setNode('identity', 'active', 'VERIFY');
    animatePacket({ start:0, end:IDENT, duration:800, color:'#55ddd4', radius:5 });
    animateEthernetFrame({ start:.02, end:IDENT, duration:760, color:'#55ddd4', label:'AUTH' });
  },
  error(message) {
    if (!message) { clearError(); return; }
    setLoading(false);
    showError('Connection rejected', message, 'password', IDENT);
  },
  async success() {
    // A bounded presentation delay before the stable login script redirects.
    try {
      await Promise.race([
        (async () => {
      shell.classList.remove("error");
      shell.classList.add("success");

      systemStatus.textContent =
        "SECURE CONNECTION";

      channelStatus.textContent =
        "Secure";

      authValue.textContent =
        "VERIFIED";

      sessionValue.textContent =
        "CONNECTED";

      setNode(
        "identity",
        "success",
        "VERIFIED"
      );

      growRoute(IDENT);

      setStream(
        "ACCEPT",
        "Identity Verified",
        true
      );

      await animatePacket({
        start: IDENT,
        end: .85,
        duration: 500,
        color: "#42dc91",
        radius: 5
      });

      setNode(
        "core",
        "active",
        "OPENING"
      );

      setStream(
        "TUNNEL",
        "Secure Tunnel Established",
        true
      );

      growRoute(1);

      await animatePacket({
        start: .85,
        end: 1,
        duration: 650,
        color: "#42dc91",
        radius: 6
      });

      setNode(
        "core",
        "success",
        "CONNECTED"
      );

      securityMeter.classList.add(
        "complete"
      );

      setStep(
        connectStep,
        "complete"
      );

      setStream(
        "ONLINE",
        "Connected to Connectra",
        true
      );

      buttonLabel.textContent =
        "Connected to Connectra";

      loginButton
        .querySelector(
          ".button-content .material-symbols-outlined"
        )
        .textContent =
          "verified";

      loginButton.classList.remove(
        "loading"
      );

      await sleep(250);

      /* light surge along the whole green route */
      await animatePacket({
        start: 0,
        end: 1,
        duration: 750,
        color: "#d8fff0",
        radius: 8,
        length: 170
      });

      await sleep(450);


        })(),
        new Promise(resolve => setTimeout(resolve, 4500))
      ]);
    } catch (error) {
      console.warn('Login animation unavailable:', error);
    }
  }
};

/* Power-up: the Ethernet route draws itself, nodes come online in route order */
async function boot() {
  if (reduceMotion.matches) {
    shell.classList.remove("booting");
    return;
  }

  const reveal = document.querySelector("#revealPath");
  const len = reveal.getTotalLength();
  const masked = document.querySelectorAll(
    ".fiber-depth, .fiber-halo, .fiber-main, .fiber-rim, .fiber-jacket-outer, .fiber-ticks, .fiber-yarn, .fiber-jacket, .fiber-clad, .fiber-print, .fiber-sheen, .fiber-strand, .lan-lane, .lan-pulse-track"
  );

  masked.forEach((p) => p.setAttribute("mask", "url(#revealMask)"));

  reveal.style.strokeDasharray = len;
  reveal.style.strokeDashoffset = len;
  reveal.getBoundingClientRect();
  reveal.style.transition = "stroke-dashoffset 2s cubic-bezier(.65,0,.35,1)";
  reveal.style.strokeDashoffset = 0;

  systemStatus.textContent = "INITIALIZING";
  setStream("BOOT", "Bringing network path online...", true);

  const order = ["client", "edge", "identity", "core"];
  const times = [150, 650, 1250, 1850];

  order.forEach((name, i) => {
    setTimeout(() => nodes[name].classList.add("node-on"), times[i]);
  });

  setTimeout(() => (sleeveLayer.style.opacity = 1), 1100);

  await sleep(2300);

  masked.forEach((p) => p.removeAttribute("mask"));
  shell.classList.remove("booting");
  if (!loginButton.disabled && !shell.classList.contains("success")) {
    systemStatus.textContent = "SYSTEM ONLINE";
    setStream("IDLE", "Awaiting identity packet...", false);
  }
}

updateEmail();
updatePassword();
simulateTelemetry();
boot();

/* Telemetry values carry a state tone so the bar reads at a glance */
function toneOf(text) {
  const t = text.trim().toUpperCase();
  if (["REJECTED", "DENIED"].includes(t)) return "bad";
  if (["VERIFIED", "CONNECTED"].includes(t)) return "good";
  if (["IDENTITY", "ENCRYPTING", "HANDSHAKE", "VERIFYING"].includes(t)) return "busy";
  return "idle";
}

[authValue, sessionValue].forEach((el) => {
  const sync = () => (el.dataset.tone = toneOf(el.textContent));
  new MutationObserver(sync).observe(el, {
    childList: true,
    characterData: true,
    subtree: true
  });
  sync();
});
})();
