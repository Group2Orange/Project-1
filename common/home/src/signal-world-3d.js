import * as T from 'three';

/* Procedural 3D telecom scene. No external textures or models: every map is generated here. */
const R = 260;                                  // Earth radius in scene units (illustrative)
const groundY = (x, z) => -R + Math.sqrt(R * R - x * x - z * z);
const v3 = (x, y, z) => new T.Vector3(x, y, z);
const tex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; return t;
};
const glowTex = () => tex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(.25, '#fffa'); r.addColorStop(1, '#fff0'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const ringTex = () => tex(128, 128, g => { g.strokeStyle = '#fff'; g.lineWidth = 5; g.shadowBlur = 8; g.shadowColor = '#fff'; g.beginPath(); g.arc(64, 64, 48, 0, 7); g.stroke(); });

export function create(canvas, opts = {}) {
  const weak = !!opts.weak;
  const renderer = new T.WebGLRenderer({ canvas, antialias: !weak, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x03101b, 1);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  let shadows = !weak; renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.fog = new T.FogExp2(0x061a28, .0042);
  const camera = new T.PerspectiveCamera(34, 1, .5, 2500);
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  /* ---------- environment (reflections) ---------- */
  {
    const env = new T.Scene();
    env.add(new T.Mesh(new T.SphereGeometry(50, 24, 12), new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y*.5+.5;gl_FragColor=vec4(mix(vec3(.01,.03,.05),vec3(.06,.14,.22),h),1.);}' })));
    const panel = (c, w, h, x, y, z) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel(0xdff4ff, 30, 18, -25, 30, 20); panel(0x35d6c6, 8, 40, 38, 8, -10); panel(0xffd9a0, 10, 6, 10, 20, -35); panel(0x90b8ff, 40, 4, 0, 44, 0);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .03).texture; scene.environmentIntensity = .75; pm.dispose();
  }

  /* ---------- lights ---------- */
  scene.add(new T.HemisphereLight(0x5a88a8, 0x06121b, .55));
  const key = new T.DirectionalLight(0xcfe9ff, 2.4); key.position.set(-30, 46, 26); key.target.position.set(10, 6, -6);
  key.castShadow = shadows; key.shadow.mapSize.set(weak ? 1024 : 2048, weak ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -34, right: 34, top: 30, bottom: -20, near: 5, far: 140 }); key.shadow.bias = -.0004; key.shadow.normalBias = .04;
  scene.add(key, key.target);
  const rim = new T.DirectionalLight(0x38d9c8, 1.1); rim.position.set(40, 14, -40); scene.add(rim);

  /* ---------- sky, stars, Earth, atmosphere ---------- */
  const sky = new T.Mesh(new T.SphereGeometry(1800, 24, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float h=clamp(normalize(p).y,0.,1.);vec3 c=mix(vec3(.035,.13,.17),vec3(.012,.05,.09),smoothstep(0.,.35,h));c=mix(c,vec3(.006,.02,.04),smoothstep(.3,1.,h));gl_FragColor=vec4(c,1.);}' }));
  scene.add(sky);
  { const n = weak ? 350 : 800, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 6.283, y = .05 + Math.random() * .95, r = Math.sqrt(1 - y * y) * 1700; a.set([Math.cos(u) * r, y * 1700, Math.sin(u) * r], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(a, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xc9faff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: .6, fog: false, depthWrite: false }))); }

  const groundMap = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#0b2230'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${20 + Math.random() * 30},${50 + Math.random() * 40},${60 + Math.random() * 30},.16)`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 22, 2 + Math.random() * 12); }
    g.strokeStyle = 'rgba(90,190,190,.10)'; g.lineWidth = 1; for (let i = 0; i <= 32; i++) { g.beginPath(); g.moveTo(i * w / 32, 0); g.lineTo(i * w / 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 16); g.lineTo(w, i * h / 16); g.stroke(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,214,150,${.25 + Math.random() * .4})`; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
  });
  groundMap.wrapS = groundMap.wrapT = T.RepeatWrapping; groundMap.anisotropy = aniso; groundMap.repeat.set(5, 1.2);
  const cap = (r, m) => { const e = new T.Mesh(new T.SphereGeometry(r, weak ? 64 : 128, 40, 0, 6.2832, 0, .62), m); e.position.y = -R; return e; };
  const earth = cap(R, new T.MeshStandardMaterial({ map: groundMap, color: 0xb8d4dc, roughness: .88, metalness: .08 })); earth.receiveShadow = true; scene.add(earth);
  const haze = cap(R + 5, new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 m=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-m.xyz);gl_Position=projectionMatrix*m;}',
    fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),3.2);gl_FragColor=vec4(vec3(.12,.5,.6)*f*.45,f*.6);}' })); scene.add(haze);

  /* ---------- materials ---------- */
  const steel = new T.MeshStandardMaterial({ color: 0x9fb0b8, metalness: .85, roughness: .38 });
  const darkSteel = new T.MeshStandardMaterial({ color: 0x3b4b55, metalness: .8, roughness: .45 });
  const white = new T.MeshStandardMaterial({ color: 0xe3ecee, metalness: .35, roughness: .38, side: T.DoubleSide });
  const concrete = new T.MeshStandardMaterial({ color: 0x4b5d66, metalness: .05, roughness: .9 });
  const foil = tex(256, 256, (g, w) => { g.fillStyle = '#b89a55'; g.fillRect(0, 0, w, w); for (let i = 0; i < 700; i++) { const l = 60 + Math.random() * 90; g.strokeStyle = `hsla(40,45%,${l / 2.2}%,.35)`; g.beginPath(); const x = Math.random() * w, y = Math.random() * w; g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 50, y + (Math.random() - .5) * 50); g.stroke(); } });
  foil.wrapS = foil.wrapT = T.RepeatWrapping;
  const gold = new T.MeshStandardMaterial({ map: foil, bumpMap: foil, bumpScale: 1.4, color: 0xffffff, metalness: .9, roughness: .34 });
  const cells = tex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16407c'); gr.addColorStop(.5, '#0d2a58'); gr.addColorStop(1, '#122f63'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(170,200,225,.55)'; g.lineWidth = 1.5; for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo(i * w / 12, h); g.stroke(); } for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(0, j * h / 6); g.lineTo(w, j * h / 6); g.stroke(); }
    g.strokeStyle = 'rgba(210,225,235,.9)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  }); cells.anisotropy = aniso;
  const solar = new T.MeshStandardMaterial({ map: cells, metalness: .65, roughness: .26 });
  const panelBack = new T.MeshStandardMaterial({ color: 0x8c9aa2, metalness: .5, roughness: .5 });
  const glowMap = glowTex(), ringMap = ringTex();
  const glow = (color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowMap, color, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s; };
  const mesh = (geo, mat, parent, shadow = true) => { const m = new T.Mesh(geo, mat); m.castShadow = shadow && shadows; m.receiveShadow = shadows; parent?.add(m); return m; };

  /* parabolic dish opening toward local +Z; returns group (aim with lookAt) */
  const dishGeo = (r, depth) => { const p = []; for (let i = 0; i <= 14; i++) { const x = r * i / 14; p.push(new T.Vector2(x, depth * (x / r) ** 2)); } const g = new T.LatheGeometry(p, 40); g.rotateX(Math.PI / 2); return g; };
  function makeDish(r, parent, rim = true) {
    const d = new T.Group(), depth = r * .32;
    mesh(dishGeo(r, depth), white, d);
    if (rim) { const t = mesh(new T.TorusGeometry(r, r * .025, 6, 40), steel, d); t.position.z = depth; }
    mesh(new T.CylinderGeometry(r * .018, r * .018, depth * 2.6, 6).rotateX(Math.PI / 2), darkSteel, d).position.z = depth * 1.4;
    mesh(new T.CylinderGeometry(r * .08, r * .1, r * .2, 10).rotateX(Math.PI / 2), darkSteel, d).position.z = depth * 2.7;
    parent.add(d); return d;
  }

  /* ---------- lattice tower ---------- */
  const TX = 2, TZ = 0, TH = 19, towerBase = v3(TX, groundY(TX, TZ), TZ);
  const tower = new T.Group(); tower.position.copy(towerBase); scene.add(tower);
  const halfAt = y => 2.7 - 2.1 * Math.pow(y / TH, .85);
  { const segs = 12, ends = [], pt = (y, i) => { const h = halfAt(y), s = [[1, 1], [-1, 1], [-1, -1], [1, -1]][i % 4]; return v3(s[0] * h, y, s[1] * h); };
    for (let i = 0; i < 4; i++) ends.push([pt(0, i), pt(TH, i)]);
    for (let k = 0; k < segs; k++) { const y0 = TH * k / segs, y1 = TH * (k + 1) / segs;
      for (let i = 0; i < 4; i++) { ends.push([pt(y0, i), pt(y0, i + 1)]); ends.push([pt(y0, i), pt(y1, i + 1)], [pt(y0, i + 1), pt(y1, i)]); } }
    const inst = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 5), steel, ends.length), m = new T.Matrix4(), q = new T.Quaternion(), up = v3(0, 1, 0);
    ends.forEach(([a, b], i) => { const d = b.clone().sub(a), len = d.length(), leg = i < 4, w = leg ? .09 : .04;
      q.setFromUnitVectors(up, d.normalize()); m.compose(a.clone().add(b).multiplyScalar(.5), q, v3(w, len, w)); inst.setMatrixAt(i, m); });
    inst.castShadow = shadows; inst.receiveShadow = shadows; tower.add(inst); }
  mesh(new T.CylinderGeometry(.07, .12, 4.4, 8), steel, tower).position.y = TH + 1.9;          // mast
  const deck = mesh(new T.CylinderGeometry(1.15, 1.15, .1, 20), darkSteel, tower); deck.position.y = TH - 1.2;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5, p = new T.Group(); p.position.set(Math.cos(a) * 1.15, TH - .2, Math.sin(a) * 1.15); p.rotation.y = -a + Math.PI / 2;
    mesh(new T.BoxGeometry(.22, 2, .1), white, p); mesh(new T.BoxGeometry(.05, .05, .35), darkSteel, p).position.set(0, .4, -.2); tower.add(p); }
  const mw = mesh(new T.CylinderGeometry(.05, .05, .5, 6), darkSteel, tower); mw.position.set(.5, TH * .62, 1.3);
  const mwDish = makeDish(.65, tower); mwDish.position.set(.0, TH * .62, 1.05); mwDish.rotation.y = -.5;
  const bars = []; // cable ladder and warning lights
  { const pts = [v3(0, TH - 1.2, 1.1), v3(.4, TH * .6, halfAt(TH * .6) + .25), v3(.9, 3, halfAt(3) + .5), v3(3.5, .3, 3.2)];
    mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .035, 5), new T.MeshStandardMaterial({ color: 0x101a20, roughness: .6, metalness: .3 }), tower); }
  const beacons = [[0, TH + 4.2, 0], [0, TH * .5, 0], [halfAt(TH * .3), TH * .3, halfAt(TH * .3)]].map(p => {
    const s = glow(0xff4a3a, .9, .9), c = mesh(new T.SphereGeometry(.07, 8, 6), new T.MeshBasicMaterial({ color: 0xff5a4a }), tower, false); s.position.set(...p); c.position.set(...p); tower.add(s); return s; });
  mesh(new T.CylinderGeometry(3.3, 3.6, .25, 28), concrete, tower).position.y = .05;
  [[3.4, 3.4], [-3, 3.6]].forEach(([x, z]) => { const b = mesh(new T.BoxGeometry(1.6, 1.1, 1), darkSteel, tower); b.position.set(x, .6, z) });

  /* ---------- ground station (transmitting dish) ---------- */
  const gsPos = v3(11, 0, 8); gsPos.y = groundY(gsPos.x, gsPos.z);
  const gs = new T.Group(); gs.position.copy(gsPos); scene.add(gs);
  mesh(new T.CylinderGeometry(2.8, 3.1, .22, 28), concrete, gs).position.y = .05;
  mesh(new T.CylinderGeometry(.34, .5, 2.4, 12), steel, gs).position.y = 1.3;
  const yoke = new T.Group(); yoke.position.y = 2.7; gs.add(yoke);
  mesh(new T.BoxGeometry(.5, .35, .5), darkSteel, yoke);
  const gsDish = makeDish(2.1, yoke); const gsBuilding = mesh(new T.BoxGeometry(2.6, 1.3, 1.7), concrete, gs); gsBuilding.position.set(3.6, .8, 1);
  mesh(new T.BoxGeometry(2.7, .08, 1.8), steel, gs).position.set(3.6, 1.48, 1);
  const gsFeed = new T.Object3D(); gsFeed.position.set(0, 0, 2.1 * .32 * 2.7); gsDish.add(gsFeed);

  /* ---------- receiving ground station ---------- */
  const rxPos = v3(31, 0, -14); rxPos.y = groundY(rxPos.x, rxPos.z);
  const rx = new T.Group(); rx.position.copy(rxPos); scene.add(rx);
  mesh(new T.CylinderGeometry(2.1, 2.3, .2, 24), concrete, rx).position.y = .05;
  mesh(new T.CylinderGeometry(.22, .34, 1.7, 10), steel, rx).position.y = .95;
  const rxYoke = new T.Group(); rxYoke.position.y = 1.9; rx.add(rxYoke); const rxDish = makeDish(1.45, rxYoke);
  mesh(new T.BoxGeometry(1.8, .9, 1.2), darkSteel, rx).position.set(-2.6, .55, .5);
  const rxBeacon = glow(0x80ffe0, .7, .5); rxBeacon.position.set(-2.6, 1.15, .5); rx.add(rxBeacon);

  /* ---------- satellites ---------- */
  function makeSat(scale, big) {
    const s = new T.Group(), body = new T.Group(); s.add(body); s.scale.setScalar(scale);
    mesh(new T.BoxGeometry(1.6, 1.5, 2.2), gold, body);
    const rad = mesh(new T.BoxGeometry(1.7, .08, 2.3), steel, body); rad.position.y = .8;
    mesh(new T.BoxGeometry(.9, .5, .9), darkSteel, body).position.set(0, -.95, -.2);
    for (const sx of [-1, 1]) { mesh(new T.CylinderGeometry(.05, .05, 2.4, 6).rotateZ(Math.PI / 2), steel, body).position.set(sx * 1.9, 0, 0);
      const wing = new T.Group(); wing.position.x = sx * 1.4; body.add(wing); (s.userData.wings ||= []).push(wing);
      for (let k = 0; k < 3; k++) { const p = new T.Group(); p.position.x = sx * (.35 + k * 2.15); const f = mesh(new T.BoxGeometry(2, .05, 1.7), panelBack, p), fr = new T.Mesh(new T.PlaneGeometry(2, 1.7), solar); fr.rotation.x = -Math.PI / 2; fr.position.y = .031; p.add(fr); wing.add(p); } }
    for (const [x, z] of [[-.6, 1.12], [.6, 1.12], [-.6, -1.12], [.6, -1.12]]) mesh(new T.ConeGeometry(.1, .22, 8), darkSteel, body).position.set(x, -.7, z);
    const d1 = makeDish(big ? .95 : .7, body); d1.position.set(-.35, -.2, 1.3);                 // link toward first target
    const d2 = makeDish(big ? .7 : .5, body); d2.position.set(.45, .1, -1.35);                  // link toward second target
    mesh(new T.CylinderGeometry(.015, .015, 1.2, 4), white, body).position.set(.6, 1.3, .5);
    const led = glow(0x7ffff0, .55, .0); led.position.set(0, 1.0, 1.15); body.add(led);
    s.userData.d1 = d1; s.userData.d2 = d2; s.userData.led = led; s.userData.body = body; return s;
  }
  const satA = makeSat(2.1, true), satB = makeSat(1.7, false); scene.add(satA, satB);
  const posA = v3(), posB = v3();
  const orbit = t => { posA.set(19 + Math.sin(t * .09) * 3.4, 21 + Math.sin(t * .12) * .9, -28 + Math.cos(t * .09) * 3); posB.set(40 + Math.cos(t * .07) * 2.5, 15 + Math.sin(t * .1) * 1.2, -50 + Math.sin(t * .07) * 4); satA.position.copy(posA); satB.position.copy(posB); };

  /* ---------- signal paths, packets, pulses ---------- */
  const COLORS = [0x64e2ed, 0xb9b0ff, 0xf2c789];
  const legs = [0, 1, 2].map(i => {
    const curve = new T.QuadraticBezierCurve3(v3(), v3(), v3()), N = 56, geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
    const line = new T.Line(geo, new T.LineDashedMaterial({ color: COLORS[i], transparent: true, opacity: .24, dashSize: .8, gapSize: .6, depthWrite: false, fog: false })); line.frustumCulled = false; scene.add(line);
    const packets = Array.from({ length: 4 }, () => { const g = new T.Group(); g.add(new T.Mesh(new T.BoxGeometry(.5, .16, .16), new T.MeshBasicMaterial({ color: 0xeafffa, toneMapped: false }))); g.add(glow(COLORS[i], 1.5, .7)); g.visible = false; scene.add(g); return g; });
    return { curve, line, geo, N, packets };
  });
  const pulse = (color, size) => { const s = new T.Sprite(new T.SpriteMaterial({ map: ringMap, color, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.userData.size = size; scene.add(s); return s; };
  const pulses = { tx: pulse(COLORS[0], 4), a: pulse(0xa0f2ff, 7), b: pulse(0xd3c3ff, 6), rx: pulse(0xf2c789, 6) };
  const confirmGlow = glow(0xfff0c8, 3, 0); scene.add(confirmGlow);
  const showPulse = (s, pos, age, win = .1) => { const k = age / win, on = k >= 0 && k <= 1; s.material.opacity = on ? (1 - k) * .55 : 0; if (on) { s.position.copy(pos); s.scale.setScalar(.6 * s.userData.size * (.35 + k)); } };

  function setLeg(l, a, b, lift) {
    l.curve.v0.copy(a); l.curve.v2.copy(b); l.curve.v1.copy(a).lerp(b, .5).y += lift;
    const p = l.geo.attributes.position; for (let i = 0; i < l.N; i++) l.curve.getPoint(i / (l.N - 1), tmp), p.setXYZ(i, tmp.x, tmp.y, tmp.z);
    p.needsUpdate = true; l.line.computeLineDistances();
  }
  const tmp = v3(), tmp2 = v3(), tmp3 = v3();
  const THR = { up: .36, rel: .62, down: .95 };
  /* Radio waves leaving each relay satellite: expanding wavefronts that follow the signal path, plus soft omni rings. */
  const WN = 6, addMat = (c, o = 0) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  const ringGeo = new T.RingGeometry(.86, 1, 64), discGeo = new T.CircleGeometry(.86, 40);
  const makeTx = (leg, color, r, a, b, sat) => ({ leg, r, a, b, sat, color,
    waves: Array.from({ length: WN }, () => { const g = new T.Group(), ring = new T.Mesh(ringGeo, addMat(color)), disc = new T.Mesh(discGeo, addMat(color)); g.add(ring, disc); g.userData = { ring, disc }; g.visible = false; scene.add(g); return g; }),
    omni: [0, 1].map(() => { const sp = pulse(color, 1); sp.material.opacity = 0; return sp; }) });
  const txs = [];
  // The tower's microwave dish also beams waves up into the sky toward satellite 1 (straight beam), and the antenna crown emits soft rings.
  const towerLeg = { curve: new T.QuadraticBezierCurve3(v3(), v3(), v3()) };
  const towerTop = { position: tower.position.clone().add(v3(0, TH + 1.5, 0)), scale: { x: 1.3 } };
  { const t = makeTx(towerLeg, COLORS[0], .7, 0, THR.up, towerTop); txs.push(t); }
  function updateWaves(elapsed, p, still) {
    txs.forEach((tx, n) => {
      const act = p >= tx.a && p <= tx.b ? Math.sin((p - tx.a) / (tx.b - tx.a) * Math.PI) : 0, str = .16 + .36 * Math.min(1, act * 1.6);
      const len = tx.leg.curve.v0.distanceTo(tx.leg.curve.v2);
      tx.waves.forEach((w, i) => {
        const k = still ? (i + .5) / WN : (elapsed * .3 + i / WN + n * .37) % 1, t = .03 + k * .55, op = str * (1 - k) ** 1.3 * Math.min(1, k * 8);
        tx.leg.curve.getPoint(t, w.position); tx.leg.curve.getPoint(t + .012, tmp2); w.lookAt(tmp2);
        w.scale.setScalar(tx.r + t * len * .14); w.userData.ring.material.opacity = op; w.userData.disc.material.opacity = op * .12; w.visible = op > .005;
      });
      tx.omni.forEach((sp, j) => {
        const k = still ? .3 + j * .4 : (elapsed * .22 + j * .5 + n * .3) % 1;
        sp.position.copy(tx.sat.position); sp.scale.setScalar(tx.sat.scale.x * (2 + k * 9)); sp.material.opacity = (1 - k) ** 1.6 * (.16 + .2 * act);
      });
    });
  }
  function runPacket(l, h, still) {
    l.packets.forEach((g, i) => {
      let t = still ? (i === 1 ? .55 : -1) : h * 1.15 - i * .05; const on = t > 0 && t < 1; g.visible = on; if (!on) return;
      l.curve.getPoint(t, g.position); l.curve.getPoint(Math.min(1, t + .01), tmp2); g.lookAt(tmp2);
      g.scale.setScalar(Math.min(1, (1 - t) * 8, t * 10) * .9 + .1);
    });
  }

  /* ---------- camera framing ---------- */
  const view = { w: 1, h: 1, mobile: false, dist: 60 };
  const target = v3(18, 10.5, -14), dir = v3(-.12, .13, 1).normalize(), look = v3(), offs = v3();
  function resize(w, h, dpr) {
    view.w = w; view.h = h; view.mobile = w / h < .9 || w <= 820;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = view.mobile ? 42 : 34;
    const wantW = view.mobile ? 58 : 58, region = view.mobile ? 1 : .56;              // scene width / share of the screen it may use
    view.dist = Math.max(55, (wantW / 2 / region) / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    camera.updateProjectionMatrix();
  }
  function updateCamera(px, py, sc) {
    const m = view.mobile;
    target.set(m ? 18 : 18, m ? 15 : 10.5 + sc * 3, -14);
    look.copy(target); offs.copy(dir).multiplyScalar(view.dist);
    camera.position.copy(look).add(offs); camera.position.x += px * 2.4 + sc * 4; camera.position.y += -py * 1.4 + sc * 2.5;
    camera.lookAt(look);
    // shift scene right (desktop) or into the lower part (mobile) so hero copy stays clear
    const sx = m ? 0 : .16, sy = m ? .27 : 0;
    camera.setViewOffset(view.w, view.h, -sx * view.w, -sy * view.h, view.w, view.h);
  }

  /* ---------- per-frame update ---------- */
  let phase = 'uplink';
  function update({ elapsed, px = 0, py = 0, scroll = 0, still = false, cycle = 10 }) {
    orbit(elapsed);
    satA.userData.wings.forEach(w => { w.rotation.x = Math.sin(elapsed * .1) * .25; });
    satB.userData.wings.forEach(w => { w.rotation.x = Math.cos(elapsed * .1) * .25; });
    satA.rotation.y = Math.sin(elapsed * .06) * .25; satB.rotation.y = Math.cos(elapsed * .05) * .3 + .6;
    satA.updateMatrixWorld(true); satB.updateMatrixWorld(true);
    // aim every dish at its target
    gsDish.lookAt(posA); rxDish.lookAt(posB);
    satA.userData.d1.lookAt(gsPos.x, gsPos.y + 4, gsPos.z); satA.userData.d2.lookAt(posB);
    satB.userData.d1.lookAt(posA); satB.userData.d2.lookAt(rxPos.x, rxPos.y + 2, rxPos.z);
    gsDish.updateWorldMatrix(true, true);
    const gsTip = gsFeed.getWorldPosition(tmp3).clone(), rxTip = rxDish.getWorldPosition(tmp3).clone().add(v3(0, .3, 0));
    const aTx = satA.userData.d2.getWorldPosition(v3()), bTx = satB.userData.d2.getWorldPosition(v3());
    setLeg(legs[0], gsTip, satA.userData.d1.getWorldPosition(v3()), 7);
    setLeg(legs[1], aTx, satB.userData.d1.getWorldPosition(v3()), 4);
    setLeg(legs[2], bTx, rxTip, 9);
    const p = (elapsed % cycle) / cycle;
    runPacket(legs[0], p / THR.up, still); runPacket(legs[1], (p - THR.up) / (THR.rel - THR.up), still); runPacket(legs[2], (p - THR.rel) / (THR.down - THR.rel), still);
    if (still) { Object.values(pulses).forEach(s => s.material.opacity = 0); confirmGlow.material.opacity = 0; satA.userData.led.material.opacity = satB.userData.led.material.opacity = 0; }
    else {
      showPulse(pulses.tx, gsTip, p, .09); showPulse(pulses.a, posA, p - THR.up); showPulse(pulses.b, posB, p - THR.rel);
      showPulse(pulses.rx, tmp.copy(rxTip).add(v3(0, 1, 0)), p - THR.down, .1);
      const flash = (age, w) => age >= 0 && age < w ? Math.sin(age / w * Math.PI) * .9 : 0;
      satA.userData.led.material.opacity = flash(p - THR.up, .08); satB.userData.led.material.opacity = flash(p - THR.rel, .08);
      confirmGlow.position.copy(rxTip); confirmGlow.material.opacity = flash(p - THR.down, .06) * .6;
    }
    beacons.forEach((b, i) => b.material.opacity = still ? .7 : .25 + .75 * Math.max(0, Math.sin(elapsed * 2.1 + i * 1.7)) ** 3);
    rxBeacon.material.opacity = still ? .4 : .25 + .25 * Math.sin(elapsed * 3);
    [[mwDish, posA, towerLeg]].forEach(([d, tgt, lg]) => {
      d.lookAt(tgt); d.updateWorldMatrix(true, false); d.getWorldPosition(lg.curve.v0);
      lg.curve.v0.add(tmp.set(0, 0, .5).applyQuaternion(d.getWorldQuaternion(new T.Quaternion()))); lg.curve.v2.copy(tgt); lg.curve.v1.lerpVectors(lg.curve.v0, tgt, .5);
    });
    updateWaves(elapsed, p, still);
    phase = p < THR.up ? 'uplink' : p < THR.rel ? 'relay' : p < THR.down ? 'downlink' : 'received';
    updateCamera(px, py, scroll);
    return phase;
  }
  const render = () => renderer.render(scene, camera);
  const setShadows = on => { if (shadows === on) return; shadows = on; renderer.shadowMap.enabled = on; key.castShadow = on; scene.traverse(o => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = o.castShadow && on; if (o.material) o.material.needsUpdate = true; } }); };
  const dispose = () => { scene.traverse(o => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose(); x.dispose(); }); }); renderer.dispose(); };
  return { renderer, resize, update, render, setShadows, dispose };
}