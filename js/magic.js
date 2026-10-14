'use strict';
/* Spells (Finger Seal / Astrologer's Staff), buffs, and Spirit Ash summons that fight alongside you. */

// ---------------------------------------------------------------- buffs
const buffDmg = () => P.buffs.reduce((m, b) => m * (b.dmg || 1), 1);
const buffDef = () => P.buffs.reduce((m, b) => m * (b.def || 1), 1);
const spellMult = () => (1 + (P.mnd - 10) * 0.06) * (1 + level() * 0.012) * buffDmg();
function addBuff(id, b) {
  P.buffs = P.buffs.filter((o) => o.id !== id);
  P.buffs.push({ id, ...b, max: b.t });
}
function updateBuffs(dt) {
  for (const b of P.buffs) b.t -= dt;
  P.buffs = P.buffs.filter((b) => b.t > 0);
}

// ---------------------------------------------------------------- learning
function learnSpell(id, quiet) {
  if (!SPELLS[id] || P.spells.includes(id)) return;
  P.spells.push(id);
  if (P.memory.length < 3) P.memory.push(id);
  if (!quiet) { banner('Learned ' + SPELLS[id].name, '#e9cf86', SPELLS[id].type === 'incant' ? 'Incantation · cast with the Finger Seal' : 'Sorcery · cast with the Astrologer\'s Staff', 3.4, 0.55, 'small'); sfx('item'); }
}
function learnAsh(id, quiet) {
  if (!ASHES[id] || P.ashes.includes(id)) return;
  P.ashes.push(id);
  if (!P.ash) P.ash = id;
  if (!quiet) { banner('Obtained ' + ASHES[id].name, '#cbd8ff', 'Spirit Ash · summon it during boss fights', 3.4, 0.55, 'small'); sfx('item'); }
}
// hands out spells and ashes earned so far (also fixes up older saves)
function checkGifts(quiet) {
  let delay = 0;
  const later = (f) => { if (quiet) f(); else { setTimeout(f, delay); delay += 1800; } };
  for (const [boss, g] of Object.entries(MAGIC_FROM_BOSS)) {
    if (!G.defeatedTypes.has(boss)) continue;
    if (g.spell && !P.spells.includes(g.spell)) later(() => learnSpell(g.spell, quiet));
    if (g.ash && !P.ashes.includes(g.ash)) later(() => learnAsh(g.ash, quiet));
  }
  for (const [grace, g] of Object.entries(MAGIC_FROM_GRACE)) {
    if (!G.graces.some((o) => o.found && !o.inst && o.name === grace)) continue;
    if ((g.bell && !P.bell) || (g.ash && !P.ashes.includes(g.ash))) later(() => {
      if (g.bell && !P.bell) { P.bell = true; if (!quiet) banner('Spirit Calling Bell', '#cbd8ff', g.who + ' gives you a bell to call upon spirits', 3.4, 0.55, 'small'); }
      learnAsh(g.ash, quiet);
    });
  }
}

