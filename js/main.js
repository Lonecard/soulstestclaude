'use strict';
/* UI (title, grace, pause), saving, main loop, boot. */

const $ = (id) => document.getElementById(id);
const graceKey = (g) => (g.inst || 'ow') + '|' + g.name;

// ---------------------------------------------------------------- save
const SAVE_KEY = 'ashenreach_save_v4';
const OLD_SAVE_KEY = 'ashenreach_save_v3'; // older map scale: keep progress, drop the bloodstain position
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      vig: P.vig, mnd: P.mnd, end: P.end, str: P.str, runes: P.runes, seeds: P.seeds, cerulean: P.cerulean, weapon: P.weapon, owned: P.owned, wlv: P.wlv,
      greatRunes: P.greatRunes, grace: graceKey(G.graces[G.graceIdx]), found: G.graces.filter((g) => g.found).map(graceKey),
      defeated: [...G.defeated], defeatedTypes: [...G.defeatedTypes], taken: [...G.taken], bloodstain: G.bloodstain, clock: G.clock, sound: AU.on,
    }));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    let s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) { s = JSON.parse(localStorage.getItem(OLD_SAVE_KEY) || 'null'); if (s) s.bloodstain = null; }
    if (!s) return false;
    for (const k of ['vig', 'mnd', 'end', 'str']) P[k] = s[k] || 10;
    P.runes = s.runes || 0; P.seeds = s.seeds || 0; P.cerulean = s.cerulean ?? 1; P.wlv = s.wlv || {};
    if (Array.isArray(s.owned)) P.owned = s.owned.filter((w) => WEAPONS[w]);
    if (!P.owned.length) P.owned = ['longsword'];
    P.weapon = P.owned.includes(s.weapon) ? s.weapon : P.owned[0];
    P.greatRunes = s.greatRunes || [];
    const found = new Set(s.found || []);
    G.graces.forEach((g) => { if (found.has(graceKey(g))) g.found = true; });
    const gi = G.graces.findIndex((g) => graceKey(g) === s.grace);
    G.graceIdx = gi >= 0 ? gi : 0;
    G.defeated = new Set(s.defeated || []); G.defeatedTypes = new Set(s.defeatedTypes || []); G.taken = new Set(s.taken || []);
    G.bloodstain = s.bloodstain || null; G.clock = s.clock ?? 10;
    if (s.sound === false) AU.on = false;
    return true;
  } catch (e) { return false; }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- menus
// A tap that opens a menu can also "click" whatever button appears under the finger.
// Swallow every click inside an overlay for a short moment after it opens.
const MENU_GUARD_MS = 450;
for (const id of ['grace', 'pause', 'map']) {
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
  const g = G.graces[G.graceIdx];
  $('graceName').textContent = g.name;
  $('graceSub').textContent = (g.inst ? INST[g.inst].d.name : (regionAt(g.x, g.y) || { name: '' }).name) + '  ·  Rested: HP, FP and flasks restored. Foes have returned.';
  $('lvl').textContent = level();
  $('runesHeld').textContent = P.runes;
  $('cost').textContent = c;
  for (const k of ['vig', 'mnd', 'end', 'str']) $('s_' + k).textContent = P[k];
  $('dHp').textContent = P.maxHp; $('dFp').textContent = P.maxFp; $('dSt').textContent = P.maxSt; $('dFl').textContent = P.maxFlasks + ' + ' + P.maxFpFlasks;
  $('s_flask').textContent = P.maxFlasks + '/' + P.maxFpFlasks;
  $('flaskHp').disabled = P.cerulean <= 0; $('flaskFp').disabled = P.cerulean >= P.totalFlasks;
  $('gRunes').textContent = P.greatRunes.length ? P.greatRunes.join(' · ') : 'None yet';
  document.querySelectorAll('#tab-level button[data-stat]').forEach((b) => (b.disabled = P.runes < c));
  $('btnTime').textContent = G.inst ? 'Time does not pass here' : isNight() ? 'Pass time until morning' : 'Pass time until nightfall';
  $('btnTime').disabled = !!G.inst;
  // equipment
  const wl = $('weaponList'); wl.innerHTML = '';
  for (const id of P.owned) {
    const w = WEAPONS[id], row = document.createElement('div');
    row.className = 'item' + (id === P.weapon ? ' equipped' : '');
    const lv = wLevel(id), mul = (1 + (P.str - 10) * 0.065) * (1 + lv * 0.1);
    const extras = [w.bleed ? 'Blood loss' : '', w.frost ? 'Frost' : '', w.skill ? 'Skill: ' + w.skill.name : ''].filter(Boolean).join(' · ');
    row.innerHTML = `<div><b>${w.name}${lv ? ' +' + lv : ''}</b><small>${w.desc}</small><small>Light ${Math.round(w.l[0].dmg * mul)} · Heavy ${Math.round(w.heavy.dmg * mul)}${extras ? ' · ' + extras : ''}</small></div>`;
    const box = document.createElement('div'); box.className = 'btns';
    const b = document.createElement('button');
    b.textContent = id === P.weapon ? 'Equipped' : 'Equip'; b.disabled = id === P.weapon;
    b.addEventListener('click', () => { P.weapon = id; sfx('item'); refreshGrace(); save(); });
    const u = document.createElement('button');
    const cost = upgradeCost(id);
    u.textContent = lv >= 10 ? 'Max' : 'Upgrade (' + cost + ')';
    u.disabled = lv >= 10 || P.runes < cost;
    u.addEventListener('click', () => { if (P.runes < cost || lv >= 10) return; P.runes -= cost; P.wlv[id] = lv + 1; sfx('clang'); refreshGrace(); save(); });
    box.append(b, u); row.appendChild(box); wl.appendChild(row);
  }
  const hint = document.createElement('p'); hint.className = 'hint';
  hint.textContent = 'Armaments are found where they lie in the Lands Between, or taken from the great enemies who wield them.';
  wl.appendChild(hint);
  // travel, grouped by region / dungeon
  const tl = $('travelList'); tl.innerHTML = '';
  const groups = new Map();
  G.graces.forEach((gr, i) => {
    if (!gr.found || (gr.afterBoss && !G.defeated.has(gr.afterBoss))) return;
    const label = gr.inst ? INST[gr.inst].d.name : (regionAt(gr.x, gr.y) || { name: 'The Lands Between' }).name;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push([gr, i]);
  });
  for (const [label, list] of groups) {
    const h = document.createElement('div'); h.className = 'group'; h.textContent = label; tl.appendChild(h);
    for (const [gr, i] of list) {
      const row = document.createElement('div'); row.className = 'item' + (i === G.graceIdx ? ' equipped' : '');
      row.innerHTML = `<div><b>${gr.name}</b></div>`;
      const b = document.createElement('button');
      b.textContent = i === G.graceIdx ? 'Here' : 'Travel'; b.disabled = i === G.graceIdx;
      b.addEventListener('click', () => { G.graceIdx = i; respawnAtGrace(); sfx('fog'); refreshGrace(); save(); });
      row.appendChild(b); tl.appendChild(row);
    }
  }
}
document.querySelectorAll('#tab-level button[data-stat]').forEach((b) => b.addEventListener('click', () => {
  const c = levelCost(); if (P.runes < c) return;
  P.runes -= c; P[b.dataset.stat]++;
  recalcStats(); P.hp = P.hpLag = P.maxHp; P.st = P.maxSt; P.fp = P.maxFp;
  initAudio(); sfx('runes');
  refreshGrace(); save();
}));
function shiftFlask(d) {
  P.cerulean = clamp(P.cerulean + d, 0, P.totalFlasks);
  recalcStats(); P.flasks = P.maxFlasks; P.fpFlasks = P.maxFpFlasks;
  initAudio(); sfx('item'); refreshGrace(); save();
}
$('flaskHp').addEventListener('click', () => shiftFlask(-1));
$('flaskFp').addEventListener('click', () => shiftFlask(1));
$('btnTime').addEventListener('click', () => {
  G.clock = isNight() ? 8 : 20;
  respawnAtGrace(); refreshGrace(); sfx('grace'); save();
});
$('btnDepart').addEventListener('click', closeGrace);
$('btnLeave').addEventListener('click', closeGrace);

