/* cable3d.js — load AFTER login.js.
   Draws a shaded, tube-like CAT6 cable with twisted pairs, glowing packets, sleeves and RJ45 plugs
   in an undistorted pixel-space SVG placed UNDER the original network SVG, so login.js packets,
   success route and cursor light still render on top. Same path geometry => nodes stay aligned. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.querySelector(".network-stage");
  const base = document.querySelector(".network-svg");
  if (!stage || !base) return;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "network-svg cable3d");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("preserveAspectRatio", "none");
  stage.insertBefore(svg, base);

  const SEGS = [
    [[130, 265], [215, 265], [222, 95], [345, 95]],
    [[345, 95], [485, 95], [495, 265], [650, 265]],
    [[650, 265], [780, 265], [775, 95], [870, 95]]
  ];

  const bez = (p, t) => {
    const u = 1 - t;
    return [
      u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]
    ];
  };

  const toPath = (pts) =>
    pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");

  function build() {
    const r = base.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (!w || !h) return;

    const sx = w / 1000, sy = h / 370;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    /* sample the centre line in pixel space */
    const pts = [];
    SEGS.forEach((s, i) => {
      for (let k = i ? 1 : 0; k <= 60; k++) {
        const b = bez(s, k / 60);
        pts.push([b[0] * sx, b[1] * sy]);
      }
    });
    const n = pts.length;

    const tans = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      return [dx / m, dy / m];
    });

    const L = [0];
    for (let i = 1; i < n; i++) {
      L[i] = L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }

    /* offset line; positive d = towards the top of the screen */
    const off = (fn) =>
      toPath(pts.map((p, i) => {
        const d = fn(i);
        return [p[0] + tans[i][1] * d, p[1] - tans[i][0] * d];
      }));

    const W = Math.max(26, Math.min(38, w * 0.038));
    const k = W / 38;
    const C = toPath(pts);

    /* twisted pairs */
    const strandColors = ["#25e6df", "#42dc91", "#5ac8fa", "#8498ff"];
    const strands = strandColors.map((c, j) =>
      `<path d="${off((i) => W * 0.16 * Math.sin((2 * Math.PI * L[i]) / 78 + (j * Math.PI) / 2))}"
        stroke="${c}" stroke-width="2.4" opacity=".6" filter="url(#c3Glow)"/>`
    ).join("");

    /* sleeves */
    const sleeves = [0.17, 0.5, 0.83].map((f) => {
      let i = L.findIndex((v) => v >= f * L[n - 1]);
      if (i < 0) i = n - 1;
      const a = (Math.atan2(tans[i][1], tans[i][0]) * 180) / Math.PI;
      return `<g class="c3-sleeve" transform="translate(${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}) rotate(${a.toFixed(1)})">
        <rect x="-13" y="${-(W / 2 + 4)}" width="26" height="${W + 8}" rx="6" fill="url(#c3Boot)"
          stroke="rgba(120,225,230,.4)" stroke-width="1"/>
        <rect x="-9" y="${-(W / 2)}" width="4" height="${W}" rx="2" fill="rgba(255,255,255,.1)" stroke="none"/>
      </g>`;
    }).join("");

    /* RJ45 plug, drawn extending along +x from the cable end:
       strain-relief boot -> crimp collar -> clear body with the 8 colour-coded wires -> 8 gold contacts -> latch */
    const wireColors = ["#f6c27a", "#f08a24", "#bfe7c0", "#3a7bd5", "#a8c8f0", "#2fae5a", "#d9c0a0", "#8a5a2b"];
    const wires = wireColors.map((c, i) =>
      `<rect x="40" y="${(-13.5 + i * 3.7).toFixed(1)}" width="24" height="2.3" rx="1" fill="${c}" opacity=".9" stroke="none"/>`
    ).join("");
    const pins = Array.from({ length: 8 }, (_, i) =>
      `<rect x="${(67 + i * 4.1).toFixed(1)}" y="-13" width="2.7" height="17" rx="1" fill="url(#c3Gold)" stroke="none"/>`
    ).join("");
    const ribs = [5, 12, 19].map((x) =>
      `<path d="M${x} -15 V15" stroke="rgba(150,225,230,.22)" stroke-width="1.2"/>`
    ).join("");

    const plug = (x, y, flip) => {
      const s = k;
      const cx = x + (flip ? -1 : 1) * 52 * s;
      return `
      <g class="c3-plug" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${flip ? -s : s} ${s})">
        <path d="M-8 -15 L26 -19 Q31 -19 31 -14 V14 Q31 19 26 19 L-8 15 Z" fill="url(#c3Boot)" stroke="rgba(110,230,226,.4)" stroke-width="1.2"/>
        ${ribs}
        <rect x="31" y="-21" width="8" height="42" rx="2" fill="#0b2a31" stroke="rgba(150,235,235,.5)" stroke-width="1"/>
        <path d="M39 -23 H92 L104 -14 V14 L92 23 H39 Z" fill="url(#c3Glass)" stroke="rgba(205,252,248,.75)" stroke-width="1.3"/>
        <rect x="40" y="-15" width="58" height="30" rx="3" fill="rgba(4,32,40,.6)" stroke="rgba(211,255,251,.3)" stroke-width=".8"/>
        ${wires}${pins}
        <path d="M46 -23 L54 -33 H84 L90 -23" fill="none" stroke="rgba(224,255,252,.85)" stroke-width="2"/>
        <path d="M104 -14 V14" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/>
        <circle class="c3-led c3-led-a" cx="97" cy="9" r="2"/>
        <circle class="c3-led c3-led-b" cx="97" cy="-9" r="2"/>
      </g>
      <g class="c3-tag" transform="translate(${cx.toFixed(1)} ${(y - 44 * s).toFixed(1)})">
        <path d="M0 9 V16" stroke="rgba(37,230,223,.5)" stroke-width="1"/>
        <rect x="-32" y="-9" width="64" height="18" rx="9" fill="rgba(2,19,25,.88)" stroke="rgba(37,230,223,.5)"/>
        <text y="3.5" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="8.5" font-weight="700" letter-spacing="1" fill="#7bf2e9" stroke="none">LAN · RJ45</text>
      </g>`;
    };

    svg.innerHTML = `
      <defs>
        <filter id="c3Blur8" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="c3Blur3" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="c3Blur1" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation=".8"/></filter>
        <filter id="c3Glow" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="2.6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="c3Glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(190,250,248,.42)"/>
          <stop offset=".5" stop-color="rgba(120,215,218,.16)"/>
          <stop offset="1" stop-color="rgba(60,150,160,.28)"/>
        </linearGradient>
        <linearGradient id="c3Gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e7bf55"/><stop offset="1" stop-color="#a9812a"/>
        </linearGradient>
        <linearGradient id="c3Boot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0e2f37"/><stop offset="1" stop-color="#020b0e"/>
        </linearGradient>
      </defs>
      <g class="c3-cable" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="c3-shadow" d="${C}" stroke="rgba(0,0,0,.6)" stroke-width="${W + 14}" filter="url(#c3Blur8)" transform="translate(0 12)"/>
        <path class="c3-glow" d="${C}" stroke="rgba(37,230,223,.1)" stroke-width="${W + 20}" filter="url(#c3Blur8)"/>
        <path d="${C}" stroke="#03141a" stroke-width="${W}"/>
        <path d="${off(() => W / 2 - 1)}" stroke="rgba(150,240,240,.55)" stroke-width="1.6"/>
        <path d="${off(() => -(W / 2 - 1))}" stroke="rgba(80,190,200,.25)" stroke-width="1.4"/>
        <path d="${off(() => W * 0.26)}" stroke="rgba(140,225,230,.16)" stroke-width="${W * 0.3}" filter="url(#c3Blur3)"/>
        <path d="${off(() => -W * 0.3)}" stroke="rgba(0,0,0,.4)" stroke-width="${W * 0.3}" filter="url(#c3Blur3)"/>
        <path d="${C}" stroke="rgba(150,220,228,.07)" stroke-width="${W - 9}" stroke-dasharray="1.5 6.5" stroke-linecap="butt"/>
        <path d="${C}" stroke="#062a32" stroke-width="${W * 0.64}"/>
        <path d="${C}" stroke="rgba(37,230,223,.3)" stroke-width="${W * 0.5}" filter="url(#c3Blur3)"/>
        ${strands}
        <path class="c3-flow-a" d="${C}" stroke="#42dc91" stroke-width="${W * 0.2}" stroke-dasharray="16 52" stroke-linecap="butt" filter="url(#c3Glow)"/>
        <path class="c3-flow-b" d="${C}" stroke="#7bf2e9" stroke-width="${W * 0.15}" stroke-dasharray="11 57" stroke-dashoffset="30" stroke-linecap="butt" filter="url(#c3Glow)"/>
        <path d="${off(() => W * 0.3)}" stroke="rgba(255,255,255,.28)" stroke-width="2" filter="url(#c3Blur1)"/>
        ${sleeves}
        ${plug(pts[0][0], pts[0][1], true)}
        ${plug(pts[n - 1][0], pts[n - 1][1], false)}
      </g>`;
  }

  build();
  window.addEventListener("load", build);
  if ("ResizeObserver" in window) new ResizeObserver(build).observe(base);
})();