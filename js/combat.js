'use strict';
/* Combat & simulation: player, Torrent, skills, enemies, bosses, hazards, travel, day/night. */

// ---------------------------------------------------------------- effects
function burst(x, y, n, col, spd = 160, life = 0.5, size = 3, grav = 0, glow = false) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(spd * 0.3, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), max: life, size: rand(size * 0.5, size), col, grav, glow });
  }
}
function sparks(x, y, ang, n, col = '#ffd890', spd = 320) {
  for (let i = 0; i < n; i++) {
    const a = ang + rand(-0.8, 0.8), s = rand(spd * 0.4, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.12, 0.3), max: 0.3, size: rand(1, 2), col, grav: 0, glow: true, streak: true });
  }
}
function blood(x, y, ang, n, col = '#7a0e0e', spd = 230) {
  for (let i = 0; i < n; i++) {
    const a = ang + rand(-0.6, 0.6), s = rand(spd * 0.3, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.5), max: 0.5, size: rand(1.5, 3.5), col, grav: 300 });
  }
  if (Math.random() < 0.5) decal(x + Math.cos(ang) * rand(10, 30), y + 10 + Math.sin(ang) * rand(10, 30), rand(5, 11), col);
}
function decal(x, y, r, col) { G.decals.push({ x, y, r, col, life: 14, rot: rand(0, TAU) }); if (G.decals.length > 140) G.decals.shift(); }
function dmgNumber(x, y, v, col = '#fff', big = false, text = null) { G.numbers.push({ x: x + rand(-8, 8), y: y - 20, text: text || String(Math.round(v)), life: 0.95, col, big }); }
function banner(text, col, sub = '', dur = 3.2, size = 1, style = '') {
  if (style && style !== 'small') G.banners = G.banners.filter((b) => b.style !== style);
  G.banners.push({ text, col, sub, t: 0, dur, size, style });
}
function shake(a) { G.shake = Math.max(G.shake, a); }
const elHex = (el) => '#' + elc(el).split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------- stats
const weapon = () => WEAPONS[P.weapon] || WEAPONS.longsword;
const wLevel = (id = P.weapon) => P.wlv[id] || 0;
const upgradeCost = (id = P.weapon) => Math.round(260 * Math.pow(wLevel(id) + 1, 1.7));
const level = () => 1 + (P.vig - 10) + (P.mnd - 10) + (P.end - 10) + (P.str - 10);
const levelCost = () => { const l = level(); return Math.floor(60 + 34 * l + 3.4 * l * l); };
function recalcStats() {
  P.maxHp = Math.round(130 + (P.vig - 10) * 15 + Math.max(0, P.vig - 40) * 5);
  P.maxSt = 90 + (P.end - 10) * 7;
  P.maxFp = 50 + (P.mnd - 10) * 6;
  P.maxFlasks = Math.min(14, 4 + P.seeds);
}
const dmgMult = () => (1 + (P.str - 10) * 0.065) * (1 + wLevel() * 0.1) * (P.buffT > 0 ? P.buffMul : 1);
const tierMul = (t) => ({ hp: 1 + 0.62 * (t - 1), dmg: 1 + 0.36 * (t - 1), runes: Math.pow(1.75, t - 1) });
const isNight = () => G.clock >= 19 || G.clock < 5;
function tierAt(x, y, inst) {
  if (inst) return INST[inst].d.tier || (regionAt(INST[inst].d.x * MU, INST[inst].d.y * MU) || { tier: 1 }).tier;
  const r = regionAt(x, y);
  return r && r.tier ? r.tier : 1;
}

// ---------------------------------------------------------------- spawning
let UID = 0;
function makeEnemy(id, x, y, o = {}) {
  const isBoss = !!BOSSES[id];
  const def = isBoss ? BOSSES[id] : MOBS[id];
  const t = tierAt(x, y, o.inst);
  const tm = tierMul(t);
  const rank = isBoss ? RANK[def.rank] || RANK.field : null;
  const hp = Math.round(isBoss ? 650 * rank.hp * tm.hp * (def.hpMul || 1) : def.hp * tm.hp);
  const e = {
    uid: ++UID, type: id, def, x, y, home: { x, y }, r: def.r, hp, maxHp: hp, hpLag: hp, poise: def.poise, maxPoise: def.poise,
    dmgMul: (isBoss ? rank.dmg : 1) * tm.dmg, runes: Math.round((isBoss ? 900 * rank.runes : def.runes) * tm.runes),
    face: Math.PI / 2, vx: 0, vy: 0, state: o.dormant ? 'dormant' : 'idle', t: 0, atk: null, atkName: '', hitDone: false,
    cd: rand(0.3, 1), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(1, 3), flash: 0, showHp: 0,
    dead: false, deathT: 0, boss: isBoss, phase2: false, air: 0, leapFrom: null, leapTo: null,
    lastAtk: '', glinted: false, dmgAccum: 0, dmgAccumT: 0, bleed: 0, frost: 0, frostT: 0, tick: 0, walk: 0, patrolDir: -1,
    inst: o.inst || null, key: o.key || null, night: !!o.night, drop: o.drop, trail: [],
    name: def.name,
  };
  if (def.mimic) e.mimic = true;
  return e;
}
function spawnOverworldMobs(list) {
  const R = rng(777);
  for (const reg of RW) {
    if (reg.blocked || !REGION_MOBS[reg.id] && !REGION_MOBS[reg.biome]) continue;
    const pool = REGION_MOBS[reg.id] || REGION_MOBS[reg.biome];
    const area = (reg.bb.x1 - reg.bb.x0) * (reg.bb.y1 - reg.bb.y0);
    const n = Math.round(area / (900 * 900) * 1.4);
    let made = 0, tries = 0;
    while (made < n && tries++ < n * 8) {
      const x = reg.bb.x0 + R() * (reg.bb.x1 - reg.bb.x0), y = reg.bb.y0 + R() * (reg.bb.y1 - reg.bb.y0);
      if (!pip(x, y, reg.pts) || pointBlocked(x, y)) continue;
      if (GRACE_W.some((g) => Math.hypot(g.x - x, g.y - y) < 420)) continue;
      const type = pool[(R() * pool.length) | 0];
      const pack = type === 'wolf' || type === 'rotdog' || type === 'snow_wolf' || type === 'demi' ? 2 + ((R() * 2) | 0) : 1;
      for (let k = 0; k < pack; k++) list.push(makeEnemy(type, x + k * 30, y + k * 20));
      made++;
    }
  }
  // camps at named locations
  for (const L of LOC_W) {
    if (!['ruins', 'fort', 'village', 'church'].includes(L.kind)) continue;
    const reg = regionAt(L.x, L.y); if (!reg || reg.blocked) continue;
    const pool = REGION_MOBS[reg.id] || REGION_MOBS[reg.biome] || REGION_MOBS.limgrave;
    const n = L.kind === 'fort' ? 5 : 3;
    for (let k = 0; k < n; k++) {
      const a = R() * TAU, d = 60 + R() * 150, x = L.x + Math.cos(a) * d, y = L.y + Math.sin(a) * d;
      if (pointBlocked(x, y) || GRACE_W.some((g) => Math.hypot(g.x - x, g.y - y) < 260)) continue;
      list.push(makeEnemy(pool[(R() * pool.length) | 0], x, y));
    }
  }
}
// keep field bosses far enough from Sites of Grace that resting is always safe
const _spotCache = new Map();
function fieldBossSpot(id, x, y) {
  const k = id + x + ',' + y;
  if (_spotCache.has(k)) return _spotCache.get(k);
  const need = BOSSES[id].aggro + 170;
  let px = x, py = y;
  for (let it = 0; it < 60; it++) {
    let fx = 0, fy = 0;
    for (const g of GRACE_W) {
      const dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy);
      if (d < need) { fx += (dx / (d || 1)) * (need - d); fy += (dy / (d || 1)) * (need - d); }
    }
    if (!fx && !fy) break;
    const nx = px + clamp(fx, -60, 60), ny = py + clamp(fy, -60, 60);
    if (!walkable(nx, ny)) break;
    px = nx; py = ny;
  }
  const out = { x: px, y: py };
  _spotCache.set(k, out);
  return out;
}
function spawnWorld() {
  const all = [];
  spawnOverworldMobs(all);
  FIELD_BOSSES.forEach(([id, x, y, o = {}], i) => {
    const key = 'f:' + i;
    if (G.defeated.has(key) || !BOSSES[id]) return;
    if (o.night && !isNight()) return;
    const p = fieldBossSpot(id, x * MU, y * MU);
    all.push(makeEnemy(id, p.x, p.y, { key, night: o.night }));
  });
  for (const inst of INST_LIST) {
    for (const m of inst.mobs) if (MOBS[m.type]) all.push(makeEnemy(m.type, m.x, m.y, { inst: inst.id }));
    for (const r of inst.bossRooms) {
      const key = bossKey(inst.id, r.enc);
      if (G.defeated.has(key)) continue;
      r.ids.forEach((bid, k) => {
        if (!BOSSES[bid]) return;
        const off = r.ids.length > 1 ? (k === 0 ? -90 : 90) : 0;
        const e = makeEnemy(bid, r.cx + 80, r.cy + off, { inst: inst.id, key, dormant: inst.d.size !== 'arena' });
        e.room = r;
        all.push(e);
      });
    }
  }
  G.all = all;
  G.projectiles.length = 0; G.pproj.length = 0; G.rings.length = 0; G.strikes.length = 0; G.pools.length = 0;
  activateRealm();
}
function activateRealm() { G.enemies = G.all.filter((e) => e.inst === G.inst && !e.dead); }
function refreshNightSpawns() {
  const night = isNight();
  if (night === G.wasNight) return;
  G.wasNight = night;
  if (night) {
    FIELD_BOSSES.forEach(([id, x, y, o = {}], i) => {
      const key = 'f:' + i;
      if (!o.night || G.defeated.has(key) || G.all.some((e) => e.key === key)) return;
      const p = fieldBossSpot(id, x * MU, y * MU);
      const e = makeEnemy(id, p.x, p.y, { key, night: true });
      G.all.push(e); if (!G.inst) G.enemies.push(e);
    });
  } else {
    const gone = (e) => e.night && (e.state === 'idle' || e.state === 'return');
    G.all = G.all.filter((e) => !gone(e)); G.enemies = G.enemies.filter((e) => !gone(e));
  }
}

