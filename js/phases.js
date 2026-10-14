'use strict';
/* Boss second phases (real transformations, not a power-up glow), Rennala's chanting students and boss-summoned spirits. */

function startPhase2(e) {
  const ph = e.def.phase2;
  if (!ph || ph.fx === 'quiet') { e.phase2 = true; return; }
  e.phasing = true; e.state = 'phase'; e.t = 0; e.atk = null; e.air = 0; e.vx = e.vy = 0;
  e.phFx = ph.fx; e.phStep = 0; e.poise = e.maxPoise; e.shielded = false;
  if (ph.fresh) {
    // the first bar is empty; a new one fills up during the transition
    e.newMax = Math.round(e.maxHp * (ph.hpMul || 1));
    e.hp = 1; e.hpLag = 1;
  }
  if (P.lock === e && ph.fx === 'meteor') P.lock = null;
  if (ph.quote) setTimeout(() => banner(ph.quote, '#e8dcc0', '', 3.6, 0.42, 'small'), 250);
  if (e.def.students) for (const o of G.enemies) if (o.owner === e && !o.dead) dissolve(o);
}

function finishPhase2(e) {
  const ph = e.def.phase2;
  applyPhaseLook(e);
  e.phase2 = true; e.phasing = false; e.hidden = false; e.air = 0;
  e.state = 'chase'; e.t = 0; e.cd = 0.3;
  if (ph.speed) e.phSpeed = ph.speed;
  if (ph.fresh) { e.maxHp = e.newMax; e.hp = e.hpLag = e.maxHp; }
  if (ph.name || ph.fresh) {
    e.name = ph.name || e.name;
    banner(e.name, '#e9cf86', '', 2.4, 0.6, 'zone');
  }
}
function applyPhaseLook(e) {
  const ph = e.def.phase2;
  if (ph.look && !e.lookApplied) { e.def.look = { ...e.def.look, ...ph.look }; e.lookApplied = true; }
}