// ---------------------------------------------------------------- casting
const curSpell = () => SPELLS[P.memory[P.spellIdx % Math.max(1, P.memory.length)]];
function cycleSpell() {
  if (P.memory.length < 2) return;
  P.spellIdx = (P.spellIdx + 1) % P.memory.length;
  sfx('item'); banner(curSpell().name, '#cbd8ff', '', 0.9, 0.42, 'small');
}
function startCast(mv) {
  const sp = curSpell();
  if (!sp || P.mounted) return false;
  if (sp.type === 'incant' && !P.seal) return false;
  if (sp.type === 'sorc' && !P.staff) { sfx('empty'); banner('Requires a staff', '#9ab0ff', '', 1, 0.45, 'small'); return true; }
  if (P.fp < sp.fp) { sfx('empty'); banner('Not enough FP', '#9ab0ff', '', 1, 0.45, 'small'); return true; }
  P.fp -= sp.fp;
  softAim(mv);
  P.state = 'cast'; P.t = 0; P.cast = { sp, done: false, tick: 0, hit: new Set() };
  sfx('glint');
  return true;
}
function updateCast(dt, mv) {
  const C = P.cast, sp = C.sp, fire = sp.cast * 0.6;
  if (mv.m > 0) { moveEnt(P, mv.x * 40 * dt, mv.y * 40 * dt); P.moving = 40; }
  if (P.lock) P.face += angDiff(P.face, angTo(P, P.lock)) * Math.min(1, dt * 8);
  const col = sp.type === 'incant' ? (sp.col || '255,220,130') : elc(sp.el || 'magic');
  if (P.t < fire && Math.random() < 0.6) G.particles.push({ x: P.x + Math.cos(P.face + 0.9) * 12 + rand(-4, 4), y: P.y - 22 + rand(-4, 4), vx: rand(-20, 20), vy: rand(-40, -10), life: 0.5, max: 0.5, size: 2.5, col: `rgb(${col})`, grav: 0, glow: true });
  if (P.t >= fire && !C.done) { C.done = true; castEffect(sp); }
  if (sp.kind === 'beam' && C.done) {
    C.tick -= dt;
    if (C.tick <= 0) {
      C.tick = 0.12; C.hit.clear();
      for (const e of G.enemies) {
        if (!targetable(e) || e.hidden) continue;
        if (segDist(e.x, e.y, P.x, P.y, P.x + Math.cos(P.face) * sp.len, P.y + Math.sin(P.face) * sp.len) < e.r + 18) spellHit(e, sp.dmg * spellMult(), P.face, sp.el, 4);
      }
    }
    for (let i = 0; i < 6; i++) { const d = rand(20, sp.len); G.particles.push({ x: P.x + Math.cos(P.face) * d + rand(-8, 8), y: P.y - 14 + Math.sin(P.face) * d + rand(-8, 8), vx: Math.cos(P.face) * 200, vy: Math.sin(P.face) * 200, life: 0.2, max: 0.2, size: rand(3, 7), col: pick(['#8ab8ff', '#c0d8ff', '#ffffff']), grav: 0, glow: true }); }
    if (P.t >= fire + sp.dur) { P.state = 'free'; P.cast = null; }
    return;
  }
  if (P.t >= sp.cast) { P.state = 'free'; P.cast = null; }
}
function spellHit(e, dmg, ang, el, poise = 20) {
  damageEnemy(e, dmg * rand(0.95, 1.05), poise, ang, e.state === 'stagger', true, el);
}
function castEffect(sp) {
  const fx = (n, col) => burst(P.x, P.y - 14, n, col, 160, 0.9, 3, 0, true);
  switch (sp.kind) {
    case 'heal': {
      const amt = P.maxHp * sp.amt + 30;
      P.hp = Math.min(P.maxHp, P.hp + amt);
      for (const al of G.allies) al.hp = Math.min(al.maxHp, al.hp + al.maxHp * sp.amt);
      fx(50, '#ffe08a'); sfx('heal');
      G.rings.push({ x: P.x, y: P.y, r: 10, maxR: 160, spd: 300, th: 10, dmg: 0, push: 0, hit: true, col: '255,220,130', delay: 0, fx: false, player: true, hitSet: new Set(), el: 'holy' });
      break;
    }
    case 'buff':
      addBuff(sp.name, { name: sp.name, t: sp.dur, dmg: sp.dmg, def: sp.def, col: sp.col });
      fx(60, `rgb(${sp.col})`); sfx('heal');
      banner(sp.name, `rgb(${sp.col})`, sp.def < 1 ? 'Attack and defense up' : 'Attack up', 1.5, 0.45, 'small');
      break;
    case 'proj': case 'multi': {
      const n = sp.n || 1;
      for (let i = 0; i < n; i++) {
        const a = P.face + (i - (n - 1) / 2) * 0.16;
        G.pproj.push({ x: P.x + Math.cos(a) * 18, y: P.y - 14 + Math.sin(a) * 18, vx: Math.cos(a) * sp.spd, vy: Math.sin(a) * sp.spd, r: sp.r, dmg: sp.dmg * spellMult(), el: sp.el, life: sp.spd < 300 ? 3.4 : 1.6, hit: new Set(), ang: a, orb: true, fixed: true, homing: sp.homing, burn: sp.burn, big: sp.r > 20 });
      }
      sfx(sp.el === 'lightning' ? 'clang' : 'orb');
      break;
    }
    case 'beam': sfx('orb'); break;
  }
}

