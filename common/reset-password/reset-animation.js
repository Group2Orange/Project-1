/* =========================================================
   RESET PASSWORD — TELECOM AUTHENTICATION PIPELINE
   Observes the existing form only. Never modifies its logic.
   Fibers dynamically anchor to the real card position.
   ========================================================= */

(function () {
    'use strict';

    /* ---------- 1. Grab existing elements (read-only) ---------- */
    const form       = document.getElementById('reset-password-form');
    const newPwd     = document.getElementById('new-password');
    const confirmPwd = document.getElementById('confirm-password');
    const errorBox   = document.getElementById('password-error');

    if (!form || !newPwd || !confirmPwd) return;

    /* ---------- 2. Find the card ---------- */
    const card =
        document.querySelector('.reset-container') ||
        document.querySelector('.reset-card') ||
        document.querySelector('.card') ||
        form.closest('div');

    /* ---------- 3. Build the stage ---------- */
    const stage = document.createElement('div');
    stage.className = 'tm-stage';
    stage.setAttribute('aria-hidden', 'true');

    /* Rack layout (%) — 3 racks in a balanced triangle around the card.
       All three fully visible inside the viewport (no clipping). */
    const RACKS = [
        { id: 'AUTH-01',   x: 66, y: 22, state: 'AUTH'    },
        { id: 'CRYPT-02',  x: 88, y: 50, state: 'AES'     },
        { id: 'VAULT-03',  x: 66, y: 72, state: 'STORE'   }
    ];

    stage.innerHTML = `
        <svg class="tm-fiber-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g id="tm-fiber-group"></g>
        </svg>

        ${RACKS.map((r, i) => `
            <div class="tm-rack tm-rack--r${i}" style="left:${r.x}%; top:${r.y}%">
                <div class="tm-rack__head">
                    <span class="tm-rack__name">${r.id}</span>
                    <span class="tm-rack__state">${r.state}</span>
                </div>
                ${Array.from({ length: 6 }).map((_, j) => `
                    <div class="tm-rack__unit">
                        <span class="tm-unit__label">U${String(j + 1).padStart(2, '0')}</span>
                        <div class="tm-unit__leds">
                            <i class="tm-led"></i><i class="tm-led"></i><i class="tm-led"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div class="tm-hud">
            <div class="tm-hud__item"><span class="tm-hud__key">LINK</span><span class="tm-hud__val" id="tm-hud-link">IDLE</span></div>
            <div class="tm-hud__item"><span class="tm-hud__key">RATE</span><span class="tm-hud__val" id="tm-hud-rate">0 KB/S</span></div>
            <div class="tm-hud__item"><span class="tm-hud__key">CIPHER</span><span class="tm-hud__val">AES-256-GCM</span></div>
            <div class="tm-hud__item"><span class="tm-hud__key">PKT</span><span class="tm-hud__val" id="tm-hud-pkt">0</span></div>
            <div class="tm-hud__item"><span class="tm-hud__key">STATE</span><span class="tm-hud__val" id="tm-hud-state">SECURE</span></div>
        </div>
    `;

    document.body.insertBefore(stage, document.body.firstChild);

    /* ---------- 4. Inject badge + corners into the card ---------- */
    if (card) {
        const cs = getComputedStyle(card);
        if (cs.position === 'static') card.style.position = 'relative';

        const badge = document.createElement('div');
        badge.className = 'tm-core-badge';
        badge.innerHTML = `
            <span class="tm-core-badge__dot"></span>
            <span id="tm-core-text">AUTH CORE · STANDBY</span>
        `;
        card.appendChild(badge);

        const corners = document.createElement('div');
        corners.className = 'tm-corners';
        corners.innerHTML = `
            <span class="tm-corner tm-corner--tl"></span>
            <span class="tm-corner tm-corner--tr"></span>
            <span class="tm-corner tm-corner--bl"></span>
            <span class="tm-corner tm-corner--br"></span>
        `;
        card.appendChild(corners);
    }

    const coreText = document.getElementById('tm-core-text');
    const hudLink  = document.getElementById('tm-hud-link');
    const hudRate  = document.getElementById('tm-hud-rate');
    const hudPkt   = document.getElementById('tm-hud-pkt');
    const hudState = document.getElementById('tm-hud-state');

    /* ---------- 5. Dynamic fiber anchoring ---------- */
    const fiberGroup = document.getElementById('tm-fiber-group');
    let fibers       = [];
    let CORE_PX      = { x: 0, y: 0 };
    let CORE_PCT     = { x: 30, y: 50 };

    function vwPct(v) { return (v / 100) * window.innerWidth; }
    function vhPct(v) { return (v / 100) * window.innerHeight; }

    function measureCore() {
        if (card) {
            const rect = card.getBoundingClientRect();
            CORE_PX  = { x: rect.right, y: rect.top + rect.height / 2 };
            CORE_PCT = {
                x: (CORE_PX.x / window.innerWidth) * 100,
                y: (CORE_PX.y / window.innerHeight) * 100
            };
        } else {
            CORE_PX  = { x: vwPct(30), y: vhPct(50) };
            CORE_PCT = { x: 30, y: 50 };
        }
    }

    function buildFibers() {
        measureCore();
        fiberGroup.innerHTML = '';

        const paths = RACKS.map((r, i) => {
            const startX = r.x;
            const startY = r.y;
            const endX   = CORE_PCT.x;
            const endY   = CORE_PCT.y;

            const midX = startX + (endX - startX) * 0.55;
            const midY = startY + (endY - startY) * 0.35;

            const lane = (i - (RACKS.length - 1) / 2) * 2.2;

            const cx = midX;
            const cy = midY + lane;

            const d = `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`;
            return `<path id="tm-fiber-${i}" class="tm-fiber" d="${d}" />`;
        }).join('');

        fiberGroup.innerHTML = paths;
        fibers = RACKS.map((_, i) => document.getElementById(`tm-fiber-${i}`));

        applyFiberState();
    }

    let currentFiberClass = null;

    function applyFiberState() {
        fibers.forEach(f => {
            if (!f) return;
            f.classList.remove('is-active', 'is-verifying', 'is-success', 'is-error');
            if (currentFiberClass) f.classList.add(currentFiberClass);
        });
    }

    function setFibers(cls) {
        currentFiberClass = cls;
        applyFiberState();
    }

    /* Initial build */
    buildFibers();

    /* Rebuild on resize (debounced) */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildFibers, 120);
    });

    /* Rebuild if the card resizes (e.g. success scale) */
    if (card) {
        const ro = new ResizeObserver(() => buildFibers());
        ro.observe(card);
    }

    /* ---------- 6. State helpers ---------- */
    function clearStates() {
        stage.classList.remove('is-typing', 'is-verifying', 'is-error', 'is-success');
    }

    function syncBodyClasses() {
        const b = document.body.classList;
        b.toggle('tm-on-typing',    stage.classList.contains('is-typing'));
        b.toggle('tm-on-verifying', stage.classList.contains('is-verifying'));
        b.toggle('tm-on-success',   stage.classList.contains('is-success'));
        b.toggle('tm-on-error',     stage.classList.contains('is-error'));
    }

    /* ---------- 7. Token spawner (packets per keystroke) ---------- */
    let packetCount = 0;
    let packetLive  = 0;

    function spawnPacket(isVerify) {
        const rack = RACKS[Math.floor(Math.random() * RACKS.length)];

        const startX = vwPct(rack.x);
        const startY = vhPct(rack.y);
        const endX   = CORE_PX.x;
        const endY   = CORE_PX.y;

        const el = document.createElement('div');
        el.className = 'tm-packet' + (isVerify ? ' is-verify' : '');
        el.style.left = startX + 'px';
        el.style.top  = startY + 'px';
        stage.appendChild(el);

        const dur = 1400 + Math.random() * 600;
        const t0  = performance.now();
        const arcSign = Math.random() < 0.5 ? -1 : 1;
        const arcAmp  = 20 + Math.random() * 20;

        packetLive++;
        packetCount++;
        if (hudPkt) hudPkt.textContent = String(packetCount);

        function step(now) {
            const p = Math.min((now - t0) / dur, 1);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

            const dx = endX - startX;
            const dy = endY - startY;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny =  dx / len;
            const arc = Math.sin(p * Math.PI) * arcAmp * arcSign;

            const px = startX + dx * e + nx * arc;
            const py = startY + dy * e + ny * arc;

            el.style.transform =
                `translate(${px - startX}px, ${py - startY}px) translate(-50%,-50%) scale(${1 - p * 0.25})`;
            el.style.opacity = String(1 - Math.pow(p, 2.4));

            if (p < 1) requestAnimationFrame(step);
            else {
                el.remove();
                packetLive--;
            }
        }
        requestAnimationFrame(step);

        /* safety cap */
        if (packetLive > 90) {
            const oldest = stage.querySelector('.tm-packet');
            if (oldest) { oldest.remove(); packetLive--; }
        }
    }

    /* ---------- 8. State renderers ---------- */
    function renderIdle() {
        clearStates(); setFibers(null); syncBodyClasses();
        if (coreText) coreText.textContent = 'AUTH CORE · STANDBY';
        if (hudLink)  hudLink.textContent  = 'IDLE';
        if (hudRate)  hudRate.textContent  = '0 KB/S';
        if (hudState) hudState.textContent = 'SECURE';
    }

    function renderTyping(len) {
        clearStates();
        stage.classList.add('is-typing');
        setFibers('is-active'); syncBodyClasses();
        if (coreText) coreText.textContent = 'AUTH CORE · RECEIVING';
        if (hudLink)  hudLink.textContent  = 'TRANSMITTING';
        if (hudRate)  hudRate.textContent  = Math.min(len * 52, 880) + ' KB/S';
        if (hudState) hudState.textContent = 'SECURE';
    }

    function renderVerifying() {
        clearStates();
        stage.classList.add('is-typing', 'is-verifying');
        setFibers('is-verifying'); syncBodyClasses();
        if (coreText) coreText.textContent = 'AUTH CORE · VERIFYING';
        if (hudLink)  hudLink.textContent  = 'DUAL-CHECK';
        if (hudRate)  hudRate.textContent  = '1024 KB/S';
        if (hudState) hudState.textContent = 'MATCHED';
    }

    function renderError() {
        clearStates();
        stage.classList.add('is-error');
        setFibers('is-error'); syncBodyClasses();
        if (coreText) coreText.textContent = 'AUTH CORE · REJECTED';
        if (hudLink)  hudLink.textContent  = 'REJECTED';
        if (hudRate)  hudRate.textContent  = '0 KB/S';
        if (hudState) hudState.textContent = 'INSECURE';

        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'tm-packet is-error';
                const rack = RACKS[Math.floor(Math.random() * RACKS.length)];
                el.style.left = vwPct(rack.x) + 'px';
                el.style.top  = vhPct(rack.y) + 'px';
                stage.appendChild(el);
                setTimeout(() => el.remove(), 1200);
            }, i * 60);
        }

        setTimeout(() => {
            if (stage.classList.contains('is-error')) evaluateState();
        }, 1500);
    }

    function renderSuccess() {
        clearStates();
        stage.classList.add('is-success', 'is-verifying');
        setFibers('is-success'); syncBodyClasses();
        if (coreText) coreText.textContent = 'AUTH CORE · SECURED';
        if (hudLink)  hudLink.textContent  = 'ESTABLISHED';
        if (hudRate)  hudRate.textContent  = 'ENCRYPTED';
        if (hudState) hudState.textContent = 'CONNECTED';
    }

    /* ---------- 9. Master evaluator ---------- */
    function evaluateState() {
        const a = newPwd.value || '';
        const b = confirmPwd.value || '';

        if (errorBox && !errorBox.hidden && errorBox.textContent.trim() !== '') {
            renderError(); return;
        }

        const bothFilled = a.length > 0 && b.length > 0;
        const mismatch   = bothFilled && a !== b;
        const matched    = bothFilled && a === b;

        if (mismatch)                 renderError();
        else if (matched)             renderVerifying();
        else if (a.length || b.length) renderTyping(Math.max(a.length, b.length));
        else                          renderIdle();
    }

    /* ---------- 10. Input listeners ---------- */
    let idleA = null, idleB = null;

    newPwd.addEventListener('input', () => {
        evaluateState();

        /* Spawn 2-3 tiny packets per keystroke */
        const burst = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < burst; k++) {
            setTimeout(() => spawnPacket(false), k * 90);
        }

        if (idleA) clearTimeout(idleA);
        idleA = setTimeout(() => {
            if (confirmPwd.value === '' && newPwd.value !== '') {
                if (hudRate) hudRate.textContent = 'IDLE PULSE';
                if (hudLink) hudLink.textContent = 'AWAITING';
            } else if (newPwd.value === '' && confirmPwd.value === '') {
                renderIdle();
            }
        }, 1200);
    });

    confirmPwd.addEventListener('input', () => {
        evaluateState();

        /* Spawn 2-3 tiny verification packets per keystroke */
        const burst = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < burst; k++) {
            setTimeout(() => spawnPacket(true), k * 90);
        }

        if (idleB) clearTimeout(idleB);
        idleB = setTimeout(() => {
            if (newPwd.value === '' && confirmPwd.value === '') {
                renderIdle();
            }
        }, 1200);
    });

    /* ---------- 11. Observe the existing error box ---------- */
    if (errorBox) {
        const obs = new MutationObserver(() => {
            if (!errorBox.hidden && errorBox.textContent.trim() !== '') {
                renderError();
            } else {
                evaluateState();
            }
        });
        obs.observe(errorBox, {
            attributes: true, childList: true, subtree: true, characterData: true
        });
    }

    /* ---------- 12. Keep body classes in sync ---------- */
    new MutationObserver(syncBodyClasses).observe(stage, {
        attributes: true, attributeFilter: ['class']
    });

    /* ---------- 13. Submit interception (visual only) ---------- */
    form.addEventListener('submit', () => {
        setTimeout(() => {
            if (errorBox && !errorBox.hidden && errorBox.textContent.trim() !== '') {
                renderError(); return;
            }
            renderSuccess();
            for (let i = 0; i < 18; i++) {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.className = 'tm-packet is-verify';
                    const rack = RACKS[Math.floor(Math.random() * RACKS.length)];
                    el.style.left = vwPct(rack.x) + 'px';
                    el.style.top  = vhPct(rack.y) + 'px';
                    stage.appendChild(el);
                    setTimeout(() => el.remove(), 1400);
                }, i * 50);
            }
        }, 60);
    }, true);

    /* ---------- 14. Init ---------- */
    renderIdle();

    window.addEventListener('beforeunload', () => {
        if (idleA) clearTimeout(idleA);
        if (idleB) clearTimeout(idleB);
        if (resizeTimer) clearTimeout(resizeTimer);
    });

})();