// one transition per boss; everything here is visual except Radahn's crash, Godfrey's quake and Mohg's Nihil
function updatePhase(e, dt, toP) {
  const ph = e.def.phase2, t = e.t, k = clamp(t / ph.dur, 0, 1);
  const at = (s) => t >= s && t - dt < s; // fires once when the timeline passes s seconds
  if (ph.fresh) { e.hp = Math.max(1, e.newMax * k); e.hpLag = e.hp; e.maxHp = e.newMax; }
  if (e.phFx !== 'meteor') e.face += angDiff(e.face, toP) * Math.min(1, dt * 3);
  const col = e.def.el ? elHex(e.def.el) : '#ffffff';
  switch (e.phFx) {
    case 'graft': { // Godrick hacks off his arm and grafts on a dragon's head
      if (at(1.2)) {
        const sx = e.x + Math.cos(e.face + 1.3) * e.r, sy = e.y - 20 + Math.sin(e.face + 1.3) * e.r;
        for (let i = 0; i < 6; i++) blood(sx, sy, e.face + 1.3 + rand(-0.6, 0.6), 18, '#7a0e0e', 360);
        sfx('bleed'); sfx('heavy'); shake(10); G.hitstop = 0.12;
      }
      if (t > 1.2 && t < 2.6 && Math.random() < 0.5) blood(e.x + Math.cos(e.face + 1.3) * e.r, e.y - 16, rand(0, TAU), 2, '#7a0e0e', 80);
      if (at(2.6)) { e.phase2 = true; sfx('roar'); shake(14); burst(e.x + Math.cos(e.face) * e.r, e.y - 30, 70, '#ff8a3a', 280, 1.1, 4, 0, true); }
      break;
    }
    case 'moon': { // Rennala rises and calls down the Full Moon
      e.air = Math.min(0.5, t * 0.4);
      G.moonT = Math.max(G.moonT || 0, 1);
      if (Math.random() < 0.8) G.particles.push({ x: e.x + rand(-160, 160), y: e.y + rand(-80, 60), vx: 0, vy: rand(-50, -20), life: 1.2, max: 1.2, size: rand(2, 4), col: pick(['#a8c8ff', '#e0ecff', '#7aa0ff']), grav: 0, glow: true });
      if (at(2.4)) { burst(e.x, e.y - 40, 90, '#c8dcff', 260, 1.2, 4, 0, true); sfx('orb'); shake(8); }
      break;
    }
    case 'meteor': { // Radahn leaps into the sky and crashes down as a meteor
      if (t < 1.1) {
        e.air = t * 3.4;
        if (Math.random() < 0.9) G.particles.push({ x: e.x + rand(-20, 20), y: e.y - e.air * 70 + rand(-10, 10), vx: rand(-30, 30), vy: rand(40, 120), life: 0.6, max: 0.6, size: rand(3, 6), col: pick(['#b070ff', '#d0b0ff', '#ff8a5a']), grav: 0, glow: true });
        if (at(0.05)) { sfx('roar'); burst(e.x, e.y, 50, '#b070ff', 240, 0.8, 4, 0, true); shake(10); }
      } else if (t < 3.4) {
        e.hidden = true; e.air = 4;
        if (t < 3.0) { e.mx = P.x; e.my = P.y; }
      } else if (at(3.4) || (!e.crashed && t >= 3.4)) {
        e.crashed = true; e.hidden = false; e.air = 0; e.x = e.mx; e.y = e.my; collide(e);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 150 + P.r * 0.4) hurtPlayer(70 * e.dmgMul, Math.atan2(P.y - e.y, P.x - e.x), 320, e, 'gravity');
        addRing(e.x, e.y, { r0: 150, maxR: 360, spd: 320, th: 16, dmg: 18 * e.dmgMul, push: 200, col: elc('gravity'), el: 'gravity' });
        burst(e.x, e.y, 120, '#b070ff', 360, 1.2, 5, 0, true); decal(e.x, e.y + 6, 120, 'rgba(20,10,30,0.6)');
        sfx('slam'); sfx('felled'); shake(26); G.hitstop = 0.15;
      }
      break;
    }
    case 'emerge': { // the serpent splits open and Rykard's face rises out of it
      if (Math.random() < 0.6) G.particles.push({ x: e.x + rand(-60, 60), y: e.y + rand(-30, 30), vx: 0, vy: rand(-90, -40), life: 0.8, max: 0.8, size: rand(3, 6), col: pick(['#ff7a2a', '#ffb347', '#c03010']), grav: 0, glow: true });
      if (at(1.4)) {
        applyPhaseLook(e); sfx('roar'); shake(16);
        burst(e.x, e.y - 30, 100, '#ff7a2a', 300, 1.2, 5, 0, true);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; G.pools.push({ x: e.x + Math.cos(a) * 180, y: e.y + Math.sin(a) * 130, r: 70, life: 6, max: 6, el: 'fire', dps: 8 * e.dmgMul, status: null, tick: 0.6, grow: 0 }); }
      }
      break;
    }
    case 'cursed': { // Morgott cuts his palm and his blood becomes weapons
      if (at(0.8)) { const hx = e.x + Math.cos(e.face + 0.9) * e.r, hy = e.y - 20; for (let i = 0; i < 4; i++) blood(hx, hy, rand(0, TAU), 14, '#c01020', 260); sfx('bleed'); burst(hx, hy, 40, '#d01a30', 200, 0.8, 3, 0, true); shake(6); }
      break;
    }
    case 'leg': { // Niall slams his prosthetic leg: lightning and frost
      if (at(0.6)) { burst(e.x, e.y, 60, '#ffe86e', 260, 0.8, 3.5, 0, true); addRing(e.x, e.y, { r0: 20, maxR: 200, spd: 360, th: 14, dmg: 14 * e.dmgMul, push: 200, col: elc('lightning'), el: 'lightning' }); sfx('clang'); shake(10); }
      break;
    }
    case 'bloom': { // Malenia rises, sprouts her rotted wings and the Scarlet Aeonia blooms
      e.air = t < 1.4 ? t * 0.9 : t < 3.6 ? 1.26 : Math.max(0, 1.26 - (t - 3.6) * 1.4);
      if (at(1.4)) { e.phase2 = true; sfx('roar'); burst(e.x, e.y - 90, 80, '#e05a2a', 220, 1.2, 4, 0, true); }
      if (t > 1.4 && Math.random() < 0.8) G.particles.push({ x: e.x + rand(-40, 40), y: e.y - 90 + rand(-30, 30), vx: rand(-40, 40), vy: rand(-20, 40), life: 1, max: 1, size: rand(2, 5), col: pick(['#e05a2a', '#ff8a50', '#c03018']), grav: 0, glow: true });
      if (at(2.8)) {
        addRing(e.x, e.y, { r0: 30, maxR: 330, spd: 260, th: 26, dmg: 36 * e.dmgMul, push: 220, col: elc('rot'), el: 'rot' });
        G.pools.push({ x: e.x, y: e.y, r: 200, life: 7, max: 7, el: 'rot', dps: 7 * e.dmgMul, status: 'rot', tick: 0.6, grow: 0 });
        burst(e.x, e.y, 140, '#e05a2a', 360, 1.4, 5, 0, true); sfx('slam'); shake(18);
      }
      break;
    }
    case 'ritual': { // Mohg's Bloodboon ritual, then three cries of "Nihil!"
      if (at(0.2)) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; G.pools.push({ x: e.x + Math.cos(a) * 220, y: e.y + Math.sin(a) * 160, r: 60, life: 6, max: 6, el: 'blood', dps: 6 * e.dmgMul, status: 'bleed', tick: 0.6, grow: 0 }); }
      if (at(1.6)) { applyPhaseLook(e); e.phase2 = true; sfx('roar'); burst(e.x, e.y - 30, 80, '#c01020', 260, 1, 4, 0, true); }
      e.air = t > 1.6 ? Math.min(0.6, (t - 1.6) * 0.8) : 0;
      for (const s of [2.4, 3.2, 4.0]) if (at(s)) {
        addRing(e.x, e.y, { r0: 30, maxR: 520, spd: 520, th: 20, dmg: 12 * e.dmgMul, push: 60, col: elc('blood'), el: 'blood' });
        burst(e.x, e.y - 40, 50, '#ff2040', 260, 0.7, 4, 0, true); sfx('bleed'); shake(12);
      }
      break;
    }
    case 'reveal': { // the Beast Clergyman sheds his robes: Maliketh draws the Black Blade
      if (t < 1.2 && Math.random() < 0.9) { const a = rand(0, TAU); G.particles.push({ x: e.x + Math.cos(a) * 70, y: e.y - 20 + Math.sin(a) * 50, vx: -Math.sin(a) * 120, vy: Math.cos(a) * 90, life: 0.6, max: 0.6, size: rand(3, 6), col: pick(['#1a1018', '#c04050', '#3a2030']), grav: 0, glow: true }); }
      if (at(1.2)) { applyPhaseLook(e); sfx('glint'); sfx('roar'); burst(e.x, e.y - 20, 100, '#c04050', 300, 1, 4, 0, true); shake(14); G.hitstop = 0.15; }
      break;
    }
    case 'kneel': { // Godfrey kneels, Serosh is cast off, and Hoarah Loux stands
      if (at(1.5)) {
        applyPhaseLook(e);
        addRing(e.x, e.y, { r0: 30, maxR: 300, spd: 380, th: 18, dmg: 20 * e.dmgMul, push: 260, col: '230,200,140' });
        burst(e.x, e.y, 80, 'rgba(160,140,100,0.85)', 300, 0.9, 5); decal(e.x, e.y + 6, 90, 'rgba(20,16,12,0.5)');
        sfx('slam'); shake(20);
      }
      if (at(2.6)) sfx('roar');
      break;
    }
    case 'legoff': { // the Fire Giant severs his own leg and fights on, crawling
      if (t < 1.0 && Math.random() < 0.6) G.particles.push({ x: e.x + rand(-30, 30), y: e.y - 10, vx: rand(-40, 40), vy: rand(-120, -40), life: 0.7, max: 0.7, size: rand(3, 7), col: pick(['#ff7a2a', '#ffb347']), grav: 0, glow: true });
      if (at(1.0)) { burst(e.x + Math.cos(e.face + 1.6) * e.r * 0.5, e.y - 10, 90, '#ff7a2a', 300, 1, 5, 0, true); sfx('slam'); sfx('heavy'); shake(16); }
      if (at(2.0)) {
        applyPhaseLook(e); sfx('roar'); shake(20);
        addRing(e.x, e.y, { r0: e.r, maxR: 300, spd: 300, th: 22, dmg: 18 * e.dmgMul, push: 200, col: elc('fire'), el: 'fire' });
      }
      break;
    }
  }
  if (t >= ph.dur) finishPhase2(e);
}

