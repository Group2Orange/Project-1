(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
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
        el?.remove(); resolve(); return;
      }
      const skip = $('#skipIntro');
      const background = $$('main, nav.navbar, [data-footer], #backgroundMotion');
      const original = background.map(node => [node, node.inert]);
      original.forEach(([node]) => { node.inert = true; });
      let finished = false, closing = false, closeTimer, finishTimer;
      const restore = () => original.forEach(([node, inert]) => { node.inert = inert; });
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
        if (hadFocus) $('#mainContent')?.focus({ preventScroll: true });
        resolve();
      };
      const leave = () => {
        if (closing || finished) return;
        closing = true;
        clearTimeout(closeTimer);
        root.classList.remove('intro-pending');
        root.classList.add('intro-leaving');
        restore();
        if (el.contains(document.activeElement)) $('#mainContent')?.focus({ preventScroll: true });
        resolve();
        finishTimer = setTimeout(finish, reduce.matches ? 0 : 850);
      };
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); leave(); }
        if (e.key === 'Tab' && !closing) { e.preventDefault(); skip.focus({ preventScroll:true }); }
      };
      const preference = () => { if (reduce.matches) finish(); };
      skip.addEventListener('click', leave);
      document.addEventListener('keydown', key);
      document.addEventListener('teamspace:intro-ready', finish, { once:true });
      reduce.addEventListener('change', preference);
      closeTimer = setTimeout(leave, Math.max(0, 1700 - (performance.now() - (window.teamspaceIntroStarted || 0))));
      addEventListener('pageshow', e => { if (e.persisted) finish(); }, { once:true });
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
    addEventListener('scroll', queue, { passive:true });
    addEventListener('resize', queue, { passive:true });
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
    const timers = new WeakMap();
    const show = el => {
      clearTimeout(timers.get(el));
      el.classList.add('is-in');
      timers.set(el, setTimeout(() => el.classList.add('settled'), 1200));
    };
    let observer;
    const configure = () => {
      observer?.disconnect();
      if (reduce.matches || !('IntersectionObserver' in window)) {
        root.classList.remove('motion-ready');
        targets.forEach(show); return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.intersectionRatio >= .06) show(e.target);
          // Reset only once completely outside; small scroll reversals never flicker.
          else if (!e.isIntersecting && !e.target.contains(document.activeElement)) {
            clearTimeout(timers.get(e.target));
            e.target.classList.remove('is-in', 'settled');
          }
        });
      }, { threshold:[0, .06], rootMargin:'0px' });
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
      el.addEventListener('pointermove',e => {
        if (reduce.matches || !finePointer.matches || e.pointerType === 'touch') return;
        const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        el.style.setProperty('--pointer-x',`${(x+.5)*100}%`);
        el.style.setProperty('--pointer-y',`${(y+.5)*100}%`);
        if (el.classList.contains('home-btn')) {
          el.style.setProperty('--mag-x',`${x*7}px`); el.style.setProperty('--mag-y',`${y*5}px`);
        }
      });
      el.addEventListener('pointerleave',() => { el.style.setProperty('--mag-x','0px'); el.style.setProperty('--mag-y','0px'); });
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
      if (!card || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      selectCard(card);
    });

    document.addEventListener("click", (event) => {
      if (slider.classList.contains("has-selected") && !slider.contains(event.target)) clearSelection();
    });
  }

  function networkHealth() {
    const section = $('#network-health');
    if (!section) return;

    const world = $('#signalWorld');
    const phase = $('[data-network-phase]', section);
    const board = $('[data-network-board]', section);
    const nodes = $$('[data-route-node]', section);
    const phases = {
      uplink: 'Core route active',
      relay: 'Cloud relay active',
      downlink: 'Portal delivery active',
      received: 'Secure delivery confirmed'
    };

    const syncPhase = () => {
      const key = world?.dataset.phase || 'uplink';
      if (phase) phase.textContent = phases[key] || 'Routing signal';
      if (board) board.dataset.phase = key;
      nodes.forEach((node) => node.classList.toggle('is-active', node.dataset.routeNode === key));
    };

    syncPhase();
    if ('MutationObserver' in window && world) {
      new MutationObserver(syncPhase).observe(world, { attributes: true, attributeFilter: ['data-phase'] });
    }
  }

  /* ===== Carousel ===== */
  function carousel() {
    const car = $("#companyCarousel"), tr = $("#companyTrack");
    if (!car || !tr) return;
    const slides = $$(".company-slide", tr), dots = $("#companyDots"), bar = $("#companyProgress");
    let timer = null, activeIndex = -1;
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
      if (i !== activeIndex) {
        activeIndex = i;
        car.dispatchEvent(new CustomEvent("company:active-change", { detail: { index: i } }));
      }
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
    $("#companyPrev")?.addEventListener("click", () => { move(-1); play(); });
    $("#companyNext")?.addEventListener("click", () => { move(1); play(); });
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

    const visible = new WeakMap();
    const canPlay = (video) => !reduce.matches && !document.hidden && visible.get(video);

    const sync = (video) => {
      const media = video.closest('.company-media');
      if (video.readyState >= 2) media?.classList.add('is-ready');
      if (canPlay(video)) video.play().catch(() => {});
      else video.pause();
    };

    vids.forEach((video) => {
      const media = video.closest('.company-media');
      video.muted = true;
      video.playsInline = true;
      video.addEventListener('loadeddata', () => { media?.classList.add('is-ready'); media?.classList.remove('has-error'); sync(video); });
      video.addEventListener('canplay', () => { media?.classList.add('is-ready'); media?.classList.remove('has-error'); });
      video.addEventListener('error', () => { media?.classList.add('has-error'); media?.classList.remove('is-ready'); });
      if (video.readyState >= 2) media?.classList.add('is-ready');
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { visible.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= .35); sync(entry.target); });
      }, { threshold: [0, .35, .65] });
      vids.forEach((video) => io.observe(video));
    } else {
      vids.forEach((video) => { visible.set(video, true); sync(video); });
    }

    const syncAll = () => vids.forEach(sync);
    document.addEventListener('visibilitychange', syncAll);
    reduce.addEventListener('change', syncAll);
    $('#companyCarousel')?.addEventListener('company:active-change', syncAll);
  }

  /* A lightweight 2D-canvas renderer of a rotating 3D globe. All artwork is local. */
  function orbitalNetwork() {
    const scene=$('#orbitalScene'), canvas=$('#orbitalCanvas'), viewport=$('#orbitalViewport');
    if (!scene || !canvas || !viewport) return;
    const ctx=canvas.getContext('2d');
    if (!ctx) return; // Keep the inline SVG fallback.
    const TAU=Math.PI*2, rad=Math.PI/180, cx=400, cy=317, radius=151;
    const pause=$('#orbitalPause'), controls=$('#orbitalControls');
    let elapsed=0, last=0, lastDraw=0, raf=0, visible=false, paused=false, mode='both';
    let pointer={x:0,y:0}, view={x:0,y:0};
    // Deliberately simplified continental outlines, sampled once into a dot globe.
    const continents=[
      [[-168,69],[-145,72],[-128,70],[-116,76],[-89,72],[-62,59],[-54,48],[-67,43],[-81,25],[-80,9],[-91,16],[-105,24],[-117,33],[-125,49],[-143,59],[-163,59]],
      [[-81,12],[-65,10],[-50,1],[-35,-7],[-42,-21],[-53,-34],[-68,-55],[-75,-47],[-72,-18],[-80,-5]],
      [[-18,36],[-4,37],[12,32],[32,31],[44,12],[51,11],[44,-3],[39,-17],[31,-30],[18,-35],[12,-18],[8,-3],[-7,5],[-17,16]],
      [[-10,36],[-9,43],[1,45],[-5,49],[7,54],[10,58],[20,70],[32,70],[43,58],[30,46],[27,40],[14,38],[9,43],[3,40]],
      [[27,40],[43,58],[33,70],[66,76],[108,75],[144,62],[178,64],[167,51],[140,49],[133,39],[122,31],[121,19],[107,9],[102,1],[94,17],[83,9],[72,20],[59,25],[49,12],[35,29]],
      [[112,-11],[131,-12],[141,-10],[153,-27],[146,-39],[129,-32],[115,-35]],
      [[-53,60],[-43,61],[-20,76],[-34,84],[-58,82],[-70,72]],
      [[-8,50],[-2,51],[1,57],[-5,59]],
      [[44,-13],[50,-16],[47,-26],[44,-25]],
      [[129,31],[135,34],[142,41],[146,45],[143,34]],
      [[96,5],[106,-3],[115,-8],[110,-8],[102,-2]],
      [[119,0],[125,2],[129,-4],[124,-7],[118,-4]],
      [[133,-3],[149,-6],[153,-11],[139,-9]],
      [[166,-35],[177,-40],[170,-47],[165,-44]]
    ];
    const inside=(x,y,poly) => {
      let hit=false;
      for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
        const [xi,yi]=poly[i], [xj,yj]=poly[j];
        if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) hit=!hit;
      }
      return hit;
    };
    const land=[];
    for (let lat=-57;lat<83;lat+=2.15) {
      const step=2.15/Math.max(.25,Math.cos(lat*rad));
      for (let lon=-178;lon<180;lon+=step) {
        if (continents.some(poly=>inside(lon,lat,poly))) land.push([lat*rad,lon*rad]);
      }
    }
    const stars=Array.from({length:72},(_,i)=>({x:28+(i*137.51)%744,y:28+(i*83.7)%548,r:i%7===0?1.5:.7}));
    const satellites=[
      {rotation:-.38, flatten:.62, size:274, phase:2.9, speed:.085, name:'RELAY 01', tint:'#80e9db'},
      {rotation:1.05, flatten:.67, size:258, phase:.46, speed:-.069, name:'RELAY 02', tint:'#aaadf5'},
      {rotation:-1.08, flatten:.68, size:263, phase:.25, speed:.055, name:'RELAY 03', tint:'#e6bf82'}
    ];
    const project=(lat,lon,spin) => {
      const a=lon-spin, cl=Math.cos(lat), x=cl*Math.sin(a), y=-Math.sin(lat), z=cl*Math.cos(a);
      const tilt=.12+view.y*.06, yy=y*Math.cos(tilt)-z*Math.sin(tilt), zz=y*Math.sin(tilt)+z*Math.cos(tilt);
      return {x:cx+radius*x,y:cy+radius*yy,z:zz};
    };
    const orbit=(sat,t) => {
      const x=Math.cos(t)*sat.size, y=Math.sin(t)*sat.size*sat.flatten;
      const a=sat.rotation+view.x*.025;
      return {x:cx+x*Math.cos(a)-y*Math.sin(a),y:cy+x*Math.sin(a)+y*Math.cos(a),z:Math.sin(t)};
    };
    const circle=(x,y,r,fill) => {
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fillStyle=fill; ctx.fill();
    };
    const orbitalLines=front => {
      satellites.forEach(sat=>{
        ctx.beginPath(); let pen=false;
        for(let i=0;i<=180;i++) {
          const p=orbit(sat,i/180*TAU);
          if ((p.z>=0)===front) { if(pen)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y); pen=true; }
          else pen=false;
        }
        ctx.strokeStyle=front?'#90d7ce27':'#90d7ce12'; ctx.lineWidth=.8;
        ctx.setLineDash(front?[]:[3,7]); ctx.stroke(); ctx.setLineDash([]);
      });
    };
    function globe(spin) {
      const halo=ctx.createRadialGradient(cx,cy,radius*.92,cx,cy,radius*1.3);
      halo.addColorStop(0,'#55ddd400'); halo.addColorStop(.35,'#3cb9c029'); halo.addColorStop(1,'#55ddd400');
      circle(cx,cy,radius*1.3,halo);
      const ocean=ctx.createRadialGradient(cx-70,cy-75,8,cx+20,cy+30,radius*1.2);
      ocean.addColorStop(0,'#164454'); ocean.addColorStop(.55,'#0b2c3b'); ocean.addColorStop(1,'#031018');
      circle(cx,cy,radius,ocean);
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,radius,0,TAU); ctx.clip();
      ctx.strokeStyle='#81dfd61d'; ctx.lineWidth=.65;
      const line=points=>{
        ctx.beginPath(); let pen=false;
        points.forEach(([a,b])=>{
          const p=project(a,b,spin);
          if(p.z>.01) { if(pen)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y); pen=true; }
          else pen=false;
        });
        ctx.stroke();
      };
      for(let lat=-60;lat<=60;lat+=20) line(Array.from({length:121},(_,i)=>[lat*rad,i*TAU/120]));
      for(let lon=0;lon<360;lon+=30) line(Array.from({length:61},(_,i)=>[(-90+i*3)*rad,lon*rad]));
      // Batch front and limb dots into two paths instead of thousands of fills.
      const points=land.map(([a,b])=>project(a,b,spin)).filter(p=>p.z>0);
      [false,true].forEach(bright=>{
        ctx.beginPath();
        points.forEach(p=>{
          if ((p.z>.4)!==bright) return;
          const r=.65+Math.min(p.z,.8)*.76;
          ctx.moveTo(p.x+r,p.y); ctx.arc(p.x,p.y,r,0,TAU);
        });
        ctx.fillStyle=bright?'#71d2bd':'#378584'; ctx.fill();
      });
      const shade=ctx.createRadialGradient(cx-54,cy-56,55,cx,cy,radius+6);
      shade.addColorStop(0,'#010e1a00'); shade.addColorStop(.77,'#02101705'); shade.addColorStop(1,'#02101799');
      circle(cx,cy,radius,shade); ctx.restore();
      ctx.beginPath(); ctx.arc(cx,cy,radius,0,TAU); ctx.strokeStyle='#69dcd572'; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,radius+4,Math.PI*1.03,Math.PI*1.63); ctx.strokeStyle='#92f5e66b'; ctx.lineWidth=1.3; ctx.stroke();
    }
    function drawSatellite(sat,p) {
      const scale=.79+(p.z+1)*.15;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(sat.rotation*.4 + elapsed*.014); ctx.scale(scale,scale);
      ctx.shadowBlur=14; ctx.shadowColor='#62d9d826';
      // Solar arrays, their grid cells, metallic bus, and antenna dish.
      for(const side of [-1,1]) {
        const x=side<0?-43:16;
        const panel=ctx.createLinearGradient(x,-14,x+27,14);
        panel.addColorStop(0,'#285274'); panel.addColorStop(1,'#102b40');
        ctx.fillStyle=panel; ctx.strokeStyle=sat.tint; ctx.lineWidth=.85;
        ctx.fillRect(x,-14,27,28); ctx.strokeRect(x,-14,27,28);
        ctx.strokeStyle='#83cee158'; ctx.lineWidth=.55;
        ctx.beginPath();
        for(let i=1;i<3;i++){ctx.moveTo(x+i*9,-14);ctx.lineTo(x+i*9,14);}
        for(let i=1;i<4;i++){ctx.moveTo(x,-14+i*7);ctx.lineTo(x+27,-14+i*7);}
        ctx.stroke();
        ctx.fillStyle='#97b8c3';ctx.fillRect(side<0?-16:10,-2,6,4);
      }
      const body=ctx.createLinearGradient(-10,-10,10,12);
      body.addColorStop(0,'#e5f3ed');body.addColorStop(1,'#7b9ea9');
      ctx.fillStyle=body;ctx.fillRect(-10,-11,20,22);
      ctx.strokeStyle='#f2ffff';ctx.lineWidth=1;ctx.strokeRect(-10,-11,20,22);
      ctx.fillStyle='#355865';ctx.fillRect(-5,-5,10,10);
      ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,-24);ctx.stroke();
      ctx.beginPath();ctx.ellipse(0,-26,9,4,.2,0,Math.PI);ctx.stroke();
      circle(0,15,2.5,sat.tint); ctx.restore();
      ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#a0c5c5';
      ctx.fillText(sat.name,p.x,p.y+40*scale);
    }
    const curvePoint=(a,b,c,t)=>({x:(1-t)*(1-t)*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*c.y+t*t*b.y});
    function connection(anchor,point,index) {
      if(anchor.z<.05) return;
      const draw=(up)=>{
        const color=up?'#eab877':'#71f0d5';
        const dx=point.x-anchor.x,dy=point.y-anchor.y,length=Math.max(1,Math.hypot(dx,dy));
        const bend=up?26:-26;
        const control={x:(point.x+anchor.x)/2-dy/length*bend,y:(point.y+anchor.y)/2+dx/length*bend};
        ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.quadraticCurveTo(control.x,control.y,point.x,point.y);
        ctx.lineWidth=.9;ctx.strokeStyle=up?'#eab87732':'#71f0d539';ctx.stroke();
        // Gold packets move out; mint packets travel back along a separate curve.
        for(let j=0;j<3;j++) {
          const phase=(elapsed*.29+j/3+index*.21)%1;
          const t=up?phase:1-phase;
          for(let trail=5;trail>=0;trail--) {
            const tt=t+(up?-1:1)*trail*.015;
            if(tt<0||tt>1)continue;
            const p=curvePoint(anchor,point,control,tt);
            ctx.globalAlpha=(1-trail/6)*.9;
            circle(p.x,p.y,trail?1.4:2.8,color);
          }
          const p=curvePoint(anchor,point,control,t), q=curvePoint(anchor,point,control,Math.max(0,Math.min(1,t+(up?.02:-.02))));
          ctx.globalAlpha=.95;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(q.y-p.y,q.x-p.x));
          ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(-3,-2.6);ctx.lineTo(-3,2.6);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
        }
        ctx.globalAlpha=1;
      };
      if(mode!=='downlink')draw(true);
      if(mode!=='uplink')draw(false);
      const pulse=(elapsed*.65+index*.3)%1;
      ctx.beginPath();ctx.arc(anchor.x,anchor.y,4+pulse*11,0,TAU);ctx.lineWidth=1;ctx.strokeStyle=`rgba(125,240,212,${(1-pulse)*.6})`;ctx.stroke();
      circle(anchor.x,anchor.y,3,'#beffea');
    }
    function draw() {
      ctx.clearRect(0,0,800,660);
      stars.forEach((s,i)=>circle(s.x,s.y,s.r,`rgba(149,210,216,${.12+.14*(.5+.5*Math.sin(elapsed*.5+i))})`));
      const spin=.26+elapsed*.024+view.x*.07;
      const positions=satellites.map(sat=>orbit(sat,sat.phase+elapsed*sat.speed));
      orbitalLines(false);
      positions.forEach((p,i)=>{if(p.z<0)drawSatellite(satellites[i],p);});
      globe(spin);
      orbitalLines(true);
      // Ground terminals remain on the visible hemisphere as the globe rotates.
      const anchors=[project(30*rad,spin-.56,spin),project(-17*rad,spin+.47,spin),project(49*rad,spin+.17,spin)];
      positions.forEach((p,i)=>{
        const outside=Math.hypot(p.x-cx,p.y-cy)>radius+28;
        if(p.z>=0 || outside)connection(anchors[i],p,i);
      });
      positions.forEach((p,i)=>{if(p.z>=0)drawSatellite(satellites[i],p);});
    }
    const canRun=()=>visible && !paused && !reduce.matches && !document.hidden;
    const frame=now=>{
      raf=0;
      if(!canRun())return;
      if(!last)last=now;
      const delta=Math.min((now-last)/1000,.05);last=now;elapsed+=delta;
      if(now-lastDraw>=32) {
        view.x+=(pointer.x-view.x)*.08;view.y+=(pointer.y-view.y)*.08;
        draw();lastDraw=now;
      }
      raf=requestAnimationFrame(frame);
    };
    const sync=()=>{
      cancelAnimationFrame(raf);raf=0;last=0;
      pause.disabled=reduce.matches;
      pause.setAttribute('aria-pressed',String(paused || reduce.matches));
      pause.setAttribute('aria-label',reduce.matches?'Animation disabled by reduced motion preference':paused?'Resume orbital animation':'Pause orbital animation');
      pause.firstElementChild.textContent=paused||reduce.matches?'▷':'Ⅱ';
      scene.dataset.animation=canRun()?'running':'paused';
      draw();
      if(canRun())raf=requestAnimationFrame(frame);
    };
    const resize=()=>{
      const width=viewport.clientWidth;
      if(!width)return;
      const dpr=Math.min(devicePixelRatio||1,2), scale=width/800*dpr;
      canvas.width=Math.round(800*scale);canvas.height=Math.round(660*scale);
      ctx.setTransform(canvas.width/800,0,0,canvas.height/660,0,0);
      draw();
    };
    resize();scene.classList.add('canvas-ready');controls.hidden=false;
    $$('.orbital-modes button').forEach(button=>button.addEventListener('click',()=>{
      mode=button.dataset.linkMode;scene.dataset.linkMode=mode;
      $$('.orbital-modes button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      draw();
    }));
    pause.addEventListener('click',()=>{paused=!paused;sync();});
    viewport.addEventListener('pointermove',e=>{
      if(!finePointer.matches || reduce.matches || paused || e.pointerType==='touch')return;
      const r=viewport.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5};
    },{passive:true});
    viewport.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(viewport);
    else addEventListener('resize',resize);
    if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync();},{threshold:0}).observe(viewport);
    else{visible=true;sync();}
    reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});
    addEventListener('pageshow',sync);
    scene.dataset.linkMode=mode;sync();
  }

  /* Full-page telecom scene: ground uplink → satellite relay → ground downlink. */
  function signalWorld() {
    const canvas = $('#signalWorldCanvas'), world = $('#signalWorld'), toggle = $('#backgroundMotion');
    if (!canvas || !world || !toggle) return;
    const ctx = canvas.getContext('2d', { alpha:false });
    if (!ctx) return;
    const TAU = Math.PI * 2, cycleDuration = 10;
    let width=1, height=1, elapsed=0, raf=0, last=0, lastDraw=0, paused=false, inPage=true;
    let scrollTarget=0, scrollView=0, dpr=1, backdrop;
    const stars = Array.from({length:115}, (_,i) => ({x:(i*0.61803398875)%1,y:(i*0.754877666)%1,r:i%13===0?1.2:.55}));
    const geometry = () => {
      const mobile = width <= 820;
      const scale = mobile ? Math.min(1,width/520) : Math.min(1.25, Math.max(.72,width/1440));
      const ground = height*(mobile?.935:.865);
      const tower = {x:width*(mobile?.47:.74),y:ground,h:Math.min(mobile?168:280,height*(mobile?.22:.31)),s:scale};
      const tip = {x:tower.x,y:tower.y-tower.h-15*scale};
      const drift = Math.sin(elapsed*.24)*12*scale;
      const a = {x:width*(mobile?.22:.595)+drift, y:height*(mobile?.53:.19)+Math.sin(elapsed*.32)*9*scale-scrollView*10,s:scale,rotation:-.32};
      const b = {x:width*(mobile?.83:.907)-drift*.6, y:height*(mobile?.59:.285)+Math.cos(elapsed*.25)*12*scale-scrollView*6,s:scale*.86,rotation:.30};
      const receiver = {x:width*(mobile?.88:.914),y:ground+5*scale,s:scale};
      const end = {x:receiver.x-4*scale,y:receiver.y-42*scale};
      return {mobile,scale,ground,tower,tip,a,b,receiver,end};
    };
    const stroke = (points,color,lineWidth=1,c=ctx) => {
      c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.strokeStyle=color;c.lineWidth=lineWidth;c.stroke();
    };
    const circle = (x,y,r,color,c=ctx) => {c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill();};
    function buildBackdrop() {
      backdrop=document.createElement('canvas');backdrop.width=canvas.width;backdrop.height=canvas.height;
      const c=backdrop.getContext('2d');if(!c){backdrop=null;return;}
      c.setTransform(dpr,0,0,dpr,0,0);
      const bg=c.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#03101b');bg.addColorStop(.6,'#071b29');bg.addColorStop(1,'#092e38');
      c.fillStyle=bg;c.fillRect(0,0,width,height);
      const glow=c.createRadialGradient(width*.8,height*.60,0,width*.8,height*.60,width*.58);
      glow.addColorStop(0,'#23687b3b');glow.addColorStop(1,'#04121c00');c.fillStyle=glow;c.fillRect(0,0,width,height);
      stars.forEach(s=>circle(s.x*width,s.y*height*.86,s.r,'#c9faff39',c));
      const g=geometry(), horizonY=g.ground-2*g.scale, rx=width*(g.mobile?1.8:.9), ry=height*.42, centerX=width*(g.mobile?.65:.8), centerY=horizonY+ry;
      c.save();c.beginPath();c.ellipse(centerX,centerY,rx,ry,0,0,TAU);c.clip();
      const earth=c.createLinearGradient(0,horizonY,0,height);earth.addColorStop(0,'#123a46');earth.addColorStop(.18,'#09202e');earth.addColorStop(1,'#020b13');
      c.fillStyle=earth;c.fillRect(0,horizonY,width,height-horizonY);
      // A perspective mesh makes the lower edge read as Earth's curved surface.
      for(let i=0;i<22;i++)stroke([[centerX+(i-11)*18,horizonY],[centerX+(i-11)*width*.13,height]],'#5baca826',.65,c);
      for(let i=0;i<5;i++){c.beginPath();c.ellipse(centerX,centerY,rx+i*60,ry-i*18,0,Math.PI,TAU);c.strokeStyle='#5baca822';c.lineWidth=.75;c.stroke();}
      for(let i=0;i<36;i++){const x=width*.48+(i*61.71)%(width*.55),y=horizonY+12+(i*23.1)%Math.max(20,height-horizonY);circle(x,y,.9,'#90e1c950',c);}
      c.restore();
      c.save();c.beginPath();c.ellipse(centerX,centerY,rx,ry,0,Math.PI,TAU);c.strokeStyle='#70e7ec69';c.lineWidth=1.2;c.shadowBlur=20;c.shadowColor='#68e0ff';c.stroke();c.restore();
    }
    function drawTower(g) {
      const {x,y,h,s}=g.tower, top=y-h, half=28*s;
      ctx.save();
      const base=ctx.createRadialGradient(x,y,0,x,y,92*s);base.addColorStop(0,'#76e8d027');base.addColorStop(1,'#76e8d000');circle(x,y,92*s,base);
      ctx.fillStyle='#0a1b28';ctx.beginPath();ctx.moveTo(x-6*s,top);ctx.lineTo(x-half,y);ctx.lineTo(x+half,y);ctx.lineTo(x+6*s,top);ctx.closePath();ctx.fill();
      stroke([[x-6*s,top],[x-half,y],[x+half,y],[x+6*s,top]],'#a1cfdb',2*s);
      for(let i=0;i<6;i++){
        const p=i/6,q=(i+1)/6, y1=top+h*p,y2=top+h*q, w1=6*s+(half-6*s)*p,w2=6*s+(half-6*s)*q;
        stroke([[x-w1,y1],[x+w2,y2]],'#668c9f',1.05*s);stroke([[x+w1,y1],[x-w2,y2]],'#4d758c',1.05*s);
        stroke([[x-w2,y2],[x+w2,y2]],'#9bbbbd',1.05*s);
      }
      stroke([[x,top-25*s],[x,top+20*s]],'#d4f4f6',2*s);
      // Antenna panels and mounting booms.
      for(const side of [-1,1]) {
        stroke([[x,top+26*s],[x+side*30*s,top+26*s]],'#93b5c3',2*s);
        const ax=x+side*28*s;
        const panel=ctx.createLinearGradient(ax-5*s,top+7*s,ax+6*s,top+44*s);panel.addColorStop(0,'#d8eeee');panel.addColorStop(1,'#628491');
        ctx.fillStyle=panel;ctx.fillRect(ax-5*s,top+7*s,10*s,39*s);ctx.strokeStyle='#b6d9de';ctx.lineWidth=.8*s;ctx.strokeRect(ax-5*s,top+7*s,10*s,39*s);
      }
      ctx.fillStyle='#153141';ctx.fillRect(x-44*s,y-4*s,88*s,10*s);stroke([[x-45*s,y-4*s],[x+45*s,y-4*s]],'#5b858f',2*s);
      circle(g.tip.x,g.tip.y,3*s,'#f3c582');
      ctx.font=`${Math.max(7,9*s)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#94bdc5';ctx.fillText('GROUND STATION',x,y+29*s);
      ctx.restore();
    }
    function satellite(p,label) {
      const s=p.s;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.scale(s,s);
      const halo=ctx.createRadialGradient(0,0,0,0,0,85);halo.addColorStop(0,'#90c7ff14');halo.addColorStop(1,'#90c7ff00');circle(0,0,85,halo);
      for(const side of [-1,1]) {
        const x=side<0?-62:21;
        const fill=ctx.createLinearGradient(x,-20,x+41,20);fill.addColorStop(0,'#3d7193');fill.addColorStop(.5,'#234b6d');fill.addColorStop(1,'#102d4b');
        ctx.fillStyle=fill;ctx.fillRect(x,-20,41,40);ctx.strokeStyle='#9bd0e8';ctx.lineWidth=1;ctx.strokeRect(x,-20,41,40);
        for(let i=1;i<4;i++)stroke([[x+i*10.25,-20],[x+i*10.25,20]],'#70a4d582',.65);
        for(let i=1;i<4;i++)stroke([[x,-20+i*10],[x+41,-20+i*10]],'#70a4d582',.65);
        ctx.fillStyle='#9cbdc9';ctx.fillRect(side<0?-22:12,-2,10,4);
      }
      const bus=ctx.createLinearGradient(-12,-13,12,15);bus.addColorStop(0,'#f4efcc');bus.addColorStop(.5,'#becbd0');bus.addColorStop(1,'#647f9f');
      ctx.fillStyle=bus;ctx.fillRect(-12,-14,24,28);ctx.strokeStyle='#e4f4f6';ctx.strokeRect(-12,-14,24,28);
      ctx.fillStyle='#425c72';ctx.fillRect(-6,-7,12,10);
      stroke([[0,14],[0,27]],'#d7ebeb',1.5);
      ctx.beginPath();ctx.ellipse(0,28,10,4,-.1,0,Math.PI);ctx.strokeStyle='#e9f5ee';ctx.lineWidth=1.3;ctx.stroke();
      stroke([[0,28],[4,34]],'#bce9de',1);
      circle(3,-18,2,'#cafff1');ctx.restore();
      ctx.font=`${Math.max(7,9*s)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#8eafb9';ctx.fillText(label,p.x,p.y+48*s);
    }
    function dish(g) {
      const {x,y,s}=g.receiver;
      ctx.save();ctx.translate(x,y);ctx.scale(s,s);
      stroke([[-17,1],[17,1]],'#a1cbd3',3);stroke([[0,0],[0,-23],[-8,-39]],'#809fac',3);
      ctx.save();ctx.translate(-4,-40);ctx.rotate(-.5);
      const metal=ctx.createLinearGradient(-22,-7,22,12);metal.addColorStop(0,'#e0f0ed');metal.addColorStop(1,'#557e94');
      ctx.beginPath();ctx.ellipse(0,0,25,10,0,0,Math.PI);ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#d7f3ef';ctx.lineWidth=1.3;ctx.stroke();
      stroke([[-19,2],[0,-17],[19,2]],'#adc9d4',1.2);circle(0,-17,2,'#adf4de');ctx.restore();
      ctx.font='8px monospace';ctx.fillStyle='#94bdc5';ctx.textAlign='center';ctx.fillText('EARTH / RECEIVE',0,28);ctx.restore();
    }
    const curve = (a,b,c,d,t) => ({x:(1-t)**3*a.x+3*(1-t)**2*t*b.x+3*(1-t)*t*t*c.x+t**3*d.x,y:(1-t)**3*a.y+3*(1-t)**2*t*b.y+3*(1-t)*t*t*c.y+t**3*d.y});
    function routes(g) {
      const {tip,a,b,end,scale:s}=g;
      return [
        [tip,{x:tip.x+28*s,y:tip.y-130*s},{x:a.x+80*s,y:a.y+110*s},a],
        [a,{x:a.x+85*s,y:a.y-75*s},{x:b.x-100*s,y:b.y-80*s},b],
        [b,{x:b.x+80*s,y:b.y+130*s},{x:end.x-55*s,y:end.y-155*s},end]
      ];
    }
    function path(route,color,alpha) {
      ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(route[0].x,route[0].y);ctx.bezierCurveTo(route[1].x,route[1].y,route[2].x,route[2].y,route[3].x,route[3].y);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
    }
    function packet(route,t,color,s) {
      if(t<0 || t>1)return;
      ctx.save();
      for(let i=12;i>=0;i--) {
        const tt=t-i*.008;if(tt<0)continue;
        const p=curve(...route,tt);ctx.globalAlpha=(1-i/13)*.8;circle(p.x,p.y,(i?1.4:3)*s,color);
      }
      const p=curve(...route,t),q=curve(...route,Math.min(1,t+.01));
      ctx.globalAlpha=1;ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(q.y-p.y,q.x-p.x));
      ctx.shadowBlur=12*s;ctx.shadowColor=color;ctx.fillStyle='#f0fff9';ctx.fillRect(-5*s,-1.6*s,8*s,3.2*s);ctx.restore();
    }
    function impact(point,age,color,s) {
      if(age<0 || age>.10)return;
      const p=age/.10;
      ctx.save();ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=color;ctx.lineWidth=1.5*s;
      for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(point.x,point.y,(8+p*47+i*10)*s,0,TAU);ctx.stroke();}
      if(p<.45){ctx.globalAlpha=(1-p/.45)*.9;circle(point.x,point.y,7*s,color);}
      ctx.restore();
    }
    function draw() {
      if(backdrop){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(backdrop,0,0);ctx.restore();}
      else{ctx.fillStyle='#04131e';ctx.fillRect(0,0,width,height);}
      const g=geometry(), links=routes(g), colors=['#64e2ed','#c3b6ff','#f2c789'];
      // Static guide paths remain present for reduced-motion users.
      links.forEach((r,i)=>path(r,colors[i],.19));
      // Slow orbital arcs sit behind the satellites.
      ctx.save();ctx.setLineDash([3,7]);ctx.strokeStyle='#87afc12b';ctx.lineWidth=.8;
      ctx.beginPath();ctx.ellipse(width*.79,height*(g.mobile?.60:.28),width*(g.mobile?.48:.29),height*.13,-.24,Math.PI*.9,Math.PI*2);ctx.stroke();ctx.restore();
      drawTower(g);satellite(g.a,'ORBITAL RELAY / 01');satellite(g.b,'ORBITAL RELAY / 02');dish(g);
      const phase=(elapsed%cycleDuration)/cycleDuration;
      // One complete, chronological cycle: no return packet until the relay is hit.
      if(phase<.36)for(let i=0;i<4;i++)packet(links[0],phase/.36-i*.035,colors[0],g.scale);
      else if(phase<.62)for(let i=0;i<4;i++)packet(links[1],(phase-.36)/.26-i*.035,colors[1],g.scale);
      else if(phase<.95)for(let i=0;i<4;i++)packet(links[2],(phase-.62)/.33-i*.035,colors[2],g.scale);
      impact(g.tip,phase,'#64e2ed',g.scale);
      impact(g.a,phase-.36,'#a0f2ff',g.scale);
      impact(g.b,phase-.62,'#d3c3ff',g.scale);
      impact(g.end,phase-.95,'#f2c789',g.scale);
      // A static position for each leg explains the route when motion is disabled.
      if(reduce.matches)links.forEach((r,i)=>packet(r,.55,colors[i],g.scale));
      const phaseName=phase<.36?'uplink':phase<.62?'relay':phase<.95?'downlink':'received';
      if(world.dataset.phase!==phaseName)world.dataset.phase=phaseName;
    }
    const running = () => !paused && !reduce.matches && !document.hidden && inPage;
    const frame = now => {
      raf=0;if(!running())return;
      if(!last)last=now;
      elapsed+=Math.min((now-last)/1000,.055);last=now;
      if(now-lastDraw>=32){scrollView+=(scrollTarget-scrollView)*.09;draw();lastDraw=now;}
      raf=requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf);raf=0;last=0;
      toggle.disabled=reduce.matches;
      toggle.setAttribute('aria-pressed',String(paused||reduce.matches));
      toggle.setAttribute('aria-label',reduce.matches?'Background animation disabled by reduced motion preference':paused?'Resume background animation':'Pause background animation');
      toggle.querySelector('[data-motion-label]').textContent=reduce.matches?'Still view':paused?'Resume background':'Pause background';
      toggle.querySelector('[data-motion-symbol]').textContent=paused||reduce.matches?'▷':'Ⅱ';
      world.dataset.animation=running()?'running':'paused';draw();
      if(running())raf=requestAnimationFrame(frame);
    };
    const resize = () => {
      const rect=world.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      dpr=Math.min(devicePixelRatio||1,width<=820?1.5:1.75);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);buildBackdrop();draw();
    };
    resize();world.classList.add('is-ready');toggle.hidden=false;
    toggle.addEventListener('click',()=>{paused=!paused;sync();});
    addEventListener('scroll',()=>{scrollTarget=Math.min(1,scrollY/Math.max(1,root.scrollHeight-innerHeight));if(!running())draw();},{passive:true});
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(world);else addEventListener('resize',resize);
    reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    addEventListener('pagehide',()=>{inPage=false;sync();});addEventListener('pageshow',()=>{inPage=true;sync();});
    sync();
  }

  const initialize = fn => {
    try { fn(); } catch (error) { console.warn(`TeamSpace: ${fn.name} unavailable`, error); }
  };
  const ready = splash();
  [scrollProgress, pointerEffects, feedback, networkHealth, carousel, orbitalNetwork].forEach(initialize);
  ready.then(() => [reveals, counters, signalWorld, videos].forEach(initialize));
})();
