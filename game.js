/* Ashen Reach - a tiny mobile-first soulslike. No dependencies. */
(() => {
'use strict';

// ---------------------------------------------------------------- utils
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
let seed = 7331;
const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

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
  heavy() { noise(0.28, 0.3, 'bandpass', 1300, 250, 1.0); },
  hit() { tone('sine', 140, 45, 0.16, 0.5); noise(0.08, 0.3, 'highpass', 3000, 1500); },
  crit() { tone('sine', 110, 35, 0.35, 0.6); noise(0.2, 0.35, 'bandpass', 1800, 300, 2); tone('triangle', 900, 1400, 0.25, 0.12); },
  hurt() { tone('square', 180, 70, 0.2, 0.16); noise(0.15, 0.3, 'lowpass', 1500, 300); },
  roll() { noise(0.26, 0.14, 'lowpass', 700, 200); },
  heal() { [523, 659, 784, 1046].forEach((f, i) => tone('sine', f, f, 0.35, 0.12, i * 0.08)); },
  empty() { tone('triangle', 300, 200, 0.12, 0.1); },
  die() { tone('sawtooth', 110, 38, 2.2, 0.22); noise(1.5, 0.15, 'lowpass', 600, 80); },
  felled() { [196, 247, 294, 392, 494].forEach((f, i) => tone('sine', f, f, 3.2, 0.09, i * 0.06)); },
  grace() { tone('sine', 880, 880, 0.9, 0.1); tone('sine', 1320, 1320, 0.9, 0.06, 0.12); tone('sine', 1760, 1760, 1.0, 0.04, 0.24); },
  glint() { tone('sine', 2600, 2200, 0.25, 0.14); },
  roar() { tone('sawtooth', 90, 50, 1.4, 0.25); noise(1.3, 0.3, 'lowpass', 500, 120); },
  slam() { tone('sine', 70, 30, 0.45, 0.6); noise(0.4, 0.4, 'lowpass', 400, 60); },
  orb() { tone('triangle', 500, 900, 0.3, 0.08); },
  enemySwing() { noise(0.18, 0.16, 'bandpass', 1500, 400, 1); },
  runes() { tone('sine', 1200, 1600, 0.15, 0.06); tone('sine', 1600, 2000, 0.15, 0.05, 0.07); },
  fog() { noise(0.9, 0.18, 'bandpass', 300, 1200, 0.7); },
};
function sfx(n) { if (AU.ctx && AU.on && SFX[n]) SFX[n](); }
function startDrone() {
  const ac = AU.ctx; if (!ac || AU.drone) return;
  const g = ac.createGain(), f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 260;
  g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 2);
  const oscs = [55, 55.7, 82.4].map((fr) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
  f.connect(g); g.connect(AU.master);
  AU.drone = { g, oscs };
}
function stopDrone() {
  const ac = AU.ctx, d = AU.drone; if (!ac || !d) return;
  d.g.gain.cancelScheduledValues(ac.currentTime);
  d.g.gain.setValueAtTime(d.g.gain.value, ac.currentTime);
  d.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.5);
  d.oscs.forEach((o) => o.stop(ac.currentTime + 1.6));
  AU.drone = null;
}

// ---------------------------------------------------------------- world
const WORLD = { w: 1600, h: 3400 };
const WALL_H = 26;
const WALLS = [
  // borders
  { x: 0, y: 0, w: 1600, h: 40 }, { x: 0, y: 3360, w: 1600, h: 40 },
  { x: 0, y: 0, w: 40, h: 3400 }, { x: 1560, y: 0, w: 40, h: 3400 },
  // boss arena
  { x: 260, y: 110, w: 1080, h: 40 },
  { x: 260, y: 110, w: 40, h: 960 }, { x: 1300, y: 110, w: 40, h: 960 },
  { x: 260, y: 1030, w: 500, h: 40 }, { x: 840, y: 1030, w: 500, h: 40 },
  // ruins
  { x: 560, y: 2560, w: 130, h: 28 }, { x: 960, y: 2480, w: 30, h: 150 },
  { x: 380, y: 2020, w: 210, h: 28 }, { x: 1060, y: 1860, w: 30, h: 180 },
  { x: 600, y: 1700, w: 30, h: 120 }, { x: 300, y: 2780, w: 34, h: 200 },
  { x: 1180, y: 2700, w: 170, h: 28 }, { x: 980, y: 2230, w: 150, h: 26 },
  { x: 420, y: 1420, w: 28, h: 160 }, { x: 1000, y: 1380, w: 200, h: 28 },
  { x: 1240, y: 2950, w: 28, h: 160 },
];
const FOG = { x: 760, y: 1030, w: 80, h: 40 };
const ARENA = { cx: 800, cy: 590, r: 440 };
const PATH = [[800, 3330], [780, 2950], [840, 2560], [760, 2150], [830, 1760], [720, 1420], [800, 1080]];
const GRACE_DEFS = [
  { x: 800, y: 3150, name: 'Stranded Graveyard' },
  { x: 650, y: 1300, name: 'Gatefront Ruins' },
  { x: 800, y: 300, name: 'Ashen Throne', afterBoss: true },
];
const SPAWNS = [
  ['hollow', 720, 2760], ['hollow', 900, 2700],
  ['hollow', 820, 2430], ['wolf', 520, 2250], ['wolf', 580, 2300],
  ['hollow', 1100, 2120], ['hollow', 960, 1980],
  ['brute', 800, 1860],
  ['hollow', 560, 1620], ['hollow', 950, 1560], ['wolf', 1150, 1300], ['wolf', 1210, 1250],
  ['brute', 400, 2600],
];

const TREES = [], TUFTS = [], STONES = [];
(function genWorld() {
  const nearPath = (x, y) => { let m = 1e9; for (let i = 0; i < PATH.length - 1; i++) m = Math.min(m, segDist(x, y, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1])); return m; };
  const inRect = (x, y, r, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  let tries = 0;
  while (TREES.length < 150 && tries++ < 5000) {
    const x = 60 + srand() * 1480, y = 60 + srand() * 3280;
    if (x > 230 && x < 1370 && y < 1100) continue;
    if (nearPath(x, y) < 120) continue;
    if (WALLS.some((w) => inRect(x, y, w, 40))) continue;
    if (GRACE_DEFS.some((g) => Math.hypot(g.x - x, g.y - y) < 120)) continue;
    if (SPAWNS.some((s) => Math.hypot(s[1] - x, s[2] - y) < 70)) continue;
    if (TREES.some((t) => Math.hypot(t.x - x, t.y - y) < 70)) continue;
    TREES.push({ x, y, r: 11, size: 30 + srand() * 22, hue: srand() });
  }
  for (let i = 0; i < 2600; i++) TUFTS.push({ x: srand() * WORLD.w, y: srand() * WORLD.h, s: 0.6 + srand() * 0.8, c: srand() });
  // graveyard stones around start
  for (let i = 0; i < 26; i++) {
    const a = srand() * TAU, d = 130 + srand() * 230;
    const x = 800 + Math.cos(a) * d * 1.4, y = 3150 + Math.sin(a) * d * 0.6;
    if (nearPath(x, y) < 60 || y > 3330) continue;
    STONES.push({ x, y, w: 10 + srand() * 6, h: 14 + srand() * 8, tilt: (srand() - 0.5) * 0.4 });
  }
})();

// ---------------------------------------------------------------- definitions
const PATK = {
  l1: { wind: 0.11, act: 0.11, rec: 0.3, dmg: 24, range: 54, arc: 2.1, st: 13, lunge: 170, poise: 12, dir: 1 },
  l2: { wind: 0.09, act: 0.11, rec: 0.3, dmg: 26, range: 54, arc: 2.2, st: 13, lunge: 160, poise: 12, dir: -1 },
  l3: { wind: 0.17, act: 0.13, rec: 0.42, dmg: 36, range: 64, arc: 0.9, st: 17, lunge: 260, poise: 20, dir: 1, thrust: true },
  heavy: { wind: 0.4, act: 0.15, rec: 0.48, dmg: 58, range: 66, arc: 2.6, st: 28, lunge: 130, poise: 45, dir: 1, heavy: true },
};
const ETYPES = {
  hollow: {
    name: 'Hollow Soldier', hp: 75, r: 13, speed: 74, poise: 30, aggro: 250, runes: 45, wlen: 40,
    col: '#5d574b', col2: '#8f8571', head: '#7b6f5c',
    atks: {
      slash: { wind: 0.62, act: 0.14, rec: 0.65, dmg: 16, range: 50, arc: 1.9, lunge: 120, min: 0, max: 58, w: 3, next: 'slash2', chain: 0.35, track: 5 },
      slash2: { wind: 0.4, act: 0.14, rec: 0.8, dmg: 16, range: 50, arc: 1.9, dir: -1, lunge: 120, w: 0, track: 4 },
      thrust: { wind: 0.8, act: 0.16, rec: 0.7, dmg: 20, range: 64, arc: 0.6, lunge: 260, min: 40, max: 110, w: 1, thrust: true, track: 4 },
    },
  },
  wolf: {
    name: 'Gaunt Wolf', hp: 44, r: 11, speed: 165, poise: 12, aggro: 300, runes: 30, wolf: true,
    col: '#48443c', col2: '#6c665a',
    atks: { bite: { wind: 0.42, act: 0.22, rec: 0.6, dmg: 11, range: 30, arc: 1.4, lunge: 380, min: 0, max: 140, w: 1, track: 7 } },
  },
  brute: {
    name: 'Grave Brute', hp: 230, r: 20, speed: 54, poise: 85, aggro: 240, runes: 160, wlen: 54,
    col: '#4f4034', col2: '#7d6a55', head: '#6a5847', club: true,
    atks: {
      smash: { wind: 1.05, act: 0.16, rec: 1.0, dmg: 34, kind: 'circle', off: 46, rad: 44, lunge: 60, min: 0, max: 80, w: 2, track: 3, shake: 9 },
      sweep: { wind: 0.75, act: 0.2, rec: 0.85, dmg: 24, range: 78, arc: 3.0, lunge: 80, min: 0, max: 72, w: 2, track: 4 },
    },
  },
  boss: {
    name: 'Morgrave, the Ashen Knight', hp: 950, r: 24, speed: 96, poise: 150, aggro: 99999, runes: 3000, wlen: 74, boss: true,
    col: '#2c2832', col2: '#8c7a4a', head: '#3a3540',
    atks: {
      slash1: { wind: 0.55, act: 0.15, rec: 0.3, dmg: 24, range: 86, arc: 2.5, lunge: 230, min: 0, max: 96, w: 3, next: 'slash2', chain: 0.85, track: 6 },
      slash2: { wind: 0.36, act: 0.15, rec: 0.55, dmg: 26, range: 86, arc: 2.5, dir: -1, lunge: 230, w: 0, next: 'slash3', chain: 0.7, track: 6 },
      slash3: { wind: 0.6, act: 0.18, rec: 0.8, dmg: 34, range: 104, arc: 0.7, lunge: 380, thrust: true, w: 0, p2: true, track: 5 },
      delayed: { wind: 1.45, act: 0.16, rec: 0.85, dmg: 44, kind: 'circle', off: 60, rad: 58, lunge: 140, min: 0, max: 115, w: 2, track: 3.5, glint: 1.05, shake: 13 },
      charge: { wind: 0.7, act: 0.5, rec: 0.75, dmg: 30, kind: 'dash', dashSpd: 640, rad: 30, min: 150, max: 480, w: 2, track: 4 },
      leap: { wind: 0.55, act: 0.6, rec: 0.9, dmg: 38, kind: 'leap', rad: 66, min: 170, max: 520, w: 2, track: 6, shake: 16 },
      orbs: { wind: 0.75, act: 0.1, rec: 0.7, dmg: 20, kind: 'orbs', min: 120, max: 650, w: 2, p2: true, track: 5 },
      nova: { wind: 1.1, act: 0.1, rec: 1.0, dmg: 30, kind: 'ring', min: 0, max: 120, w: 1.5, p2: true, track: 0, shake: 10 },
    },
  },
};