// ---------------------------------------------------------------- travel
function placePlayer(x, y, inst) {
  P.x = x; P.y = y; P.vx = P.vy = 0; P.lock = null; P.buffer = null; P.iframes = 0.8;
  if (inst !== G.inst) { G.inst = inst; activateRealm(); }
  if (inst) P.mounted = false;
  cam.x = P.x; cam.y = P.y;
  G.arenaFight = null; G.arenaRect = null; stopDrone();
  G.zone = ''; G.locName = '';
}
function respawnAtGrace() {
  const g = G.graces[G.graceIdx];
  recalcStats();
  P.hp = P.hpLag = P.maxHp; P.st = P.maxSt; P.fp = P.maxFp; P.flasks = P.maxFlasks;
  P.state = 'free'; P.t = 0; P.status = { bleed: 0, rot: 0, poison: 0, frost: 0 }; P.rotT = 0; P.poisonT = 0; P.frostT = 0;
  G.inst = g.inst || null;
  spawnWorld();
  placePlayer(g.x, g.y + 44, g.inst || null);
}
function enterDungeon(d) {
  const inst = INST[d.id];
  G.returnPoint = { x: d.x * MU, y: d.y * MU + 50 };
  sfx('fog'); burst(P.x, P.y, 30, 'rgba(230,230,240,0.8)', 100, 0.8, 5);
  placePlayer(inst.spawn.x, inst.spawn.y, d.id);
  banner(d.name.toUpperCase(), '#e8dcb8', '', 3.4, 0.6, 'zone');
}
function leaveDungeon(to) {
  const p = to || G.returnPoint || { x: GRACE_W[0].x, y: GRACE_W[0].y };
  placePlayer(p.x, p.y, null);
}
function reqOk(req) {
  if (!req) return true;
  if (req.boss && !G.defeatedTypes.has(req.boss)) return false;
  if (req.runes && P.greatRunes.length < req.runes) return false;
  if (req.medallion && ['dectus_l', 'dectus_r'].filter((k) => G.taken.has(k)).length < req.medallion) return false;
  return true;
}

// ---------------------------------------------------------------- player actions
const isInvuln = () => P.iframes > 0 || (P.state === 'roll' && P.t > 0.03 && P.t < (P.backstep ? 0.2 : 0.36)) || (P.state === 'skill' && P.skill && P.skill.iframes && P.t < P.skill.iframes);
function useStamina(n) { P.st -= n; P.stDelay = 0.65; if (P.st < -20) P.st = -20; }
const targetable = (e) => !e.dead && e.state !== 'dormant';
function nearestEnemy(maxD, cone, dirA) {
  let best = null, bd = maxD;
  for (const e of G.enemies) {
    if (!targetable(e)) continue;
    const d = dist(P, e) - e.r;
    if (d > bd) continue;
    if (cone && Math.abs(angDiff(dirA, angTo(P, e))) > cone) continue;
    best = e; bd = d;
  }
  return best;
}
function softAim(mv) {
  if (P.lock) { P.face = angTo(P, P.lock); return; }
  const dirA = mv.m > 0.2 ? Math.atan2(mv.y, mv.x) : P.face;
  const t = nearestEnemy(170, 1.0, dirA);
  P.face = t ? angTo(P, t) : dirA;
}
function startAttack(a, mv) {
  if (P.st <= 0) return false;
  useStamina(a.st * (P.mounted ? 0.7 : 1));
  softAim(mv);
  P.state = 'attack'; P.t = 0; P.atk = a; P.hitSet = new Set(); P.swung = false;
  return true;
}
function startRoll(mv) {
  if (P.st <= 0) return false;
  if (P.mounted) { useStamina(10); P.state = 'jump'; P.t = 0; sfx('roll'); return true; }
  useStamina(20);
  P.backstep = mv.m < 0.2;
  P.rollDir = P.backstep ? P.face + Math.PI : Math.atan2(mv.y, mv.x);
  if (!P.backstep && !P.lock) P.face = P.rollDir;
  P.state = 'roll'; P.t = 0;
  sfx('roll');
  return true;
}
function startHeal() {
  if (P.flasks <= 0) { sfx('empty'); banner('No flasks remaining', '#bba', '', 1.2, 0.45, 'small'); return true; }
  P.flasks--; P.state = 'heal'; P.t = 0; P.healed = false;
  return true;
}
function toggleLock() {
  if (P.lock) { P.lock = null; return; }
  P.lock = nearestEnemy(440, 0, 0);
}
function whistle() {
  if (P.state === 'dead') return;
  if (P.mounted) { P.mounted = false; sfx('roll'); return; }
  if (G.inst) { banner('Torrent cannot be summoned here', '#bba', '', 1.6, 0.45, 'small'); return; }
  if (G.arenaFight) return;
  P.mounted = true; sfx('neigh');
  burst(P.x, P.y, 20, 'rgba(200,220,255,0.7)', 90, 0.6, 3, 0, true);
}
function tryBuffered(mv) {
  const b = P.buffer; if (!b) return false;
  const w = weapon();
  let ok = false;
  if (b === 'light') {
    const chaining = P.state === 'attack' && P.atk && P.atk !== w.heavy && !P.atk.skill;
    const next = chaining ? (P.combo + 1) % w.l.length : 0;
    ok = startAttack(w.l[next], mv);
    if (ok) P.combo = next;
  } else if (b === 'heavy') { ok = startAttack(w.heavy, mv); if (ok) P.combo = 0; }
  else if (b === 'roll') ok = startRoll(mv);
  else if (b === 'heal') ok = startHeal();
  else if (b === 'skill') ok = startSkill(mv);
  if (ok) P.buffer = null;
  return ok;
}

