'use strict';
/* Combat: player, enemies, bosses, hazards, context actions, main update. */

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
  if (Math.random() < 0.6) decal(x + Math.cos(ang) * rand(10, 30), y + 10 + Math.sin(ang) * rand(10, 30), rand(5, 11), col);
}
function decal(x, y, r, col) {
  G.decals.push({ x, y, r, col, life: 14, rot: rand(0, TAU) });
  if (G.decals.length > 140) G.decals.shift();
}
function dmgNumber(x, y, v, col = '#fff', big = false, text = null) {
  G.numbers.push({ x: x + rand(-8, 8), y: y - 20, text: text || String(Math.round(v)), life: 0.95, col, big });
}
function banner(text, col, sub = '', dur = 3.2, size = 1, style = '') {
  G.banners = G.banners.filter((b) => b.style !== style || !style || style === 'small');
  G.banners.push({ text, col, sub, t: 0, dur, size, style });
}
function shake(a) { G.shake = Math.max(G.shake, a); }

// ---------------------------------------------------------------- stats
const weapon = () => WEAPONS[P.weapon] || WEAPONS.longsword;
const level = () => 1 + (P.vig - 10) + (P.end - 10) + (P.str - 10);
const levelCost = () => { const l = level(); return Math.floor(50 + 30 * l + 3.2 * l * l); };
function recalcStats() {
  P.maxHp = 130 + (P.vig - 10) * 15;
  P.maxSt = 90 + (P.end - 10) * 8;
  P.maxFlasks = Math.min(10, 4 + P.seeds);
}
const dmgMult = () => 1 + (P.str - 10) * 0.07;

// ---------------------------------------------------------------- spawning
function makeEnemy(type, x, y) {
  const d = ETYPES[type];
  return {
    type, def: d, x, y, home: { x, y }, r: d.r, hp: d.hp, maxHp: d.hp, hpLag: d.hp, poise: d.poise,
    face: Math.PI / 2, vx: 0, vy: 0, state: 'idle', t: 0, atk: null, atkName: '', hitDone: false,
    cd: rand(0.3, 1), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(1, 3), flash: 0, showHp: 0,
    dead: false, deathT: 0, boss: !!d.boss, phase2: false, air: 0, leapFrom: null, leapTo: null,
    lastAtk: '', glinted: false, dmgAccum: 0, dmgAccumT: 0, bleed: 0, tick: 0, walk: 0, patrolDir: -1,
  };
}
function resetEnemies() {
  G.enemies = [];
  for (const [type, x, y] of SPAWNS) {
    if (ETYPES[type].boss && G.defeated.has(type)) continue;
    G.enemies.push(makeEnemy(type, x, y));
  }
  for (const id of Object.keys(ARENAS)) {
    if (G.defeated.has(id)) continue;
    const a = ARENAS[id], e = makeEnemy(id, a.spawn[0], a.spawn[1]);
    e.state = 'dormant';
    G.enemies.push(e);
  }
  G.projectiles.length = 0; G.rings.length = 0;
}
function respawnAtGrace() {
  const g = G.graces[G.graceIdx];
  P.x = g.x; P.y = g.y + 44; P.face = -Math.PI / 2;
  recalcStats();
  P.hp = P.hpLag = P.maxHp; P.st = P.maxSt; P.flasks = P.maxFlasks;
  P.state = 'free'; P.t = 0; P.vx = P.vy = 0; P.lock = null; P.buffer = null; P.iframes = 1;
  cam.x = P.x; cam.y = P.y;
  G.arenaFight = null; G.activeBoss = null; stopDrone();
  resetEnemies();
}