// ---------------------------------------------------------------- state
const G = {
  state: 'title', time: 0, hitstop: 0, shake: 0,
  enemies: [], projectiles: [], rings: [], particles: [], numbers: [], banners: [], motes: [],
  graces: GRACE_DEFS.map((g, i) => ({ ...g, found: i === 0 })),
  graceIdx: 0, bossDead: false, bossFight: false, boss: null, bloodstain: null,
  deadT: 0, drumT: 0, ctxAction: null, runeShow: 0, victoryShown: false,
};
const cam = { x: 800, y: 3100 };
const P = {
  x: 800, y: 3190, r: 12, face: -Math.PI / 2, vx: 0, vy: 0,
  hp: 0, maxHp: 0, st: 0, maxSt: 0, stDelay: 0, flasks: 4, maxFlasks: 4,
  vig: 10, end: 10, str: 10, runes: 0,
  state: 'free', t: 0, atk: null, combo: 0, buffer: null, bufferT: 0, hitSet: null, swung: false,
  iframes: 0, flash: 0, lock: null, rollDir: 0, backstep: false, healed: false, sprinting: false, moveAnim: 0,
};
const level = () => 1 + (P.vig - 10) + (P.end - 10) + (P.str - 10);
const levelCost = () => { const l = level(); return Math.floor(50 + 28 * l + 3 * l * l); };
function recalcStats() {
  P.maxHp = 120 + (P.vig - 10) * 14;
  P.maxSt = 90 + (P.end - 10) * 8;
}
const dmgMult = () => 1 + (P.str - 10) * 0.07;

// ---------------------------------------------------------------- save
const SAVE_KEY = 'ashenreach_save_v1';
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      vig: P.vig, end: P.end, str: P.str, runes: P.runes, graceIdx: G.graceIdx,
      found: G.graces.map((g) => g.found), bossDead: G.bossDead, bloodstain: G.bloodstain, sound: AU.on,
    }));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return;
    P.vig = s.vig || 10; P.end = s.end || 10; P.str = s.str || 10; P.runes = s.runes || 0;
    G.graceIdx = s.graceIdx || 0; G.bossDead = !!s.bossDead; G.bloodstain = s.bloodstain || null;
    if (Array.isArray(s.found)) s.found.forEach((f, i) => { if (G.graces[i]) G.graces[i].found = f; });
    if (s.sound === false) AU.on = false;
  } catch (e) { /* corrupt save */ }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- entities
function makeEnemy(type, x, y) {
  const d = ETYPES[type];
  return {
    type, def: d, x, y, home: { x, y }, r: d.r, hp: d.hp, maxHp: d.hp, poise: d.poise,
    face: Math.PI / 2, vx: 0, vy: 0, state: 'idle', t: 0, atk: null, atkName: '', hitDone: false,
    cd: rand(0.3, 1), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(1, 3), flash: 0, showHp: 0,
    dead: false, deathT: 0, boss: !!d.boss, phase2: false, air: 0, leapFrom: null, leapTo: null,
    lastAtk: '', glinted: false, dmgAccum: 0, dmgAccumT: 0,
  };
}
function resetEnemies() {
  G.enemies = SPAWNS.map((s) => makeEnemy(s[0], s[1], s[2]));
  G.boss = null;
  if (!G.bossDead) { G.boss = makeEnemy('boss', 800, 470); G.boss.state = 'dormant'; G.enemies.push(G.boss); }
  G.projectiles.length = 0; G.rings.length = 0;
}
function respawnAtGrace() {
  const g = G.graces[G.graceIdx];
  P.x = g.x; P.y = g.y + 40; P.face = -Math.PI / 2;
  P.hp = P.maxHp; P.st = P.maxSt; P.flasks = P.maxFlasks;
  P.state = 'free'; P.t = 0; P.vx = P.vy = 0; P.lock = null; P.buffer = null; P.iframes = 1;
  cam.x = P.x; cam.y = P.y;
  G.bossFight = false; stopDrone();
  resetEnemies();
}

// ---------------------------------------------------------------- effects
function burst(x, y, n, col, spd = 160, life = 0.5, size = 3, grav = 0) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(spd * 0.3, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), max: life, size: rand(size * 0.5, size), col, grav });
  }
}
function dirBurst(x, y, ang, n, col, spd = 220) {
  for (let i = 0; i < n; i++) {
    const a = ang + rand(-0.6, 0.6), s = rand(spd * 0.3, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.5), max: 0.5, size: rand(1.5, 3.5), col, grav: 300 });
  }
}
function dmgNumber(x, y, v, col = '#fff', big = false) {
  G.numbers.push({ x: x + rand(-8, 8), y: y - 20, text: String(Math.round(v)), life: 0.9, col, big });
}
function banner(text, col, sub = '', dur = 3.2, size = 1) {
  G.banners.push({ text, col, sub, t: 0, dur, size });
}
function shake(a) { G.shake = Math.max(G.shake, a); }

// ---------------------------------------------------------------- input
const keys = new Set();
const input = { attack: false, heavy: false, roll: false, heal: false, lock: false, ctx: false };
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
  ctx: btn('ctx', '', { pill: true, visible: () => !!G.ctxAction, onDown: () => (input.ctx = true) }),
  pause: btn('pause', 'II', { small: true, onDown: () => setPause(true) }),
};
function layoutButtons() {
  const sa = safeArea();
  const R = clamp(Math.min(W, H) * 0.095, 30, 54);
  const ax = W - R * 1.55 - sa.r, ay = H - R * 1.5 - sa.b;
  Object.assign(B.attack, { x: ax, y: ay, r: R * 1.12 });
  Object.assign(B.roll, { x: ax - R * 2.6, y: ay + R * 0.25, r: R * 0.88 });
  Object.assign(B.heavy, { x: ax - R * 0.15, y: ay - R * 2.45, r: R * 0.8 });
  Object.assign(B.heal, { x: ax - R * 2.3, y: ay - R * 2.05, r: R * 0.72 });
  Object.assign(B.lock, { x: ax + R * 0.35, y: ay - R * 4.3, r: R * 0.6 });
  Object.assign(B.ctx, { x: W / 2, y: H - R * 2.3 - sa.b, r: R * 0.75 });
  Object.assign(B.pause, { x: W - 26 - sa.r, y: 26 + sa.t, r: 20 });
  joy.R = R * 1.25;
}
function safeArea() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
  return { t: v('--sat'), r: v('--sar'), b: v('--sab'), l: v('--sal') };
}
document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

const ptrs = new Map();
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio();
  if (e.pointerType === 'touch' || e.pointerType === 'pen') showTouch = true;
  if (G.state !== 'play') return;
  const x = e.clientX, y = e.clientY;
  if (showTouch) {
    for (const b of buttons) {
      if (b.visible && !b.visible()) continue;
      const hit = b.pill ? Math.abs(x - b.x) < b.r * 2.6 && Math.abs(y - b.y) < b.r * 0.9 : Math.hypot(x - b.x, y - b.y) <= b.r * 1.18;
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
cvs.addEventListener('pointerup', releasePtr);
cvs.addEventListener('pointercancel', releasePtr);
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {
  initAudio();
  const k = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'Escape' || k === 'KeyP') { if (G.state === 'play') setPause(true); else if (G.state === 'pause') setPause(false); return; }
  if (G.state !== 'play') return;
  if (k === 'KeyJ') input.attack = true;
  if (k === 'KeyK') input.heavy = true;
  if (k === 'KeyE' || k === 'KeyR') input.heal = true;
  if (k === 'KeyQ' || k === 'Tab') input.lock = true;
  if (k === 'KeyF' || k === 'Enter') input.ctx = true;
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

// ---------------------------------------------------------------- collision
function circleRect(e, w) {
  const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h);
  const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return false;
  if (d2 > 1e-4) { const d = Math.sqrt(d2); e.x = cx + (dx / d) * e.r; e.y = cy + (dy / d) * e.r; }
  else {
    const l = e.x - w.x, r = w.x + w.w - e.x, t = e.y - w.y, b = w.y + w.h - e.y, m = Math.min(l, r, t, b);
    if (m === l) e.x = w.x - e.r; else if (m === r) e.x = w.x + w.w + e.r; else if (m === t) e.y = w.y - e.r; else e.y = w.y + w.h + e.r;
  }
  return true;
}
const fogPresent = () => !G.bossDead;
function collide(e) {
  let hit = false;
  for (const w of WALLS) if (Math.abs(e.x - (w.x + w.w / 2)) < w.w / 2 + e.r && Math.abs(e.y - (w.y + w.h / 2)) < w.h / 2 + e.r) hit = circleRect(e, w) || hit;
  if (fogPresent()) hit = circleRect(e, FOG) || hit;
  for (const t of TREES) {
    const dx = e.x - t.x, dy = e.y - t.y, rr = e.r + t.r, d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); e.x = t.x + (dx / d) * rr; e.y = t.y + (dy / d) * rr; hit = true; }
  }
  return hit;
}
function moveEnt(e, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  let hit = false;
  for (let i = 0; i < steps; i++) { e.x += dx / steps; e.y += dy / steps; hit = collide(e) || hit; }
  return hit;
}
function pointInWall(x, y) {
  return WALLS.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h);
}