// ---------------------------------------------------------------- weapon skills (Ashes of War)
function startSkill(mv) {
  const w = weapon(), sk = w.skill;
  if (!sk || P.mounted) return false;
  if (P.fp < sk.fp) { sfx('empty'); banner('Not enough FP', '#9ab0ff', '', 1, 0.45, 'small'); return true; }
  if (P.st <= 0) return false;
  P.fp -= sk.fp; useStamina(14);
  softAim(mv);
  const base = w.base * sk.mul;
  const S = { kind: sk.kind, name: sk.name, el: sk.el || 'phys', dmg: base, hit: new Set(), done: false, ls: sk.lifesteal };
  switch (sk.kind) {
    case 'thrustup': S.atk = { wind: 0.22, act: 0.14, rec: 0.4, dmg: base, range: w.l[0].range + 22, arc: 0.7, poise: 40, lunge: 300, thrust: true, skill: true }; break;
    case 'unsheathe': S.atk = { wind: 0.4, act: 0.12, rec: 0.42, dmg: base, range: w.l[0].range + 18, arc: 2.8, poise: 40, lunge: 220, dir: 1, skill: true }; break;
    case 'quickstep': S.dur = 0.55; S.iframes = 0.3; break;
    case 'leapslam': S.dur = 0.8; S.iframes = 0.45; break;
    case 'stomp': case 'nova': case 'gravity': S.dur = 0.75; S.iframes = 0.2; break;
    case 'buff': S.dur = 0.8; break;
    case 'wave': S.dur = 0.65; break;
    case 'beam': S.dur = 1.1; break;
    case 'flurry': S.dur = 1.0; S.iframes = sk.name === 'Waterfowl Dance' ? 0.5 : 0; break;
    case 'blink': S.dur = 0.55; S.iframes = 0.3; break;
  }
  if (sk.kind === 'blink' || sk.kind === 'quickstep') {
    // dash up to the target instead of straight through it
    const tgt = nearestEnemy(280, 1.2, P.face);
    S.dash = tgt ? clamp(dist(P, tgt) - tgt.r - P.r - 18, 0, 200) : 180;
  }
  if (S.atk) { P.state = 'attack'; P.t = 0; P.atk = S.atk; P.hitSet = new Set(); P.swung = false; P.atkEl = S.el; sfx('glint'); return true; }
  P.state = 'skill'; P.t = 0; P.skill = S;
  sfx(S.el === 'phys' ? 'heavy' : 'orb');
  return true;
}
function skillHit(e, dmg, ang, poise = 30) {
  if (P.skill.hit.has(e)) return;
  P.skill.hit.add(e);
  damageEnemy(e, dmg * dmgMult() * rand(0.95, 1.05), poise, ang, e.state === 'stagger', true, P.skill.el);
  if (P.skill.ls) P.hp = Math.min(P.maxHp, P.hp + dmg * P.skill.ls);
}
function updateSkill(dt, mv) {
  const S = P.skill, k = P.t / S.dur, w = weapon();
  const enemiesNear = (r) => G.enemies.filter((e) => targetable(e) && dist(P, e) < r + e.r && e.air < 0.3);
  switch (S.kind) {
    case 'quickstep': {
      if (P.t < 0.25) moveEnt(P, Math.cos(P.face) * (S.dash / 0.25) * dt, Math.sin(P.face) * (S.dash / 0.25) * dt);
      else if (!S.done) { S.done = true; for (const e of enemiesNear(w.l[0].range + 10)) if (Math.abs(angDiff(P.face, angTo(P, e))) < 1.3) skillHit(e, S.dmg, angTo(P, e)); sfx('swing'); }
      break;
    }
    case 'blink': {
      if (P.t < 0.12) moveEnt(P, Math.cos(P.face) * (S.dash / 0.12) * dt, Math.sin(P.face) * (S.dash / 0.12) * dt);
      else if (!S.done) { S.done = true; for (const e of enemiesNear(w.l[0].range + 20)) if (Math.abs(angDiff(P.face, angTo(P, e))) < 1.4) skillHit(e, S.dmg, angTo(P, e), 50); sfx('crit'); burst(P.x, P.y - 10, 20, elHex(S.el), 200, 0.5, 3, 0, true); }
      break;
    }
    case 'leapslam': {
      P.air = Math.sin(clamp(P.t / 0.5, 0, 1) * Math.PI) * 0.6;
      if (P.t < 0.5) moveEnt(P, Math.cos(P.face) * 300 * dt, Math.sin(P.face) * 300 * dt);
      else if (!S.done) {
        S.done = true; P.air = 0;
        const cx = P.x + Math.cos(P.face) * 40, cy = P.y + Math.sin(P.face) * 40;
        for (const e of G.enemies) if (targetable(e) && Math.hypot(e.x - cx, e.y - cy) < 80 + e.r) skillHit(e, S.dmg, angTo(P, e), 70);
        burst(cx, cy, 30, 'rgba(160,140,100,0.8)', 200, 0.6, 4); sfx('slam'); shake(9);
        addPRing(cx, cy, 140, S.dmg * 0.4, S.el);
      }
      break;
    }
    case 'stomp': case 'nova': {
      if (P.t > 0.3 && !S.done) {
        S.done = true;
        const r = S.kind === 'stomp' ? 120 : 170;
        addPRing(P.x, P.y, r, S.dmg, S.el);
        burst(P.x, P.y, 40, elHex(S.el), 240, 0.8, 4, 0, S.el !== 'phys');
        sfx('slam'); shake(10);
      }
      break;
    }
    case 'gravity': {
      if (P.t < 0.4) for (const e of enemiesNear(300)) if (!e.boss || e.def.rank !== 'god') { const a = angTo(e, P); moveEnt(e, Math.cos(a) * 260 * dt, Math.sin(a) * 260 * dt); }
      if (P.t > 0.45 && !S.done) { S.done = true; addPRing(P.x, P.y, 180, S.dmg, 'gravity'); burst(P.x, P.y, 50, '#b070ff', 260, 0.8, 4, 0, true); sfx('slam'); shake(12); }
      break;
    }
    case 'buff': {
      if (P.t > 0.4 && !S.done) { S.done = true; P.buffT = 30; P.buffMul = w.skill.mul; burst(P.x, P.y - 10, 40, '#ffe08a', 120, 1, 3, 0, true); sfx('heal'); banner(S.name, '#ffe08a', 'Attack up', 1.5, 0.45, 'small'); }
      break;
    }
    case 'wave': {
      if (P.t > 0.25 && !S.done) {
        S.done = true;
        G.pproj.push({ x: P.x + Math.cos(P.face) * 20, y: P.y - 10 + Math.sin(P.face) * 20, vx: Math.cos(P.face) * 560, vy: Math.sin(P.face) * 560, r: 30, dmg: S.dmg, el: S.el, life: 0.75, hit: new Set(), ang: P.face, wave: true, ls: S.ls });
        sfx('heavy');
      }
      break;
    }
    case 'beam': {
      S.tick = (S.tick || 0) - dt;
      if (P.t > 0.25 && S.tick <= 0) {
        S.tick = 0.14; S.hit.clear();
        const L = 320;
        for (const e of G.enemies) {
          if (!targetable(e)) continue;
          const dd = segDist(e.x, e.y, P.x, P.y, P.x + Math.cos(P.face) * L, P.y + Math.sin(P.face) * L);
          if (dd < e.r + 16) skillHit(e, S.dmg * 0.35, P.face, 6);
        }
      }
      if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 3);
      break;
    }
    case 'flurry': {
      S.tick = (S.tick || 0) - dt;
      if (P.t > 0.08 && S.tick <= 0 && P.t < S.dur - 0.15) {
        S.tick = 0.16; S.hit.clear(); sfx('swing');
        const rng2 = w.l[0].range + 20;
        for (const e of enemiesNear(rng2)) if (Math.abs(angDiff(P.face, angTo(P, e))) < 1.6) skillHit(e, S.dmg, angTo(P, e), 8);
        if (w.bleed) for (const e of S.hit) applyBleed(e, w.bleed * 0.5);
        if (S.name === 'Waterfowl Dance') moveEnt(P, Math.cos(P.face) * 30, Math.sin(P.face) * 30);
      }
      break;
    }
  }
  if (P.t >= S.dur) { P.state = 'free'; P.skill = null; P.air = 0; }
}
function addPRing(x, y, maxR, dmg, el) {
  G.rings.push({ x, y, r: 10, maxR, spd: maxR * 3, th: 18, dmg, push: 0, hit: false, col: elc(el), delay: 0, fx: false, player: true, hitSet: new Set(), el });
}

// ---------------------------------------------------------------- player update
function updatePlayer(dt) {
  P.t += dt;
  P.iframes = Math.max(0, P.iframes - dt);
  P.flash = Math.max(0, P.flash - dt);
  P.buffT = Math.max(0, P.buffT - dt);
  if (P.hpLag > P.hp) P.hpLag = Math.max(P.hp, P.hpLag - P.maxHp * 0.5 * dt * (P.iframes > 0 ? 0 : 1)); else P.hpLag = P.hp;
  const kb = Math.exp(-9 * dt);
  if (Math.abs(P.vx) + Math.abs(P.vy) > 1) { moveEnt(P, P.vx * dt, P.vy * dt); P.vx *= kb; P.vy *= kb; } else P.vx = P.vy = 0;
  P.moving = 0;
  updateStatus(dt);
  if (P.state === 'dead') return;

  if (P.stDelay > 0) P.stDelay -= dt;
  else if (P.state !== 'attack' && P.state !== 'roll' && !P.sprinting) P.st = Math.min(P.maxSt, P.st + (P.mounted ? 70 : 55) * dt);
  P.fp = Math.min(P.maxFp, P.fp + 1.2 * dt);

  const mv = getMove();
  if (input.attack) { P.buffer = 'light'; P.bufferT = 0.4; }
  if (input.heavy) { P.buffer = 'heavy'; P.bufferT = 0.4; }
  if (input.roll) { P.buffer = 'roll'; P.bufferT = 0.4; }
  if (input.heal) { P.buffer = 'heal'; P.bufferT = 0.3; }
  if (input.skill) { P.buffer = 'skill'; P.bufferT = 0.4; }
  input.attack = input.heavy = input.roll = input.heal = input.skill = false;
  if (input.lock) { input.lock = false; toggleLock(); }
  if (input.whistle) { input.whistle = false; whistle(); }
  if (input.ctx) { input.ctx = false; doContext(); }
  P.bufferT -= dt; if (P.bufferT <= 0) P.buffer = null;

  if (P.lock && (!targetable(P.lock) || dist(P, P.lock) > 600)) P.lock = null;
  P.sprinting = false;

  switch (P.state) {
    case 'free': {
      if (tryBuffered(mv)) break;
      const walk = P.mounted ? 330 : 150, sprint = P.mounted ? 470 : 245;
      let spd = walk * mv.m;
      if (mv.m > 0.3 && sprintHeld() && P.st > 0 && !P.lock) { spd = sprint; P.sprinting = true; P.st -= (P.mounted ? 10 : 16) * dt; P.stDelay = 0.35; }
      if (mv.m > 0) {
        moveEnt(P, (mv.x / mv.m) * spd * dt, (mv.y / mv.m) * spd * dt);
        P.moveAnim += dt * spd * 0.07; P.moving = spd;
        if (!P.lock) P.face += angDiff(P.face, Math.atan2(mv.y, mv.x)) * Math.min(1, dt * (P.mounted ? 8 : 16));
        if (P.sprinting && Math.random() < 0.3) G.particles.push({ x: P.x, y: P.y + 8, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, size: 3, col: 'rgba(120,105,80,0.5)', grav: 0 });
      }
      if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 14);
      break;
    }
    case 'attack': {
      const a = P.atk, t1 = a.wind, t2 = a.wind + a.act, t3 = t2 + a.rec;
      if (P.mounted && mv.m > 0) moveEnt(P, mv.x * 250 * dt, mv.y * 250 * dt);
      if (P.t < t1 && P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 10);
      if (P.t >= t1 && !P.swung) {
        P.swung = true; sfx(a === weapon().heavy || weapon().style === 'colossal' ? 'heavy' : 'swing');
        if (!P.mounted) { P.vx += Math.cos(P.face) * a.lunge; P.vy += Math.sin(P.face) * a.lunge; }
        if (a.overhead) {
          const ix = P.x + Math.cos(P.face) * a.range * 0.7, iy = P.y + Math.sin(P.face) * a.range * 0.7;
          burst(ix, iy, 16, weapon().glow || 'rgba(150,130,100,0.8)', 160, 0.5, 3.5, 0, !!weapon().glow);
          shake(5);
        }
      }
      if (P.t >= t1 && P.t < t2) playerHitCheck(a);
      if (P.t >= t2 && (P.buffer === 'light' || P.buffer === 'heavy' || P.buffer === 'roll' || P.buffer === 'skill')) {
        if (P.buffer === 'roll' || P.t >= t2 + a.rec * 0.25) { if (tryBuffered(mv)) break; }
      }
      if (P.t >= t3) { P.state = 'free'; P.combo = 0; P.atk = null; P.atkEl = null; }
      break;
    }
    case 'skill': updateSkill(dt, mv); break;
    case 'roll': {
      const dur = P.backstep ? 0.32 : 0.48, k = P.t / dur;
      const spd = (P.backstep ? 260 : 360) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      moveEnt(P, Math.cos(P.rollDir) * spd * dt, Math.sin(P.rollDir) * spd * dt);
      if (Math.random() < 0.5) G.particles.push({ x: P.x + rand(-6, 6), y: P.y + 8, vx: rand(-15, 15), vy: rand(-20, 0), life: 0.45, max: 0.45, size: 4, col: 'rgba(110,98,76,0.5)', grav: 0 });
      if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 12);
      if (P.t >= dur) { P.state = 'free'; tryBuffered(mv); }
      break;
    }
    case 'jump': {
      P.air = Math.sin(clamp(P.t / 0.5, 0, 1) * Math.PI) * 0.5;
      if (mv.m > 0) moveEnt(P, mv.x * 380 * dt, mv.y * 380 * dt);
      if (P.t >= 0.5) { P.state = 'free'; P.air = 0; }
      break;
    }
    case 'heal': {
      if (mv.m > 0) { moveEnt(P, mv.x * (P.mounted ? 200 : 55) * dt, mv.y * (P.mounted ? 200 : 55) * dt); P.moveAnim += dt * 4; P.moving = 55; }
      if (P.t > 0.5 && !P.healed) {
        P.healed = true; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.55 + 20); sfx('heal');
        for (let i = 0; i < 26; i++) G.particles.push({ x: P.x + rand(-14, 14), y: P.y + rand(-4, 10), vx: rand(-10, 10), vy: rand(-80, -30), life: rand(0.5, 1), max: 1, size: rand(2, 4), col: pick(['#f0c060', '#ffdd88', '#e8a040']), grav: 0, glow: true });
      }
      if (P.t >= 0.95) P.state = 'free';
      break;
    }
    case 'hurt':
      if (P.t >= 0.36) P.state = 'free';
      break;
  }

  // graces, bloodstain, hazards, place names
  for (const g of G.graces) {
    if (g.inst !== G.inst || g.found) continue;
    if (g.afterBoss && !G.defeated.has(g.afterBoss)) continue;
    if (Math.abs(g.x - P.x) < 100 && Math.abs(g.y - P.y) < 100 && Math.hypot(g.x - P.x, g.y - P.y) < 90) { g.found = true; banner('LOST GRACE DISCOVERED', '#e9cf86', g.name, 3.4, 0.75, 'grace'); sfx('grace'); save(); }
  }
  if (G.bloodstain && G.bloodstain.inst === G.inst && Math.hypot(G.bloodstain.x - P.x, G.bloodstain.y - P.y) < 26) {
    P.runes += G.bloodstain.runes; G.runeShow = 2;
    banner('RUNES RECOVERED', '#e9cf86', '+' + G.bloodstain.runes, 2, 0.6, 'small'); sfx('runes');
    burst(G.bloodstain.x, G.bloodstain.y, 30, '#ffd77a', 120, 0.9, 3, 0, true);
    G.bloodstain = null; save();
  }
  if (!G.inst) {
    const pt = patchAt(P.x, P.y);
    if (pt && pt.hazard && P.air <= 0 && !P.mounted) statusBuild(pt.hazard === 'fire' ? null : pt.hazard, 14 * dt, pt.hazard === 'fire' ? 9 * dt : 0);
    const r = regionAt(P.x, P.y);
    if (r && !r.blocked && r.name !== G.zone) {
      const first = !G.zone; G.zone = r.name;
      if (!first || G.state === 'play') banner(r.name.toUpperCase(), '#e8dcb8', '', 3.6, 0.6, 'zone');
    }
    let ln = '';
    for (const L of LOC_W) if (Math.abs(L.x - P.x) < 300 && Math.abs(L.y - P.y) < 300 && Math.hypot(L.x - P.x, L.y - P.y) < 260) { ln = L.name; break; }
    if (ln && ln !== G.locName) banner(ln, '#e8dcb8', '', 2.6, 0.38, 'loc');
    G.locName = ln;
  } else {
    const inst = INST[G.inst];
    for (const p of inst.props) if (p.type === 'pool' && Math.hypot(p.x - P.x, p.y - P.y) < p.rad) statusBuild(p.el === 'rot' ? 'rot' : 'bleed', 18 * dt, 0);
  }
}