// ---------------------------------------------------------------- spirit summons
function canSummon() {
  if (!P.bell || !P.ash || G.allies.length || P.mounted || P.state === 'dead') return false;
  if (!(G.arenaFight || G.activeBosses.length)) return false;
  return G.summonUsed !== (G.arenaFight || (G.activeBosses[0] && G.activeBosses[0].uid));
}
function summonSpirit() {
  const A = ASHES[P.ash];
  if (A.hpCost) {
    if (P.hp <= P.maxHp * A.hpCost + 1) { sfx('empty'); banner('Not enough HP', '#ff9a8a', '', 1, 0.45, 'small'); return; }
    P.hp -= P.maxHp * A.hpCost;
  } else if (P.fp < A.fp) { sfx('empty'); banner('Not enough FP', '#9ab0ff', '', 1, 0.45, 'small'); return; }
  else P.fp -= A.fp;
  G.summonUsed = G.arenaFight || (G.activeBosses[0] && G.activeBosses[0].uid);
  P.state = 'bell'; P.t = 0;
  sfx('glint');
  setTimeout(() => {
    for (let i = 0; i < A.n; i++) {
      const a = P.face + Math.PI + (i - (A.n - 1) / 2) * 0.9;
      let x = P.x + Math.cos(a) * 50, y = P.y + Math.sin(a) * 50;
      if (!walkable(x, y) || pointBlocked(x, y)) { x = P.x; y = P.y; }
      G.allies.push(makeAlly(A, x, y));
      burst(x, y - 10, 30, '#a8c8ff', 160, 0.9, 3, 0, true);
    }
    sfx('orb');
  }, 450);
}
function makeAlly(A, x, y) {
  const lv = level(), hpS = 1 + lv * 0.04, dS = 1 + lv * 0.025;
  const base = { ally: true, kind: A.kind, x, y, face: P.face, walk: 0, air: 0, flash: 0, state: 'move', t: 0, cd: rand(0.2, 0.6), tgt: null, vx: 0, vy: 0, hitSet: new Set() };
  switch (A.kind) {
    case 'wolf':
      return { ...base, r: 11, spd: 230, hp: A.hp * hpS, maxHp: A.hp * hpS, def: { look: { kind: 'quad', body: '#6a7a98', fur: '#a8b8d8', scale: 1, ghost: true, glow: '150,190,255' } },
        atk: { wind: 0.35, act: 0.12, rec: 0.55, range: 34, arc: 1.6, dmg: A.dmg * dS, lunge: 300 } };
    case 'jelly':
      return { ...base, r: 12, spd: 110, hp: A.hp * hpS, maxHp: A.hp * hpS, ranged: 230, def: { look: { kind: 'jelly' } },
        atk: { wind: 0.7, act: 0.1, rec: 1.3, range: 340, dmg: A.dmg * dS, el: 'poison', shot: true } };
    case 'tiche':
      return { ...base, r: 12, spd: 270, hp: A.hp * hpS, maxHp: A.hp * hpS, def: { look: HU({ armor: '#1a1a24', cape: '#141420', capeLong: 1.2, helm: 'hood', ghost: true, weapon: WPN('katana', 32, { col: '#c03040', edge: '#ff8080' }) }) },
        atk: { wind: 0.28, act: 0.12, rec: 0.32, range: 52, arc: 2.2, dmg: A.dmg * dS, lunge: 320, dir: 1, el: 'death', dd: true } };
    case 'mimic': {
      const w = weapon(), l = w.l[0];
      return { ...base, r: P.r, spd: 170, hp: P.maxHp, maxHp: P.maxHp, mimic: true,
        def: { look: { body: '#6a6a78', armor: '#9a9aa8', cape: '#5a5a68', helm: 'tarnished', trim: '#d8d8e8', capeLong: 0.95, ghost: true, weapon: { type: w.rtype, len: w.len, w: w.w, col: '#c8c8d8', edge: '#ffffff' } } },
        atk: { wind: l.wind, act: l.act, rec: l.rec + 0.2, range: l.range, arc: l.arc, dmg: l.dmg * dmgMult() * 0.75, lunge: l.lunge, dir: l.dir || 1, thrust: l.thrust } };
    }
  }
}
function clearAllies(fx = true) {
  if (fx) for (const al of G.allies) burst(al.x, al.y - 10, 20, '#a8c8ff', 120, 0.8, 3, 0, true);
  G.allies = [];
}
function allyTarget(al) {
  let best = null, bd = 900;
  for (const e of G.enemies) {
    if (!targetable(e) || e.hidden || e.state === 'idle' && !e.boss) continue;
    const d = dist(al, e) - (e.boss ? 120 : 0); // spirits go for the boss first
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function updateAllies(dt) {
  // burning black flame on enemies
  for (const e of G.enemies) if (e.burnT > 0 && !e.dead) {
    e.burnT -= dt;
    if (e.state !== 'phase' && !e.shielded) { e.hp -= (e.maxHp * (e.boss ? 0.005 : 0.012) + 3) * dt; if (Math.random() < 0.5) G.particles.push({ x: e.x + rand(-e.r, e.r) * 0.6, y: e.y - rand(0, e.r * 1.5), vx: 0, vy: -40, life: 0.5, max: 0.5, size: 3, col: pick(['#ff5032', '#1a1010']), grav: 0, glow: true }); if (e.hp <= 0) killEnemy(e); }
  }
  if (!G.allies.length) return;
  // spirits fade once the fight is over
  if (!G.bossBusy) { G.allyIdle = (G.allyIdle || 0) + dt; if (G.allyIdle > 3) { clearAllies(); return; } } else G.allyIdle = 0;
  for (const al of G.allies) {
    al.t += dt; al.flash = Math.max(0, al.flash - dt);
    const kb = Math.exp(-8 * dt);
    if (Math.abs(al.vx) + Math.abs(al.vy) > 1) { moveEnt(al, al.vx * dt, al.vy * dt); al.vx *= kb; al.vy *= kb; }
    if (!al.tgt || !targetable(al.tgt) || al.tgt.hidden) al.tgt = allyTarget(al);
    const T = al.tgt, a = al.atk;
    if (al.state === 'move') {
      al.cd -= dt;
      if (!T) { // stay close to the player
        const d = dist(al, P);
        if (d > 90) { const ang = angTo(al, P); moveEnt(al, Math.cos(ang) * al.spd * dt, Math.sin(ang) * al.spd * dt); al.face = ang; al.walk += dt * 8; }
        continue;
      }
      const d = dist(al, T), ang = angTo(al, T), want = al.ranged || (a.range + T.r - 6);
      al.face += angDiff(al.face, ang) * Math.min(1, dt * 10);
      if (d > want) { moveEnt(al, Math.cos(ang) * al.spd * dt, Math.sin(ang) * al.spd * dt); al.walk += dt * 8; }
      else if (al.ranged && d < al.ranged - 80) { moveEnt(al, -Math.cos(ang) * al.spd * dt, -Math.sin(ang) * al.spd * dt); }
      if (al.cd <= 0 && d <= (al.ranged ? a.range : a.range + T.r + 10)) {
        // Tiche vanishes and reappears behind her target
        if (al.kind === 'tiche' && Math.random() < 0.3) { const ba = T.face + Math.PI; const tx = T.x + Math.cos(ba) * (T.r + 30), ty = T.y + Math.sin(ba) * (T.r + 30); if (walkable(tx, ty)) { burst(al.x, al.y - 10, 14, '#c03040', 120, 0.5, 3, 0, true); al.x = tx; al.y = ty; al.face = angTo(al, T); } }
        al.state = 'windup'; al.t = 0; al.hitSet = new Set();
      }
    } else if (al.state === 'windup') {
      if (T) al.face += angDiff(al.face, angTo(al, T)) * Math.min(1, dt * 8);
      if (al.t >= a.wind) {
        al.state = 'active'; al.t = 0;
        if (a.lunge) { al.vx += Math.cos(al.face) * a.lunge; al.vy += Math.sin(al.face) * a.lunge; }
        if (a.shot) { G.pproj.push({ x: al.x, y: al.y - 22, vx: Math.cos(al.face) * 300, vy: Math.sin(al.face) * 300, r: 9, dmg: a.dmg, el: a.el, life: 1.4, hit: new Set(), ang: al.face, orb: true, fixed: true, homing: 1.5, ally: true }); sfx('orb'); }
        else sfx(al.mimic ? 'swing' : 'enemySwing');
      }
    } else if (al.state === 'active') {
      if (!a.shot) for (const e of G.enemies) {
        if (!targetable(e) || e.hidden || al.hitSet.has(e) || e.air > 0.3) continue;
        const d = dist(al, e);
        if (d < a.range + e.r && Math.abs(angDiff(al.face, angTo(al, e))) < a.arc / 2 + 0.2) { al.hitSet.add(e); allyDamage(al, e, a.dmg, a.el); if (a.dd && !e.dead) e.hp -= Math.min(e.maxHp * 0.003, 40); }
      }
      if (al.t >= a.act) { al.state = 'recover'; al.t = 0; }
    } else if (al.state === 'recover') {
      if (al.t >= a.rec) { al.state = 'move'; al.t = 0; al.cd = rand(0.1, 0.5); }
    }
  }
  // keep spirits from piling into each other or the boss
  for (const al of G.allies) for (const o of [...G.allies, ...(al.tgt ? [al.tgt] : [])]) {
    if (o === al || o.dead) continue;
    const dx = al.x - o.x, dy = al.y - o.y, rr = al.r + o.r, d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2), k = Math.min(rr - d, 8); moveEnt(al, (dx / d) * k, (dy / d) * k); }
  }
  G.allies = G.allies.filter((al) => al.hp > 0);
}
function allyDamage(al, e, dmg, el) {
  const hs = G.hitstop, sh = G.shake;
  damageEnemy(e, dmg * buffDmg() * rand(0.92, 1.08), 12, angTo(al, e), e.state === 'stagger', false, el);
  G.hitstop = Math.max(hs, Math.min(G.hitstop, 0.02)); G.shake = Math.max(sh, Math.min(G.shake, 2));
  // foes turn on the spirits that hurt them
  if (!e.dead && Math.random() < (e.boss ? 0.22 : 0.5)) e.tgt = al;
}
function allyHurt(al, dmg, ang) {
  if (al.hp <= 0) return;
  dmg *= buffDef();
  al.hp -= dmg; al.flash = 0.15;
  al.vx += Math.cos(ang) * 120; al.vy += Math.sin(ang) * 120;
  dmgNumber(al.x, al.y - 14, dmg, '#a8c8ff');
  if (al.hp <= 0) { burst(al.x, al.y - 10, 30, '#a8c8ff', 160, 0.9, 3, 0, true); sfx('die'); }
}
function allyAt(x, y, r) {
  for (const al of G.allies) if (al.hp > 0 && Math.hypot(al.x - x, al.y - y) < r + al.r) return al;
  return null;
}
// enemy attacks hit spirits with the same shapes they use against the player
function hitAllies(e, a, dt) {
  if (!e.allyHits) e.allyHits = new Set();
  e.allyTick = (e.allyTick || 0) - dt;
  const tickOnce = ['spin', 'breath', 'beam'].includes(a.kind);
  if (tickOnce && e.allyTick <= 0) { e.allyTick = 0.25; e.allyHits.clear(); }
  for (const al of G.allies) {
    if (al.hp <= 0 || e.allyHits.has(al)) continue;
    const d = dist(e, al), ang = angTo(e, al);
    let hit = false;
    if (a.kind === 'spin') hit = d < a.rad + al.r * 0.4;
    else if (a.kind === 'circle') hit = Math.hypot(al.x - (e.x + Math.cos(e.face) * a.off), al.y - (e.y + Math.sin(e.face) * a.off)) < a.rad + al.r * 0.4;
    else if (a.kind === 'leap') hit = e.air < 0.05 && e.t >= a.act * 0.95 && d < a.rad + al.r * 0.4;
    else if (a.kind === 'dash') hit = d < e.r + al.r + a.rad * 0.4;
    else if (a.kind === 'breath') hit = d < a.range && Math.abs(angDiff(e.face, ang)) < a.cone;
    else if (a.kind === 'beam') hit = segDist(al.x, al.y, e.x, e.y, e.x + Math.cos(e.face) * a.len, e.y + Math.sin(e.face) * a.len) < a.width / 2 + al.r * 0.4;
    else if (!a.kind && a.range) hit = d < a.range + al.r && Math.abs(angDiff(e.face, ang)) < a.arc / 2 + 0.15;
    if (hit) { e.allyHits.add(al); allyHurt(al, (a.kind === 'breath' || a.kind === 'beam' ? a.dmg : a.dmg) * e.dmgMul, ang); }
  }
}