// ---------------------------------------------------------------- player
const isInvuln = () => P.iframes > 0 || (P.state === 'roll' && P.t > 0.03 && P.t < (P.backstep ? 0.2 : 0.36));
function useStamina(n) { P.st -= n; P.stDelay = 0.65; if (P.st < -20) P.st = -20; }
function nearestEnemy(maxD, cone, dirA) {
  let best = null, bd = maxD;
  for (const e of G.enemies) {
    if (e.dead || e.state === 'dormant') continue;
    const d = dist(P, e);
    if (d > bd) continue;
    if (cone && Math.abs(angDiff(dirA, angTo(P, e))) > cone) continue;
    best = e; bd = d;
  }
  return best;
}
function softAim(mv) {
  if (P.lock) { P.face = angTo(P, P.lock); return; }
  const dirA = mv.m > 0.2 ? Math.atan2(mv.y, mv.x) : P.face;
  const t = nearestEnemy(150, 1.0, dirA);
  P.face = t ? angTo(P, t) : dirA;
}
function startAttack(name, mv) {
  if (P.st <= 0) return false;
  const a = PATK[name];
  useStamina(a.st);
  softAim(mv);
  P.state = 'attack'; P.t = 0; P.atk = a; P.hitSet = new Set(); P.swung = false;
  return true;
}
function startRoll(mv) {
  if (P.st <= 0) return false;
  useStamina(20);
  P.backstep = mv.m < 0.2;
  P.rollDir = P.backstep ? P.face + Math.PI : Math.atan2(mv.y, mv.x);
  if (!P.backstep && !P.lock) P.face = P.rollDir;
  P.state = 'roll'; P.t = 0;
  sfx('roll');
  return true;
}
function startHeal() {
  if (P.flasks <= 0) { sfx('empty'); banner('No flasks remaining', '#bba', '', 1.2, 0.45); return true; }
  P.flasks--; P.state = 'heal'; P.t = 0; P.healed = false;
  return true;
}
function toggleLock() {
  if (P.lock) { P.lock = null; return; }
  P.lock = nearestEnemy(400, 0, 0);
}
function tryBuffered(mv) {
  const b = P.buffer; if (!b) return false;
  let ok = false;
  if (b === 'light') {
    const next = P.state === 'attack' && P.atk && !P.atk.heavy ? (P.combo + 1) % 3 : 0;
    ok = startAttack(['l1', 'l2', 'l3'][next], mv);
    if (ok) P.combo = next;
  } else if (b === 'heavy') { ok = startAttack('heavy', mv); if (ok) P.combo = 0; }
  else if (b === 'roll') ok = startRoll(mv);
  else if (b === 'heal') ok = startHeal();
  if (ok) P.buffer = null;
  return ok;
}

function updatePlayer(dt) {
  P.t += dt;
  P.iframes = Math.max(0, P.iframes - dt);
  P.flash = Math.max(0, P.flash - dt);
  const kb = Math.exp(-9 * dt);
  if (Math.abs(P.vx) + Math.abs(P.vy) > 1) { moveEnt(P, P.vx * dt, P.vy * dt); P.vx *= kb; P.vy *= kb; } else P.vx = P.vy = 0;

  if (P.state === 'dead') return;

  // stamina
  if (P.stDelay > 0) P.stDelay -= dt;
  else if (P.state !== 'attack' && P.state !== 'roll' && !P.sprinting) P.st = Math.min(P.maxSt, P.st + 55 * dt);

  const mv = getMove();
  if (input.attack) { P.buffer = 'light'; P.bufferT = 0.4; }
  if (input.heavy) { P.buffer = 'heavy'; P.bufferT = 0.4; }
  if (input.roll) { P.buffer = 'roll'; P.bufferT = 0.4; }
  if (input.heal) { P.buffer = 'heal'; P.bufferT = 0.3; }
  input.attack = input.heavy = input.roll = input.heal = false;
  if (input.lock) { input.lock = false; toggleLock(); }
  if (input.ctx) { input.ctx = false; doContext(); }
  P.bufferT -= dt; if (P.bufferT <= 0) P.buffer = null;

  if (P.lock && (P.lock.dead || dist(P, P.lock) > 520 || P.lock.state === 'dormant')) P.lock = null;
  P.sprinting = false;

  switch (P.state) {
    case 'free': {
      if (tryBuffered(mv)) break;
      let spd = 150 * mv.m;
      if (mv.m > 0.3 && sprintHeld() && P.st > 0 && !P.lock) { spd = 245; P.sprinting = true; P.st -= 16 * dt; P.stDelay = 0.35; }
      if (mv.m > 0) {
        moveEnt(P, mv.x / mv.m * spd * dt, mv.y / mv.m * spd * dt);
        P.moveAnim += dt * spd * 0.06;
        if (!P.lock) P.face += angDiff(P.face, Math.atan2(mv.y, mv.x)) * Math.min(1, dt * 16);
        if (P.sprinting && Math.random() < 0.3) G.particles.push({ x: P.x, y: P.y + 8, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, size: 3, col: 'rgba(120,105,80,0.5)', grav: 0 });
      }
      if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 14);
      break;
    }
    case 'attack': {
      const a = P.atk, t1 = a.wind, t2 = a.wind + a.act, t3 = t2 + a.rec;
      if (P.t < t1 && P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 10);
      if (P.t >= t1 && !P.swung) {
        P.swung = true; sfx(a.heavy ? 'heavy' : 'swing');
        P.vx += Math.cos(P.face) * a.lunge; P.vy += Math.sin(P.face) * a.lunge;
      }
      if (P.t >= t1 && P.t < t2) playerHitCheck(a);
      if (P.t >= t2 && (P.buffer === 'light' || P.buffer === 'heavy' || P.buffer === 'roll')) {
        // light attacks chain; rolls cancel recovery
        if (P.buffer === 'roll' || P.t >= t2 + a.rec * 0.25) { if (tryBuffered(mv)) break; }
      }
      if (P.t >= t3) { P.state = 'free'; P.combo = 0; P.atk = null; }
      break;
    }
    case 'roll': {
      const dur = P.backstep ? 0.32 : 0.48;
      const k = P.t / dur;
      const spd = (P.backstep ? 260 : 360) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      moveEnt(P, Math.cos(P.rollDir) * spd * dt, Math.sin(P.rollDir) * spd * dt);
      if (Math.random() < 0.5) G.particles.push({ x: P.x + rand(-6, 6), y: P.y + 8, vx: rand(-15, 15), vy: rand(-20, 0), life: 0.45, max: 0.45, size: 4, col: 'rgba(110,98,76,0.5)', grav: 0 });
      if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 12);
      if (P.t >= dur) { P.state = 'free'; tryBuffered(mv); }
      break;
    }
    case 'heal': {
      if (mv.m > 0) moveEnt(P, mv.x * 55 * dt, mv.y * 55 * dt);
      if (P.t > 0.5 && !P.healed) {
        P.healed = true; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.6); sfx('heal');
        for (let i = 0; i < 26; i++) G.particles.push({ x: P.x + rand(-14, 14), y: P.y + rand(-4, 10), vx: rand(-10, 10), vy: rand(-80, -30), life: rand(0.5, 1), max: 1, size: rand(2, 4), col: pick(['#f0c060', '#ffdd88', '#e8a040']), grav: 0, glow: true });
      }
      if (P.t >= 0.95) P.state = 'free';
      break;
    }
    case 'hurt':
      if (P.t >= 0.36) P.state = 'free';
      break;
  }

  // grace discovery, bloodstain
  for (const g of G.graces) {
    if (g.afterBoss && !G.bossDead) continue;
    if (!g.found && Math.hypot(g.x - P.x, g.y - P.y) < 90) { g.found = true; banner('LOST GRACE DISCOVERED', '#e9cf86', g.name, 3.2, 0.75); sfx('grace'); save(); }
  }
  if (G.bloodstain && Math.hypot(G.bloodstain.x - P.x, G.bloodstain.y - P.y) < 26) {
    P.runes += G.bloodstain.runes; G.runeShow = 2;
    banner('RUNES RECOVERED', '#e9cf86', '+' + G.bloodstain.runes, 2, 0.6); sfx('runes');
    burst(G.bloodstain.x, G.bloodstain.y, 30, '#ffd77a', 120, 0.9, 3);
    G.bloodstain = null; save();
  }
}

function playerHitCheck(a) {
  const mult = dmgMult();
  for (const e of G.enemies) {
    if (e.dead || P.hitSet.has(e) || e.air > 0.2 || e.state === 'dormant') continue;
    const d = dist(P, e);
    if (d > a.range + e.r) continue;
    const da = Math.abs(angDiff(P.face, angTo(P, e)));
    if (da > a.arc / 2 + (d < e.r + P.r + 6 ? 0.8 : 0.15)) continue;
    P.hitSet.add(e);
    let dmg = a.dmg * mult * rand(0.92, 1.08);
    const crit = e.state === 'stagger';
    if (crit) dmg *= a.heavy ? 2.6 : 1.8;
    damageEnemy(e, dmg, a.poise, angTo(P, e), crit, a.heavy);
  }
}
function damageEnemy(e, dmg, poise, ang, crit, heavy) {
  e.hp -= dmg; e.flash = 0.12; e.showHp = 4;
  e.dmgAccum += dmg; e.dmgAccumT = 1.2;
  dmgNumber(e.x, e.y - e.r, dmg, crit ? '#ffcf5a' : '#fff', crit);
  G.hitstop = crit ? 0.12 : heavy ? 0.085 : 0.055;
  shake(crit ? 9 : heavy ? 6 : 3);
  sfx(crit ? 'crit' : 'hit');
  dirBurst(e.x, e.y - 8, ang, crit ? 22 : 12, e.boss ? '#c9a24a' : '#7a1010', crit ? 300 : 220);
  if (e.state !== 'stagger') {
    e.poise -= poise;
    if (!e.boss) { e.vx += Math.cos(ang) * (heavy ? 160 : 70); e.vy += Math.sin(ang) * (heavy ? 160 : 70); }
    if (e.poise <= 0) {
      e.state = 'stagger'; e.t = 0; e.poise = e.def.poise; e.atk = null; e.air = 0;
      burst(e.x, e.y - 10, 18, '#ffe9a8', 200, 0.5, 2.5);
    } else if (!e.boss && e.state !== 'windup' && e.state !== 'active') {
      // small flinch for regular enemies
      e.state = 'flinch'; e.t = 0;
    }
  }
  if (e.hp <= 0) killEnemy(e);
  else if (e.state === 'idle') { e.state = 'chase'; }
}
function killEnemy(e) {
  e.dead = true; e.deathT = 0; e.hp = 0;
  P.runes += e.def.runes; G.runeShow = 2;
  burst(e.x, e.y - 10, e.boss ? 120 : 30, '#e7c46a', e.boss ? 260 : 120, e.boss ? 2 : 1, 3);
  if (P.lock === e) P.lock = null;
  if (e.boss) {
    G.bossDead = true; G.bossFight = false; G.boss = null; stopDrone();
    G.hitstop = 0.35;
    banner('GREAT ENEMY FELLED', '#e9cf86', '', 5, 1.1);
    sfx('felled'); save();
    setTimeout(() => { if (!G.victoryShown) { G.victoryShown = true; banner('Thank you for playing', '#cbb98a', 'A Site of Grace has appeared where the knight fell', 6, 0.55); } }, 5600);
  }
}

