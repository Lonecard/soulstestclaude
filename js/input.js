'use strict';
/* Input: touch joystick + buttons, keyboard, mouse. */

const keys = new Set();
const input = { attack: false, heavy: false, roll: false, heal: false, lock: false, ctx: false, skill: false, whistle: false };
let spaceDown = 0;
const joy = { id: null, bx: 0, by: 0, x: 0, y: 0, R: 60 };
const buttons = [];
function btn(name, label, opt = {}) { const b = { name, label, x: 0, y: 0, r: 40, down: false, id: null, t0: 0, ...opt }; buttons.push(b); return b; }
const B = {
  attack: btn('attack', 'ATTACK', { onDown: () => (input.attack = true) }),
  heavy: btn('heavy', 'HEAVY', { onDown: () => (input.heavy = true) }),
  roll: btn('roll', 'ROLL', { onUp: (b) => { if (performance.now() - b.t0 < 280) input.roll = true; } }),
  heal: btn('heal', 'FLASK', { onDown: () => (input.heal = true) }),
  lock: btn('lock', 'LOCK', { onDown: () => (input.lock = true) }),
  skill: btn('skill', 'SKILL', { onDown: () => (input.skill = true) }),
  whistle: btn('whistle', 'TORRENT', { small: true, onDown: () => (input.whistle = true) }),
  map: btn('map', 'MAP', { small: true, onDown: () => openMap() }),
  ctx: btn('ctx', '', { pill: true, visible: () => !!G.ctxAction, onDown: () => (input.ctx = true) }),
  pause: btn('pause', 'II', { small: true, onDown: () => setPause(true) }),
};

document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
let SAFE = { t: 0, r: 0, b: 0, l: 0 };
function readSafeArea() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
  SAFE = { t: v('--sat'), r: v('--sar'), b: v('--sab'), l: v('--sal') };
}
function layoutButtons() {
  readSafeArea();
  const R = clamp(Math.min(W, H) * 0.095, 30, 54);
  const ax = W - R * 1.55 - SAFE.r, ay = H - R * 1.5 - SAFE.b;
  Object.assign(B.attack, { x: ax, y: ay, r: R * 1.12 });
  Object.assign(B.roll, { x: ax - R * 2.6, y: ay + R * 0.25, r: R * 0.88 });
  Object.assign(B.heavy, { x: ax - R * 0.15, y: ay - R * 2.45, r: R * 0.8 });
  Object.assign(B.heal, { x: ax - R * 2.3, y: ay - R * 2.05, r: R * 0.72 });
  Object.assign(B.lock, { x: ax + R * 0.35, y: ay - R * 4.3, r: R * 0.6 });
  Object.assign(B.ctx, { x: W / 2, y: H * 0.62, r: R * 0.75 });
  Object.assign(B.skill, { x: ax - R * 1.95, y: ay - R * 4.15, r: R * 0.66 });
  Object.assign(B.pause, { x: W - 26 - SAFE.r, y: 26 + SAFE.t, r: 20 });
  Object.assign(B.map, { x: W - 74 - SAFE.r, y: 26 + SAFE.t, r: 20 });
  Object.assign(B.whistle, { x: W - 122 - SAFE.r, y: 26 + SAFE.t, r: 20 });
  joy.R = R * 1.25;
}

const ptrs = new Map();
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio();
  if (e.pointerType === 'touch' || e.pointerType === 'pen') showTouch = true;
  if (G.state !== 'play') return;
  const x = e.clientX, y = e.clientY;
  if (showTouch) {
    for (const b of buttons) {
      if (b.visible && !b.visible()) continue;
      const hit = b.pill ? Math.abs(x - b.x) < b.r * 2.8 && Math.abs(y - b.y) < b.r * 0.9 : Math.hypot(x - b.x, y - b.y) <= b.r * 1.18;
      if (hit) {
        b.down = true; b.id = e.pointerId; b.t0 = performance.now();
        ptrs.set(e.pointerId, { kind: 'btn', b });
        if (b.onDown) b.onDown(b);
        return;
      }
    }
    if (x < W * 0.55 && joy.id === null) {
      joy.id = e.pointerId; joy.bx = joy.x = x; joy.by = joy.y = y;
      ptrs.set(e.pointerId, { kind: 'joy' });
    }
  } else if (e.pointerType === 'mouse') {
    if (e.button === 0) input.attack = true;
    if (e.button === 2) input.heavy = true;
  }
}, { passive: false });
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  joy.x = e.clientX; joy.y = e.clientY;
  const dx = joy.x - joy.bx, dy = joy.y - joy.by, d = Math.hypot(dx, dy);
  if (d > joy.R) { joy.bx = joy.x - (dx / d) * joy.R; joy.by = joy.y - (dy / d) * joy.R; }
});
function releasePtr(e) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  ptrs.delete(e.pointerId);
  if (p.kind === 'joy') joy.id = null;
  else { p.b.down = false; p.b.id = null; if (p.b.onUp) p.b.onUp(p.b); }
}
function clearPointers() { joy.id = null; ptrs.clear(); buttons.forEach((b) => (b.down = false)); keys.clear(); }
cvs.addEventListener('pointerup', releasePtr);
cvs.addEventListener('pointercancel', releasePtr);
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('.panel')) e.preventDefault(); }, { passive: false });

window.addEventListener('keydown', (e) => {
  initAudio();
  const k = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'Escape' || k === 'KeyP') {
    if (G.state === 'play') setPause(true);
    else if (G.state === 'pause') setPause(false);
    else if (G.state === 'menu') closeGrace();
    else if (G.state === 'map') closeMap();
    return;
  }
  if (G.state !== 'play') return;
  if (k === 'KeyJ') input.attack = true;
  if (k === 'KeyK') input.heavy = true;
  if (k === 'KeyE' || k === 'KeyR') input.heal = true;
  if (k === 'KeyQ' || k === 'Tab') input.lock = true;
  if (k === 'KeyF' || k === 'Enter') input.ctx = true;
  if (k === 'KeyL' || k === 'KeyU') input.skill = true;
  if (k === 'KeyT') input.whistle = true;
  if (k === 'KeyM') openMap();
  if (k === 'Space') spaceDown = performance.now();
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Space' && spaceDown && performance.now() - spaceDown < 280 && G.state === 'play') input.roll = true;
  if (e.code === 'Space') spaceDown = 0;
});
window.addEventListener('blur', () => { keys.clear(); if (G.state === 'play') setPause(true); });

function getMove() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (joy.id !== null) {
    const dx = (joy.x - joy.bx) / joy.R, dy = (joy.y - joy.by) / joy.R;
    if (Math.hypot(dx, dy) > 0.15) { x += dx; y += dy; }
  }
  const m = Math.hypot(x, y);
  if (m < 0.01) return { x: 0, y: 0, m: 0 };
  const mm = Math.min(1, m);
  return { x: (x / m) * mm, y: (y / m) * mm, m: mm };
}
const sprintHeld = () => keys.has('ShiftLeft') || keys.has('ShiftRight') ||
  (spaceDown && performance.now() - spaceDown > 280) || (B.roll.down && performance.now() - B.roll.t0 > 280);