// ---------------------------------------------------------------- player actions
const isInvuln = () => P.iframes > 0 || (P.state === 'roll' && P.t > 0.03 && P.t < (P.backstep ? 0.2 : 0.36));
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
  const t = nearestEnemy(150, 1.0, dirA);
  P.face = t ? angTo(P, t) : dirA;
}
function startAttack(a, mv) {
  if (P.st <= 0) return false;
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
  if (P.flasks <= 0) { sfx('empty'); banner('No flasks remaining', '#bba', '', 1.2, 0.45, 'small'); return true; }
  P.flasks--; P.state = 'heal'; P.t = 0; P.healed = false;
  return true;
}
function toggleLock() {
  if (P.lock) { P.lock = null; return; }
  P.lock = nearestEnemy(420, 0, 0);
}
function tryBuffered(mv) {
  const b = P.buffer; if (!b) return false;
  const w = weapon();
  let ok = false;
  if (b === 'light') {
    const chaining = P.state === 'attack' && P.atk && P.atk !== w.heavy;
    const next = chaining ? (P.combo + 1) % w.l.length : 0;
    ok = startAttack(w.l[next], mv);
    if (ok) P.combo = next;
  } else if (b === 'heavy') { ok = startAttack(w.heavy, mv); if (ok) P.combo = 0; }
  else if (b === 'roll') ok = startRoll(mv);
  else if (b === 'heal') ok = startHeal();
  if (ok) P.buffer = null;
  return ok;
}