function hurtPlayer(dmg, srcAng, push = 140) {
  if (P.state === 'dead' || isInvuln()) return false;
  P.hp -= dmg; P.flash = 0.2; P.iframes = 0.45;
  dmgNumber(P.x, P.y - 14, dmg, '#ff6a5a');
  shake(7); sfx('hurt'); vibrate(40);
  dirBurst(P.x, P.y - 8, srcAng, 14, '#8a0e0e');
  G.hitstop = Math.max(G.hitstop, 0.06);
  P.vx = Math.cos(srcAng) * push; P.vy = Math.sin(srcAng) * push;
  if (P.hp <= 0) { playerDie(); return true; }
  const armored = P.state === 'attack' && P.atk && P.atk.heavy && P.t >= P.atk.wind * 0.5 && P.t < P.atk.wind + P.atk.act;
  if (!armored && P.state !== 'heal') { P.state = 'hurt'; P.t = 0; P.atk = null; }
  if (P.state === 'heal' && dmg > 15) { P.state = 'hurt'; P.t = 0; }
  return true;
}
function playerDie() {
  P.hp = 0; P.state = 'dead'; P.t = 0; P.lock = null;
  G.deadT = 0; G.bossFight = false; stopDrone();
  G.bloodstain = P.runes > 0 ? { x: P.x, y: P.y, runes: P.runes } : null;
  P.runes = 0;
  sfx('die'); vibrate([60, 40, 120]);
  banner('YOU DIED', '#a81c14', '', 4.2, 1.35);
  save();
}

// ---------------------------------------------------------------- context actions (grace / fog)
function computeContext() {
  G.ctxAction = null;
  if (P.state === 'dead') return;
  for (let i = 0; i < G.graces.length; i++) {
    const g = G.graces[i];
    if (g.afterBoss && !G.bossDead) continue;
    if (g.found && Math.hypot(g.x - P.x, g.y - P.y) < 60) { G.ctxAction = { kind: 'rest', idx: i, label: 'Rest at Grace' }; return; }
  }
  if (fogPresent() && !G.bossFight && Math.abs(P.x - (FOG.x + FOG.w / 2)) < 60 && P.y > FOG.y + FOG.h && P.y - (FOG.y + FOG.h) < 50) {
    G.ctxAction = { kind: 'fog', label: 'Traverse the fog' };
  }
}
function doContext() {
  const c = G.ctxAction; if (!c || P.state !== 'free') return;
  if (c.kind === 'rest') openGrace(c.idx);
  else if (c.kind === 'fog') {
    P.x = 800; P.y = FOG.y - 30; P.face = -Math.PI / 2; P.lock = null;
    cam.y = P.y;
    sfx('fog'); burst(P.x, P.y, 30, 'rgba(230,230,240,0.8)', 100, 0.8, 5);
    G.bossFight = true;
    if (G.boss) { G.boss.state = 'intro'; G.boss.t = 0; }
    startDrone();
  }
}

// ---------------------------------------------------------------- enemies
function enemyStartAttack(e, name) {
  const a = e.def.atks[name];
  e.atk = a; e.atkName = name; e.state = 'windup'; e.t = 0; e.hitDone = false; e.glinted = false; e.lastAtk = name;
  e.leapFrom = null; e.leapTo = null;
}
function chooseAttack(e, d) {
  const opts = [];
  let total = 0;
  for (const [n, a] of Object.entries(e.def.atks)) {
    if (!a.w || (a.p2 && !e.phase2)) continue;
    if (d < (a.min || 0) || d > a.max) continue;
    const w = a.w * (n === e.lastAtk ? 0.35 : 1);
    opts.push([n, w]); total += w;
  }
  if (!opts.length) return null;
  let r = Math.random() * total;
  for (const [n, w] of opts) { r -= w; if (r <= 0) return n; }
  return opts[opts.length - 1][0];
}
function enemyHit(e, dmg, ang) {
  const m = e.phase2 ? 1.12 : 1;
  if (hurtPlayer(dmg * m * rand(0.95, 1.05), ang, e.boss ? 200 : 140)) e.hitDone = true;
}

function updateEnemy(e, dt) {
  if (e.dead) { e.deathT += dt; return; }
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.showHp = Math.max(0, e.showHp - dt);
  if (e.dmgAccumT > 0) { e.dmgAccumT -= dt; if (e.dmgAccumT <= 0) e.dmgAccum = 0; }
  const kb = Math.exp(-8 * dt);
  if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { moveEnt(e, e.vx * dt, e.vy * dt); e.vx *= kb; e.vy *= kb; } else e.vx = e.vy = 0;

  const d = dist(e, P), toP = angTo(e, P);
  const spdMul = e.phase2 ? 1.22 : 1;
  const windMul = e.phase2 ? 0.86 : 1;
  const playerAlive = P.state !== 'dead';

  // phase 2 transition
  if (e.boss && !e.phase2 && e.hp < e.maxHp * 0.5 && (e.state === 'chase' || e.state === 'stagger' && e.t > 1.2)) {
    e.phase2 = true; e.state = 'roar'; e.t = 0; e.atk = null; e.poise = e.def.poise;
    sfx('roar'); shake(12);
  }

  switch (e.state) {
    case 'dormant': return;
    case 'intro':
      e.face = toP;
      if (e.t > 1.1) { e.state = 'chase'; e.t = 0; e.cd = 0.4; }
      return;
    case 'roar':
      e.face = toP;
      if (e.t > 0.45 && e.t - dt <= 0.45) {
        G.rings.push({ x: e.x, y: e.y, r: 10, maxR: 260, spd: 520, th: 22, dmg: 0, push: 340, hit: false, col: '255,140,60' });
        burst(e.x, e.y - 10, 60, '#ff8a3a', 260, 1, 3.5);
      }
      if (e.t > 1.7) { e.state = 'chase'; e.t = 0; e.cd = 0.2; }
      return;
    case 'idle': {
      if (playerAlive && d < e.def.aggro) { e.state = 'chase'; e.t = 0; }
      return;
    }
    case 'return': {
      const dh = Math.hypot(e.home.x - e.x, e.home.y - e.y);
      e.face = Math.atan2(e.home.y - e.y, e.home.x - e.x);
      moveEnt(e, Math.cos(e.face) * e.def.speed * 1.2 * dt, Math.sin(e.face) * e.def.speed * 1.2 * dt);
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3 * dt);
      if (dh < 10 || e.t > 8) { e.state = 'idle'; e.hp = e.maxHp; }
      return;
    }
    case 'flinch':
      if (e.t > 0.25) { e.state = 'chase'; e.t = 0; }
      return;
    case 'stagger':
      if (e.t > (e.boss ? 2.2 : 1.1)) { e.state = 'chase'; e.t = 0; e.cd = 0.1; }
      return;
    case 'chase': {
      if (!playerAlive) { e.state = e.boss ? 'chase' : 'return'; if (e.boss) return; e.t = 0; return; }
      if (!e.boss && Math.hypot(e.home.x - e.x, e.home.y - e.y) > 560) { e.state = 'return'; e.t = 0; return; }
      e.face += angDiff(e.face, toP) * Math.min(1, dt * 7);
      e.cd -= dt;
      if (e.cd <= 0) {
        const n = chooseAttack(e, d);
        if (n) { enemyStartAttack(e, n); return; }
      }
      const spd = e.def.speed * spdMul;
      const keep = e.boss ? 66 : e.def.wolf ? 50 : 38;
      if (d > keep + e.r) {
        moveEnt(e, Math.cos(toP) * spd * dt, Math.sin(toP) * spd * dt);
      } else {
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(0.8, 2.2); }
        const sa = toP + (Math.PI / 2) * e.strafe;
        moveEnt(e, Math.cos(sa) * spd * 0.45 * dt, Math.sin(sa) * spd * 0.45 * dt);
      }
      return;
    }
    case 'windup': {
      const a = e.atk;
      if (a.track) e.face += angDiff(e.face, toP) * Math.min(1, dt * a.track);
      if (a.glint && !e.glinted && e.t >= a.glint * windMul) { e.glinted = true; sfx('glint'); }
      if (a.kind === 'leap') e.leapTo = { x: P.x, y: P.y };
      if (e.t >= a.wind * windMul) {
        e.state = 'active'; e.t = 0; e.hitDone = false;
        if (a.lunge) { e.vx += Math.cos(e.face) * a.lunge; e.vy += Math.sin(e.face) * a.lunge; }
        if (a.kind === 'leap') {
          e.leapFrom = { x: e.x, y: e.y };
          const ld = Math.min(420, dist(e, e.leapTo)), la = angTo(e, e.leapTo);
          e.leapTo = { x: e.x + Math.cos(la) * ld, y: e.y + Math.sin(la) * ld };
        }
        if (a.kind === 'orbs') {
          const n = e.phase2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const oa = e.face + (i - (n - 1) / 2) * 0.22;
            G.projectiles.push({ x: e.x + Math.cos(oa) * 30, y: e.y - 12 + Math.sin(oa) * 30, vx: Math.cos(oa) * 250, vy: Math.sin(oa) * 250, r: 9, dmg: a.dmg, life: 2.6 });
          }
          sfx('orb');
        }
        if (a.kind === 'ring') {
          G.rings.push({ x: e.x, y: e.y, r: 10, maxR: 270, spd: 330, th: 18, dmg: a.dmg, push: 220, hit: false, col: '255,120,40' });
          sfx('slam'); shake(a.shake || 8);
        }
        if (a.kind !== 'leap' && a.kind !== 'ring' && a.kind !== 'orbs') sfx(e.boss || e.def.club ? 'heavy' : 'enemySwing');
      }
      return;
    }
    case 'active': {
      const a = e.atk;
      if (a.kind === 'dash') {
        const hitW = moveEnt(e, Math.cos(e.face) * a.dashSpd * dt, Math.sin(e.face) * a.dashSpd * dt);
        if (Math.random() < 0.7) G.particles.push({ x: e.x, y: e.y + 10, vx: rand(-20, 20), vy: rand(-20, 0), life: 0.5, max: 0.5, size: 5, col: e.phase2 ? 'rgba(255,120,40,0.6)' : 'rgba(110,98,76,0.5)', grav: 0 });
        if (!e.hitDone && d < e.r + P.r + a.rad * 0.4) enemyHit(e, a.dmg, e.face);
        if (hitW && e.t > 0.1) e.t = a.act;
      } else if (a.kind === 'leap') {
        const k = clamp(e.t / a.act, 0, 1);
        e.x = lerp(e.leapFrom.x, e.leapTo.x, k); e.y = lerp(e.leapFrom.y, e.leapTo.y, k);
        collide(e);
        e.air = Math.sin(k * Math.PI);
        if (k >= 1 && !e.hitDone) {
          e.air = 0; e.hitDone = true;
          if (Math.hypot(P.x - e.x, P.y - e.y) < a.rad + P.r) enemyHit(e, a.dmg, toP);
          e.hitDone = true;
          G.rings.push({ x: e.x, y: e.y, r: a.rad * 0.6, maxR: e.phase2 ? 240 : 170, spd: 300, th: 15, dmg: 16, push: 180, hit: false, col: '230,200,140' });
          burst(e.x, e.y, 40, 'rgba(140,120,90,0.8)', 220, 0.7, 5);
          sfx('slam'); shake(a.shake || 12);
        }
      } else if (a.kind === 'circle') {
        if (!e.hitDone && e.t < 0.05 + dt) {
          const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
          if (Math.hypot(P.x - cx, P.y - cy) < a.rad + P.r) enemyHit(e, a.dmg, toP);
          e.hitDone = true;
          burst(cx, cy, 24, 'rgba(140,120,90,0.8)', 180, 0.6, 4);
          sfx('slam'); shake(a.shake || 8);
          if (e.boss && e.phase2) G.rings.push({ x: cx, y: cy, r: 20, maxR: 150, spd: 260, th: 14, dmg: 14, push: 150, hit: false, col: '255,120,40' });
        }
      } else if (a.range && !e.hitDone) {
        if (d < a.range + P.r && Math.abs(angDiff(e.face, toP)) < a.arc / 2 + 0.15) enemyHit(e, a.dmg, e.face);
      }
      if (e.t >= a.act) { e.state = 'recover'; e.t = 0; e.air = 0; }
      return;
    }
    case 'recover': {
      const a = e.atk;
      if (e.t >= a.rec * windMul) {
        const nx = a.next && e.def.atks[a.next];
        const chain = a.chain || 0;
        if (nx && (!nx.p2 || e.phase2) && Math.random() < chain && playerAlive) enemyStartAttack(e, a.next);
        else { e.state = 'chase'; e.t = 0; e.cd = e.boss ? rand(0.15, e.phase2 ? 0.5 : 0.8) : rand(0.5, 1.5); e.atk = null; }
      }
      return;
    }
  }
}