// ---------------------------------------------------------------- Rennala's students (phase 1)
function updateStudents(e, dt) {
  e.studs = (e.studs || []).filter((o) => !o.dead);
  e.shielded = e.studs.length > 0;
  e.air = e.shielded ? 0.35 : 0; // floats out of reach while the students chant
  if (e.shielded) { e.hadStuds = true; return; }
  if (e.hadStuds) {
    // last student down: the barrier shatters and she falls
    e.hadStuds = false; e.studT = 9; e.state = 'stagger'; e.t = 0; e.stagLen = 6; e.atk = null; e.air = 0;
    burst(e.x, e.y - 30, 70, '#ffe08a', 260, 1, 4, 0, true); sfx('clang'); sfx('felled'); shake(8);
    banner('The barrier shatters', '#cbd8ff', '', 2, 0.45, 'small');
    return;
  }
  e.studT = (e.studT ?? 0) - dt;
  if (e.studT <= 0) {
    for (let i = 0; i < e.def.students; i++) { const s = spawnAdd(e, 'rennala_student', i, e.def.students, { ring: 230 }); if (s) e.studs.push(s); }
    e.shielded = e.studs.length > 0;
    sfx('orb');
  }
}

// ---------------------------------------------------------------- spirits and escorts called by bosses
function spawnAdd(owner, type, i, n, o) {
  if (!MOBS[type]) return null;
  const R = o.ring || 140, a0 = owner.face + Math.PI / 2;
  let x = owner.x, y = owner.y;
  for (let k = 0; k < 6; k++) {
    const a = a0 + ((i + k * 0.37) / n) * TAU, tx = owner.x + Math.cos(a) * R, ty = owner.y + Math.sin(a) * R;
    if (walkable(tx, ty) && !pointBlocked(tx, ty)) { x = tx; y = ty; break; }
  }
  const s = makeEnemy(type, x, y, { inst: owner.inst });
  s.summoned = true; s.owner = owner; s.runes = 0; s.state = 'chase'; s.home = { x, y };
  if (o.spirit) { s.spirit = true; s.lifeT = o.life || 25; }
  G.enemies.push(s);
  burst(x, y - 10, 24, o.spirit ? '#a8c8ff' : '#e8dcc0', 140, 0.7, 3, 0, true);
  return s;
}
function dissolve(e) {
  if (e.dead) return;
  e.dead = true; e.deathT = 0; e.hp = 0;
  if (P.lock === e) P.lock = null;
  burst(e.x, e.y - 10, 20, '#a8c8ff', 120, 0.8, 3, 0, true);
}