// ---------------------------------------------------------------- status effects
function statusBuild(kind, amt, rawDmg = 0) {
  if (rawDmg > 0 && P.state !== 'dead') { P.hp -= rawDmg; if (P.hp <= 0) playerDie(); }
  if (!kind || P.state === 'dead') return;
  P.status[kind] = (P.status[kind] || 0) + amt;
  if (P.status[kind] >= 100) {
    P.status[kind] = 0;
    if (kind === 'bleed') { const d = P.maxHp * 0.15 + 30; P.hp -= d; dmgNumber(P.x, P.y - 20, d, '#ff3b2f', true, 'BLOOD LOSS'); sfx('bleed'); for (let i = 0; i < 3; i++) blood(P.x, P.y - 10, rand(0, TAU), 10, '#a01010', 300); }
    if (kind === 'rot') { P.rotT = 14; banner('SCARLET ROT', '#e05a2a', '', 1.6, 0.45, 'small'); sfx('bleed'); }
    if (kind === 'poison') { P.poisonT = 16; banner('POISONED', '#8ac050', '', 1.6, 0.45, 'small'); sfx('hurt'); }
    if (kind === 'frost') { const d = P.maxHp * 0.1 + 20; P.hp -= d; P.frostT = 20; dmgNumber(P.x, P.y - 20, d, '#bfe8ff', true, 'FROSTBITE'); sfx('clang'); burst(P.x, P.y - 10, 30, '#dff4ff', 160, 0.8, 3, 0, true); }
    if (P.hp <= 0) playerDie();
  }
}
function updateStatus(dt) {
  for (const k of ['bleed', 'rot', 'poison', 'frost']) P.status[k] = Math.max(0, (P.status[k] || 0) - 5 * dt);
  if (P.state === 'dead') return;
  if (P.rotT > 0) { P.rotT -= dt; P.hp -= (P.maxHp * 0.018 + 4) * dt; if (Math.random() < 0.2) G.particles.push({ x: P.x + rand(-8, 8), y: P.y - rand(0, 20), vx: 0, vy: -30, life: 0.6, max: 0.6, size: 2.5, col: '#e05a2a', grav: 0 }); }
  if (P.poisonT > 0) { P.poisonT -= dt; P.hp -= (P.maxHp * 0.008 + 2) * dt; }
  if (P.frostT > 0) P.frostT -= dt;
  if (P.hp <= 0) playerDie();
}

// ---------------------------------------------------------------- hits on enemies
function playerHitCheck(a) {
  const w = weapon(), mult = dmgMult();
  for (const e of G.enemies) {
    if (!targetable(e) || P.hitSet.has(e) || e.air > 0.2) continue;
    const d = dist(P, e);
    if (d > a.range + e.r) continue;
    const da = Math.abs(angDiff(P.face, angTo(P, e)));
    if (da > a.arc / 2 + (d < e.r + P.r + 8 ? 0.8 : 0.15)) continue;
    P.hitSet.add(e);
    let dmg = a.dmg * mult * rand(0.92, 1.08);
    const crit = e.state === 'stagger';
    const isHeavy = a === w.heavy || a.skill;
    if (crit) dmg *= isHeavy ? 2.6 : 1.8;
    damageEnemy(e, dmg, a.poise, angTo(P, e), crit, isHeavy, P.atkEl);
    if (!e.dead && w.bleed) applyBleed(e, w.bleed);
    if (!e.dead && w.frost) applyFrost(e, w.frost);
  }
}
function applyBleed(e, amt) {
  e.bleed += amt;
  const cap = e.boss ? 160 : 100;
  if (e.bleed >= cap) {
    e.bleed = 0;
    const dmg = e.maxHp * (e.boss ? 0.065 : 0.2) + 40 * dmgMult();
    e.hp -= dmg; e.dmgAccum += dmg; e.dmgAccumT = 1.4;
    dmgNumber(e.x, e.y - e.r - 14, dmg, '#ff3b2f', true, 'BLOOD LOSS ' + Math.round(dmg));
    sfx('bleed');
    for (let i = 0; i < 4; i++) blood(e.x, e.y - 10, rand(0, TAU), 10, '#a01010', 300);
    G.hitstop = Math.max(G.hitstop, 0.08);
    if (e.hp <= 0) killEnemy(e);
  }
}
function applyFrost(e, amt) {
  e.frost += amt;
  if (e.frost >= (e.boss ? 160 : 100)) {
    e.frost = 0; e.frostT = 12;
    const dmg = e.maxHp * (e.boss ? 0.05 : 0.12);
    e.hp -= dmg; dmgNumber(e.x, e.y - e.r - 14, dmg, '#bfe8ff', true, 'FROSTBITE');
    burst(e.x, e.y - 10, 30, '#dff4ff', 160, 0.8, 3, 0, true); sfx('clang');
    if (e.hp <= 0) killEnemy(e);
  }
}
function guarding(e) {
  return e.def.guard && (e.state === 'chase' || e.state === 'idle') && Math.abs(angDiff(e.face, angTo(e, P))) < 1.1;
}
function damageEnemy(e, dmg, poise, ang, crit, heavy, el) {
  if (e.frostT > 0) dmg *= 1.2;
  if (guarding(e) && !crit) {
    dmg *= 0.22; poise *= heavy ? 1.3 : 0.5;
    sparks(e.x + Math.cos(ang + Math.PI) * e.r, e.y - 12 + Math.sin(ang + Math.PI) * e.r, ang + Math.PI, 12);
    sfx('clang'); shake(3); e.cd = Math.min(e.cd, 0.15); G.hitstop = 0.05;
    P.vx -= Math.cos(ang) * 120; P.vy -= Math.sin(ang) * 120;
  } else {
    G.hitstop = Math.max(G.hitstop, crit ? 0.13 : heavy ? 0.085 : 0.055);
    shake(crit ? 9 : heavy ? 6 : 3);
    sfx(crit ? 'crit' : 'hit');
    const bcol = e.def.look && (e.def.look.ghost || e.def.look.kind === 'quad' && e.def.look.ghost) ? '#a0c8ff' : e.type === 'margit' || e.type === 'morgott' ? '#b8963a' : e.def.look && e.def.look.kind === 'troll' && e.def.look.variant === 'avatar' ? '#c8a050' : '#7a0e0e';
    blood(e.x, e.y - 10, ang, crit ? 24 : 12, bcol, crit ? 320 : 230);
    sparks(e.x - Math.cos(ang) * e.r * 0.5, e.y - 12, ang, crit ? 10 : 4, el && el !== 'phys' ? elHex(el) : '#fff2c0');
  }
  e.hp -= dmg; e.flash = 0.12; e.showHp = 4;
  e.dmgAccum += dmg; e.dmgAccumT = 1.4;
  dmgNumber(e.x, e.y - e.r, dmg, crit ? '#ffcf5a' : '#fff', crit);
  if (e.state === 'idle' || e.state === 'return') { e.state = 'chase'; e.t = 0; }
  if (!['stagger', 'dormant', 'intro', 'roar'].includes(e.state)) {
    e.poise -= poise;
    if (!e.boss && e.def.hp < 300) { e.vx += Math.cos(ang) * (heavy ? 160 : 70); e.vy += Math.sin(ang) * (heavy ? 160 : 70); }
    if (e.poise <= 0) {
      e.state = 'stagger'; e.t = 0; e.poise = e.maxPoise; e.atk = null; e.air = 0;
      burst(e.x, e.y - 10, 18, '#ffe9a8', 200, 0.5, 2.5, 0, true);
    } else if (!e.boss && e.def.hp < 300 && e.state !== 'windup' && e.state !== 'active') { e.state = 'flinch'; e.t = 0; }
  }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; e.deathT = 0; e.hp = 0;
  P.runes += e.runes; G.runeShow = 2;
  burst(e.x, e.y - 10, e.boss ? 140 : 30, '#e7c46a', e.boss ? 260 : 120, e.boss ? 2 : 1, 3, 0, true);
  if (P.lock === e) P.lock = null;
  if (!e.boss) return;
  const mates = G.all.filter((o) => o.key === e.key);
  if (e.key && mates.every((o) => o.dead)) {
    G.defeated.add(e.key);
    G.defeatedTypes.add(e.type);
    mates.forEach((o) => G.defeatedTypes.add(o.type));
    if (G.arenaFight === e.key) { G.arenaFight = null; G.arenaRect = null; }
    stopDrone();
    G.hitstop = 0.35;
    banner(e.def.felled || (e.def.rank === 'field' || e.def.rank === 'dungeon' ? 'ENEMY FELLED' : 'GREAT ENEMY FELLED'), '#e9cf86', '', 5, 1.1, 'big');
    sfx('felled');
    const drops = mates.map((o) => o.def.drop).filter(Boolean);
    let delay = 5200;
    for (const dr of drops) {
      if (!P.owned.includes(dr)) {
        P.owned.push(dr);
        setTimeout(() => { banner('Obtained ' + WEAPONS[dr].name, '#e9cf86', 'Equip it at a Site of Grace', 3.5, 0.55, 'small'); sfx('item'); }, delay);
        delay += 1600;
      }
    }
    for (const o of mates) if (o.def.rune && !P.greatRunes.includes(o.def.rune)) {
      P.greatRunes.push(o.def.rune);
      setTimeout(() => { banner(o.def.rune.toUpperCase(), '#ffe8a0', 'Great Rune obtained (' + P.greatRunes.length + ')', 4, 0.6, 'small'); sfx('item'); }, delay);
      delay += 1800;
    }
    if (e.def.final) setTimeout(() => { banner('ELDEN LORD', '#ffe8a0', 'You have mended the Elden Ring. Thank you for playing.', 9, 1.1, 'big'); sfx('felled'); }, delay + 400);
    save();
  }
}