function separate() {
  const list = G.enemies.filter((e) => !e.dead && e.state !== 'dormant');
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.air < 0.3) {
      const dx = a.x - P.x, dy = a.y - P.y, rr = a.r + P.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4 && P.state !== 'roll') {
        const d = Math.sqrt(d2), o = (rr - d);
        const wA = a.boss ? 0.15 : 0.5;
        a.x += (dx / d) * o * wA; a.y += (dy / d) * o * wA;
        P.x -= (dx / d) * o * (1 - wA); P.y -= (dy / d) * o * (1 - wA);
        collide(P); collide(a);
      }
    }
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4) {
        const d = Math.sqrt(d2), o = (rr - d) / 2;
        a.x += (dx / d) * o; a.y += (dy / d) * o; b.x -= (dx / d) * o; b.y -= (dy / d) * o;
      }
    }
  }
}

// ---------------------------------------------------------------- hazards
function updateHazards(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (Math.random() < 0.6) G.particles.push({ x: p.x, y: p.y, vx: rand(-15, 15), vy: rand(-30, 0), life: 0.35, max: 0.35, size: rand(2, 4), col: pick(['#ff9a3a', '#ffcc66', '#ff6a2a']), grav: 0, glow: true });
    let dead = p.life <= 0 || pointInWall(p.x, p.y);
    if (!dead && Math.hypot(P.x - p.x, P.y - p.y) < p.r + P.r) {
      if (hurtPlayer(p.dmg, Math.atan2(p.vy, p.vx), 120)) dead = true;
    }
    if (dead) { burst(p.x, p.y, 10, '#ff9a3a', 90, 0.4, 3); G.projectiles.splice(i, 1); }
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i];
    r.r += r.spd * dt;
    if (!r.hit) {
      const d = Math.hypot(P.x - r.x, P.y - r.y);
      if (Math.abs(d - r.r) < r.th / 2 + P.r * 0.6) {
        const a = Math.atan2(P.y - r.y, P.x - r.x);
        if (r.dmg > 0) { if (hurtPlayer(r.dmg, a, r.push)) r.hit = true; }
        else if (P.state !== 'dead') { P.vx += Math.cos(a) * r.push; P.vy += Math.sin(a) * r.push; r.hit = true; }
      }
    }
    if (r.r >= r.maxR) G.rings.splice(i, 1);
  }
}

// ---------------------------------------------------------------- grace menu / pause
const $ = (id) => document.getElementById(id);
function openGrace(idx) {
  G.graceIdx = idx;
  respawnAtGrace();
  sfx('grace');
  burst(P.x, P.y - 40, 30, '#ffd77a', 80, 1.2, 3);
  G.state = 'menu';
  $('graceName').textContent = G.graces[idx].name;
  refreshGrace();
  $('grace').classList.add('show');
  save();
}
function refreshGrace() {
  recalcStats();
  const c = levelCost();
  $('lvl').textContent = level();
  $('runesHeld').textContent = P.runes;
  $('cost').textContent = c;
  $('sVig').textContent = P.vig; $('sEnd').textContent = P.end; $('sStr').textContent = P.str;
  $('dHp').textContent = P.maxHp; $('dSt').textContent = P.maxSt; $('dAtk').textContent = Math.round(PATK.l1.dmg * dmgMult());
  document.querySelectorAll('#grace .stat button').forEach((b) => (b.disabled = P.runes < c));
}
document.querySelectorAll('#grace .stat button').forEach((b) => b.addEventListener('click', () => {
  const c = levelCost(); if (P.runes < c) return;
  P.runes -= c; P[b.dataset.stat]++;
  recalcStats(); P.hp = P.maxHp; P.st = P.maxSt;
  initAudio(); sfx('runes');
  refreshGrace(); save();
}));
$('btnDepart').addEventListener('click', () => { $('grace').classList.remove('show'); G.state = 'play'; last = performance.now(); });
function setPause(on) {
  if (on && G.state !== 'play') return;
  G.state = on ? 'pause' : 'play';
  $('pause').classList.toggle('show', on);
  $('btnSound').textContent = 'Sound: ' + (AU.on ? 'On' : 'Off');
  keys.clear(); joy.id = null; ptrs.clear(); buttons.forEach((b) => (b.down = false));
  last = performance.now();
}
$('btnResume').addEventListener('click', () => setPause(false));
$('btnSound').addEventListener('click', () => {
  AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? 0.55 : 0;
  $('btnSound').textContent = 'Sound: ' + (AU.on ? 'On' : 'Off'); save();
});
$('btnReset').addEventListener('click', () => {
  if (!confirm('Erase your progress and start over?')) return;
  wipeSave(); location.reload();
});
$('btnStart').addEventListener('click', () => {
  initAudio();
  try {
    const el = document.documentElement;
    if (showTouch && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  } catch (e) { /* not supported */ }
  $('title').classList.remove('show');
  G.state = 'play'; last = performance.now();
  banner(G.graces[G.graceIdx].name, '#e9cf86', '', 2.6, 0.7);
});

// ---------------------------------------------------------------- update
function update(dt) {
  G.time += dt;
  for (const b of G.banners) b.t += dt;
  G.banners = G.banners.filter((b) => b.t < b.dur);
  G.runeShow = Math.max(0, G.runeShow - dt);
  G.shake *= Math.exp(-10 * dt);

  if (G.hitstop > 0) { G.hitstop -= dt; return; }

  updatePlayer(dt);
  for (const e of G.enemies) updateEnemy(e, dt);
  separate();
  updateHazards(dt);
  computeContext();

  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt;
    p.vx *= 0.96; if (!p.grav) p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
  if (G.particles.length > 900) G.particles.splice(0, G.particles.length - 900);
  for (let i = G.numbers.length - 1; i >= 0; i--) { const n = G.numbers[i]; n.y -= 28 * dt; n.life -= dt; if (n.life <= 0) G.numbers.splice(i, 1); }
  G.enemies = G.enemies.filter((e) => !e.dead || e.deathT < 1.2);

  // boss phase 2 flames
  const boss = G.boss;
  if (boss && boss.phase2 && !boss.dead && Math.random() < 0.8) {
    G.particles.push({ x: boss.x + rand(-18, 18), y: boss.y + rand(-10, 8), vx: rand(-10, 10), vy: rand(-90, -40), life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5), col: pick(['#ff8a3a', '#ffbb55', '#ff5a1a']), grav: 0, glow: true });
  }
  if (G.bossFight) {
    G.drumT -= dt;
    if (G.drumT <= 0) { G.drumT = boss && boss.phase2 ? 0.55 : 0.8; if (AU.ctx && AU.on) { tone('sine', 65, 40, 0.25, 0.25); } }
  }

  if (P.state === 'dead') {
    G.deadT += dt;
    if (G.deadT > 4.2) respawnAtGrace();
  }

  // camera
  let tx = P.x, ty = P.y;
  if (P.lock) { tx = lerp(P.x, P.lock.x, 0.35); ty = lerp(P.y, P.lock.y, 0.35); }
  const k = 1 - Math.exp(-7 * dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

// ---------------------------------------------------------------- rendering
function view() {
  const hw = W / 2 / SCALE, hh = H / 2 / SCALE;
  return { x0: cam.x - hw - 80, x1: cam.x + hw + 80, y0: cam.y - hh - 80, y1: cam.y + hh + 120 };
}
function drawGround(v) {
  ctx.fillStyle = '#20251b';
  ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  // subtle large patches
  for (let i = 0; i < 40; i++) {
    const px = (i * 397) % WORLD.w, py = (i * 853) % WORLD.h;
    if (px < v.x0 - 200 || px > v.x1 + 200 || py < v.y0 - 200 || py > v.y1 + 200) continue;
    ctx.fillStyle = i % 2 ? 'rgba(60,70,40,0.25)' : 'rgba(25,28,20,0.35)';
    ctx.beginPath(); ctx.ellipse(px, py, 180, 110, i, 0, TAU); ctx.fill();
  }
  // path
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(92,78,55,0.55)'; ctx.lineWidth = 120;
  ctx.beginPath(); PATH.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  ctx.strokeStyle = 'rgba(118,100,70,0.35)'; ctx.lineWidth = 70; ctx.stroke();
  // arena floor
  if (v.y0 < 1100) {
    const { cx, cy, r } = ARENA;
    ctx.fillStyle = '#2a2724'; ctx.fillRect(300, 150, 1000, 880);
    ctx.fillStyle = '#34302b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let rr = 60; rr < r; rr += 60) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke(); }
    for (let a = 0; a < TAU; a += TAU / 16) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(201,169,90,0.18)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, TAU); ctx.stroke();
  }
  // grass tufts
  ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (const t of TUFTS) {
    if (t.x < v.x0 || t.x > v.x1 || t.y < v.y0 || t.y > v.y1) continue;
    if (t.x > 300 && t.x < 1300 && t.y > 150 && t.y < 1030) continue;
    ctx.strokeStyle = t.c < 0.33 ? '#3d4a2c' : t.c < 0.66 ? '#4a5733' : '#5d6238';
    const s = 6 * t.s, sw = Math.sin(G.time * 1.6 + t.x * 0.05) * 1.5;
    ctx.beginPath();
    ctx.moveTo(t.x - 3, t.y); ctx.lineTo(t.x - 4 + sw, t.y - s);
    ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + sw, t.y - s * 1.3);
    ctx.moveTo(t.x + 3, t.y); ctx.lineTo(t.x + 4 + sw, t.y - s);
    ctx.stroke();
  }
}
function drawShadow(x, y, r, a = 0.35) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 1.15, r * 0.55, 0, 0, TAU); ctx.fill();
}
function swingAngle(face, a, phase, k) {
  const dir = a.dir || 1, half = a.arc / 2;
  if (a.thrust) return face;
  if (a.kind === 'circle') {
    if (phase === 'windup') return face + Math.PI * (0.55 + 0.35 * k) * dir;
    return face;
  }
  if (phase === 'windup') return face + dir * (half + 0.45 * k);
  if (phase === 'active') return face + dir * (half + 0.45) - dir * (2 * half + 0.45) * k;
  return face - dir * half;
}
function drawBlade(x, y, ang, len, width, col, edge, ext = 0) {
  const ex = x + Math.cos(ang) * (len + ext), ey = y + Math.sin(ang) * (len + ext);
  ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, width * 0.35);
  ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8); ctx.lineTo(ex, ey); ctx.stroke();
  // crossguard
  const px = Math.cos(ang + Math.PI / 2) * width * 1.4, py = Math.sin(ang + Math.PI / 2) * width * 1.4;
  const gx = x + Math.cos(ang) * 6, gy = y + Math.sin(ang) * 6;
  ctx.strokeStyle = '#6a5528'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx - px, gy - py); ctx.lineTo(gx + px, gy + py); ctx.stroke();
  return { ex, ey };
}
function drawTrail(cx, cy, a0, a1, r, w, col) {
  if (Math.abs(a1 - a0) < 0.05) return;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, a1 < a0); ctx.stroke();
}