// ---------------------------------------------------------------- drawing spirits
function drawAlly(al) {
  ctx.save();
  ctx.globalAlpha *= 0.8;
  glowAt(al.x, al.y - 14, al.r * 3, '150,190,255', 0.3);
  if (al.kind === 'wolf') drawQuad(al, 0);
  else if (al.kind === 'jelly') {
    const bob = Math.sin(G.time * 3 + al.x) * 4, y = al.y - 30 + bob;
    drawShadow(al.x, al.y, 10, 0.2);
    ctx.strokeStyle = 'rgba(190,140,255,0.6)'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(al.x + i * 4, y + 6); ctx.quadraticCurveTo(al.x + i * 5 + Math.sin(G.time * 4 + i) * 4, y + 18, al.x + i * 4, y + 28); ctx.stroke(); }
    ctx.fillStyle = al.flash > 0 ? '#ffffff' : 'rgba(200,160,255,0.85)';
    ctx.beginPath(); ctx.ellipse(al.x, y, 13, 10, 0, Math.PI, TAU); ctx.lineTo(al.x + 13, y + 6); ctx.lineTo(al.x - 13, y + 6); ctx.closePath(); ctx.fill();
    glowAt(al.x, y, 22, '200,160,255', 0.5);
  } else {
    const L = al.def.look, st = al.state === 'move' ? null : al.state;
    const pose = attackPose(al.face, al.atk, st, al.t, 1);
    if (pose.phase === 'active' && !al.atk.thrust) pose.trail = { a0: swingAngle(al.face, al.atk, 'active', 0), len: L.weapon.len, col: al.kind === 'tiche' ? '255,90,110' : '200,215,255' };
    drawShadow(al.x, al.y, al.r, 0.3);
    drawHumanoid({ x: al.x, y: al.y, r: al.r, face: al.face, look: L, walk: al.walk, moving: al.state === 'move' && al.walk > 0 ? 80 : 0, flash: al.flash, tel: 0, weapon: L.weapon, pose, guard: false, lift: 0, phase2: false, air: 0 });
  }
  // small health bar
  const bw = 26, bx = al.x - bw / 2, by = al.y - al.r * 2.6 - 18;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
  ctx.fillStyle = '#8ab0ff'; ctx.fillRect(bx, by, bw * clamp(al.hp / al.maxHp, 0, 1), 2);
  ctx.restore();
}