// ---------------------------------------------------------------- damage to the player
function hurtPlayer(dmg, srcAng, push = 140, src = null, el = null, status = null) {
  if (P.state === 'dead' || isInvuln()) return false;
  if (P.frostT > 0) dmg *= 1.15;
  P.hp -= dmg; P.flash = 0.2; P.iframes = 0.45;
  dmgNumber(P.x, P.y - 14, dmg, '#ff6a5a');
  shake(7); sfx('hurt'); vibrate(40);
  blood(P.x, P.y - 8, srcAng, 14, '#8a0e0e');
  G.hitstop = Math.max(G.hitstop, 0.06);
  P.vx = Math.cos(srcAng) * push; P.vy = Math.sin(srcAng) * push;
  const st = status || (el && EL[el] && EL[el].status);
  if (st) statusBuild(st, 34);
  if (src && src.def.lifesteal) { src.hp = Math.min(src.maxHp, src.hp + dmg * src.def.lifesteal * 3); burst(src.x, src.y - 20, 10, '#ffd0a0', 80, 0.5, 2, 0, true); }
  if (P.hp <= 0) { playerDie(); return true; }
  if (P.mounted && dmg > P.maxHp * 0.18) { P.mounted = false; banner('Thrown from Torrent', '#bba', '', 1.4, 0.45, 'small'); }
  const armored = P.state === 'attack' && P.atk && (P.atk === weapon().heavy) && P.t >= P.atk.wind * 0.5 && P.t < P.atk.wind + P.atk.act;
  if (!armored && P.state !== 'heal' && P.state !== 'skill' && !P.mounted) { P.state = 'hurt'; P.t = 0; P.atk = null; }
  if (P.state === 'heal' && dmg > 15) { P.state = 'hurt'; P.t = 0; }
  return true;
}
function playerDie() {
  if (P.state === 'dead') return;
  P.hp = 0; P.state = 'dead'; P.t = 0; P.lock = null; P.mounted = false;
  G.deadT = 0; G.arenaFight = null; G.arenaRect = null; stopDrone();
  G.bloodstain = P.runes > 0 ? { x: P.x, y: P.y, runes: P.runes, inst: G.inst } : null;
  P.runes = 0;
  sfx('die'); vibrate([60, 40, 120]);
  banner('YOU DIED', '#a81c14', '', 4.2, 1.35, 'big');
  save();
}

// ---------------------------------------------------------------- context actions
function computeContext() {
  G.ctxAction = null;
  if (P.state === 'dead') return;
  const near = (x, y, r) => Math.abs(x - P.x) < r && Math.abs(y - P.y) < r && Math.hypot(x - P.x, y - P.y) < r;
  for (let i = 0; i < G.graces.length; i++) {
    const g = G.graces[i];
    if (g.inst !== G.inst || !g.found) continue;
    if (g.afterBoss && !G.defeated.has(g.afterBoss)) continue;
    if (near(g.x, g.y, 60)) { G.ctxAction = { kind: 'rest', idx: i, label: 'Rest at Grace' }; return; }
  }
  for (const it of G.items) {
    if (it.inst !== G.inst || G.taken.has(it.id)) continue;
    if (it.req && !G.defeatedTypes.has(it.req)) continue;
    if (near(it.x, it.y, 42)) { G.ctxAction = { kind: 'item', item: it, label: 'Pick up' }; return; }
  }
  if (!G.inst) {
    for (const e of ENTRANCES) if (near(e.x, e.y, 56)) {
      const d = e.d;
      const label = d.label ? d.label : d.theme === 'evergaol' ? 'Enter the Evergaol' : 'Enter ' + d.name;
      G.ctxAction = { kind: 'dungeon', d, label }; return;
    }
    for (const l of LIFTS) if (near(l.x * MU, l.y * MU, 56)) { G.ctxAction = { kind: 'lift', l, label: 'Take the ' + l.name }; return; }
  } else {
    const inst = INST[G.inst];
    for (const p of inst.portals) {
      if (p.after && !G.defeated.has(p.after)) continue;
      if (near(p.x, p.y, 60)) { G.ctxAction = { kind: 'portal', p, label: p.label }; return; }
    }
    if (!G.arenaFight) for (const f of inst.fogs) {
      if (!f.enter || !fogSolid(f)) continue;
      const left = f.x - P.x;
      if (Math.abs(P.y - (f.y + f.h / 2)) < 70 && left > 0 && left < 60) { G.ctxAction = { kind: 'fog', fog: f, label: 'Traverse the fog' }; return; }
    }
  }
}
function doContext() {
  const c = G.ctxAction; if (!c || (P.state !== 'free' && P.state !== 'heal')) return;
  if (c.kind === 'rest') openGrace(c.idx);
  else if (c.kind === 'item') {
    const it = c.item;
    G.taken.add(it.id);
    sfx('item'); burst(it.x, it.y, 24, '#ffe7a0', 90, 0.8, 3, 0, true);
    if (it.weapon) { if (!P.owned.includes(it.weapon)) P.owned.push(it.weapon); banner('Obtained ' + WEAPONS[it.weapon].name, '#e9cf86', 'Equip it at a Site of Grace', 3.2, 0.55, 'small'); }
    if (it.seed) { P.seeds++; recalcStats(); P.flasks = Math.min(P.maxFlasks, P.flasks + 1); banner('Golden Seed', '#e9cf86', 'Flask charges +1', 3, 0.55, 'small'); }
    if (it.runes) { P.runes += it.runes; G.runeShow = 2; banner('Golden Rune', '#e9cf86', '+' + it.runes + ' runes', 2.5, 0.55, 'small'); }
    if (it.medallion) banner(it.label, '#e9cf86', 'Key item', 3, 0.55, 'small');
    save();
  } else if (c.kind === 'dungeon') {
    if (!reqOk(c.d.req)) { banner(c.d.req.msg, '#cbb98a', '', 3.4, 0.4, 'small'); sfx('empty'); return; }
    enterDungeon(c.d);
  } else if (c.kind === 'lift') {
    if (!reqOk(c.l.req)) { banner(c.l.req.msg, '#cbb98a', '', 3.4, 0.4, 'small'); sfx('empty'); return; }
    sfx('fog'); placePlayer(c.l.to[0] * MU, c.l.to[1] * MU, null);
    banner(c.l.name.toUpperCase(), '#e8dcb8', '', 2.6, 0.5, 'loc');
  } else if (c.kind === 'portal') {
    const p = c.p;
    if (p.kind === 'leave') leaveDungeon();
    else if (p.kind === 'next') enterDungeon(DUNGEON_BY_ID[p.to]);
    else {
      const d = DUNGEON_BY_ID[p.inst];
      if (d.exit) leaveDungeon({ x: d.exit[0] * MU, y: d.exit[1] * MU });
      else if (d.id === 'ashen') { leaveDungeon({ x: GRACE_W[0].x, y: GRACE_W[0].y + 40 }); banner('THE AGE OF ORDER', '#ffe8a0', 'Your journey continues, Elden Lord', 6, 0.7, 'big'); }
      else leaveDungeon();
    }
  } else if (c.kind === 'fog') {
    const f = c.fog;
    P.x = f.x + f.w + 30; P.y = f.y + f.h / 2; P.face = 0; P.lock = null; P.vx = P.vy = 0; P.mounted = false;
    sfx('fog'); burst(P.x, P.y, 30, 'rgba(230,230,240,0.8)', 100, 0.8, 5);
    const bosses = G.enemies.filter((e) => e.key === f.key && !e.dead);
    if (bosses.length) {
      G.arenaFight = f.key; G.arenaRect = bosses[0].room;
      for (const b of bosses) { b.state = 'intro'; b.t = 0; }
      startDrone(bosses[0].def.drone || 50);
    }
  }
}