function updatePlayer(dt) {
  P.t += dt;
  P.iframes = Math.max(0, P.iframes - dt);
  P.flash = Math.max(0, P.flash - dt);
  if (P.hpLag > P.hp) P.hpLag = Math.max(P.hp, P.hpLag - P.maxHp * 0.5 * dt * (P.iframes > 0 ? 0 : 1));
  else P.hpLag = P.hp;
  const kb = Math.exp(-9 * dt);
  if (Math.abs(P.vx) + Math.abs(P.vy) > 1) { moveEnt(P, P.vx * dt, P.vy * dt); P.vx *= kb; P.vy *= kb; } else P.vx = P.vy = 0;
  P.moving = 0;

  if (P.state === 'dead') return;

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

  if (P.lock && (!targetable(P.lock) || dist(P, P.lock) > 560)) P.lock = null;
  P.sprinting = false;

  switch (P.state) {
    case 'free': {
      if (tryBuffered(mv)) break;
      let spd = 150 * mv.m;
      if (mv.m > 0.3 && sprintHeld() && P.st > 0 && !P.lock) { spd = 245; P.sprinting = true; P.st -= 16 * dt; P.stDelay = 0.35; }
      if (mv.m > 0) {
        moveEnt(P, (mv.x / mv.m) * spd * dt, (mv.y / mv.m) * spd * dt);
        P.moveAnim += dt * spd * 0.07; P.moving = spd;
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
        P.swung = true; sfx(a === weapon().heavy || weapon().style === 'great' ? 'heavy' : 'swing');
        P.vx += Math.cos(P.face) * a.lunge; P.vy += Math.sin(P.face) * a.lunge;
        if (a.overhead) {
          const ix = P.x + Math.cos(P.face) * a.range * 0.7, iy = P.y + Math.sin(P.face) * a.range * 0.7;
          burst(ix, iy, 16, a.holy ? '#ffe08a' : 'rgba(150,130,100,0.8)', 160, 0.5, 3.5, 0, !!a.holy);
          shake(5);
        }
      }
      if (P.t >= t1 && P.t < t2) playerHitCheck(a);
      if (P.t >= t2 && (P.buffer === 'light' || P.buffer === 'heavy' || P.buffer === 'roll')) {
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
      if (mv.m > 0) { moveEnt(P, mv.x * 55 * dt, mv.y * 55 * dt); P.moveAnim += dt * 4; P.moving = 55; }
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
    if (g.afterBoss && !G.defeated.has(g.afterBoss)) continue;
    if (!g.found && Math.hypot(g.x - P.x, g.y - P.y) < 90) { g.found = true; banner('LOST GRACE DISCOVERED', '#e9cf86', g.name, 3.4, 0.75, 'grace'); sfx('grace'); save(); }
  }
  if (G.bloodstain && Math.hypot(G.bloodstain.x - P.x, G.bloodstain.y - P.y) < 26) {
    P.runes += G.bloodstain.runes; G.runeShow = 2;
    banner('RUNES RECOVERED', '#e9cf86', '+' + G.bloodstain.runes, 2, 0.6, 'small'); sfx('runes');
    burst(G.bloodstain.x, G.bloodstain.y, 30, '#ffd77a', 120, 0.9, 3, 0, true);
    G.bloodstain = null; save();
  }
  // zone title
  const z = zoneAt(P.y);
  if (z.name !== G.zone) {
    const first = !G.zone;
    G.zone = z.name;
    if (!first || G.state === 'play') banner(z.name.toUpperCase(), '#e8dcb8', '', 3.6, 0.6, 'zone');
  }
}

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
    const isHeavy = a === w.heavy;
    if (crit) dmg *= isHeavy ? 2.6 : 1.8;
    damageEnemy(e, dmg, a.poise, angTo(P, e), crit, isHeavy);
    if (w.bleed && !e.dead) applyBleed(e, w.bleed);
  }
}
function applyBleed(e, amt) {
  e.bleed += amt;
  const cap = e.boss ? 150 : 100;
  if (e.bleed >= cap) {
    e.bleed = 0;
    const dmg = e.maxHp * (e.boss ? 0.07 : 0.2) + 35;
    e.hp -= dmg; e.dmgAccum += dmg; e.dmgAccumT = 1.4;
    dmgNumber(e.x, e.y - e.r - 14, dmg, '#ff3b2f', true, 'BLOOD LOSS ' + Math.round(dmg));
    sfx('bleed');
    for (let i = 0; i < 4; i++) blood(e.x, e.y - 10, rand(0, TAU), 10, '#a01010', 300);
    G.hitstop = Math.max(G.hitstop, 0.08);
    if (e.hp <= 0) killEnemy(e);
  }
}
function guarding(e) {
  return e.def.guard && (e.state === 'chase' || e.state === 'idle') && Math.abs(angDiff(e.face, angTo(e, P))) < 1.1;
}
function damageEnemy(e, dmg, poise, ang, crit, heavy) {
  if (guarding(e) && !crit) {
    dmg *= 0.22; poise *= heavy ? 1.3 : 0.5;
    sparks(e.x + Math.cos(ang + Math.PI) * e.r, e.y - 12 + Math.sin(ang + Math.PI) * e.r, ang + Math.PI, 12);
    sfx('clang'); shake(3);
    e.cd = Math.min(e.cd, 0.15);
    G.hitstop = 0.05;
    P.vx -= Math.cos(ang) * 120; P.vy -= Math.sin(ang) * 120;
  } else {
    G.hitstop = crit ? 0.13 : heavy ? 0.085 : 0.055;
    shake(crit ? 9 : heavy ? 6 : 3);
    sfx(crit ? 'crit' : 'hit');
    blood(e.x, e.y - 10, ang, crit ? 24 : 12, e.def.look.kind === 'margit' || e.type === 'sentinel' ? '#b8963a' : '#7a0e0e', crit ? 320 : 230);
    sparks(e.x - Math.cos(ang) * e.r * 0.5, e.y - 12, ang, crit ? 10 : 4, '#fff2c0');
  }
  e.hp -= dmg; e.flash = 0.12; e.showHp = 4;
  e.dmgAccum += dmg; e.dmgAccumT = 1.4;
  dmgNumber(e.x, e.y - e.r, dmg, crit ? '#ffcf5a' : '#fff', crit);
  if (e.state === 'idle' || e.state === 'return') { e.state = 'chase'; e.t = 0; }
  if (e.state !== 'stagger' && e.state !== 'dormant' && e.state !== 'intro') {
    e.poise -= poise;
    if (!e.boss && e.def.hp < 300) { e.vx += Math.cos(ang) * (heavy ? 160 : 70); e.vy += Math.sin(ang) * (heavy ? 160 : 70); }
    if (e.poise <= 0) {
      e.state = 'stagger'; e.t = 0; e.poise = e.def.poise; e.atk = null; e.air = 0;
      burst(e.x, e.y - 10, 18, '#ffe9a8', 200, 0.5, 2.5, 0, true);
    } else if (!e.boss && e.def.hp < 300 && e.state !== 'windup' && e.state !== 'active') {
      e.state = 'flinch'; e.t = 0;
    }
  }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; e.deathT = 0; e.hp = 0;
  P.runes += e.def.runes; G.runeShow = 2;
  burst(e.x, e.y - 10, e.boss ? 140 : 30, '#e7c46a', e.boss ? 260 : 120, e.boss ? 2 : 1, 3, 0, true);
  if (P.lock === e) P.lock = null;
  if (e.boss) {
    G.defeated.add(e.type);
    if (G.activeBoss === e) G.activeBoss = null;
    if (G.arenaFight === e.type) G.arenaFight = null;
    stopDrone();
    G.hitstop = 0.35;
    banner(e.def.felled || 'ENEMY FELLED', '#e9cf86', '', 5, 1.1, 'big');
    sfx('felled');
    if (e.def.drop && !P.owned.includes(e.def.drop)) {
      P.owned.push(e.def.drop);
      setTimeout(() => { banner('Obtained ' + WEAPONS[e.def.drop].name, '#e9cf86', 'Equip it at a Site of Grace', 3.5, 0.55, 'small'); sfx('item'); }, 5200);
    }
    if (e.type === 'godrick') {
      setTimeout(() => banner('Thank you for playing', '#cbb98a', 'The Elden Ring awaits, Tarnished', 7, 0.6, 'small'), 5600);
    }
    save();
  }
}