function setPause(on) {
  if (on && G.state !== 'play') return;
  G.state = on ? 'pause' : 'play';
  if (on) G.menuOpenedAt = performance.now();
  $('pause').classList.toggle('show', on);
  $('btnSound').textContent = 'Sound: ' + (AU.on ? 'On' : 'Off');
  const bosses = [...G.defeatedTypes].filter((t) => BOSSES[t]).length;
  $('progress').textContent = `Bosses felled: ${G.defeated.size}  ·  Great Runes: ${P.greatRunes.length}  ·  Graces: ${G.graces.filter((g) => g.found).length}/${G.graces.length}  ·  Boss types: ${bosses}/${Object.keys(BOSSES).length}`;
  clearPointers();
  last = performance.now();
}
$('btnResume').addEventListener('click', () => setPause(false));
$('btnMapP').addEventListener('click', () => { setPause(false); openMap(); });
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
  G.state = 'play'; last = performance.now();
});

// ---------------------------------------------------------------- loop
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
    const g = GRACE_W[0];
    cam.x = g.x + Math.sin(G.time * 0.08) * 300; cam.y = g.y - 300 + Math.cos(G.time * 0.06) * 200;
    for (let i = G.particles.length - 1; i >= 0; i--) { const p = G.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) G.particles.splice(i, 1); }
  }
  if (G.state !== 'map') render(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
genTextures();
buildRegionGrid();
genWorld();
for (const inst of INST_LIST) FOGS.push(...inst.fogs);
buildGrid();
G.graces = [
  ...GRACE_W.map((g) => ({ name: g.name, x: g.x, y: g.y, inst: null, found: g.name === START.grace })),
  ...INST_LIST.flatMap((i) => i.graces.map((g) => ({ ...g, found: false }))),
];
G.graceIdx = G.graces.findIndex((g) => g.name === START.grace);
G.items = [
  ...ITEMS_OW.map((i) => ({ ...i, x: i.x * MU, y: i.y * MU, inst: null })),
  ...INST_LIST.filter((i) => i.pickup).map((i) => i.pickup),
];
const hadSave = load();
if (hadSave) $('btnStart').textContent = 'Continue';
recalcStats();
respawnAtGrace();
resize();
requestAnimationFrame(frame);

// test / debug hook
window.__ashen = { G, P, cam, input, keys, update, respawnAtGrace, doContext, enterDungeon, BOSSES, WEAPONS, INST, DUNGEONS, openGrace, closeGrace, openMap, closeMap, MU, makeEnemy, activateRealm, regionAt };