// ---------------------------------------------------------------- enemy AI
function enemyStartAttack(e, name) {
  const a = e.def.atks[name];
  e.atk = a; e.atkName = name; e.state = 'windup'; e.t = 0; e.hitDone = false; e.glinted = false; e.lastAtk = name;
  e.leapFrom = null; e.leapTo = null; e.tick = 0; e.beamA = e.face;
}
function chooseAttack(e, d) {
  const opts = [];
  let total = 0;
  for (const [n, a] of Object.entries(e.def.atks)) {
    if (!a.w || (a.p2 && !e.phase2)) continue;
    if (d < (a.min || 0) || d > a.max) continue;
    const w = a.w * (n === e.lastAtk ? 0.35 : 1) * (e.phase2 && a.p2 ? 1.6 : 1);
    opts.push([n, w]); total += w;
  }
  if (!opts.length) return null;
  let r = Math.random() * total;
  for (const [n, w] of opts) { r -= w; if (r <= 0) return n; }
  return opts[opts.length - 1][0];
}
function enemyHit(e, dmg, ang, a) {
  if (hurtPlayer(dmg * e.dmgMul * (e.phase2 ? 1.1 : 1) * rand(0.95, 1.05), ang, e.boss ? 200 : 140, e, a && a.el, a && a.status)) e.hitDone = true;
}
function addRing(x, y, o) {
  G.rings.push({ x, y, r: o.r0 || 16, maxR: o.maxR || 160, spd: o.spd || 300, th: o.th || 15, dmg: o.dmg || 0, push: o.push || 160, hit: false, col: o.col || '230,200,140', delay: o.delay || 0, fx: !!o.fx, el: o.el });
}
const windMul = (e) => (e.phase2 ? 0.88 : 1);

function updateEnemy(e, dt) {
  if (e.dead) { e.deathT += dt; return; }
  const dx = e.x - P.x, dy = e.y - P.y;
  if ((e.state === 'idle' || e.state === 'dormant') && (Math.abs(dx) > 1100 || Math.abs(dy) > 1100) && !e.def.patrol) return;
  const d = Math.hypot(dx, dy);
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.showHp = Math.max(0, e.showHp - dt);
  e.bleed = Math.max(0, e.bleed - 5 * dt); e.frost = Math.max(0, e.frost - 5 * dt); e.frostT = Math.max(0, e.frostT - dt);
  if (e.hpLag > e.hp) e.hpLag = Math.max(e.hp, e.hpLag - e.maxHp * 0.25 * dt * (e.dmgAccumT > 0.6 ? 0 : 1)); else e.hpLag = e.hp;
  if (e.dmgAccumT > 0) { e.dmgAccumT -= dt; if (e.dmgAccumT <= 0) e.dmgAccum = 0; }
  const kb = Math.exp(-8 * dt);
  if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { moveEnt(e, e.vx * dt, e.vy * dt); e.vx *= kb; e.vy *= kb; e.walk += dt * 6; } else e.vx = e.vy = 0;
  if (e.def.look && e.def.look.kind === 'serpent') { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 40) e.trail.pop(); }

  const toP = Math.atan2(P.y - e.y, P.x - e.x);
  const spdMul = e.phase2 ? 1.2 : 1;
  const playerAlive = P.state !== 'dead';
  const def = e.def;

  if (def.p2 && !e.phase2 && e.hp < e.maxHp * def.p2 && (e.state === 'chase' || (e.state === 'stagger' && e.t > 1.2))) {
    e.phase2 = true; e.atk = null; e.poise = e.maxPoise;
    if (def.p2name) e.name = def.p2name;
    if (def.p2roar) { e.state = 'roar'; e.t = 0; sfx('roar'); shake(12); }
    else { sfx('glint'); sfx('item'); burst(e.x, e.y - 20, 60, '#ffe08a', 220, 1, 3, 0, true); }
  }

  switch (e.state) {
    case 'dormant': return;
    case 'intro':
      e.face = toP;
      if (e.t > 1.2) { e.state = 'chase'; e.t = 0; e.cd = 0.4; }
      return;
    case 'roar':
      e.face = toP;
      if (e.t > 0.45 && e.t - dt <= 0.45) {
        addRing(e.x, e.y, { r0: 10, maxR: 300, spd: 520, th: 22, push: 360, col: def.el ? elc(def.el) : '255,140,60' });
        burst(e.x, e.y - 10, 80, '#ff8a3a', 280, 1.1, 3.5, 0, true);
      }
      if (e.t > 1.8) { e.state = 'chase'; e.t = 0; e.cd = 0.2; }
      return;
    case 'idle': {
      if (def.patrol) {
        const ty = e.home.y + e.patrolDir * 420;
        if (Math.abs(e.y - ty) < 10 || e.t > 14) { e.patrolDir *= -1; e.t = 0; }
        const a = Math.atan2(ty - e.y, e.home.x - e.x);
        e.face += angDiff(e.face, a) * Math.min(1, dt * 3);
        moveEnt(e, Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt); e.walk += dt * 2.5;
      }
      if (playerAlive && d < def.aggro * (P.mounted ? 1.15 : 1)) { e.state = 'chase'; e.t = 0; if (e.boss && !e.inst) { startDrone(e.def.drone || 60); if (def.mount) sfx('neigh'); } }
      return;
    }
    case 'return': {
      const dh = Math.hypot(e.home.x - e.x, e.home.y - e.y);
      e.face = Math.atan2(e.home.y - e.y, e.home.x - e.x);
      moveEnt(e, Math.cos(e.face) * def.speed * 1.2 * dt, Math.sin(e.face) * def.speed * 1.2 * dt); e.walk += dt * 6;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3 * dt);
      if (dh < 10 || e.t > 8) { e.state = 'idle'; e.hp = e.maxHp; e.x = e.home.x; e.y = e.home.y; }
      return;
    }
    case 'flinch':
      if (e.t > 0.25) { e.state = 'chase'; e.t = 0; }
      return;
    case 'stagger':
      if (e.t > (e.boss ? 2.2 : 1.1)) { e.state = 'chase'; e.t = 0; e.cd = 0.1; }
      return;
    case 'chase': {
      if (!playerAlive) { if (!e.inst || !e.boss) { e.state = 'return'; e.t = 0; } return; }
      const leash = e.boss ? 1000 : 600;
      if (G.arenaFight !== e.key || !e.key) {
        if (Math.hypot(e.home.x - e.x, e.home.y - e.y) > leash) { e.state = 'return'; e.t = 0; return; }
      }
      e.face += angDiff(e.face, toP) * Math.min(1, dt * 7);
      e.cd -= dt;
      if (e.cd <= 0) {
        const n = chooseAttack(e, d);
        if (n) { enemyStartAttack(e, n); return; }
      }
      const spd = def.speed * spdMul;
      if (spd <= 0) return;
      if (def.ranged) {
        let mvA, s = spd;
        if (d < def.ranged.flee) mvA = toP + Math.PI;
        else if (d > def.ranged.keep + 60) mvA = toP;
        else { e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(1, 2.5); } mvA = toP + (Math.PI / 2) * e.strafe; s *= 0.5; }
        moveEnt(e, Math.cos(mvA) * s * dt, Math.sin(mvA) * s * dt); e.walk += dt * 6;
        return;
      }
      const keep = e.boss ? Math.max(50, e.r * 1.6) : def.look && def.look.kind === 'quad' ? 46 : 38;
      if (d > keep + e.r) moveEnt(e, Math.cos(toP) * spd * dt, Math.sin(toP) * spd * dt);
      else {
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(0.8, 2.2); }
        const sa = toP + (Math.PI / 2) * e.strafe;
        moveEnt(e, Math.cos(sa) * spd * 0.45 * dt, Math.sin(sa) * spd * 0.45 * dt);
      }
      e.walk += dt * (spd / 14);
      return;
    }
    case 'windup': {
      const a = e.atk;
      if (a.track) e.face += angDiff(e.face, toP) * Math.min(1, dt * a.track);
      if (a.glint && !e.glinted && e.t >= a.glint * windMul(e)) { e.glinted = true; sfx('glint'); }
      if (a.kind === 'leap') e.leapTo = { x: P.x, y: P.y };
      if (a.kind === 'beam') e.beamA = e.face;
      if (e.t >= a.wind * windMul(e)) {
        e.state = 'active'; e.t = 0; e.hitDone = false; e.tick = 0;
        if (a.lunge && e.def.speed > 0) { e.vx += Math.cos(e.face) * a.lunge; e.vy += Math.sin(e.face) * a.lunge; }
        startActive(e, a, toP);
      }
      return;
    }
    case 'active': {
      updateActive(e, e.atk, dt, d, toP);
      if (e.state === 'active' && e.t >= e.atk.act) { e.state = 'recover'; e.t = 0; e.air = 0; }
      return;
    }
    case 'recover': {
      const a = e.atk;
      if (e.t >= a.rec * windMul(e)) {
        const nx = a.next && def.atks[a.next];
        if (nx && (!nx.p2 || e.phase2) && Math.random() < (a.chain || 0) && playerAlive) enemyStartAttack(e, a.next);
        else { e.state = 'chase'; e.t = 0; e.cd = e.boss ? rand(0.15, e.phase2 ? 0.45 : 0.8) : rand(0.5, 1.5); e.atk = null; }
      }
      return;
    }
  }
}