function hurtPlayer(dmg, srcAng, push = 140) {
  if (P.state === 'dead' || isInvuln()) return false;
  P.hp -= dmg; P.flash = 0.2; P.iframes = 0.45;
  dmgNumber(P.x, P.y - 14, dmg, '#ff6a5a');
  shake(7); sfx('hurt'); vibrate(40);
  blood(P.x, P.y - 8, srcAng, 14, '#8a0e0e');
  G.hitstop = Math.max(G.hitstop, 0.06);
  P.vx = Math.cos(srcAng) * push; P.vy = Math.sin(srcAng) * push;
  if (P.hp <= 0) { playerDie(); return true; }
  const armored = P.state === 'attack' && P.atk && P.atk === weapon().heavy && P.t >= P.atk.wind * 0.5 && P.t < P.atk.wind + P.atk.act;
  if (!armored && P.state !== 'heal') { P.state = 'hurt'; P.t = 0; P.atk = null; }
  if (P.state === 'heal' && dmg > 15) { P.state = 'hurt'; P.t = 0; }
  return true;
}
function playerDie() {
  P.hp = 0; P.state = 'dead'; P.t = 0; P.lock = null;
  G.deadT = 0; G.arenaFight = null; G.activeBoss = null; stopDrone();
  G.bloodstain = P.runes > 0 ? { x: P.x, y: P.y, runes: P.runes } : null;
  P.runes = 0;
  sfx('die'); vibrate([60, 40, 120]);
  banner('YOU DIED', '#a81c14', '', 4.2, 1.35, 'big');
  save();
}

// ---------------------------------------------------------------- context actions
function computeContext() {
  G.ctxAction = null;
  if (P.state === 'dead') return;
  for (let i = 0; i < G.graces.length; i++) {
    const g = G.graces[i];
    if (g.afterBoss && !G.defeated.has(g.afterBoss)) continue;
    if (g.found && Math.hypot(g.x - P.x, g.y - P.y) < 60) { G.ctxAction = { kind: 'rest', idx: i, label: 'Rest at Grace' }; return; }
  }
  for (const it of ITEMS) {
    if (G.taken.has(it.id)) continue;
    if (Math.hypot(it.x - P.x, it.y - P.y) < 42) { G.ctxAction = { kind: 'item', item: it, label: 'Pick up' }; return; }
  }
  if (!G.arenaFight) {
    for (const f of FOGS) {
      if (!f.enter || !fogSolid(f)) continue;
      const below = P.y - (f.y + f.h);
      if (Math.abs(P.x - (f.x + f.w / 2)) < 60 && below > 0 && below < 50) { G.ctxAction = { kind: 'fog', fog: f, label: 'Traverse the fog' }; return; }
    }
  }
}
function doContext() {
  const c = G.ctxAction; if (!c || P.state !== 'free') return;
  if (c.kind === 'rest') openGrace(c.idx);
  else if (c.kind === 'item') {
    const it = c.item;
    G.taken.add(it.id);
    sfx('item'); burst(it.x, it.y, 24, '#ffe7a0', 90, 0.8, 3, 0, true);
    if (it.weapon) { if (!P.owned.includes(it.weapon)) P.owned.push(it.weapon); banner('Obtained ' + WEAPONS[it.weapon].name, '#e9cf86', 'Equip it at a Site of Grace', 3.2, 0.55, 'small'); }
    if (it.seed) { P.seeds++; recalcStats(); P.flasks = Math.min(P.maxFlasks, P.flasks + 1); banner('Golden Seed', '#e9cf86', 'Flask charges +1', 3, 0.55, 'small'); }
    if (it.runes) { P.runes += it.runes; G.runeShow = 2; banner('Golden Rune', '#e9cf86', '+' + it.runes + ' runes', 2.5, 0.55, 'small'); }
    save();
  } else if (c.kind === 'fog') {
    const f = c.fog;
    P.x = f.x + f.w / 2; P.y = f.y - 26; P.face = -Math.PI / 2; P.lock = null; P.vx = P.vy = 0;
    cam.y = P.y;
    sfx('fog'); burst(P.x, P.y, 30, 'rgba(230,230,240,0.8)', 100, 0.8, 5);
    const boss = G.enemies.find((e) => e.type === f.boss && !e.dead);
    if (boss) {
      G.arenaFight = f.boss; G.activeBoss = boss;
      boss.state = 'intro'; boss.t = 0;
      startDrone(boss.def.drone || 55);
    }
  }
}

