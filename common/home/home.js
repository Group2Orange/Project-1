(() => {
  'use strict';
  const SCRIPT_SRC = document.currentScript && document.currentScript.src;
  // $ finds one element, $$ finds all matches as a real array (optionally inside "r").
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const isSmall = () => innerWidth <= 640;
  const isMid = () => innerWidth <= 950;
  const root = document.documentElement;

  /* Splash is decorative, skippable, bounded, and independent of video loading. */
  function splash() {
    return new Promise(resolve => {
      const el = $('#siteSplash');
      if (!el || reduce.matches || !root.classList.contains('intro-pending')) {
        clearTimeout(window.teamspaceIntroFallback);
        root.classList.remove('intro-pending', 'intro-leaving');
        if (el) el.remove();
        resolve(); return;
      }
      const skip = $('#skipIntro');
      const background = $$('main, nav.navbar, [data-footer], #backgroundMotion');
      const originalInert = background.map(node => node.inert);
      background.forEach(node => { node.inert = true; });
      let finished = false, closing = false, closeTimer, finishTimer;
      const restore = () => background.forEach((node, i) => { node.inert = originalInert[i]; });
      const focusMain = () => {
        const main = $('#mainContent');
        if (main) main.focus({ preventScroll: true });
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(closeTimer); clearTimeout(finishTimer);
        clearTimeout(window.teamspaceIntroFallback);
        const hadFocus = el.contains(document.activeElement);
        restore();
        root.classList.remove('intro-pending', 'intro-leaving');
        el.remove();
        document.removeEventListener('keydown', key);
        document.removeEventListener('teamspace:intro-ready', finish);
        reduce.removeEventListener('change', preference);
        if (hadFocus) focusMain();
        resolve();
      };
      const leave = () => {
        if (closing || finished) return;
        closing = true;
        clearTimeout(closeTimer);
        root.classList.remove('intro-pending');
        root.classList.add('intro-leaving');
        restore();
        if (el.contains(document.activeElement)) focusMain();
        resolve();
        finishTimer = setTimeout(finish, reduce.matches ? 0 : 850);
      };
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); leave(); }
        if (e.key === 'Tab' && !closing) { e.preventDefault(); skip.focus({ preventScroll: true }); }
      };
      const preference = () => { if (reduce.matches) finish(); };
      skip.addEventListener('click', leave);
      document.addEventListener('keydown', key);
      document.addEventListener('teamspace:intro-ready', finish, { once: true });
      reduce.addEventListener('change', preference);
      closeTimer = setTimeout(leave, Math.max(0, 1700 - (performance.now() - (window.teamspaceIntroStarted || 0))));
      addEventListener('pageshow', e => { if (e.persisted) finish(); }, { once: true });
    });
  }

  function scrollProgress() {
    const bar = $('#scrollProgress'), section = $('#company-purpose');
    let queued = false;
    const update = () => {
      queued = false;
      const max = root.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.max(0, Math.min(scrollY / max, 1)) : 0})`;
      if (section && !reduce.matches) {
        const r = section.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          const p = (innerHeight - r.top) / (innerHeight + r.height);
          section.style.setProperty('--section-shift', `${(p - .5) * 70}px`);
        }
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(document.body);
    update();
  }

  function reveals() {
    $$('.home-section-heading, .purpose-heading, .company-carousel, #introStats, #purposeFooter').forEach(el => el.classList.add('reveal'));
    $$('.reveal').forEach(el => {
      const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
      el.style.setProperty('--delay', `${Math.min(delay, .28)}s`);
    });
    $$('.modules, .company-capabilities, .purpose-features').forEach(group => {
      const columns = getComputedStyle(group).gridTemplateColumns.split(' ').length;
      $$('.reveal', group).forEach((el, i) => el.style.setProperty('--delay', `${(i % Math.max(1, columns)) * .1}s`));
    });
    const targets = $$('.reveal');
    // timers[i] holds the pending "settled" timer for targets[i].
    const timers = [];
    const show = el => {
      const i = targets.indexOf(el);
      clearTimeout(timers[i]);
      el.classList.add('is-in');
      timers[i] = setTimeout(() => el.classList.add('settled'), 1200);
    };
    let observer;
    const configure = () => {
      if (observer) observer.disconnect();
      if (reduce.matches || !('IntersectionObserver' in window)) {
        root.classList.remove('motion-ready');
        targets.forEach(show); return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.intersectionRatio >= .06) show(e.target);
          // Reset only once completely outside; small scroll reversals never flicker.
          else if (!e.isIntersecting && !e.target.contains(document.activeElement)) {
            clearTimeout(timers[targets.indexOf(e.target)]);
            e.target.classList.remove('is-in', 'settled');
          }
        });
      }, { threshold: [0, .06], rootMargin: '0px' });
      root.classList.add('motion-ready');
      targets.forEach(el => observer.observe(el));
    };
    configure(); reduce.addEventListener('change', configure);
    if ('IntersectionObserver' in window) {
      const sections = new IntersectionObserver(entries => entries.forEach(e => {
        e.target.classList.toggle('section-visible', e.isIntersecting);
      }));
      $$('main > section').forEach(section => sections.observe(section));
    } else $$('main > section').forEach(el => el.classList.add('section-visible'));
    const visibility = () => root.classList.toggle('document-hidden', document.hidden);
    document.addEventListener('visibilitychange', visibility); visibility();
  }

  function counters() {
    const elements = $$('[data-count]');
    elements.forEach((el, i) => {
      const end = Number(el.dataset.count), suffix = el.dataset.suffix || '';
      if (reduce.matches) return;
      el.textContent = '0' + suffix;
      setTimeout(() => {
        const start = performance.now();
        const frame = now => {
          const p = reduce.matches ? 1 : Math.min((now - start) / 1200, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }, 850 + i * 130);
    });
  }

  function pointerEffects() {
    $$('.capability-card, .home-btn').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (reduce.matches || !finePointer.matches || e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--pointer-x', `${(x + .5) * 100}%`);
        el.style.setProperty('--pointer-y', `${(y + .5) * 100}%`);
        if (el.classList.contains('home-btn')) {
          el.style.setProperty('--mag-x', `${x * 7}px`); el.style.setProperty('--mag-y', `${y * 5}px`);
        }
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mag-x', '0px'); el.style.setProperty('--mag-y', '0px'); });
    });
  }

  /* ===== Feedback marquee loop + click focus ===== */
  function feedback() {
    const slider = $("#feedbackSlider"), track = $("#feedbackTrack"), group = $("#feedbackGroup");
    if (!slider || !track || !group) return;

    if (track.children.length === 1) {
      const clone = group.cloneNode(true);
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      $$("[tabindex]", clone).forEach((item) => item.setAttribute("tabindex", "-1"));
      track.appendChild(clone);
    }

    const clearSelection = () => {
      slider.classList.remove("has-selected");
      $$(".testimonial", slider).forEach((card) => {
        card.classList.remove("is-selected");
        if (!card.closest('[aria-hidden="true"]')) card.setAttribute("aria-pressed", "false");
      });
    };

    const selectCard = (card) => {
      const alreadySelected = card.classList.contains("is-selected");
      clearSelection();
      if (alreadySelected) return;
      slider.classList.add("has-selected");
      card.classList.add("is-selected");
      if (!card.closest('[aria-hidden="true"]')) card.setAttribute("aria-pressed", "true");
    };

    slider.addEventListener("click", (event) => {
      const card = event.target.closest(".testimonial");
      if (card) selectCard(card);
    });

    slider.addEventListener("keydown", (event) => {
      const card = event.target.closest(".testimonial");
      if (!card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      selectCard(card);
    });

    document.addEventListener("click", (event) => {
      if (slider.classList.contains("has-selected") && !slider.contains(event.target)) clearSelection();
    });
  }

  /* ===== Carousel ===== */
  function carousel() {
    const car = $("#companyCarousel"), tr = $("#companyTrack");
    if (!car || !tr) return;
    const slides = $$(".company-slide", tr), dots = $("#companyDots"), bar = $("#companyProgress");
    let timer = null;
    const step = () => {
      const s = slides[0];
      return s ? s.getBoundingClientRect().width + (parseFloat(getComputedStyle(tr).columnGap) || 18) : 0;
    };
    const restartBar = () => { bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run"); };
    const mark = () => {
      const s = step(), max = tr.scrollWidth - tr.clientWidth;
      let i = s ? Math.round(tr.scrollLeft / s) : 0;
      if (tr.scrollLeft >= max - 4) i = slides.length - 1;
      slides.forEach((el, k) => el.classList.toggle("is-active", k === i));
      $$("button", dots).forEach((b, k) => b.classList.toggle("on", k === i));
    };
    const move = (dir) => {
      const s = step(); if (!s) return;
      const max = tr.scrollWidth - tr.clientWidth;
      if (dir > 0 && tr.scrollLeft >= max - s * 0.5) tr.scrollTo({ left: 0, behavior: reduce.matches ? "auto" : "smooth" });
      else if (dir < 0 && tr.scrollLeft <= s * 0.5) tr.scrollTo({ left: max, behavior: reduce.matches ? "auto" : "smooth" });
      else tr.scrollBy({ left: s * dir, behavior: reduce.matches ? "auto" : "smooth" });
    };
    const stop = () => { clearInterval(timer); timer = null; bar.classList.remove("run"); };
    const play = () => {
      stop();
      if (reduce.matches || document.hidden) return;
      restartBar();
      timer = setInterval(() => { move(1); restartBar(); }, 4500);
    };
    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", `Show slide ${i + 1}`);
      b.addEventListener("click", () => { tr.scrollTo({ left: i * step(), behavior: reduce.matches ? "auto" : "smooth" }); play(); });
      dots.appendChild(b);
    });
    const prevButton = $("#companyPrev"), nextButton = $("#companyNext");
    if (prevButton) prevButton.addEventListener("click", () => { move(-1); play(); });
    if (nextButton) nextButton.addEventListener("click", () => { move(1); play(); });
    tr.addEventListener("scroll", () => requestAnimationFrame(mark), { passive: true });
    car.addEventListener("mouseenter", stop);
    car.addEventListener("mouseleave", play);
    car.addEventListener("focusin", stop);
    car.addEventListener("focusout", play);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    reduce.addEventListener("change", play);
    mark(); play();
  }
  /* ===== Company video loading + visibility ===== */
  function videos() {
    const vids = $$('[data-company-video]');
    if (!vids.length) return;

    // visible[i] is true while vids[i] is on screen enough to play.
    const visible = [];
    const canPlay = (video) => !reduce.matches && !document.hidden && visible[vids.indexOf(video)];

    const sync = (video) => {
      const media = video.closest('.company-media');
      if (video.readyState >= 2 && media) media.classList.add('is-ready');
      if (canPlay(video)) video.play().catch(() => {});
      else video.pause();
    };

    vids.forEach((video) => {
      const media = video.closest('.company-media');
      video.muted = true;
      video.playsInline = true;
      video.addEventListener('loadeddata', () => {
        if (media) { media.classList.add('is-ready'); media.classList.remove('has-error'); }
        sync(video);
      });
      video.addEventListener('canplay', () => {
        if (media) { media.classList.add('is-ready'); media.classList.remove('has-error'); }
      });
      video.addEventListener('error', () => {
        if (media) { media.classList.add('has-error'); media.classList.remove('is-ready'); }
      });
      if (video.readyState >= 2 && media) media.classList.add('is-ready');
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          visible[vids.indexOf(entry.target)] = entry.isIntersecting && entry.intersectionRatio >= .35;
          sync(entry.target);
        });
      }, { threshold: [0, .35, .65] });
      vids.forEach((video) => io.observe(video));
    } else {
      vids.forEach((video, i) => { visible[i] = true; sync(video); });
    }

    const syncAll = () => vids.forEach(sync);
    document.addEventListener('visibilitychange', syncAll);
    reduce.addEventListener('change', syncAll);
    const companyCarousel = $('#companyCarousel');
    if (companyCarousel) companyCarousel.addEventListener('company:active-change', syncAll);
  }

  /* A lightweight 2D-canvas renderer of a rotating 3D globe. All artwork is local. */
  function orbitalNetwork() {
    const scene = $('#orbitalScene'), canvas = $('#orbitalCanvas'), viewport = $('#orbitalViewport');
    if (!scene || !canvas || !viewport) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Keep the inline SVG fallback.
    const TAU = Math.PI * 2, rad = Math.PI / 180, cx = 400, cy = 317, radius = 151;
    const pause = $('#orbitalPause'), controls = $('#orbitalControls');
    let elapsed = 0, last = 0, lastDraw = 0, raf = 0, visible = false, paused = false, mode = 'both';
    let pointer = { x: 0, y: 0 }, view = { x: 0, y: 0 };
    // Deliberately simplified continental outlines, sampled once into a dot globe.
    const continents = [
      [[-168, 69], [-145, 72], [-128, 70], [-116, 76], [-89, 72], [-62, 59], [-54, 48], [-67, 43], [-81, 25], [-80, 9], [-91, 16], [-105, 24], [-117, 33], [-125, 49], [-143, 59], [-163, 59]],
      [[-81, 12], [-65, 10], [-50, 1], [-35, -7], [-42, -21], [-53, -34], [-68, -55], [-75, -47], [-72, -18], [-80, -5]],
      [[-18, 36], [-4, 37], [12, 32], [32, 31], [44, 12], [51, 11], [44, -3], [39, -17], [31, -30], [18, -35], [12, -18], [8, -3], [-7, 5], [-17, 16]],
      [[-10, 36], [-9, 43], [1, 45], [-5, 49], [7, 54], [10, 58], [20, 70], [32, 70], [43, 58], [30, 46], [27, 40], [14, 38], [9, 43], [3, 40]],
      [[27, 40], [43, 58], [33, 70], [66, 76], [108, 75], [144, 62], [178, 64], [167, 51], [140, 49], [133, 39], [122, 31], [121, 19], [107, 9], [102, 1], [94, 17], [83, 9], [72, 20], [59, 25], [49, 12], [35, 29]],
      [[112, -11], [131, -12], [141, -10], [153, -27], [146, -39], [129, -32], [115, -35]],
      [[-53, 60], [-43, 61], [-20, 76], [-34, 84], [-58, 82], [-70, 72]],
      [[-8, 50], [-2, 51], [1, 57], [-5, 59]],
      [[44, -13], [50, -16], [47, -26], [44, -25]],
      [[129, 31], [135, 34], [142, 41], [146, 45], [143, 34]],
      [[96, 5], [106, -3], [115, -8], [110, -8], [102, -2]],
      [[119, 0], [125, 2], [129, -4], [124, -7], [118, -4]],
      [[133, -3], [149, -6], [153, -11], [139, -9]],
      [[166, -35], [177, -40], [170, -47], [165, -44]]
    ];
    const inside = (x, y, poly) => {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const land = [];
    for (let lat = -57; lat < 83; lat += 2.15) {
      const step = 2.15 / Math.max(.25, Math.cos(lat * rad));
      for (let lon = -178; lon < 180; lon += step) {
        const onLand = continents.find(poly => inside(lon, lat, poly)) !== undefined;
        if (onLand) land.push([lat * rad, lon * rad]);
      }
    }
    const stars = Array.from({ length: 72 }, (_, i) => ({ x: 28 + (i * 137.51) % 744, y: 28 + (i * 83.7) % 548, r: i % 7 === 0 ? 1.5 : .7 }));
    const satellites = [
      { rotation: -.38, flatten: .62, size: 274, phase: 2.9, speed: .085, name: 'RELAY 01', tint: '#80e9db' },
      { rotation: 1.05, flatten: .67, size: 258, phase: .46, speed: -.069, name: 'RELAY 02', tint: '#aaadf5' },
      { rotation: -1.08, flatten: .68, size: 263, phase: .25, speed: .055, name: 'RELAY 03', tint: '#e6bf82' }
    ];
    const project = (lat, lon, spin) => {
      const a = lon - spin, cl = Math.cos(lat), x = cl * Math.sin(a), y = -Math.sin(lat), z = cl * Math.cos(a);
      const tilt = .12 + view.y * .06, yy = y * Math.cos(tilt) - z * Math.sin(tilt), zz = y * Math.sin(tilt) + z * Math.cos(tilt);
      return { x: cx + radius * x, y: cy + radius * yy, z: zz };
    };
    const orbit = (sat, t) => {
      const x = Math.cos(t) * sat.size, y = Math.sin(t) * sat.size * sat.flatten;
      const a = sat.rotation + view.x * .025;
      return { x: cx + x * Math.cos(a) - y * Math.sin(a), y: cy + x * Math.sin(a) + y * Math.cos(a), z: Math.sin(t) };
    };
    const circle = (x, y, r, fill) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
    };
    const orbitalLines = front => {
      satellites.forEach(sat => {
        ctx.beginPath(); let pen = false;
        for (let i = 0; i <= 180; i++) {
          const p = orbit(sat, i / 180 * TAU);
          if ((p.z >= 0) === front) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; }
          else pen = false;
        }
        ctx.strokeStyle = front ? '#90d7ce27' : '#90d7ce12'; ctx.lineWidth = .8;
        ctx.setLineDash(front ? [] : [3, 7]); ctx.stroke(); ctx.setLineDash([]);
      });
    };
    function globe(spin) {
      const halo = ctx.createRadialGradient(cx, cy, radius * .92, cx, cy, radius * 1.3);
      halo.addColorStop(0, '#55ddd400'); halo.addColorStop(.35, '#3cb9c029'); halo.addColorStop(1, '#55ddd400');
      circle(cx, cy, radius * 1.3, halo);
      const ocean = ctx.createRadialGradient(cx - 70, cy - 75, 8, cx + 20, cy + 30, radius * 1.2);
      ocean.addColorStop(0, '#164454'); ocean.addColorStop(.55, '#0b2c3b'); ocean.addColorStop(1, '#031018');
      circle(cx, cy, radius, ocean);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.clip();
      ctx.strokeStyle = '#81dfd61d'; ctx.lineWidth = .65;
      const line = points => {
        ctx.beginPath(); let pen = false;
        points.forEach(point => {
          const p = project(point[0], point[1], spin);
          if (p.z > .01) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; }
          else pen = false;
        });
        ctx.stroke();
      };
      for (let lat = -60; lat <= 60; lat += 20) line(Array.from({ length: 121 }, (_, i) => [lat * rad, i * TAU / 120]));
      for (let lon = 0; lon < 360; lon += 30) line(Array.from({ length: 61 }, (_, i) => [(-90 + i * 3) * rad, lon * rad]));
      // Batch front and limb dots into two paths instead of thousands of fills.
      const points = land.map(dot => project(dot[0], dot[1], spin)).filter(p => p.z > 0);
      [false, true].forEach(bright => {
        ctx.beginPath();
        points.forEach(p => {
          if ((p.z > .4) !== bright) return;
          const r = .65 + Math.min(p.z, .8) * .76;
          ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, TAU);
        });
        ctx.fillStyle = bright ? '#71d2bd' : '#378584'; ctx.fill();
      });
      const shade = ctx.createRadialGradient(cx - 54, cy - 56, 55, cx, cy, radius + 6);
      shade.addColorStop(0, '#010e1a00'); shade.addColorStop(.77, '#02101705'); shade.addColorStop(1, '#02101799');
      circle(cx, cy, radius, shade); ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.strokeStyle = '#69dcd572'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius + 4, Math.PI * 1.03, Math.PI * 1.63); ctx.strokeStyle = '#92f5e66b'; ctx.lineWidth = 1.3; ctx.stroke();
    }
    function drawSatellite(sat, p) {
      const scale = .79 + (p.z + 1) * .15;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sat.rotation * .4 + elapsed * .014); ctx.scale(scale, scale);
      ctx.shadowBlur = 14; ctx.shadowColor = '#62d9d826';
      // Solar arrays, their grid cells, metallic bus, and antenna dish.
      for (const side of [-1, 1]) {
        const x = side < 0 ? -43 : 16;
        const panel = ctx.createLinearGradient(x, -14, x + 27, 14);
        panel.addColorStop(0, '#285274'); panel.addColorStop(1, '#102b40');
        ctx.fillStyle = panel; ctx.strokeStyle = sat.tint; ctx.lineWidth = .85;
        ctx.fillRect(x, -14, 27, 28); ctx.strokeRect(x, -14, 27, 28);
        ctx.strokeStyle = '#83cee158'; ctx.lineWidth = .55;
        ctx.beginPath();
        for (let i = 1; i < 3; i++) { ctx.moveTo(x + i * 9, -14); ctx.lineTo(x + i * 9, 14); }
        for (let i = 1; i < 4; i++) { ctx.moveTo(x, -14 + i * 7); ctx.lineTo(x + 27, -14 + i * 7); }
        ctx.stroke();
        ctx.fillStyle = '#97b8c3'; ctx.fillRect(side < 0 ? -16 : 10, -2, 6, 4);
      }
      const body = ctx.createLinearGradient(-10, -10, 10, 12);
      body.addColorStop(0, '#e5f3ed'); body.addColorStop(1, '#7b9ea9');
      ctx.fillStyle = body; ctx.fillRect(-10, -11, 20, 22);
      ctx.strokeStyle = '#f2ffff'; ctx.lineWidth = 1; ctx.strokeRect(-10, -11, 20, 22);
      ctx.fillStyle = '#355865'; ctx.fillRect(-5, -5, 10, 10);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -24); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -26, 9, 4, .2, 0, Math.PI); ctx.stroke();
      circle(0, 15, 2.5, sat.tint); ctx.restore();
      ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#a0c5c5';
      ctx.fillText(sat.name, p.x, p.y + 40 * scale);
    }
    const curvePoint = (a, b, c, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
    function connection(anchor, point, index) {
      if (anchor.z < .05) return;
      const draw = (up) => {
        const color = up ? '#eab877' : '#71f0d5';
        const dx = point.x - anchor.x, dy = point.y - anchor.y, length = Math.max(1, Math.hypot(dx, dy));
        const bend = up ? 26 : -26;
        const control = { x: (point.x + anchor.x) / 2 - dy / length * bend, y: (point.y + anchor.y) / 2 + dx / length * bend };
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.quadraticCurveTo(control.x, control.y, point.x, point.y);
        ctx.lineWidth = .9; ctx.strokeStyle = up ? '#eab87732' : '#71f0d539'; ctx.stroke();
        // Gold packets move out; mint packets travel back along a separate curve.
        for (let j = 0; j < 3; j++) {
          const phase = (elapsed * .29 + j / 3 + index * .21) % 1;
          const t = up ? phase : 1 - phase;
          for (let trail = 5; trail >= 0; trail--) {
            const tt = t + (up ? -1 : 1) * trail * .015;
            if (tt < 0 || tt > 1) continue;
            const p = curvePoint(anchor, point, control, tt);
            ctx.globalAlpha = (1 - trail / 6) * .9;
            circle(p.x, p.y, trail ? 1.4 : 2.8, color);
          }
          const p = curvePoint(anchor, point, control, t), q = curvePoint(anchor, point, control, Math.max(0, Math.min(1, t + (up ? .02 : -.02))));
          ctx.globalAlpha = .95; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
          ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -2.6); ctx.lineTo(-3, 2.6); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
      if (mode !== 'downlink') draw(true);
      if (mode !== 'uplink') draw(false);
      const pulse = (elapsed * .65 + index * .3) % 1;
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 4 + pulse * 11, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(125,240,212,${(1 - pulse) * .6})`; ctx.stroke();
      circle(anchor.x, anchor.y, 3, '#beffea');
    }
    function draw() {
      ctx.clearRect(0, 0, 800, 660);
      stars.forEach((s, i) => circle(s.x, s.y, s.r, `rgba(149,210,216,${.12 + .14 * (.5 + .5 * Math.sin(elapsed * .5 + i))})`));
      const spin = .26 + elapsed * .024 + view.x * .07;
      const positions = satellites.map(sat => orbit(sat, sat.phase + elapsed * sat.speed));
      orbitalLines(false);
      positions.forEach((p, i) => { if (p.z < 0) drawSatellite(satellites[i], p); });
      globe(spin);
      orbitalLines(true);
      // Ground terminals remain on the visible hemisphere as the globe rotates.
      const anchors = [project(30 * rad, spin - .56, spin), project(-17 * rad, spin + .47, spin), project(49 * rad, spin + .17, spin)];
      positions.forEach((p, i) => {
        const outside = Math.hypot(p.x - cx, p.y - cy) > radius + 28;
        if (p.z >= 0 || outside) connection(anchors[i], p, i);
      });
      positions.forEach((p, i) => { if (p.z >= 0) drawSatellite(satellites[i], p); });
    }
    const canRun = () => visible && !paused && !reduce.matches && !document.hidden;
    const frame = now => {
      raf = 0;
      if (!canRun()) return;
      if (!last) last = now;
      const delta = Math.min((now - last) / 1000, .05); last = now; elapsed += delta;
      if (now - lastDraw >= 32) {
        view.x += (pointer.x - view.x) * .08; view.y += (pointer.y - view.y) * .08;
        draw(); lastDraw = now;
      }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      pause.disabled = reduce.matches;
      pause.setAttribute('aria-pressed', String(paused || reduce.matches));
      pause.setAttribute('aria-label', reduce.matches ? 'Animation disabled by reduced motion preference' : paused ? 'Resume orbital animation' : 'Pause orbital animation');
      pause.firstElementChild.textContent = paused || reduce.matches ? '▷' : 'Ⅱ';
      scene.dataset.animation = canRun() ? 'running' : 'paused';
      draw();
      if (canRun()) raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      const width = viewport.clientWidth;
      if (!width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), scale = width / 800 * dpr;
      canvas.width = Math.round(800 * scale); canvas.height = Math.round(660 * scale);
      ctx.setTransform(canvas.width / 800, 0, 0, canvas.height / 660, 0, 0);
      draw();
    };
    resize(); scene.classList.add('canvas-ready'); controls.hidden = false;
    $$('.orbital-modes button').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.linkMode; scene.dataset.linkMode = mode;
      $$('.orbital-modes button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      draw();
    }));
    pause.addEventListener('click', () => { paused = !paused; sync(); });
    viewport.addEventListener('pointermove', e => {
      if (!finePointer.matches || reduce.matches || paused || e.pointerType === 'touch') return;
      const r = viewport.getBoundingClientRect(); pointer = { x: (e.clientX - r.left) / r.width - .5, y: (e.clientY - r.top) / r.height - .5 };
    }, { passive: true });
    viewport.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(viewport);
    else addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(viewport);
    else { visible = true; sync(); }
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; });
    addEventListener('pageshow', sync);
    scene.dataset.linkMode = mode; sync();
  }

  /* Full-page 3D telecom scene (Three.js/WebGL): ground uplink → satellite relay → ground downlink.
     The static SVG fallback stays visible until WebGL has rendered its first frame. */
  function signalWorld() {
    const canvas = $('#signalWorldCanvas'), world = $('#signalWorld'), toggle = $('#backgroundMotion');
    if (!canvas || !world || !toggle) return;
    const cycleDuration = 10;
    let api = null, width = 1, height = 1, elapsed = 0, raf = 0, last = 0, lastDraw = 0, paused = false, inPage = true, lost = false;
    let scrollTarget = 0, scrollView = 0, px = 0, py = 0, tpx = 0, tpy = 0, slow = 0, frames = 0, dprCap = 0;
    const weak = isSmall() || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    const running = () => !!api && !lost && !paused && !reduce.matches && !document.hidden && inPage;
    const draw = () => {
      if (!api || lost) return;
      try {
        const still = reduce.matches, phaseName = api.update({ elapsed: still ? 3 : elapsed, px: px, py: py, scroll: scrollView, still: still, cycle: cycleDuration });
        api.render();
        if (world.dataset.phase !== phaseName) world.dataset.phase = phaseName;
      } catch (error) { fail(error); }
    };
    const fail = error => {
      console.warn('TeamSpace: 3D background unavailable', error);
      cancelAnimationFrame(raf); raf = 0; world.classList.remove('is-ready'); toggle.hidden = true;
      try { if (api) api.dispose(); } catch (e) { /* ignore */ } api = null;
    };
    const frame = now => {
      raf = 0; if (!running()) return;
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, .055); elapsed += dt; last = now;
      if (now - lastDraw >= (weak ? 30 : 15)) {
        px += (tpx - px) * .06; py += (tpy - py) * .06; scrollView += (scrollTarget - scrollView) * .08;
        const t0 = performance.now(); draw(); lastDraw = now;
        // Adaptive quality: sustained slow frames reduce resolution, then shadows.
        if (++frames > 20) { slow += performance.now() - t0 > 20 ? 1 : -1; slow = Math.max(0, slow);
          if (slow > 25) { slow = 0; if (dprCap > 1) { dprCap = Math.max(1, dprCap - .25); resize(); } else if (api) api.setShadows(false); } }
      }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      toggle.disabled = reduce.matches;
      toggle.setAttribute('aria-pressed', String(paused || reduce.matches));
      toggle.setAttribute('aria-label', reduce.matches ? 'Background animation disabled by reduced motion preference' : paused ? 'Resume background animation' : 'Pause background animation');
      toggle.querySelector('[data-motion-label]').textContent = reduce.matches ? 'Still view' : paused ? 'Resume background' : 'Pause background';
      toggle.querySelector('[data-motion-symbol]').textContent = paused || reduce.matches ? '▷' : 'Ⅱ';
      world.dataset.animation = running() ? 'running' : 'paused'; draw();
      if (running()) raf = requestAnimationFrame(frame);
    };
    function resize() {
      if (!api) return;
      const rect = world.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      if (!dprCap) dprCap = weak ? 1.25 : 1.75;
      api.resize(width, height, Math.min(devicePixelRatio || 1, dprCap)); draw();
    }
    const base = (document.currentScript && document.currentScript.src) || SCRIPT_SRC;
    const load = () => window.TeamSpaceSignalWorld3D ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = new URL('vendor/signal-world-3d.js', base || location.href).href;
      s.onload = ok; s.onerror = () => no(new Error('Could not load vendor/signal-world-3d.js')); document.head.appendChild(s);
    });
    load().then(() => {
      api = window.TeamSpaceSignalWorld3D.create(canvas, { weak: weak });
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; world.classList.remove('is-ready'); });
      canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); world.classList.add('is-ready'); sync(); });
      resize(); world.classList.add('is-ready'); toggle.hidden = false;
      toggle.addEventListener('click', () => { paused = !paused; sync(); });
      addEventListener('scroll', () => { scrollTarget = Math.min(1, scrollY / Math.max(1, root.scrollHeight - innerHeight)); if (!running()) { scrollView = scrollTarget; draw(); } }, { passive: true });
      if (finePointer.matches) addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; }, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(resize).observe(world); else addEventListener('resize', resize);
      reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
      addEventListener('pagehide', () => { inPage = false; sync(); }); addEventListener('pageshow', () => { inPage = true; sync(); });
      sync();
    }).catch(fail);
  }

  const initialize = fn => {
    try { fn(); } catch (error) { console.warn(`TeamSpace: ${fn.name} unavailable`, error); }
  };
  const ready = splash();
  [scrollProgress, pointerEffects, feedback, carousel, orbitalNetwork].forEach(initialize);
  ready.then(() => [reveals, counters, signalWorld, videos].forEach(initialize));
})();