function startActive(e, a, toP) {
  const kind = a.kind, col = elc(a.el);
  if (kind === 'leap') {
    e.leapFrom = { x: e.x, y: e.y };
    const ld = Math.min(460, dist(e, e.leapTo)), la = angTo(e, e.leapTo);
    e.leapTo = { x: e.x + Math.cos(la) * ld, y: e.y + Math.sin(la) * ld };
  } else if (kind === 'arrow') {
    G.projectiles.push({ type: 'arrow', x: e.x + Math.cos(e.face) * 16, y: e.y - 12 + Math.sin(e.face) * 16, vx: Math.cos(e.face) * a.spd, vy: Math.sin(e.face) * a.spd, r: 5, dmg: a.dmg * e.dmgMul, life: 1.4, el: a.el });
    sfx('arrow');
  } else if (kind === 'volley') {
    const n = a.n + (e.phase2 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const oa = e.face + (i - (n - 1) / 2) * a.spread;
      G.projectiles.push({ type: 'orb', x: e.x + Math.cos(oa) * (e.r + 8), y: e.y - 14 + Math.sin(oa) * (e.r + 8), vx: Math.cos(oa) * a.spd, vy: Math.sin(oa) * a.spd, r: a.pr || 8, dmg: a.dmg * e.dmgMul, life: 3, homing: a.homing, el: a.el, status: a.status, src: e });
    }
    sfx('orb');
  } else if (kind === 'daggers') {
    const n = a.n + (e.phase2 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 26;
      G.projectiles.push({ type: 'dagger', owner: e, ox: Math.cos(e.face + Math.PI / 2) * off, oy: Math.sin(e.face + Math.PI / 2) * off - 34, x: e.x, y: e.y - 30, vx: 0, vy: 0, r: 6, dmg: a.dmg * e.dmgMul, life: 3, hover: 0.3 + i * 0.16, ang: toP, el: a.el });
    }
    sfx('glint');
  } else if (kind === 'stomps') {
    for (let i = 0; i < a.n; i++) addRing(e.x, e.y, { r0: 20, maxR: a.maxR + i * 30, spd: 330, th: 16, dmg: a.dmg * e.dmgMul, push: 170, col: a.el ? col : '220,190,140', delay: i * 0.32, fx: true, el: a.el });
  } else if (kind === 'strikes') {
    const n = a.n + (e.phase2 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const px = i === 0 ? P.x : P.x + rand(-a.spread, a.spread), py = i === 0 ? P.y : P.y + rand(-a.spread, a.spread);
      G.strikes.push({ x: px, y: py, r: a.rad, t: a.delay + i * 0.12, max: a.delay + i * 0.12, dmg: a.dmg * e.dmgMul, el: a.el, status: a.status, boom: 0 });
    }
    sfx('glint');
  } else if (kind === 'nova') {
    addRing(e.x, e.y, { r0: e.r, maxR: a.maxR, spd: 320, th: 22, dmg: a.dmg * e.dmgMul, push: 220, col, el: a.el });
    burst(e.x, e.y - 10, 50, '#' + col.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join(''), 260, 0.9, 4, 0, true);
    sfx('slam'); shake(a.shake || 10);
  } else if (kind === 'pool') {
    for (let i = 0; i < a.n; i++) {
      const px = i === 0 ? P.x : P.x + rand(-140, 140), py = i === 0 ? P.y : P.y + rand(-140, 140);
      G.pools.push({ x: px, y: py, r: a.rad, life: a.life, max: a.life, el: a.el, dps: a.dmg * e.dmgMul, status: a.status || (EL[a.el] && EL[a.el].status), tick: 0.6, grow: 0 });
    }
    sfx('orb');
  } else if (kind === 'blink') {
    const ba = P.face + Math.PI + rand(-0.7, 0.7);
    burst(e.x, e.y - 10, 24, a.el ? elHex(a.el) : '#c8c8ff', 160, 0.6, 3, 0, true);
    e.x = P.x + Math.cos(ba) * (e.r + 70); e.y = P.y + Math.sin(ba) * (e.r + 70);
    collide(e); if (!walkable(e.x, e.y)) { e.x = e.home.x; e.y = e.home.y; }
    e.face = Math.atan2(P.y - e.y, P.x - e.x);
    burst(e.x, e.y - 10, 24, a.el ? elHex(a.el) : '#c8c8ff', 160, 0.6, 3, 0, true);
    sfx('dagger');
  } else if (kind === 'breath') sfx('breath');
  else if (kind === 'beam') sfx('orb');
  else if (kind !== 'circle' && kind !== 'spin') sfx(e.boss || (e.def.look && e.def.look.kind === 'troll') ? 'heavy' : 'enemySwing');
  if (kind === 'spin') sfx('heavy');
}

function updateActive(e, a, dt, d, toP) {
  const kind = a.kind;
  if (kind === 'dash') {
    const hitW = moveEnt(e, Math.cos(e.face) * a.dashSpd * dt, Math.sin(e.face) * a.dashSpd * dt);
    e.walk += dt * 20;
    if (Math.random() < 0.7) G.particles.push({ x: e.x, y: e.y + 10, vx: rand(-20, 20), vy: rand(-20, 0), life: 0.5, max: 0.5, size: 6, col: 'rgba(110,98,76,0.5)', grav: 0 });
    if (!e.hitDone && d < e.r + P.r + a.rad * 0.4) enemyHit(e, a.dmg, e.face, a);
    if (hitW && e.t > 0.1) e.t = a.act;
  } else if (kind === 'leap') {
    const k = clamp(e.t / a.act, 0, 1);
    e.x = lerp(e.leapFrom.x, e.leapTo.x, k); e.y = lerp(e.leapFrom.y, e.leapTo.y, k);
    collide(e); if (!walkable(e.x, e.y)) { e.x = e.leapFrom.x; e.y = e.leapFrom.y; }
    e.air = Math.sin(k * Math.PI);
    if (k >= 1 && !e.hitDone) {
      e.air = 0;
      if (Math.hypot(P.x - e.x, P.y - e.y) < a.rad + P.r) enemyHit(e, a.dmg, toP, a);
      e.hitDone = true;
      addRing(e.x, e.y, { r0: a.rad * 0.6, maxR: a.ring || (e.phase2 ? 250 : 180), spd: 300, th: 15, dmg: 16 * e.dmgMul, push: 180, col: a.el ? elc(a.el) : '230,200,140', el: a.el });
      burst(e.x, e.y, 40, a.el ? elHex(a.el) : 'rgba(140,120,90,0.8)', 220, 0.7, 5, 0, !!a.el);
      decal(e.x, e.y + 6, a.rad * 0.7, 'rgba(20,16,12,0.5)');
      sfx('slam'); shake(a.shake || 12);
    }
  } else if (kind === 'circle') {
    if (!e.hitDone) {
      const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
      if (Math.hypot(P.x - cx, P.y - cy) < a.rad + P.r) enemyHit(e, a.dmg, toP, a);
      e.hitDone = true;
      const col = a.el ? elHex(a.el) : 'rgba(140,120,90,0.8)';
      burst(cx, cy, 30, col, 200, 0.7, 4, 0, !!a.el);
      decal(cx, cy + 4, a.rad * 0.6, 'rgba(20,16,12,0.45)');
      sfx('slam'); shake(a.shake || 8);
      if (a.ring || (e.boss && e.phase2)) addRing(cx, cy, { r0: 20, maxR: a.ring || 150, spd: 280, th: 14, dmg: 15 * e.dmgMul, push: 150, col: a.el ? elc(a.el) : '220,190,140', el: a.el });
    }
  } else if (kind === 'spin') {
    e.tick -= dt;
    if (e.tick <= 0) { e.tick = 0.26; e.hitDone = false; }
    moveEnt(e, Math.cos(toP) * (a.chase || 70) * dt, Math.sin(toP) * (a.chase || 70) * dt);
    e.face += dt * 14;
    if (!e.hitDone && d < a.rad + P.r) enemyHit(e, a.dmg, toP, a);
    if (Math.random() < 0.8) { const ang = rand(0, TAU); G.particles.push({ x: e.x + Math.cos(ang) * a.rad, y: e.y + Math.sin(ang) * a.rad * 0.7, vx: -Math.sin(ang) * 200, vy: Math.cos(ang) * 140, life: 0.3, max: 0.3, size: 2, col: a.el ? elHex(a.el) : 'rgba(220,220,230,0.6)', grav: 0, streak: true }); }
  } else if (kind === 'breath') {
    e.face += angDiff(e.face, toP) * Math.min(1, dt * a.track);
    const mx = e.x + Math.cos(e.face) * e.r * 1.2, my = e.y - 18 + Math.sin(e.face) * e.r * 1.0;
    const cols = { fire: ['#ff7a2a', '#ffb347', '#ffd27a'], frost: ['#dff4ff', '#a8d8ff', '#ffffff'], magic: ['#8ab8ff', '#c0d8ff', '#6a90ff'], rot: ['#e05a2a', '#c04020', '#ff8040'], poison: ['#8ac050', '#a0d060', '#6a9a3a'], redlightning: ['#ff5040', '#ff9080', '#ffd0c0'] }[a.el] || ['#ff7a2a', '#ffb347'];
    for (let i = 0; i < 5; i++) {
      const ang = e.face + rand(-a.cone, a.cone), s = rand(220, 380);
      G.particles.push({ x: mx, y: my, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: rand(0.4, 0.7), max: 0.7, size: rand(4, 9), col: pick(cols), grav: 0, glow: true, grow: true });
    }
    e.tick -= dt;
    if (e.tick <= 0) {
      e.tick = 0.15;
      const ang = Math.atan2(P.y - my, P.x - mx), dd = Math.hypot(P.x - mx, P.y - my);
      if (dd < a.range && Math.abs(angDiff(e.face, ang)) < a.cone + 0.1) hurtPlayer(a.dmg * e.dmgMul, ang, 90, e, a.el, a.status);
    }
  } else if (kind === 'beam') {
    const k = clamp(e.t / a.act, 0, 1);
    e.face = e.beamA + (a.sweep ? (k - 0.5) * 2 * a.sweep : 0);
    if (!a.sweep) { e.beamA += angDiff(e.beamA, toP) * Math.min(1, dt * a.track); e.face = e.beamA; }
    e.tick -= dt;
    if (e.tick <= 0) {
      e.tick = 0.18;
      const bx = e.x + Math.cos(e.face) * a.len, by = e.y + Math.sin(e.face) * a.len;
      if (segDist(P.x, P.y, e.x, e.y, bx, by) < a.width / 2 + P.r) hurtPlayer(a.dmg * e.dmgMul, e.face, 100, e, a.el, a.status);
    }
  } else if (a.range && !e.hitDone) {
    if (d < a.range + P.r && Math.abs(angDiff(e.face, toP)) < a.arc / 2 + 0.15) enemyHit(e, a.dmg, e.face, a);
  }
}