// ---------------------------------------------------------------- enemies
function enemyStartAttack(e, name) {
  const a = e.def.atks[name];
  e.atk = a; e.atkName = name; e.state = 'windup'; e.t = 0; e.hitDone = false; e.glinted = false; e.lastAtk = name;
  e.leapFrom = null; e.leapTo = null; e.tick = 0;
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
function enemyHit(e, dmg, ang) {
  const m = e.phase2 ? 1.12 : 1;
  if (hurtPlayer(dmg * m * rand(0.95, 1.05), ang, e.boss ? 200 : 140)) e.hitDone = true;
}
function addRing(x, y, o) {
  G.rings.push({ x, y, r: o.r0 || 16, maxR: o.maxR || 160, spd: o.spd || 300, th: o.th || 15, dmg: o.dmg || 0, push: o.push || 160, hit: false, col: o.col || '230,200,140', delay: o.delay || 0, fx: !!o.fx });
}
const windMul = (e) => (e.phase2 ? 0.88 : 1);

function updateEnemy(e, dt) {
  if (e.dead) { e.deathT += dt; return; }
  const d = dist(e, P);
  if ((e.state === 'idle' || e.state === 'dormant') && d > 1100) return;
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.showHp = Math.max(0, e.showHp - dt);
  e.bleed = Math.max(0, e.bleed - 5 * dt);
  if (e.hpLag > e.hp) e.hpLag = Math.max(e.hp, e.hpLag - e.maxHp * 0.25 * dt * (e.dmgAccumT > 0.6 ? 0 : 1)); else e.hpLag = e.hp;
  if (e.dmgAccumT > 0) { e.dmgAccumT -= dt; if (e.dmgAccumT <= 0) e.dmgAccum = 0; }
  const kb = Math.exp(-8 * dt);
  if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { moveEnt(e, e.vx * dt, e.vy * dt); e.vx *= kb; e.vy *= kb; e.walk += dt * 6; } else e.vx = e.vy = 0;

  const toP = angTo(e, P);
  const spdMul = e.phase2 ? 1.2 : 1;
  const playerAlive = P.state !== 'dead';
  const def = e.def;

  // phase 2
  if (def.p2 && !e.phase2 && e.hp < e.maxHp * def.p2 && (e.state === 'chase' || (e.state === 'stagger' && e.t > 1.2))) {
    e.phase2 = true; e.atk = null; e.poise = def.poise;
    if (def.p2roar) { e.state = 'roar'; e.t = 0; sfx('roar'); shake(12); }
    else {
      sfx('glint'); sfx('item');
      burst(e.x, e.y - 20, 60, '#ffe08a', 220, 1, 3, 0, true);
    }
  }
  // boss engagement (field bosses show their bar while fighting)
  if (e.boss && !def.field && G.arenaFight === e.type) G.activeBoss = e;
  if (def.field) {
    const engaged = e.state !== 'idle' && e.state !== 'return' && d < 900;
    if (engaged && G.activeBoss !== e && playerAlive) { G.activeBoss = e; startDrone(70); sfx('neigh'); }
    if (!engaged && G.activeBoss === e) { G.activeBoss = null; stopDrone(); }
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
        addRing(e.x, e.y, { r0: 10, maxR: 280, spd: 520, th: 22, push: 360, col: '255,140,60' });
        burst(e.x, e.y - 10, 80, '#ff8a3a', 280, 1.1, 3.5, 0, true);
      }
      if (e.t > 1.8) { e.state = 'chase'; e.t = 0; e.cd = 0.2; }
      return;
    case 'idle': {
      if (def.patrol) {
        const ty = e.home.y + e.patrolDir * 420;
        if (Math.abs(e.y - ty) < 10) e.patrolDir *= -1;
        const a = Math.atan2(ty - e.y, e.home.x - e.x);
        e.face += angDiff(e.face, a) * Math.min(1, dt * 3);
        moveEnt(e, Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt); e.walk += dt * 2.5;
      }
      if (playerAlive && d < def.aggro) { e.state = 'chase'; e.t = 0; }
      return;
    }
    case 'return': {
      const dh = Math.hypot(e.home.x - e.x, e.home.y - e.y);
      e.face = Math.atan2(e.home.y - e.y, e.home.x - e.x);
      moveEnt(e, Math.cos(e.face) * def.speed * 1.2 * dt, Math.sin(e.face) * def.speed * 1.2 * dt); e.walk += dt * 6;
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
      if (!playerAlive) { if (!e.boss || def.field) { e.state = 'return'; e.t = 0; } return; }
      const leash = def.field ? 900 : 560;
      if (!G.arenaFight || G.arenaFight !== e.type) {
        if (Math.hypot(e.home.x - e.x, e.home.y - e.y) > leash) { e.state = 'return'; e.t = 0; return; }
      }
      e.face += angDiff(e.face, toP) * Math.min(1, dt * 7);
      e.cd -= dt;
      if (e.cd <= 0) {
        const n = chooseAttack(e, d);
        if (n) { enemyStartAttack(e, n); return; }
      }
      const spd = def.speed * spdMul;
      if (def.ranged) {
        let mvA = null, s = spd;
        if (d < def.ranged.flee) mvA = toP + Math.PI;
        else if (d > def.ranged.keep + 60) mvA = toP;
        else { e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(1, 2.5); } mvA = toP + (Math.PI / 2) * e.strafe; s *= 0.5; }
        moveEnt(e, Math.cos(mvA) * s * dt, Math.sin(mvA) * s * dt); e.walk += dt * 6;
        return;
      }
      const keep = e.boss ? 62 : def.look.kind === 'wolf' ? 50 : def.look.kind === 'troll' ? 70 : 38;
      if (d > keep + e.r) {
        moveEnt(e, Math.cos(toP) * spd * dt, Math.sin(toP) * spd * dt);
      } else {
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
      if (e.t >= a.wind * windMul(e)) {
        e.state = 'active'; e.t = 0; e.hitDone = false; e.tick = 0;
        if (a.lunge) { e.vx += Math.cos(e.face) * a.lunge; e.vy += Math.sin(e.face) * a.lunge; }
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
  const kind = a.kind;
  if (kind === 'leap') {
    e.leapFrom = { x: e.x, y: e.y };
    const ld = Math.min(440, dist(e, e.leapTo)), la = angTo(e, e.leapTo);
    e.leapTo = { x: e.x + Math.cos(la) * ld, y: e.y + Math.sin(la) * ld };
  } else if (kind === 'arrow') {
    const hx = e.x + Math.cos(e.face) * 16, hy = e.y - 12 + Math.sin(e.face) * 16;
    G.projectiles.push({ type: 'arrow', x: hx, y: hy, vx: Math.cos(e.face) * a.spd, vy: Math.sin(e.face) * a.spd, r: 5, dmg: a.dmg, life: 1.4 });
    sfx('arrow');
  } else if (kind === 'daggers') {
    const n = a.n + (e.phase2 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 26;
      G.projectiles.push({ type: 'dagger', owner: e, ox: Math.cos(e.face + Math.PI / 2) * off, oy: Math.sin(e.face + Math.PI / 2) * off - 34, x: e.x, y: e.y - 30, vx: 0, vy: 0, r: 6, dmg: a.dmg, life: 3, hover: 0.3 + i * 0.16, ang: toP });
    }
    sfx('glint');
  } else if (kind === 'stomps') {
    for (let i = 0; i < a.n; i++) addRing(e.x, e.y, { r0: 20, maxR: 200 + i * 30, spd: 330, th: 16, dmg: a.dmg, push: 170, col: '220,190,140', delay: i * 0.32, fx: true });
  } else if (kind === 'breath') {
    sfx('breath');
  } else if (kind !== 'circle' && kind !== 'spin') {
    sfx(e.boss || e.def.look.kind === 'troll' ? 'heavy' : 'enemySwing');
  }
  if (kind === 'spin') sfx('heavy');
}

function updateActive(e, a, dt, d, toP) {
  const kind = a.kind;
  if (kind === 'dash') {
    const hitW = moveEnt(e, Math.cos(e.face) * a.dashSpd * dt, Math.sin(e.face) * a.dashSpd * dt);
    e.walk += dt * 20;
    if (Math.random() < 0.7) G.particles.push({ x: e.x, y: e.y + 10, vx: rand(-20, 20), vy: rand(-20, 0), life: 0.5, max: 0.5, size: 6, col: 'rgba(110,98,76,0.5)', grav: 0 });
    if (!e.hitDone && d < e.r + P.r + a.rad * 0.4) enemyHit(e, a.dmg, e.face);
    if (hitW && e.t > 0.1) e.t = a.act;
  } else if (kind === 'leap') {
    const k = clamp(e.t / a.act, 0, 1);
    e.x = lerp(e.leapFrom.x, e.leapTo.x, k); e.y = lerp(e.leapFrom.y, e.leapTo.y, k);
    collide(e);
    e.air = Math.sin(k * Math.PI);
    if (k >= 1 && !e.hitDone) {
      e.air = 0;
      if (Math.hypot(P.x - e.x, P.y - e.y) < a.rad + P.r) enemyHit(e, a.dmg, toP);
      e.hitDone = true;
      addRing(e.x, e.y, { r0: a.rad * 0.6, maxR: e.phase2 ? 250 : 180, spd: 300, th: 15, dmg: 16, push: 180 });
      burst(e.x, e.y, 40, 'rgba(140,120,90,0.8)', 220, 0.7, 5);
      decal(e.x, e.y + 6, a.rad * 0.7, 'rgba(20,16,12,0.5)');
      sfx('slam'); shake(a.shake || 12);
    }
  } else if (kind === 'circle') {
    if (!e.hitDone) {
      const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
      if (Math.hypot(P.x - cx, P.y - cy) < a.rad + P.r) enemyHit(e, a.dmg, toP);
      e.hitDone = true;
      const col = a.holy ? '#ffe08a' : a.fire ? '#ff8a3a' : 'rgba(140,120,90,0.8)';
      burst(cx, cy, 30, col, 200, 0.7, 4, 0, !!(a.holy || a.fire));
      decal(cx, cy + 4, a.rad * 0.6, 'rgba(20,16,12,0.45)');
      sfx('slam'); shake(a.shake || 8);
      if (a.ring || (e.boss && e.phase2)) addRing(cx, cy, { r0: 20, maxR: a.ring || 150, spd: 280, th: 14, dmg: 15, push: 150, col: a.holy ? '255,224,140' : a.fire ? '255,130,50' : '220,190,140' });
    }
  } else if (kind === 'spin') {
    e.tick -= dt;
    if (e.tick <= 0) { e.tick = 0.3; e.hitDone = false; }
    moveEnt(e, Math.cos(toP) * 70 * dt, Math.sin(toP) * 70 * dt);
    e.face += dt * 14;
    if (!e.hitDone && d < a.rad + P.r) enemyHit(e, a.dmg, toP);
    if (Math.random() < 0.8) { const ang = rand(0, TAU); G.particles.push({ x: e.x + Math.cos(ang) * a.rad, y: e.y + Math.sin(ang) * a.rad * 0.7, vx: -Math.sin(ang) * 200, vy: Math.cos(ang) * 140, life: 0.3, max: 0.3, size: 2, col: 'rgba(220,220,230,0.6)', grav: 0, streak: true }); }
  } else if (kind === 'breath') {
    e.face += angDiff(e.face, toP) * Math.min(1, dt * a.track);
    const mx = e.x + Math.cos(e.face - 0.6) * 26, my = e.y - 22 + Math.sin(e.face - 0.6) * 20;
    for (let i = 0; i < 5; i++) {
      const ang = e.face + rand(-a.cone, a.cone), s = rand(220, 380);
      G.particles.push({ x: mx, y: my, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: rand(0.4, 0.7), max: 0.7, size: rand(4, 9), col: pick(['#ff7a2a', '#ffb347', '#ffd27a', '#e8501a']), grav: 0, glow: true, grow: true });
    }
    e.tick -= dt;
    if (e.tick <= 0) {
      e.tick = 0.15;
      const ang = angTo({ x: mx, y: my }, P), dd = Math.hypot(P.x - mx, P.y - my);
      if (dd < a.range && Math.abs(angDiff(e.face, ang)) < a.cone + 0.1) hurtPlayer(a.dmg, ang, 90);
    }
  } else if (a.range && !e.hitDone) {
    if (d < a.range + P.r && Math.abs(angDiff(e.face, toP)) < a.arc / 2 + 0.15) enemyHit(e, a.dmg, e.face);
  }
}

function separate() {
  const list = G.enemies.filter((e) => !e.dead && e.state !== 'dormant' && Math.abs(e.y - P.y) < 900);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.air < 0.3) {
      const dx = a.x - P.x, dy = a.y - P.y, rr = a.r + P.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4 && P.state !== 'roll') {
        // push apart through collision (substepped) so nobody gets shoved through walls or fog
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
        p.ang = angTo(p, P);
        if (p.hover <= 0) { p.vx = Math.cos(p.ang) * 640; p.vy = Math.sin(p.ang) * 640; sfx('dagger'); }
      }
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.type === 'dagger' && Math.random() < 0.8) G.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 2.5, col: '#ffe08a', grav: 0, glow: true });
      dead = p.life <= 0 || pointBlocked(p.x, p.y + 12);
      if (!dead && Math.hypot(P.x - p.x, P.y - 10 - p.y) < p.r + P.r) {
        if (hurtPlayer(p.dmg, Math.atan2(p.vy, p.vx), 110)) dead = true;
      }
    }
    if (dead) {
      if (p.type === 'dagger') burst(p.x, p.y, 10, '#ffe08a', 90, 0.4, 2.5, 0, true);
      else sparks(p.x, p.y, Math.atan2(p.vy, p.vx) + Math.PI, 4, '#e8d8b0', 120);
      G.projectiles.splice(i, 1);
    }
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i];
    if (r.delay > 0) {
      r.delay -= dt;
      if (r.delay <= 0 && r.fx) { sfx('slam'); shake(8); burst(r.x, r.y, 24, 'rgba(140,120,90,0.8)', 200, 0.6, 4); }
      continue;
    }
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

