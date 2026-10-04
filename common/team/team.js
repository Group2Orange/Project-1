(() => {
  const units = Array.from(document.querySelectorAll('.unit'));
  const fronts = units.map(u => u.querySelector('.front'));

  function setOpen(unit, open) {
    unit.classList.toggle('open', open);
    unit.querySelector('.front').setAttribute('aria-expanded', open);
  }

  // Only one drawer open at a time
  function toggle(unit) {
    const willOpen = !unit.classList.contains('open');
    units.forEach(u => setOpen(u, u === unit && willOpen));
  }

  fronts.forEach((btn, i) => {
    btn.addEventListener('click', () => toggle(units[i]));
    btn.addEventListener('keydown', e => {
      const move = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); fronts[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); fronts[fronts.length - 1].focus(); }
      if (move) { e.preventDefault(); fronts[(i + move + fronts.length) % fronts.length].focus(); }
    });
  });

  // Hide broken photos so the "Add Photo" placeholder shows
  document.querySelectorAll('.photo img').forEach(img => {
    // "this" is the <img> that failed to load.
    img.addEventListener('error', function () {
      this.removeAttribute('src');
    });
  });

  // Cables: SVG patch cables that plug into drawer fronts and follow them as drawers open
  const NS = 'http://www.w3.org/2000/svg';
  const rack = document.querySelector('.rack');
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const CABLE_COLORS = ['#17a2ae', '#8795ab', '#10b981', '#d7e0e8', '#0E7C86']; // edit freely

  const svg = el('svg', { class: 'cables', 'aria-hidden': 'true' }, rack);
  const grad = el('linearGradient', { id: 'plugMetal', x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
  const stops = [
    { offset: '0', color: '#eef3f7' },
    { offset: '.5', color: '#aab9c6' },
    { offset: '1', color: '#6f8396' }
  ];
  stops.forEach(stop => el('stop', { offset: stop.offset, 'stop-color': stop.color }, grad));

  const makePlug = parent => {
    const g = el('g', { class: 'plug' }, parent);
    el('rect', { class: 'plug-socket', x: -3, y: -8, width: 5, height: 16, rx: 2 }, g);
    el('rect', { class: 'plug-body', x: -2, y: -6, width: 14, height: 12, rx: 2 }, g);
    el('rect', { class: 'plug-boot', x: 11, y: -5, width: 9, height: 10, rx: 3 }, g);
    el('circle', { class: 'plug-led', cx: 6, cy: 0, r: 1.6 }, g);
    return g;
  };

  const cables = units.slice(0, -1).map((_, i) => {
    const dir = i % 2 ? -1 : 1; // alternate right / left side of the rack
    const g = el('g', { class: 'cable', style: `--c:${CABLE_COLORS[i % CABLE_COLORS.length]}` }, svg);
    const sway = el('g', { class: 'sway ' + (dir > 0 ? 'r' : 'l'), style: `animation-delay:${-i * 1.7}s` }, g);
    const paths = ['c-shadow', 'c-under', 'c-body', 'c-rib', 'c-hi', 'c-pulse'].map(cls => {
      const p = el('path', { class: cls }, sway);
      if (cls === 'c-pulse') {
        p.setAttribute('pathLength', 100);
        p.style.animationDuration = (2.6 + (i % 3) * 0.7) + 's';
        p.style.animationDelay = (-i * 0.9) + 's';
      }
      return p;
    });
    return { dir: dir, paths: paths, plugA: makePlug(g), plugB: makePlug(g) };
  });

  const offsetIn = node => { // position relative to the rack, ignoring CSS transforms
    let x = 0, y = 0;
    while (node && node !== rack) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x: x, y: y };
  };

  function renderCables() {
    const s = rack.clientWidth < 520 ? 0.6 : 1;
    svg.setAttribute('width', rack.clientWidth);
    svg.setAttribute('height', rack.clientHeight);
    svg.style.setProperty('--w', 6 * s);
    cables.forEach((cable, i) => {
      const dir = cable.dir;
      const a = fronts[i], b = fronts[i + 1];
      const pa = offsetIn(a), pb = offsetIn(b);
      const edge = dir > 0 ? pa.x + a.offsetWidth : pa.x;
      const y0 = pa.y + a.offsetHeight * 0.7;
      const y1 = pb.y + b.offsetHeight * 0.3;
      const xs = edge + dir * 19 * s;
      const reach = (24 + Math.min(26, (y1 - y0) * 0.05)) * s * 1.33;
      const xc = xs + dir * reach;
      const d = `M${xs},${y0} C${xc},${y0 + 4} ${xc},${y1 - 4} ${xs},${y1}`;
      cable.paths.forEach(p => p.setAttribute('d', d));
      cable.plugA.setAttribute('transform', `translate(${edge},${y0}) scale(${dir * s},${s})`);
      cable.plugB.setAttribute('transform', `translate(${edge},${y1}) scale(${dir * s},${s})`);
    });
  }
  new ResizeObserver(renderCables).observe(rack.querySelector('.units')); // fires while drawers animate
  new ResizeObserver(renderCables).observe(rack);
  renderCables();

  // Staggered entrance on scroll
  units.forEach((u, i) => u.style.setProperty('--i', i));
  const reveal = () => {
    rack.classList.add('in');
    setTimeout(() => setOpen(units[0], true), 900 + units.length * 90);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { io.disconnect(); reveal(); }
    }, { threshold: 0.15 });
    io.observe(rack);
  } else {
    reveal();
  }
})();