function drawPlayer() {
  const p = P;
  if (p.state === 'dead' && G.deadT > 1.6) return;
  let bob = Math.sin(p.moveAnim) * 1.5;
  let sx = 1, sy = 1;
  let alpha = p.state === 'dead' ? Math.max(0, 1 - G.deadT / 1.6) : 1;
  if (p.state === 'roll') { const k = p.t / (p.backstep ? 0.32 : 0.48); sy = 0.75; sx = 1.1; bob = -Math.sin(k * Math.PI) * 4; }
  drawShadow(p.x, p.y, p.r);
  ctx.save();
  ctx.globalAlpha = alpha;
  const by = p.y - 10 + bob;
  const handA = p.face + 0.9;
  const hx = p.x + Math.cos(handA) * p.r * 0.8, hy = by + Math.sin(handA) * p.r * 0.6;

  // weapon angle
  let wa = p.face + 1.0, phase = null, k = 0, ext = 0;
  if (p.state === 'attack') {
    const a = p.atk;
    if (p.t < a.wind) { phase = 'windup'; k = p.t / a.wind; }
    else if (p.t < a.wind + a.act) { phase = 'active'; k = (p.t - a.wind) / a.act; }
    else { phase = 'rec'; k = 1; }
    wa = swingAngle(p.face, a, phase, k);
    if (a.thrust) ext = phase === 'windup' ? -12 * k : phase === 'active' ? 14 * k : 8;
  } else if (p.state === 'roll') wa = p.rollDir + 2.2;
  else if (p.state === 'heal') wa = p.face + 1.6;

  const behind = Math.sin(p.face) < -0.2;
  const drawWeapon = () => {
    if (phase === 'active' && !p.atk.thrust) {
      const a0 = swingAngle(p.face, p.atk, 'active', 0);
      drawTrail(p.x, by, a0, wa, 34, 22, p.atk.heavy ? 'rgba(255,230,170,0.35)' : 'rgba(255,255,255,0.28)');
    }
    const bx = p.state === 'attack' ? p.x : hx, byy = p.state === 'attack' ? by : hy;
    drawBlade(bx, byy, wa, p.atk && p.atk.heavy ? 50 : 44, p.atk && p.atk.heavy ? 5 : 4, '#b9bec6', '#f2f4f7', ext);
  };
  if (behind) drawWeapon();

  ctx.translate(p.x, by); ctx.scale(sx, sy);
  // cape
  ctx.fillStyle = '#23262e';
  ctx.beginPath();
  const ca = p.face + Math.PI;
  ctx.moveTo(Math.cos(ca + 1.2) * 11, Math.sin(ca + 1.2) * 9);
  ctx.quadraticCurveTo(Math.cos(ca) * 22, Math.sin(ca) * 18 + 6, Math.cos(ca - 1.2) * 11, Math.sin(ca - 1.2) * 9);
  ctx.fill();
  // body
  ctx.fillStyle = p.flash > 0 ? '#ffffff' : '#3c4350';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c9a95a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 13, 0, 0, TAU); ctx.stroke();
  // shield (off-hand)
  const sa = p.face - 0.9;
  ctx.fillStyle = '#5a4630';
  ctx.beginPath(); ctx.ellipse(Math.cos(sa) * 11, Math.sin(sa) * 9, 7, 8, sa, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#9b7d45'; ctx.lineWidth = 1.5; ctx.stroke();
  // hood/head
  const hxo = Math.cos(p.face) * 3, hyo = Math.sin(p.face) * 2 - 11;
  ctx.fillStyle = p.flash > 0 ? '#fff' : '#2b2f38';
  ctx.beginPath(); ctx.arc(hxo, hyo, 7.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9a95a';
  ctx.beginPath(); ctx.arc(hxo + Math.cos(p.face) * 4, hyo + Math.sin(p.face) * 3, 1.6, 0, TAU); ctx.fill();
  // flask glow
  if (p.state === 'heal') {
    ctx.fillStyle = `rgba(255,190,80,${0.5 + 0.5 * Math.sin(p.t * 20)})`;
    ctx.beginPath(); ctx.arc(Math.cos(p.face + 0.9) * 10, Math.sin(p.face + 0.9) * 8 - 6, 4.5, 0, TAU); ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyWorldTransform();
  ctx.globalAlpha = alpha;
  if (!behind) drawWeapon();
  ctx.restore();
}

function drawEnemy(e) {
  const d = e.def;
  let alpha = 1;
  if (e.dead) alpha = Math.max(0, 1 - e.deathT / 1.1);
  if (e.state === 'dormant' && !G.bossFight) alpha = 0.92;
  const lift = e.air * 70;
  drawShadow(e.x, e.y, e.r * (1 - e.air * 0.4), 0.35 * (1 - e.air * 0.5));
  ctx.save();
  ctx.globalAlpha = alpha;
  const by = e.y - (e.r * 0.7) - lift;

  // telegraph ground markers
  if (e.state === 'windup' && e.atk && !e.dead) {
    const a = e.atk, k = e.t / (a.wind * (e.phase2 ? 0.86 : 1));
    if (a.kind === 'circle') {
      const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
      ctx.fillStyle = `rgba(200,40,30,${0.08 + 0.17 * k})`;
      ctx.beginPath(); ctx.arc(cx, cy, a.rad, 0, TAU); ctx.fill();
    } else if (a.kind === 'leap' && e.leapTo) {
      ctx.strokeStyle = `rgba(220,60,40,${0.25 + 0.4 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, a.rad, 0, TAU); ctx.stroke();
    } else if (a.kind === 'ring') {
      ctx.strokeStyle = `rgba(255,120,40,${0.15 + 0.4 * k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, 40 + 40 * k, 0, TAU); ctx.stroke();
    }
  }
  if (e.state === 'active' && e.atk && e.atk.kind === 'leap' && e.leapTo) {
    ctx.fillStyle = 'rgba(200,40,30,0.22)';
    ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, e.atk.rad, 0, TAU); ctx.fill();
  }

  // weapon pose
  let wa = e.face + 0.9, phase = null, k = 0, ext = 0;
  if (e.atk && (e.state === 'windup' || e.state === 'active' || e.state === 'recover')) {
    const a = e.atk;
    const wm = e.phase2 ? 0.86 : 1;
    phase = e.state === 'windup' ? 'windup' : e.state === 'active' ? 'active' : 'rec';
    k = phase === 'windup' ? clamp(e.t / (a.wind * wm), 0, 1) : phase === 'active' ? clamp(e.t / a.act, 0, 1) : 1;
    if (a.kind === 'dash') wa = e.face + 0.35;
    else if (a.kind === 'leap') wa = phase === 'active' ? e.face + Math.PI * (1 - e.t / a.act) : e.face + 2.6;
    else if (a.kind === 'orbs' || a.kind === 'ring') wa = e.face - Math.PI / 2;
    else wa = swingAngle(e.face, a, phase, k);
    if (a.thrust) ext = phase === 'windup' ? -14 * k : phase === 'active' ? 18 * k : 10;
  }
  if (e.state === 'stagger') wa = e.face + 2.4;

  const wolf = d.wolf;
  const behind = Math.sin(e.face) < -0.2;
  const drawWeapon = () => {
    if (wolf || e.dead) return;
    const len = d.wlen;
    if (phase === 'active' && e.atk.range && !e.atk.thrust) {
      const a0 = swingAngle(e.face, e.atk, 'active', 0);
      drawTrail(e.x, by, a0, wa, len * 0.75, len * 0.45, e.boss ? (e.phase2 ? 'rgba(255,140,60,0.35)' : 'rgba(230,200,120,0.3)') : 'rgba(255,220,200,0.22)');
    }
    if (d.club) {
      const ex = e.x + Math.cos(wa) * len, ey = by + Math.sin(wa) * len;
      ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.x, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#5b4632'; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, TAU); ctx.fill();
    } else {
      const tip = drawBlade(e.x, by, wa, len, e.boss ? 7 : 3.5, e.boss ? (e.phase2 ? '#5a2a1a' : '#4a4652') : '#7d776c', e.boss ? (e.phase2 ? '#ff9a50' : '#d7c48a') : '#a9a397', ext);
      if (e.atk && e.atk.glint && e.state === 'windup') {
        const gk = e.t - e.atk.glint * (e.phase2 ? 0.86 : 1);
        if (gk > 0 && gk < 0.25) drawGlint(tip.ex, tip.ey, 1 - gk / 0.25);
      }
    }
  };
  if (behind) drawWeapon();

  const flash = e.flash > 0;
  const tel = e.state === 'windup' ? 0.5 + 0.5 * Math.sin(e.t * 30) : 0;
  if (wolf) {
    ctx.translate(e.x, by + 4); ctx.rotate(e.face);
    ctx.fillStyle = flash ? '#fff' : d.col;
    ctx.beginPath(); ctx.ellipse(-2, 0, 17, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : d.col2;
    ctx.beginPath(); ctx.ellipse(13, 0, 8, 6.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(8, -11); ctx.lineTo(14, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(8, 11); ctx.lineTo(14, 6); ctx.fill();
    ctx.strokeStyle = d.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-26, Math.sin(G.time * 8) * 4); ctx.stroke();
    ctx.fillStyle = e.state === 'windup' ? '#ff4a3a' : '#c23a2a';
    ctx.beginPath(); ctx.arc(17, -3, 1.6, 0, TAU); ctx.arc(17, 3, 1.6, 0, TAU); ctx.fill();
    if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-2, 0, 19, 11, 0, 0, TAU); ctx.stroke(); }
  } else {
    ctx.translate(e.x, by);
    if (e.state === 'stagger') ctx.rotate(Math.sin(e.t * 10) * 0.08);
    const r = e.r;
    if (e.boss) {
      // cape
      const ca = e.face + Math.PI;
      ctx.fillStyle = e.phase2 ? '#3d1810' : '#2a1c30';
      ctx.beginPath();
      ctx.moveTo(Math.cos(ca + 1.3) * r, Math.sin(ca + 1.3) * r * 0.8);
      ctx.quadraticCurveTo(Math.cos(ca) * r * 2.2, Math.sin(ca) * r * 1.8 + 14, Math.cos(ca - 1.3) * r, Math.sin(ca - 1.3) * r * 0.8);
      ctx.fill();
    }
    ctx.fillStyle = flash ? '#fff' : d.col;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.08, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.boss ? d.col2 : 'rgba(0,0,0,0.4)'; ctx.lineWidth = e.boss ? 2.5 : 1.5;
    ctx.stroke();
    if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r + 3, r * 1.08 + 3, 0, 0, TAU); ctx.stroke(); }
    // head
    const hxo = Math.cos(e.face) * r * 0.25, hyo = Math.sin(e.face) * r * 0.18 - r * 0.85;
    const hr = r * (e.boss ? 0.48 : 0.55);
    ctx.fillStyle = flash ? '#fff' : d.head;
    ctx.beginPath(); ctx.arc(hxo, hyo, hr, 0, TAU); ctx.fill();
    if (e.boss) {
      ctx.strokeStyle = d.col2; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hxo - hr * 0.7, hyo - hr * 0.5); ctx.quadraticCurveTo(hxo - hr * 1.6, hyo - hr * 1.2, hxo - hr * 1.2, hyo - hr * 2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hxo + hr * 0.7, hyo - hr * 0.5); ctx.quadraticCurveTo(hxo + hr * 1.6, hyo - hr * 1.2, hxo + hr * 1.2, hyo - hr * 2.2); ctx.stroke();
    }
    // eyes
    const ex = hxo + Math.cos(e.face) * hr * 0.55, ey = hyo + Math.sin(e.face) * hr * 0.4;
    const eyeCol = e.boss ? (e.phase2 ? '#ffb040' : '#e8d080') : '#d8a040';
    ctx.fillStyle = eyeCol;
    const px = Math.cos(e.face + Math.PI / 2) * hr * 0.35, py = Math.sin(e.face + Math.PI / 2) * hr * 0.2;
    ctx.beginPath(); ctx.arc(ex + px, ey + py, 1.6, 0, TAU); ctx.arc(ex - px, ey - py, 1.6, 0, TAU); ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyWorldTransform();
  ctx.globalAlpha = alpha;
  if (!behind) drawWeapon();
  if (e.state === 'stagger') {
    ctx.fillStyle = '#ffd36a'; ctx.font = 'bold 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = G.time * 4 + i * TAU / 3; ctx.fillText('✦', e.x + Math.cos(a) * 14, by - e.r - 10 + Math.sin(a) * 4); }
  }
  ctx.restore();
}
function drawGlint(x, y, k) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const s = 18 * (0.5 + k);
  ctx.fillStyle = `rgba(255,240,180,${k})`;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + s); ctx.lineTo(x - 2.5, y); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x, y + 2.5); ctx.lineTo(x + s, y); ctx.lineTo(x, y - 2.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawTree(t) {
  drawShadow(t.x, t.y, 16, 0.3);
  ctx.fillStyle = '#3a2c20';
  ctx.fillRect(t.x - 4, t.y - 26, 8, 28);
  const near = Math.hypot(P.x - t.x, P.y - (t.y - 40)) < t.size;
  ctx.globalAlpha = near ? 0.45 : 0.95;
  const top = t.y - 34 - t.size * 0.4;
  const g = t.hue < 0.5 ? ['#2e3a24', '#3c4a2c', '#4d5a34'] : ['#3b3524', '#4d4528', '#66592f'];
  ctx.fillStyle = g[0]; ctx.beginPath(); ctx.arc(t.x, top + 6, t.size, 0, TAU); ctx.fill();
  ctx.fillStyle = g[1]; ctx.beginPath(); ctx.arc(t.x - t.size * 0.25, top - 2, t.size * 0.7, 0, TAU); ctx.fill();
  ctx.fillStyle = g[2]; ctx.beginPath(); ctx.arc(t.x - t.size * 0.35, top - 8, t.size * 0.35, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawWall(w) {
  const arena = w.y < 1100 && w.x >= 250 && w.x + w.w <= 1350;
  ctx.fillStyle = arena ? '#2a2622' : '#2f2b26';
  ctx.fillRect(w.x, w.y + w.h - WALL_H, w.w, WALL_H);
  ctx.fillStyle = arena ? '#4a443c' : '#57504a';
  ctx.fillRect(w.x, w.y - WALL_H, w.w, w.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  for (let x = w.x + 20; x < w.x + w.w; x += 22) { ctx.beginPath(); ctx.moveTo(x, w.y + w.h - WALL_H); ctx.lineTo(x, w.y + w.h); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeRect(w.x + 0.5, w.y - WALL_H + 0.5, w.w - 1, w.h - 1);
}
function drawFog() {
  if (!fogPresent()) return;
  const t = G.time;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = FOG.x + (i / 8) * FOG.w, y = FOG.y + FOG.h / 2 - 14 + Math.sin(t * 2 + i) * 6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30);
    const col = G.bossFight ? '255,180,120' : '220,225,240';
    g.addColorStop(0, `rgba(${col},0.22)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - 30, y - 40, 60, 80);
  }
  ctx.restore();
}
function drawGrace(g) {
  if (g.afterBoss && !G.bossDead) return;
  const t = G.time, x = g.x, y = g.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = 46 + Math.sin(t * 2) * 4;
  const gr = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, r);
  gr.addColorStop(0, g.found ? 'rgba(255,215,120,0.55)' : 'rgba(255,215,120,0.25)'); gr.addColorStop(1, 'rgba(255,215,120,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - 10 - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255,220,140,0.85)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const a = t * 1.5 + i * TAU / 5;
    ctx.beginPath(); ctx.moveTo(x, y - 6);
    ctx.quadraticCurveTo(x + Math.cos(a) * 12, y - 18, x + Math.cos(a) * 4, y - 30 - Math.sin(a + t) * 4); ctx.stroke();
  }
  ctx.restore();
  if (G.state === 'play' && Math.random() < 0.15) G.particles.push({ x: x + rand(-10, 10), y: y - 6, vx: rand(-6, 6), vy: rand(-40, -15), life: 1.2, max: 1.2, size: 2, col: '#ffd77a', grav: 0, glow: true });
}

let camOX = 0, camOY = 0;
function applyWorldTransform() {
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, DPR * (W / 2 - (cam.x + camOX) * SCALE), DPR * (H / 2 - (cam.y + camOY) * SCALE));
}

function render() {
  const s = G.shake;
  camOX = s > 0.3 ? rand(-s, s) / SCALE : 0; camOY = s > 0.3 ? rand(-s, s) / SCALE : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0c0a'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  applyWorldTransform();
  const v = view();
  drawGround(v);

  for (const st of STONES) {
    if (st.x < v.x0 || st.x > v.x1 || st.y < v.y0 || st.y > v.y1) continue;
    ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.tilt);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-st.w / 2, -2, st.w + 4, 5);
    ctx.fillStyle = '#5c5850'; ctx.fillRect(-st.w / 2, -st.h, st.w, st.h);
    ctx.fillStyle = '#6d695f'; ctx.fillRect(-st.w / 2, -st.h, st.w, 3);
    ctx.restore();
  }
  if (G.bloodstain) {
    const b = G.bloodstain;
    ctx.fillStyle = 'rgba(120,10,10,0.6)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 14, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,60,40,${0.5 + 0.3 * Math.sin(G.time * 4)})`;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 6, 3, 0, 0, TAU); ctx.fill();
  }
  for (const g of G.graces) drawGrace(g);
  for (const r of G.rings) {
    ctx.strokeStyle = `rgba(${r.col},${0.75 * (1 - r.r / r.maxR) + 0.1})`; ctx.lineWidth = r.th;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
  }

  // sorted drawables
  const list = [];
  for (const t of TREES) if (t.x > v.x0 - 60 && t.x < v.x1 + 60 && t.y > v.y0 && t.y < v.y1 + 80) list.push({ y: t.y, f: () => drawTree(t) });
  for (const w of WALLS) if (w.x < v.x1 && w.x + w.w > v.x0 && w.y < v.y1 && w.y + w.h > v.y0 - 40) list.push({ y: w.y + w.h, f: () => drawWall(w) });
  for (const e of G.enemies) if (e.x > v.x0 && e.x < v.x1 && e.y > v.y0 && e.y < v.y1 + 60) list.push({ y: e.y, f: () => drawEnemy(e) });
  list.push({ y: P.y, f: drawPlayer });
  list.push({ y: FOG.y + FOG.h + 1, f: drawFog });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.f();

  // projectiles
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of G.projectiles) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.4, 'rgba(255,150,50,0.8)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // particles
  for (const p of G.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    if (p.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;

  // lock reticle
  if (P.lock && !P.lock.dead) {
    const e = P.lock, ry = e.y - e.r * 0.7 - e.air * 70;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, ry, 5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, ry, 1.5, 0, TAU); ctx.fill();
  }
  // enemy hp bars
  for (const e of G.enemies) {
    if (e.boss || e.dead || (e.showHp <= 0 && P.lock !== e)) continue;
    const bw = 34, bx = e.x - bw / 2, byy = e.y - e.r * 2.2 - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, 5);
    ctx.fillStyle = '#9b1c16'; ctx.fillRect(bx, byy, bw * (e.hp / e.maxHp), 3);
    if (e.dmgAccum > 0) { ctx.fillStyle = '#ddd'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText(Math.round(e.dmgAccum), bx + bw + 4, byy + 4); }
  }
  // damage numbers
  ctx.textAlign = 'center';
  for (const n of G.numbers) {
    ctx.globalAlpha = clamp(n.life * 2, 0, 1);
    ctx.font = (n.big ? 'bold 16px' : 'bold 12px') + ' Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(n.text, n.x + 1, n.y + 1);
    ctx.fillStyle = n.col; ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;

  // screen-space
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawAtmosphere();
  if (G.state === 'play' || G.state === 'pause' || G.state === 'menu') drawHUD();
  drawBanners();
}

function drawAtmosphere() {
  // golden motes
  if (G.motes.length < 40) for (let i = 0; i < 40; i++) G.motes.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.5, 2), p: Math.random() * TAU });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of G.motes) {
    m.y -= 0.15 * m.s; m.x += Math.sin(G.time + m.p) * 0.2;
    if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
    ctx.fillStyle = `rgba(255,210,120,${0.15 + 0.2 * Math.sin(G.time * 2 + m.p) ** 2})`;
    ctx.fillRect(m.x, m.y, m.s * 1.5, m.s * 1.5);
  }
  ctx.restore();
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, G.bossFight ? 'rgba(25,5,0,0.7)' : 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // hurt flash
  if (P.flash > 0) { ctx.fillStyle = `rgba(140,0,0,${P.flash * 1.2})`; ctx.fillRect(0, 0, W, H); }
  if (P.state !== 'dead' && P.hp < P.maxHp * 0.25) {
    const pulse = 0.12 + 0.1 * Math.sin(G.time * 6);
    const g2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, `rgba(120,0,0,${pulse})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
}

function bar(x, y, w, h, frac, col, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = 'rgba(201,169,90,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
}
function drawHUD() {
  const sa = safeArea();
  const x0 = 16 + sa.l, y0 = 14 + sa.t;
  const maxBar = W * 0.42;
  const hpW = Math.min(maxBar, 110 + P.maxHp * 0.7), stW = Math.min(maxBar, 90 + P.maxSt * 0.7);
  bar(x0, y0, hpW, 9, P.hp / P.maxHp, '#a3201a');
  bar(x0, y0 + 15, stW, 6, Math.max(0, P.st) / P.maxSt, '#3f8a3a');
  // flasks
  ctx.font = 'bold 13px Cinzel, Georgia, serif'; ctx.textAlign = 'left';
  for (let i = 0; i < P.maxFlasks; i++) {
    const fx = x0 + i * 16, fy = y0 + 30;
    ctx.fillStyle = i < P.flasks ? '#e39a3a' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(fx + 6, fy + 9, 5.5, 0, TAU); ctx.fill();
    ctx.fillRect(fx + 4, fy, 4, 5);
  }
  // runes
  ctx.textAlign = 'right';
  const rx = W - 16 - sa.r - (showTouch ? 40 : 0), ry = 30 + sa.t;
  ctx.font = 'bold 15px Cinzel, Georgia, serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('✧ ' + P.runes, rx + 1, ry + 1);
  ctx.fillStyle = G.runeShow > 0 ? '#ffe39a' : '#d8c38e'; ctx.fillText('✧ ' + P.runes, rx, ry);
  ctx.font = '10px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(216,195,142,0.6)';
  ctx.fillText('LV ' + level(), rx, ry + 14);

  // boss bar
  const b = G.boss;
  if (b && G.bossFight && !b.dead) {
    const bw = Math.min(W * 0.5, 520), bx = (W - bw) / 2, by = showTouch ? 52 + sa.t : H - 34 - sa.b;
    ctx.textAlign = 'left'; ctx.font = '13px Cinzel, Georgia, serif';
    ctx.fillStyle = '#e8dfc8'; ctx.fillText(b.def.name, bx, by - 6);
    bar(bx, by, bw, 7, b.hp / b.maxHp, b.phase2 ? '#b8401a' : '#8f1d16');
    if (b.dmgAccum > 0) { ctx.textAlign = 'right'; ctx.fillStyle = '#eee'; ctx.fillText(Math.round(b.dmgAccum), bx + bw, by - 6); }
  }

  if (showTouch && G.state === 'play') drawControls();
  else if (G.ctxAction && G.state === 'play') {
    ctx.textAlign = 'center'; ctx.font = '14px Cinzel, Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 120, H - 92, 240, 30);
    ctx.fillStyle = '#e8dfc8'; ctx.fillText('[F]  ' + G.ctxAction.label, W / 2, H - 72);
  }
}

function drawControls() {
  // joystick
  if (joy.id !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(201,169,90,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.bx, joy.by, joy.R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,220,190,0.35)';
    ctx.beginPath(); ctx.arc(joy.x, joy.y, joy.R * 0.42, 0, TAU); ctx.fill();
  } else {
    const sa = safeArea();
    const gx = 30 + sa.l + joy.R, gy = H - 30 - sa.b - joy.R;
    ctx.strokeStyle = 'rgba(201,169,90,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy, joy.R, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(230,220,190,0.12)'; ctx.beginPath(); ctx.arc(gx, gy, joy.R * 0.42, 0, TAU); ctx.fill();
  }
  for (const b of buttons) {
    if (b.visible && !b.visible()) continue;
    if (b.pill) {
      const w = b.r * 5, h = b.r * 1.3;
      ctx.fillStyle = b.down ? 'rgba(201,169,90,0.4)' : 'rgba(10,8,5,0.6)';
      ctx.strokeStyle = 'rgba(201,169,90,0.8)'; ctx.lineWidth = 1.5;
      roundRect(b.x - w / 2, b.y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe3c2'; ctx.textAlign = 'center'; ctx.font = `${Math.round(h * 0.38)}px Cinzel, Georgia, serif`;
      ctx.fillText(G.ctxAction.label, b.x, b.y + h * 0.13);
      continue;
    }
    let active = b.down;
    let dim = false;
    if (b.name === 'heal') dim = P.flasks <= 0;
    if (b.name === 'lock') active = active || !!P.lock;
    ctx.fillStyle = active ? 'rgba(201,169,90,0.35)' : 'rgba(10,8,5,0.45)';
    ctx.strokeStyle = dim ? 'rgba(201,169,90,0.2)' : 'rgba(201,169,90,0.7)'; ctx.lineWidth = b.name === 'attack' ? 2.5 : 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke();
    drawIcon(b, dim);
  }
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawIcon(b, dim) {
  const { x, y, r } = b;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = dim ? 'rgba(239,227,194,0.3)' : '#efe3c2'; ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const s = r * 0.42;
  switch (b.name) {
    case 'attack':
      ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(s, -s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.3); ctx.lineTo(-s * 0.3, s * 0.9); ctx.stroke();
      break;
    case 'heavy':
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(s, -s); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.lineTo(s * 0.2, s); ctx.stroke();
      break;
    case 'roll':
      ctx.beginPath(); ctx.arc(0, 0, s * 0.8, -Math.PI * 0.2, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.85); ctx.lineTo(s * 0.7, -s * 0.35); ctx.lineTo(s * 0.2, -s * 0.4); ctx.stroke();
      break;
    case 'heal':
      ctx.fillStyle = dim ? 'rgba(227,154,58,0.3)' : '#e39a3a';
      ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.6, 0, TAU); ctx.fill();
      ctx.fillRect(-s * 0.2, -s * 0.8, s * 0.4, s * 0.6);
      ctx.fillStyle = '#efe3c2'; ctx.font = `bold ${Math.round(r * 0.4)}px Georgia, serif`; ctx.textAlign = 'center';
      ctx.fillText(P.flasks, s * 0.95, s * 1.15);
      break;
    case 'lock':
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
      break;
    case 'pause':
      ctx.fillRect(-5, -6, 3.5, 12); ctx.fillRect(1.5, -6, 3.5, 12);
      break;
  }
  if (b.name !== 'pause' && r > 30) {
    ctx.font = `${Math.round(r * 0.2)}px Cinzel, Georgia, serif`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(239,227,194,0.55)'; ctx.fillText(b.label, 0, r * 0.78);
  }
  ctx.restore();
}

function drawBanners() {
  for (const b of G.banners) {
    if (!b.text) continue;
    const fin = Math.min(1, b.t / 0.6), fout = Math.min(1, (b.dur - b.t) / 0.8);
    const a = Math.min(fin, fout);
    const big = b.size >= 1;
    const cy = big ? H * 0.45 : H * 0.3;
    if (big) {
      const g = ctx.createLinearGradient(0, cy - 50, 0, cy + 40);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.65 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, cy - 50, W, 90);
    }
    let fs = Math.round(Math.min(W * 0.085, 64) * b.size);
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = big ? '0.12em' : '0.08em';
    ctx.font = `${big ? 700 : 400} ${fs}px Cinzel, Georgia, serif`;
    const tw = ctx.measureText(b.text).width;
    if (tw > W * 0.86) { fs = Math.floor(fs * (W * 0.86) / tw); ctx.font = `${big ? 700 : 400} ${fs}px Cinzel, Georgia, serif`; }
    const scale = 1 + (1 - fin) * 0.06 + b.t * 0.01;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(scale, scale);
    ctx.globalAlpha = a;
    ctx.shadowColor = b.col; ctx.shadowBlur = big ? 24 : 10;
    ctx.fillStyle = b.col; ctx.fillText(b.text, 0, fs * 0.35);
    ctx.shadowBlur = 0;
    if (b.sub) { ctx.font = `${Math.round(fs * 0.36)}px Cinzel, Georgia, serif`; ctx.fillStyle = '#d8ccae'; ctx.fillText(b.sub, 0, fs * 0.35 + fs * 0.6); }
    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- loop
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
  SCALE = Math.max(0.6, Math.min(W, H) / 370);
  layoutButtons();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, 1 / 30);
  if (G.state === 'play') update(dt);
  else if (G.state === 'title') { G.time += dt; cam.y = 3100 + Math.sin(G.time * 0.2) * 40; }
  render();
  requestAnimationFrame(frame);
}

// boot
load();
recalcStats();
respawnAtGrace();
resize();
requestAnimationFrame(frame);

// test / debug hook
window.__ashen = { G, P, cam, input, keys, update, respawnAtGrace, doContext, ETYPES };
})();