// ---------------------------------------------------------------- main update
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
  // safety net: nothing leaves a boss arena while the fight is on
  if (G.arenaFight) {
    const rc = ARENAS[G.arenaFight].rect;
    for (const e of [P, ...G.enemies.filter((x) => x.type === G.arenaFight)]) {
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
  if (G.particles.length > 1200) G.particles.splice(0, G.particles.length - 1200);
  for (let i = G.decals.length - 1; i >= 0; i--) { G.decals[i].life -= dt; if (G.decals[i].life <= 0) G.decals.splice(i, 1); }
  for (let i = G.numbers.length - 1; i >= 0; i--) { const n = G.numbers[i]; n.y -= 28 * dt; n.life -= dt; if (n.life <= 0) G.numbers.splice(i, 1); }
  G.enemies = G.enemies.filter((e) => !e.dead || e.deathT < 1.4);

  // boss ambience
  for (const e of G.enemies) {
    if (e.dead || !e.phase2) continue;
    if (Math.random() < 0.8) {
      const col = e.type === 'margit' ? ['#ffe08a', '#fff0b0', '#e8c060'] : ['#ff8a3a', '#ffbb55', '#ff5a1a'];
      G.particles.push({ x: e.x + rand(-20, 20), y: e.y + rand(-14, 8), vx: rand(-10, 10), vy: rand(-90, -40), life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5), col: pick(col), grav: 0, glow: true });
    }
  }
  if (G.activeBoss && G.activeBoss.dead) G.activeBoss = null;
  if (G.activeBoss) {
    G.drumT -= dt;
    if (G.drumT <= 0) { G.drumT = G.activeBoss.phase2 ? 0.55 : 0.8; if (AU.ctx && AU.on) tone('sine', 65, 40, 0.25, 0.25); }
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
