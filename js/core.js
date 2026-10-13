'use strict';
/* Core: utilities, canvas, audio, shared game state. */

// ---------------------------------------------------------------- utils
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ } }

// ---------------------------------------------------------------- canvas
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let W = 0, H = 0, DPR = 1, SCALE = 1;
let showTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------------------------------------------------------------- audio
const AU = { ctx: null, master: null, noise: null, on: true, drone: null };
function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    AU.ctx = ac;
    AU.master = ac.createGain(); AU.master.gain.value = AU.on ? 0.55 : 0; AU.master.connect(ac.destination);
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = b;
  } catch (e) { AU.ctx = null; }
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  const ac = AU.ctx; if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, ftype, f0, f1, q = 1, delay = 0) {
  const ac = AU.ctx; if (!ac) return;
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = AU.noise; f.type = ftype; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
}
const SFX = {
  swing() { noise(0.16, 0.22, 'bandpass', 2400, 500, 1.2); },
  heavy() { noise(0.3, 0.32, 'bandpass', 1300, 220, 1.0); },
  hit() { tone('sine', 140, 45, 0.16, 0.5); noise(0.08, 0.3, 'highpass', 3000, 1500); },
  crit() { tone('sine', 110, 35, 0.35, 0.6); noise(0.2, 0.35, 'bandpass', 1800, 300, 2); tone('triangle', 900, 1400, 0.25, 0.12); },
  clang() { tone('triangle', 1900, 1500, 0.25, 0.14); tone('square', 2600, 2400, 0.08, 0.05); noise(0.06, 0.2, 'highpass', 4000, 3000); },
  bleed() { noise(0.4, 0.4, 'bandpass', 900, 200, 2); tone('sawtooth', 220, 60, 0.3, 0.12); },
  hurt() { tone('square', 180, 70, 0.2, 0.16); noise(0.15, 0.3, 'lowpass', 1500, 300); },
  roll() { noise(0.26, 0.14, 'lowpass', 700, 200); },
  heal() { [523, 659, 784, 1046].forEach((f, i) => tone('sine', f, f, 0.35, 0.12, i * 0.08)); },
  empty() { tone('triangle', 300, 200, 0.12, 0.1); },
  die() { tone('sawtooth', 110, 38, 2.2, 0.22); noise(1.5, 0.15, 'lowpass', 600, 80); },
  felled() { [196, 247, 294, 392, 494].forEach((f, i) => tone('sine', f, f, 3.4, 0.09, i * 0.06)); },
  grace() { tone('sine', 880, 880, 0.9, 0.1); tone('sine', 1320, 1320, 0.9, 0.06, 0.12); tone('sine', 1760, 1760, 1.0, 0.04, 0.24); },
  item() { tone('sine', 660, 990, 0.3, 0.1); tone('sine', 990, 1320, 0.4, 0.07, 0.1); },
  glint() { tone('sine', 2600, 2200, 0.25, 0.14); },
  roar() { tone('sawtooth', 90, 50, 1.4, 0.25); noise(1.3, 0.3, 'lowpass', 500, 120); },
  slam() { tone('sine', 70, 30, 0.45, 0.6); noise(0.4, 0.4, 'lowpass', 400, 60); },
  orb() { tone('triangle', 500, 900, 0.3, 0.08); },
  dagger() { tone('sine', 1800, 2400, 0.18, 0.08); noise(0.12, 0.1, 'highpass', 5000, 3000); },
  arrow() { noise(0.1, 0.15, 'bandpass', 3000, 1200, 3); tone('triangle', 400, 200, 0.08, 0.08); },
  breath() { noise(1.2, 0.35, 'lowpass', 900, 300, 0.7); tone('sawtooth', 70, 50, 1.2, 0.1); },
  enemySwing() { noise(0.18, 0.16, 'bandpass', 1500, 400, 1); },
  runes() { tone('sine', 1200, 1600, 0.15, 0.06); tone('sine', 1600, 2000, 0.15, 0.05, 0.07); },
  fog() { noise(0.9, 0.18, 'bandpass', 300, 1200, 0.7); },
  neigh() { tone('sawtooth', 500, 900, 0.25, 0.08); tone('sawtooth', 900, 400, 0.4, 0.07, 0.2); },
};
function sfx(n) { if (AU.ctx && AU.on && SFX[n]) SFX[n](); }
function startDrone(base = 55) {
  const ac = AU.ctx; if (!ac || AU.drone) return;
  const g = ac.createGain(), f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 280;
  g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 2);
  const oscs = [base, base * 1.012, base * 1.5].map((fr) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
  f.connect(g); g.connect(AU.master);
  AU.drone = { g, oscs };
}
function stopDrone() {
  const ac = AU.ctx, d = AU.drone; if (!ac || !d) return;
  d.g.gain.cancelScheduledValues(ac.currentTime);
  d.g.gain.setValueAtTime(Math.max(0.0001, d.g.gain.value), ac.currentTime);
  d.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.5);
  d.oscs.forEach((o) => o.stop(ac.currentTime + 1.6));
  AU.drone = null;
}

// ---------------------------------------------------------------- shared state
const G = {
  state: 'title', time: 0, hitstop: 0, shake: 0, clock: 10, wasNight: false,
  all: [], enemies: [], projectiles: [], pproj: [], rings: [], strikes: [], pools: [],
  particles: [], decals: [], numbers: [], banners: [], motes: [], rain: [],
  graces: [], graceIdx: 0, items: [], defeated: new Set(), defeatedTypes: new Set(), taken: new Set(), bloodstain: null,
  inst: null, returnPoint: null, deadT: 0, ctxAction: null, runeShow: 0, zone: '', locName: '', drumT: 0,
  activeBosses: [], arenaFight: null, arenaRect: null, amb: null, menuOpenedAt: 0,
};
const cam = { x: 0, y: 0 };
const P = {
  x: 0, y: 0, r: 12, face: -Math.PI / 2, vx: 0, vy: 0, air: 0,
  hp: 0, maxHp: 0, hpLag: 0, st: 0, maxSt: 0, stDelay: 0, fp: 0, maxFp: 0, flasks: 4, maxFlasks: 4, seeds: 0,
  vig: 10, mnd: 10, end: 10, str: 10, runes: 0, greatRunes: [],
  weapon: 'longsword', owned: ['longsword'], wlv: {},
  state: 'free', t: 0, atk: null, atkEl: null, skill: null, combo: 0, buffer: null, bufferT: 0, hitSet: null, swung: false,
  iframes: 0, flash: 0, lock: null, rollDir: 0, backstep: false, healed: false, sprinting: false, moveAnim: 0, moving: 0,
  mounted: false, buffT: 0, buffMul: 1,
  status: { bleed: 0, rot: 0, poison: 0, frost: 0 }, rotT: 0, poisonT: 0, frostT: 0,
};
