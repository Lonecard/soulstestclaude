'use strict';
/* UI (title, grace, pause), saving, main loop, boot. */

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- save
const SAVE_KEY = 'ashenreach_save_v2';
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      vig: P.vig, end: P.end, str: P.str, runes: P.runes, seeds: P.seeds, weapon: P.weapon, owned: P.owned,
      graceIdx: G.graceIdx, found: G.graces.map((g) => g.found), defeated: [...G.defeated], taken: [...G.taken],
      bloodstain: G.bloodstain, sound: AU.on,
    }));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return false;
    P.vig = s.vig || 10; P.end = s.end || 10; P.str = s.str || 10; P.runes = s.runes || 0; P.seeds = s.seeds || 0;
    if (Array.isArray(s.owned)) P.owned = s.owned.filter((w) => WEAPONS[w]);
    if (!P.owned.length) P.owned = ['longsword'];
    P.weapon = P.owned.includes(s.weapon) ? s.weapon : P.owned[0];
    G.graceIdx = clamp(s.graceIdx || 0, 0, G.graces.length - 1);
    if (Array.isArray(s.found)) s.found.forEach((f, i) => { if (G.graces[i]) G.graces[i].found = f; });
    G.defeated = new Set(s.defeated || []); G.taken = new Set(s.taken || []);
    G.bloodstain = s.bloodstain || null;
    if (s.sound === false) AU.on = false;
    return true;
  } catch (e) { return false; }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- menus
// A tap that opens a menu can also "click" whatever button appears under the finger.
// Swallow every click inside an overlay for a short moment after it opens.
const MENU_GUARD_MS = 450;
for (const id of ['grace', 'pause']) {
  $(id).addEventListener('click', (e) => {
    if (performance.now() - G.menuOpenedAt < MENU_GUARD_MS) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
function openGrace(idx) {
  G.graceIdx = idx;
  respawnAtGrace();
  sfx('grace');
  burst(P.x, P.y - 40, 30, '#ffd77a', 80, 1.2, 3, 0, true);
  G.state = 'menu'; G.menuOpenedAt = performance.now();
  clearPointers();
  setTab('level');
  refreshGrace();
  $('grace').classList.add('show');
  save();
}
function closeGrace() {
  $('grace').classList.remove('show');
  G.state = 'play'; last = performance.now();
  clearPointers();
}
function setTab(name) {
  document.querySelectorAll('#grace .tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('#grace .tab').forEach((t) => t.classList.toggle('show', t.id === 'tab-' + name));
}
document.querySelectorAll('#grace .tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
function refreshGrace() {
  recalcStats();
  const c = levelCost();
  $('graceName').textContent = G.graces[G.graceIdx].name;
  $('lvl').textContent = level();
  $('runesHeld').textContent = P.runes;
  $('cost').textContent = c;
  $('sVig').textContent = P.vig; $('sEnd').textContent = P.end; $('sStr').textContent = P.str;
  $('dHp').textContent = P.maxHp; $('dSt').textContent = P.maxSt; $('dFl').textContent = P.maxFlasks;
  document.querySelectorAll('#tab-level .stat button').forEach((b) => (b.disabled = P.runes < c));
  // equipment
  const wl = $('weaponList'); wl.innerHTML = '';
  for (const id of P.owned) {
    const w = WEAPONS[id], row = document.createElement('div');
    row.className = 'item' + (id === P.weapon ? ' equipped' : '');
    const dmg = Math.round(w.l[0].dmg * dmgMult()), hv = Math.round(w.heavy.dmg * dmgMult());
    row.innerHTML = `<div><b>${w.name}</b><small>${w.desc}</small><small>Light ${dmg} &middot; Heavy ${hv}${w.bleed ? ' &middot; Bleed' : ''}</small></div>`;
    const b = document.createElement('button');
    b.textContent = id === P.weapon ? 'Equipped' : 'Equip'; b.disabled = id === P.weapon;
    b.addEventListener('click', () => { P.weapon = id; sfx('item'); refreshGrace(); save(); });
    row.appendChild(b); wl.appendChild(row);
  }
  if (P.owned.length < Object.keys(WEAPONS).length) {
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'More armaments lie hidden in the Lands Between. Look for glowing items, and the Tree Sentinel guards a prize.';
    wl.appendChild(hint);
  }
  // travel
  const tl = $('travelList'); tl.innerHTML = '';
  G.graces.forEach((g, i) => {
    if (!g.found || (g.afterBoss && !G.defeated.has(g.afterBoss))) return;
    const zone = zoneAt(g.y).name;
    const row = document.createElement('div'); row.className = 'item' + (i === G.graceIdx ? ' equipped' : '');
    row.innerHTML = `<div><b>${g.name}</b><small>${zone}</small></div>`;
    const b = document.createElement('button');
    b.textContent = i === G.graceIdx ? 'Here' : 'Travel'; b.disabled = i === G.graceIdx;
    b.addEventListener('click', () => { G.graceIdx = i; respawnAtGrace(); G.zone = zoneAt(P.y).name; sfx('fog'); refreshGrace(); save(); });
    row.appendChild(b); tl.appendChild(row);
  });
}
document.querySelectorAll('#tab-level .stat button').forEach((b) => b.addEventListener('click', () => {
  const c = levelCost(); if (P.runes < c) return;
  P.runes -= c; P[b.dataset.stat]++;
  recalcStats(); P.hp = P.hpLag = P.maxHp; P.st = P.maxSt;
  initAudio(); sfx('runes');
  refreshGrace(); save();
}));
$('btnDepart').addEventListener('click', closeGrace);
$('btnLeave').addEventListener('click', closeGrace);

function setPause(on) {
  if (on && G.state !== 'play') return;
  G.state = on ? 'pause' : 'play';
  if (on) G.menuOpenedAt = performance.now();
  $('pause').classList.toggle('show', on);
  $('btnSound').textContent = 'Sound: ' + (AU.on ? 'On' : 'Off');
  clearPointers();
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
  respawnAtGrace();
  G.zone = '';
  G.state = 'play'; last = performance.now();
});

// ---------------------------------------------------------------- loop
// Adaptive quality: if frames run slow, render at a lower resolution.
let maxDPR = 2, slowFrames = 0, frameCount = 0;
function adaptQuality(dt) {
  if (G.state !== 'play' || maxDPR <= 1) return;
  frameCount++;
  if (dt > 1 / 42) slowFrames++;
  if (frameCount >= 120) {
    if (slowFrames > 60) { maxDPR = maxDPR > 1.5 ? 1.5 : 1; resize(); }
    frameCount = slowFrames = 0;
  }
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
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
  adaptQuality(dt);
  dt = Math.min(dt, 1 / 30);
  if (G.state === 'play') update(dt);
  else if (G.state === 'title') {
    G.time += dt;
    cam.x = 1200 + Math.sin(G.time * 0.08) * 260; cam.y = 6500 + Math.cos(G.time * 0.06) * 200;
    for (let i = G.particles.length - 1; i >= 0; i--) { const p = G.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) G.particles.splice(i, 1); }
  }
  render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
genTextures();
genDecor();
buildGrid();
G.graces = GRACE_DEFS.map((g, i) => ({ ...g, found: i === 0 }));
const hadSave = load();
if (hadSave) $('btnStart').textContent = 'Continue';
recalcStats();
respawnAtGrace();
resize();
requestAnimationFrame(frame);

// test / debug hook
window.__ashen = { G, P, cam, input, keys, update, respawnAtGrace, doContext, ETYPES, WEAPONS, openGrace, closeGrace };
