(function () {
  'use strict';

  const rr = document.getElementById('router-visual');
  const np = document.getElementById('new-password');
  const cp = document.getElementById('confirm-password');
  const form = document.getElementById('reset-password-form');

  if (!rr || !np || !cp || !form) return;

  const disp = rr.querySelector('[data-rr-text]');
  const shake = rr.querySelector('.rr-shake');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const minLen = Number.parseInt(rr.getAttribute('data-min-length'), 10) || 8;
  const states = ['idle', 'typing', 'checking', 'ready', 'sending', 'success', 'error'];
  const copy = {
    idle: 'WAITING',
    typing: 'RECEIVING DATA',
    checking: 'VERIFYING',
    ready: 'READY',
    success: 'SECURE',
    error: 'PASSWORD MISMATCH'
  };

  let current = '';
  let locked = false;
  let active = false;
  let sequence = null;
  let timers = [];
  let finishCallbacks = [];
  let raf = 0;

  function setState(state, text = copy[state], phase = '') {
    states.forEach(name => rr.classList.toggle(name, name === state));
    rr.dataset.phase = phase;
    if (disp) disp.textContent = text || '';
    current = state;
  }

  function wait(fn, ms) {
    const delay = reduce.matches ? Math.min(ms, 250) : ms;
    timers.push(window.setTimeout(fn, delay));
  }

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function shakeRouter() {
    if (!shake || reduce.matches) return;
    shake.classList.remove('shake');
    void shake.offsetWidth;
    shake.classList.add('shake');
  }

  function rulesOk(value) {
    return value.length >= minLen && /[a-z]/i.test(value) && /\d/.test(value);
  }

  function isValid() {
    return Boolean(np.value) && Boolean(cp.value) && rulesOk(np.value) && np.value === cp.value;
  }

  function flushFinish() {
    const callbacks = finishCallbacks;
    finishCallbacks = [];
    callbacks.forEach(resolve => resolve());
  }

  function evaluate() {
    if (locked) return;

    const a = np.value;
    const b = cp.value;
    const checks = { length:a.length >= minLen, letters:/[a-z]/i.test(a), number:/\d/.test(a) };
    document.querySelectorAll('[data-requirement]').forEach(item => item.classList.toggle('valid', Boolean(checks[item.dataset.requirement])));
    const previous = current;

    if (!a && !b) {
      setState('idle');
      return;
    }

    if (a && !b) {
      setState('typing');
      return;
    }

    if (!a && b) {
      setState('checking');
      return;
    }

    if (a !== b) {
      const isPrefix = b.length < a.length && a.startsWith(b) && document.activeElement === cp;
      if (isPrefix) {
        setState('checking');
        return;
      }

      setState('error', 'PASSWORD MISMATCH');
      if (previous !== 'error') shakeRouter();
      return;
    }

    setState(isValid() ? 'ready' : 'checking');
  }

  function startSequence() {
    clearTimers();
    locked = true;
    active = true;
    sequence = { result: null, applyReady: false, phase: 'reset' };

    setState('sending', 'RESETTING', 'reset');

    wait(() => {
      if (!sequence) return;
      sequence.phase = 'apply';
      setState('sending', 'APPLYING PASSWORD', 'apply');

      wait(() => {
        if (!sequence) return;
        sequence.applyReady = true;
        settle();
      }, 1400);
    }, 1250);

    wait(release, 12000);
  }

  function settle() {
    if (!sequence || !sequence.applyReady || sequence.result === null) return;

    if (sequence.result) {
      sequence.phase = 'out';
      setState('sending', 'SECURING CONNECTION', 'out');

      wait(() => {
        setState('success', 'SECURE');
        active = false;
        wait(flushFinish, 650);
      }, 1250);
    } else {
      sequence.phase = 'done';
      setState('error', 'RESET FAILED');
      active = false;
      shakeRouter();
      wait(release, 2200);
    }
  }

  function report(ok) {
    if (!active || !sequence || sequence.phase === 'done') return;
    sequence.result = Boolean(ok);
    settle();
  }

  function release() {
    flushFinish();
    clearTimers();
    locked = false;
    active = false;
    sequence = null;
    evaluate();
  }

  ['input', 'change'].forEach(eventName => {
    np.addEventListener(eventName, evaluate);
    cp.addEventListener(eventName, evaluate);
  });

  cp.addEventListener('blur', evaluate);

  form.addEventListener('submit', event => {
    if (event.target !== form || locked) return;
    if (!isValid()) return;
    startSequence();
  }, true);

  document.addEventListener('password-reset:success', () => report(true));
  document.addEventListener('password-reset:error', () => report(false));

  window.RouterReset = {
    finish() {
      return new Promise(resolve => {
        if (!active) {
          resolve();
          return;
        }

        finishCallbacks.push(resolve);
        window.setTimeout(resolve, 7000);
      });
    },
    success() { report(true); },
    error() { report(false); }
  };

  rr.addEventListener('pointermove', event => {
    if (reduce.matches) return;

    const rect = rr.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      rr.style.setProperty('--px', x.toFixed(2));
      rr.style.setProperty('--py', y.toFixed(2));
    });
  });

  rr.addEventListener('pointerleave', () => {
    rr.style.setProperty('--px', '0');
    rr.style.setProperty('--py', '0');
  });

  evaluate();
})();