function separate() {
  const list = G.enemies.filter((e) => !e.dead && e.state !== 'dormant' && Math.abs(e.y - P.y) < 900 && Math.abs(e.x - P.x) < 900);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.air < 0.3 && P.air <= 0) {
      const dx = a.x - P.x, dy = a.y - P.y, rr = a.r + P.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4 && P.state !== 'roll') {
        const d = Math.sqrt(d2), o = Math.min(rr - d, 12);
        const wA = a.boss || a.def.hp > 300 ? 0.15 : 0.5;
        moveEnt(a, (dx / d) * o * wA, (dy / d) * o * wA);
        moveEnt(P, -(dx / d) * o * (1 - wA), -(dy / d) * o * (1 - wA));
      }
    }
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4) {
        const d = Math.sqrt(d2), o = Math.min((rr - d) / 2, 8);
        moveEnt(a, (dx / d) * o, (dy / d) * o); moveEnt(b, -(dx / d) * o, -(dy / d) * o);
      }
    }
  }
}

// ---------------------------------------------------------------- hazards
function updateHazards(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    let dead = false;
    if (p.type === 'dagger' && p.hover > 0) {
      if (!p.owner || p.owner.dead) dead = true;
      else {
        p.hover -= dt;
        p.x = p.owner.x + p.ox; p.y = p.owner.y + p.oy;
        p.ang = Math.atan2(P.y - p.y, P.x - p.x);
        if (p.hover <= 0) { p.vx = Math.cos(p.ang) * 640; p.vy = Math.sin(p.ang) * 640; sfx('dagger'); }
      }
    } else {
      if (p.homing) {
        const want = Math.atan2(P.y - 10 - p.y, P.x - p.x), cur = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy);
        const na = cur + clamp(angDiff(cur, want), -p.homing * dt, p.homing * dt);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.type !== 'arrow' && Math.random() < 0.7) G.particles.push({ x: p.x, y: p.y, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.3, max: 0.3, size: rand(2, 4), col: elHex(p.el || 'holy'), grav: 0, glow: true });
      dead = p.life <= 0 || pointBlocked(p.x, p.y + 12);
      if (!dead && Math.hypot(P.x - p.x, P.y - 10 - p.y) < p.r + P.r) {
        if (hurtPlayer(p.dmg, Math.atan2(p.vy, p.vx), 110, p.src, p.el, p.status)) dead = true;
      }
    }
    if (dead) {
      if (p.type !== 'arrow') burst(p.x, p.y, 10, elHex(p.el || 'holy'), 90, 0.4, 2.5, 0, true);
      else sparks(p.x, p.y, Math.atan2(p.vy, p.vx) + Math.PI, 4, '#e8d8b0', 120);
      G.projectiles.splice(i, 1);
    }
  }
  // player projectiles (skill waves)
  for (let i = G.pproj.length - 1; i >= 0; i--) {
    const p = G.pproj[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (Math.random() < 0.8) G.particles.push({ x: p.x + rand(-p.r, p.r) * 0.5, y: p.y + rand(-p.r, p.r) * 0.5, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 3, col: elHex(p.el), grav: 0, glow: true });
    for (const e of G.enemies) {
      if (!targetable(e) || p.hit.has(e)) continue;
      if (Math.hypot(e.x - p.x, e.y - 10 - p.y) < e.r + p.r) {
        p.hit.add(e);
        damageEnemy(e, p.dmg * dmgMult(), 30, Math.atan2(p.vy, p.vx), e.state === 'stagger', true, p.el);
        if (p.ls) P.hp = Math.min(P.maxHp, P.hp + p.dmg * p.ls);
        if (weapon().frost) applyFrost(e, weapon().frost);
      }
    }
    if (p.life <= 0 || pointBlocked(p.x, p.y + 12)) G.pproj.splice(i, 1);
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i];
    if (r.delay > 0) {
      r.delay -= dt;
      if (r.delay <= 0 && r.fx) { sfx('slam'); shake(8); burst(r.x, r.y, 24, 'rgba(140,120,90,0.8)', 200, 0.6, 4); }
      continue;
    }
    r.r += r.spd * dt;
    if (r.player) {
      for (const e of G.enemies) {
        if (!targetable(e) || r.hitSet.has(e)) continue;
        if (Math.hypot(e.x - r.x, e.y - r.y) < r.r + e.r) { r.hitSet.add(e); damageEnemy(e, r.dmg * dmgMult(), 40, angTo(r, e), e.state === 'stagger', true, r.el); }
      }
    } else if (!r.hit) {
      const d = Math.hypot(P.x - r.x, P.y - r.y);
      if (Math.abs(d - r.r) < r.th / 2 + P.r * 0.6 && P.air <= 0.2) {
        const a = Math.atan2(P.y - r.y, P.x - r.x);
        if (r.dmg > 0) { if (hurtPlayer(r.dmg, a, r.push, null, r.el)) r.hit = true; }
        else if (P.state !== 'dead') { P.vx += Math.cos(a) * r.push; P.vy += Math.sin(a) * r.push; r.hit = true; }
      }
    }
    if (r.r >= r.maxR) G.rings.splice(i, 1);
  }
  for (let i = G.strikes.length - 1; i >= 0; i--) {
    const s = G.strikes[i];
    if (s.t > 0) {
      s.t -= dt;
      if (s.t <= 0) {
        s.boom = 0.35;
        if (Math.hypot(P.x - s.x, P.y - s.y) < s.r + P.r * 0.5) hurtPlayer(s.dmg, Math.atan2(P.y - s.y, P.x - s.x), 120, null, s.el, s.status);
        burst(s.x, s.y, 26, elHex(s.el), 220, 0.6, 3.5, 0, true);
        sfx(s.el === 'lightning' || s.el === 'redlightning' ? 'clang' : 'slam'); shake(5);
      }
    } else { s.boom -= dt; if (s.boom <= 0) G.strikes.splice(i, 1); }
  }
  for (let i = G.pools.length - 1; i >= 0; i--) {
    const p = G.pools[i];
    p.life -= dt; p.grow = Math.min(1, p.grow + dt * 3);
    p.tick -= dt;
    if (p.tick <= 0) {
      p.tick = 0.5;
      if (Math.hypot(P.x - p.x, P.y - p.y) < p.r * p.grow && P.air <= 0 && !isInvuln()) {
        P.hp -= p.dps * 0.5; P.flash = 0.08; dmgNumber(P.x, P.y - 14, p.dps * 0.5, '#ff9a7a');
        if (p.status) statusBuild(p.status, 14);
        if (P.hp <= 0) playerDie();
      }
    }
    if (p.life <= 0) G.pools.splice(i, 1);
  }
}

// ---------------------------------------------------------------- main update
function update(dt) {
  G.time += dt;
  if (!G.inst) G.clock = (G.clock + dt * (24 / 720)) % 24;
  refreshNightSpawns();
  for (const b of G.banners) b.t += dt;
  G.banners = G.banners.filter((b) => b.t < b.dur);
  G.runeShow = Math.max(0, G.runeShow - dt);
  G.shake *= Math.exp(-10 * dt);

  if (G.hitstop > 0) { G.hitstop -= dt; return; }

  updatePlayer(dt);
  for (const e of G.enemies) updateEnemy(e, dt);
  separate();
  updateHazards(dt);
  if (G.arenaFight && G.arenaRect) {
    const rc = G.arenaRect;
    for (const e of [P, ...G.enemies.filter((x) => x.key === G.arenaFight)]) {
      e.x = clamp(e.x, rc.x + e.r, rc.x + rc.w - e.r); e.y = clamp(e.y, rc.y + e.r, rc.y + rc.h - e.r);
    }
  }
  computeContext();

  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt;
    p.vx *= 0.96; if (!p.grav) p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
  if (G.particles.length > 1400) G.particles.splice(0, G.particles.length - 1400);
  for (let i = G.decals.length - 1; i >= 0; i--) { G.decals[i].life -= dt; if (G.decals[i].life <= 0) G.decals.splice(i, 1); }
  for (let i = G.numbers.length - 1; i >= 0; i--) { const n = G.numbers[i]; n.y -= 28 * dt; n.life -= dt; if (n.life <= 0) G.numbers.splice(i, 1); }
  if (G.enemies.some((e) => e.dead && e.deathT >= 1.4)) G.enemies = G.enemies.filter((e) => !e.dead || e.deathT < 1.4);

  // engaged bosses (health bars + music)
  G.activeBosses = G.enemies.filter((e) => e.boss && !e.dead && !['idle', 'dormant', 'return'].includes(e.state) && dist(e, P) < 1100).slice(0, 3);
  for (const e of G.activeBosses) {
    if (e.phase2 && Math.random() < 0.7) {
      const col = e.def.el ? [elHex(e.def.el), '#ffffff'] : ['#ff8a3a', '#ffbb55', '#ff5a1a'];
      G.particles.push({ x: e.x + rand(-20, 20), y: e.y + rand(-14, 8), vx: rand(-10, 10), vy: rand(-90, -40), life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5), col: pick(col), grav: 0, glow: true });
    }
  }
  if (G.activeBosses.length) {
    G.drumT -= dt;
    if (G.drumT <= 0) { G.drumT = G.activeBosses[0].phase2 ? 0.55 : 0.8; if (AU.ctx && AU.on) tone('sine', 65, 40, 0.25, 0.25); }
  } else if (AU.drone && !G.arenaFight) stopDrone();

  if (P.state === 'dead') {
    G.deadT += dt;
    if (G.deadT > 4.2) respawnAtGrace();
  }

  let tx = P.x, ty = P.y;
  if (P.lock) { tx = lerp(P.x, P.lock.x, 0.35); ty = lerp(P.y, P.lock.y, 0.35); }
  const k = 1 - Math.exp(-7 * dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}
