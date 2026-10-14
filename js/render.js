'use strict';
/* World rendering: terrain, structures, entities, hazards, lighting and atmosphere. */

const WALL_H = { castle: 50, ruin: 26, cliff: 40, hut: 34, keep: 70, inst: 50, gold: 50 };
let camOX = 0, camOY = 0;
function applyWorldTransform() {
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, DPR * (W / 2 - (cam.x + camOX) * SCALE), DPR * (H / 2 - (cam.y + camOY) * SCALE));
}
const toScreen = (x, y) => [(x - cam.x - camOX) * SCALE + W / 2, (y - cam.y - camOY) * SCALE + H / 2];
function view() {
  const hw = W / 2 / SCALE, hh = H / 2 / SCALE;
  return { x0: cam.x - hw - 90, x1: cam.x + hw + 90, y0: cam.y - hh - 90, y1: cam.y + hh + 160 };
}
const bbHit = (bb, v) => bb.x1 > v.x0 && bb.x0 < v.x1 && bb.y1 > v.y0 && bb.y0 < v.y1;
function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
function strokePath(p) { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }

// ---------------------------------------------------------------- terrain
function drawOverworldGround(v) {
  const sea = TEX.sea;
  if (sea.setTransform && typeof DOMMatrix !== 'undefined') sea.setTransform(new DOMMatrix([1, 0, 0, 1, (G.time * 7) % 256, (G.time * 3) % 256]));
  ctx.fillStyle = sea; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const vis = RW.filter((r) => bbHit(r.bb, v));
  ctx.lineJoin = 'round';
  for (const r of vis) { polyPath(r.pts); ctx.strokeStyle = 'rgba(220,235,240,0.18)'; ctx.lineWidth = 170 + Math.sin(G.time * 1.2) * 14; ctx.stroke(); }
  for (const r of vis) { polyPath(r.pts); ctx.strokeStyle = '#8a7a58'; ctx.lineWidth = 110; ctx.stroke(); }
  for (const r of vis) { if (r.blocked) continue; polyPath(r.pts); ctx.fillStyle = TEX[BIOMES[r.biome].tex]; ctx.fill(); }
  ctx.save();
  ctx.beginPath();
  for (const r of vis) if (!r.blocked) { r.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  ctx.clip();
  ctx.globalAlpha = 0.5;
  for (const r of vis) { if (r.blocked) continue; polyPath(r.pts); ctx.strokeStyle = TEX[BIOMES[r.biome].tex]; ctx.lineWidth = 120; ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const p of PW) {
    if (!bbHit(p.bb, v)) continue;
    ctx.fillStyle = TEX[p.tex];
    if (p.pts) polyPath(p.pts); else { ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, TAU); }
    ctx.globalAlpha = 0.55; ctx.strokeStyle = TEX[p.tex]; ctx.lineWidth = 90; ctx.stroke();
    ctx.globalAlpha = 1; ctx.fill();
    if (p.tex === 'lava') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15 + 0.08 * Math.sin(G.time * 2); ctx.fillStyle = '#ff6a20'; ctx.fill(); ctx.restore(); }
  }
  ctx.lineCap = 'round';
  for (const p of ROADS_W) {
    ctx.strokeStyle = TEX.dirt;
    ctx.globalAlpha = 0.45; ctx.lineWidth = 128; strokePath(p);
    ctx.globalAlpha = 0.85; ctx.lineWidth = 76; strokePath(p);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  for (const r of vis) {
    if (!r.blocked) continue;
    if (r.biome === 'cliff') {
      polyPath(r.pts); ctx.fillStyle = TEX.cliff; ctx.fill();
      ctx.save(); polyPath(r.pts); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 80; polyPath(r.pts); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,210,0.06)'; ctx.lineWidth = 20; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#1e1c18'; ctx.lineWidth = 6; polyPath(r.pts); ctx.stroke();
    } else drawCity(r, v);
  }
  for (const s of SEGS) {
    if (Math.max(s.ax, s.bx) < v.x0 - 50 || Math.min(s.ax, s.bx) > v.x1 + 50 || Math.max(s.ay, s.by) < v.y0 - 50 || Math.min(s.ay, s.by) > v.y1 + 50) continue;
    ctx.strokeStyle = '#2a2620'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.stroke();
    ctx.strokeStyle = TEX.cliff; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(s.ax, s.ay - 6); ctx.lineTo(s.bx, s.by - 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,210,0.08)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.ax, s.ay - 14); ctx.lineTo(s.bx, s.by - 14); ctx.stroke();
  }
}
const CITY_CACHE = new Map();
function cityBlocks(r) {
  if (CITY_CACHE.has(r.id)) return CITY_CACHE.get(r.id);
  const R = rng(r.id.length * 911), out = [];
  for (let i = 0; i < 90; i++) {
    const x = r.bb.x0 + R() * (r.bb.x1 - r.bb.x0), y = r.bb.y0 + R() * (r.bb.y1 - r.bb.y0);
    if (!pip(x, y, r.pts)) continue;
    out.push({ x, y, w: 80 + R() * 160, h: 60 + R() * 120, hgt: 30 + R() * 60, v: R() });
  }
  out.sort((a, b) => a.y - b.y);
  CITY_CACHE.set(r.id, out);
  return out;
}
function drawCity(r, v) {
  const gold = r.biome === 'capital';
  polyPath(r.pts); ctx.fillStyle = TEX[gold ? 'capital' : 'stone']; ctx.fill();
  ctx.save(); polyPath(r.pts); ctx.clip();
  for (const b of cityBlocks(r)) {
    if (b.x + b.w < v.x0 || b.x > v.x1 || b.y + b.h < v.y0 || b.y - b.hgt > v.y1) continue;
    ctx.fillStyle = gold ? '#6a5a3a' : '#3a3632'; ctx.fillRect(b.x, b.y + b.h - b.hgt * 0.5, b.w, b.hgt * 0.5);
    ctx.fillStyle = gold ? TEX.goldTop : TEX.wallTop; ctx.fillRect(b.x, b.y - b.hgt * 0.5, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y - b.hgt * 0.5, b.w, b.h);
  }
  ctx.restore();
  ctx.strokeStyle = gold ? '#8a7448' : '#4a4640'; ctx.lineWidth = 60; polyPath(r.pts); ctx.stroke();
  ctx.strokeStyle = gold ? '#b89a5a' : '#6a645a'; ctx.lineWidth = 40; ctx.stroke();
  ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 46; ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y] of r.pts) { if (x < v.x0 - 80 || x > v.x1 + 80 || y < v.y0 - 80 || y > v.y1 + 80) continue; ball(x, y - 20, 50, 46, gold ? '#a08a5a' : '#5a5650'); ball(x, y - 50, 36, 32, gold ? '#c0a870' : '#6a645a'); }
}
function drawErdtree(v) {
  const x = 65 * MU, y = 22.6 * MU;
  if (x < v.x0 - 1600 || x > v.x1 + 1600 || y < v.y0 - 1600 || y > v.y1 + 1600) return;
  ctx.fillStyle = '#7a5a2a'; ctx.fillRect(x - 60, y - 300, 120, 300);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const rr = 900 - i * 180;
    const g = ctx.createRadialGradient(x, y - 420, 0, x, y - 420, rr);
    g.addColorStop(0, `rgba(255,220,120,${0.12 + i * 0.05})`); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 420, rr, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,214,110,0.55)';
  for (let i = 0; i < 26; i++) { const a = i * 2.39, d = 120 + (i * 37) % 420; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - 420 + Math.sin(a) * d * 0.6, 90 + (i % 5) * 20, 0, TAU); ctx.fill(); }
}
function drawInstanceGround(v) {
  const inst = INST[G.inst], th = BIOMES[inst.theme] || BIOMES.catacomb;
  ctx.fillStyle = '#07070a'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  if (inst.theme === 'underground' || inst.theme === 'mohgwyn' || inst.theme === 'rot') {
    ctx.fillStyle = inst.theme === 'underground' ? 'rgba(170,200,255,0.8)' : 'rgba(255,180,160,0.6)';
    for (let i = 0; i < 160; i++) {
      const sx = ((i * 977) % 3000) + Math.floor(v.x0 / 3000) * 3000, sy = ((i * 613) % 2000) + Math.floor(v.y0 / 2000) * 2000;
      for (const ox of [0, 3000]) for (const oy of [0, 2000]) { const x = sx + ox, y = sy + oy; if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3)); }
    }
  }
  ctx.fillStyle = TEX[th.tex];
  for (const f of inst.floors) if (f.x < v.x1 && f.x + f.w > v.x0 && f.y < v.y1 && f.y + f.h > v.y0) ctx.fillRect(f.x, f.y, f.w, f.h);
  for (const r of inst.bossRooms) {
    if (r.x > v.x1 || r.x + r.w < v.x0) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.strokeStyle = 'rgba(201,169,90,0.16)'; ctx.lineWidth = 3;
    const rr = Math.min(r.w, r.h) * 0.45;
    for (const k of [0.35, 0.65, 0.95]) { ctx.beginPath(); ctx.arc(r.cx, r.cy, rr * k, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}
function drawGround(v) {
  if (G.inst) drawInstanceGround(v); else drawOverworldGround(v);
  for (const d of G.decals) {
    if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
    ctx.globalAlpha = Math.min(1, d.life / 3) * 0.75; ctx.fillStyle = d.col;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, d.rot, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (G.inst) return;
  ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  const wind = Math.sin(G.time * 0.7) * 0.5 + 1;
  for (const t of inView(TUFT_BK, v)) {
    ctx.strokeStyle = t.col;
    const s = 7 * t.s, sw = Math.sin(G.time * 2 + t.x * 0.04 + t.y * 0.01) * 2 * wind + (t.dry ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(t.x - 3, t.y); ctx.quadraticCurveTo(t.x - 3, t.y - s * 0.6, t.x - 4 + sw, t.y - s);
    ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(t.x, t.y - s * 0.7, t.x + sw, t.y - s * 1.35);
    ctx.moveTo(t.x + 3, t.y); ctx.quadraticCurveTo(t.x + 3, t.y - s * 0.6, t.x + 4 + sw, t.y - s);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- props
function drawFlame(x, y, s, v, blue) {
  const t = G.time * 9 + v * 20;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cols = blue ? ['rgba(60,90,255,0.6)', 'rgba(110,160,255,0.6)', 'rgba(200,225,255,0.7)'] : ['rgba(255,90,20,0.6)', 'rgba(255,160,50,0.6)', 'rgba(255,230,150,0.7)'];
  for (let i = 0; i < 3; i++) {
    const h = (10 + i * 3 + Math.sin(t + i) * 3) * s, w = (5 - i) * s;
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w, y - h * 0.5, x + Math.sin(t * 0.7) * 2 * s, y - h); ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w, y); ctx.fill();
  }
  ctx.restore();
}
function drawTreeShape(d, pal) {
  drawShadow(d.x + 8, d.y, d.s * 0.7, 0.28);
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(d.x - 4, d.y - 30, 8, 32);
  const near = Math.hypot(P.x - d.x, P.y - (d.y - 30)) < d.s + 6;
  ctx.globalAlpha = near ? 0.4 : 1;
  const top = d.y - 40 - d.s * 0.45, sway = Math.sin(G.time * 1.2 + d.x) * 2;
  ctx.fillStyle = pal[0]; ctx.beginPath(); ctx.arc(d.x + sway, top + 6, d.s, 0, TAU); ctx.fill();
  ctx.fillStyle = pal[1];
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + d.v * 5; ctx.beginPath(); ctx.arc(d.x + sway + Math.cos(a) * d.s * 0.4, top + Math.sin(a) * d.s * 0.35, d.s * 0.55, 0, TAU); ctx.fill(); }
  ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(d.x + sway - d.s * 0.3, top - d.s * 0.3, d.s * 0.38, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}
const TREE_PAL = {
  default: [['#2f3d22', '#46582c', '#647236'], ['#4a4224', '#6c5f2c', '#9a8a3e'], ['#5a3a1e', '#8a5a26', '#b88a3a']],
  pink: [['#4a3a3a', '#8a5a6a', '#c88aa0'], ['#2f3d22', '#46582c', '#647236']],
  blue: [['#2a3a4a', '#3a5068', '#5a7a98'], ['#2f3d32', '#405a48', '#5a7a60']],
  gold: [['#6a5a20', '#a08a30', '#d8c050'], ['#7a6a28', '#b89a38', '#e8d060']],
};
function drawDecor(d) {
  const t = G.time;
  switch (d.type) {
    case 'tree': { const pals = TREE_PAL[d.variant] || TREE_PAL.default; drawTreeShape(d, pals[Math.floor(d.v * pals.length) % pals.length]); break; }
    case 'rottree': {
      drawShadow(d.x + 6, d.y, 14, 0.28);
      ctx.strokeStyle = '#3a1a14'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - d.s * 1.2); ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.6; ctx.beginPath(); ctx.moveTo(d.x + 2, d.y - d.s * 0.8); ctx.lineTo(d.x + Math.cos(a) * d.s * 0.7, d.y - d.s * 0.8 + Math.sin(a) * d.s * 0.6); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,60,40,0.55)'; ctx.beginPath(); ctx.arc(d.x, d.y - d.s * 1.2, d.s * 0.6, 0, TAU); ctx.fill();
      break;
    }
    case 'pine': {
      drawShadow(d.x + 6, d.y, d.s * 0.5, 0.28);
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(d.x - 3, d.y - 14, 6, 16);
      for (let i = 0; i < 3; i++) {
        const w = d.s * (0.75 - i * 0.18), yy = d.y - 10 - i * d.s * 0.4;
        ctx.fillStyle = i % 2 ? '#2a3a32' : '#304438';
        ctx.beginPath(); ctx.moveTo(d.x - w, yy); ctx.lineTo(d.x, yy - d.s * 0.7); ctx.lineTo(d.x + w, yy); ctx.fill();
        ctx.fillStyle = 'rgba(240,245,250,0.75)'; ctx.beginPath(); ctx.moveTo(d.x - w * 0.5, yy - d.s * 0.35); ctx.lineTo(d.x, yy - d.s * 0.7); ctx.lineTo(d.x + w * 0.5, yy - d.s * 0.35); ctx.fill();
      }
      break;
    }
    case 'deadtree': {
      drawShadow(d.x + 6, d.y, 12, 0.25);
      ctx.strokeStyle = '#2e2620'; ctx.lineCap = 'round';
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y - d.s * 1.4); ctx.stroke();
      ctx.lineWidth = 3;
      const sway = Math.sin(t * 1.5 + d.x) * 2;
      for (let i = 0; i < 5; i++) { const h = d.s * (0.5 + i * 0.18), a = (i % 2 ? 1 : -1) * (0.6 + d.v * 0.5) - Math.PI / 2; ctx.beginPath(); ctx.moveTo(d.x + 1, d.y - h); ctx.lineTo(d.x + Math.cos(a) * d.s * 0.6 + sway, d.y - h + Math.sin(a) * d.s * 0.5); ctx.stroke(); }
      break;
    }
    case 'bush': case 'drybush': {
      const c = d.type === 'drybush' ? ['#5a5434', '#6e6640'] : d.v < 0.5 ? ['#2f4020', '#43562a'] : ['#4a4a24', '#5f5c2c'];
      const s = 9 * d.s;
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(d.x, d.y + 2, s * 1.3, s * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(d.x - s * 0.5, d.y - s * 0.4, s * 0.7, 0, TAU); ctx.arc(d.x + s * 0.5, d.y - s * 0.4, s * 0.7, 0, TAU); ctx.fill();
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(d.x, d.y - s * 0.75, s * 0.75, 0, TAU); ctx.fill();
      break;
    }
    case 'flowers': case 'rotbloom': {
      const cols = d.type === 'rotbloom' ? ['#d04030', '#e8603a'] : d.v < 0.5 ? ['#e8cf6a', '#f2e08a'] : ['#e9e4d0', '#cfc4e8'];
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + d.v * 9, r = 3 + (i % 3) * 5, x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r * 0.5;
        ctx.strokeStyle = d.type === 'rotbloom' ? '#5a2a1a' : '#4a5a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
        ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.arc(x, y - 6, d.type === 'rotbloom' ? 2.6 : 1.8, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'boulder': case 'icerock': {
      drawShadow(d.x + 4, d.y, d.r, 0.3);
      ball(d.x, d.y - d.r * 0.45, d.r * 1.1, d.r * 0.85, d.type === 'icerock' ? '#a8c0d0' : d.v < 0.5 ? '#6a665a' : '#5a5a52', d.v);
      if (d.type === 'icerock') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.9, d.r * 0.5, d.r * 0.2, 0, 0, TAU); ctx.fill(); }
      break;
    }
    case 'grave': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(d.x - 6, d.y - 1, 14, 5);
      ctx.fillStyle = '#5f5b52'; ctx.beginPath(); ctx.moveTo(d.x - 6, d.y); ctx.lineTo(d.x - 6, d.y - 14); ctx.arc(d.x, d.y - 14, 6, Math.PI, 0); ctx.lineTo(d.x + 6, d.y); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d.x, d.y - 15); ctx.lineTo(d.x, d.y - 7); ctx.moveTo(d.x - 3, d.y - 12); ctx.lineTo(d.x + 3, d.y - 12); ctx.stroke();
      break;
    }
    case 'bones': {
      ctx.strokeStyle = '#cfc6b0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = d.v * 7 + i * 2; ctx.beginPath(); ctx.moveTo(d.x + Math.cos(a) * 7, d.y + Math.sin(a) * 3); ctx.lineTo(d.x - Math.cos(a) * 7, d.y - Math.sin(a) * 3); ctx.stroke(); }
      ctx.fillStyle = '#ddd4bd'; ctx.beginPath(); ctx.arc(d.x + 8, d.y - 2, 3.5, 0, TAU); ctx.fill();
      break;
    }
    case 'pillar': {
      drawShadow(d.x + 5, d.y, 14, 0.35);
      ctx.fillStyle = '#4c4740'; ctx.fillRect(d.x - 12, d.y - 60, 24, 60);
      const g = ctx.createLinearGradient(d.x - 12, 0, d.x + 12, 0); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(d.x - 12, d.y - 60, 24, 60);
      ctx.fillStyle = '#6a645a'; ctx.beginPath(); ctx.ellipse(d.x, d.y - 60, 14, 6, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'crystal': {
      ctx.fillStyle = 'rgba(140,190,255,0.85)';
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + d.v; const cx = d.x + Math.cos(a) * 8, cy = d.y + Math.sin(a) * 4; ctx.beginPath(); ctx.moveTo(cx, cy - 26 - i * 4); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx - 6, cy); ctx.fill(); }
      glowAt(d.x, d.y - 14, 40, '120,170,255', 0.3);
      break;
    }
    case 'branch': {
      ctx.strokeStyle = '#a08a60'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(d.x - 60, d.y); ctx.quadraticCurveTo(d.x, d.y - 30 * d.v, d.x + 60, d.y + 10); ctx.stroke();
      break;
    }
    case 'pool': {
      ctx.fillStyle = d.el === 'rot' ? 'rgba(200,70,30,0.55)' : 'rgba(150,10,20,0.6)';
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rad, d.rad * 0.6, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'torch': case 'bluetorch': {
      ctx.fillStyle = '#2a2420'; ctx.fillRect(d.x - 2, d.y - 26, 4, 26);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(d.x - 4, d.y - 30, 8, 5);
      drawFlame(d.x, d.y - 32, 1, d.v || 0, d.type === 'bluetorch');
      break;
    }
    case 'altar': {
      ctx.fillStyle = '#6a645a'; ctx.fillRect(d.x - 26, d.y - 14, 52, 20);
      ctx.fillStyle = '#7a746a'; ctx.fillRect(d.x - 26, d.y - 18, 52, 6);
      break;
    }
    case 'tower': {
      const h = d.tall ? 200 : 110;
      drawShadow(d.x + 20, d.y, d.r * 1.2, 0.35);
      ctx.fillStyle = '#4c4740'; ctx.fillRect(d.x - d.r, d.y - h, d.r * 2, h);
      const g = ctx.createLinearGradient(d.x - d.r, 0, d.x + d.r, 0); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = g; ctx.fillRect(d.x - d.r, d.y - h, d.r * 2, h);
      ctx.fillStyle = '#6a645a'; ctx.beginPath(); ctx.ellipse(d.x, d.y - h, d.r + 4, (d.r + 4) * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a3632'; for (let i = -2; i <= 2; i++) ctx.fillRect(d.x + i * d.r * 0.4 - 4, d.y - h - 12, 8, 12);
      break;
    }
    case 'minorerdtree': {
      drawShadow(d.x + 10, d.y, 40, 0.3);
      ctx.fillStyle = '#7a5a2a'; ctx.fillRect(d.x - 12, d.y - 90, 24, 92);
      glowAt(d.x, d.y - 140, 150, '255,220,120', 0.7);
      ctx.fillStyle = 'rgba(255,214,110,0.75)';
      for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 30 + (i * 13) % 60; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * rr, d.y - 140 + Math.sin(a) * rr * 0.6, 34, 0, TAU); ctx.fill(); }
      break;
    }
  }
}
function drawWall(w) {
  let kind = w.kind;
  if (kind === 'inst') kind = (BIOMES[G.inst && INST[G.inst] ? INST[G.inst].theme : 'catacomb'] || {}).wall || 'castle';
  const h = WALL_H[kind] || 40;
  const cliff = kind === 'cliff', gold = kind === 'gold';
  if (kind === 'hut') {
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(w.x, w.y + w.h - h, w.w, h);
    ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.moveTo(w.x - 8, w.y - h + 6); ctx.lineTo(w.x + w.w / 2, w.y - h - 22); ctx.lineTo(w.x + w.w + 8, w.y - h + 6); ctx.lineTo(w.x + w.w + 8, w.y + w.h - h); ctx.lineTo(w.x - 8, w.y + w.h - h); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(w.x + w.w / 2 - 8, w.y + w.h - 22, 16, 22);
    return;
  }
  ctx.fillStyle = cliff ? TEX.cliff : TEX.wallFace;
  ctx.fillRect(w.x, w.y + w.h - h, w.w, h);
  const g = ctx.createLinearGradient(0, w.y + w.h - h, 0, w.y + w.h);
  g.addColorStop(0, cliff ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(w.x, w.y + w.h - h, w.w, h);
  ctx.fillStyle = cliff ? TEX.cliff : gold ? TEX.goldTop : kind === 'ruin' ? TEX.ruinTop : TEX.wallTop;
  ctx.fillRect(w.x, w.y - h, w.w, w.h);
  ctx.fillStyle = 'rgba(255,240,210,0.06)'; ctx.fillRect(w.x, w.y - h, w.w, 2);
  if ((kind === 'castle' || kind === 'keep' || gold) && w.w > w.h) {
    ctx.fillStyle = gold ? '#a08a5a' : '#5c564c';
    for (let x = w.x + 4; x < w.x + w.w - 10; x += 22) ctx.fillRect(x, w.y + w.h - h - 7, 12, 7);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(w.x + 0.5, w.y - h + 0.5, w.w - 1, w.h + h - 1);
}
function drawFog(f) {
  if (!fogSolid(f)) return;
  const t = G.time;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const col = G.arenaFight === f.key ? '255,190,120' : '225,228,240';
  for (let i = 0; i < 8; i++) {
    const x = f.x + f.w / 2 + Math.sin(t * 2 + i) * 6, y = f.y + (i / 7) * f.h - 24;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
    g.addColorStop(0, `rgba(${col},0.26)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - 34, y - 40, 68, 80);
  }
  ctx.restore();
}
function drawGrace(g) {
  if (g.afterBoss && !G.defeated.has(g.afterBoss)) return;
  const t = G.time, x = g.x, y = g.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = 52 + Math.sin(t * 2) * 4;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, g.found ? 'rgba(255,215,120,0.45)' : 'rgba(255,215,120,0.22)'); gr.addColorStop(1, 'rgba(255,215,120,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = t * 1.4 + i * TAU / 7, h = 28 + Math.sin(t * 3 + i) * 6;
    ctx.strokeStyle = `rgba(255,${200 + i * 6},${120 + i * 10},0.75)`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 3, y - 2);
    ctx.bezierCurveTo(x + Math.cos(a) * 14, y - h * 0.4, x - Math.cos(a) * 8, y - h * 0.7, x + Math.cos(a + 1) * 3, y - h);
    ctx.stroke();
  }
  const core = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 14);
  core.addColorStop(0, 'rgba(255,250,220,0.9)'); core.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = core; ctx.fillRect(x - 14, y - 24, 28, 28);
  ctx.restore();
  if (G.state === 'play' && Math.random() < 0.18) G.particles.push({ x: x + rand(-10, 10), y: y - 6, vx: rand(-6, 6), vy: rand(-40, -15), life: 1.2, max: 1.2, size: 2, col: '#ffd77a', grav: 0, glow: true });
}
function drawItem(it) {
  if (G.taken.has(it.id) || (it.req && !G.defeatedTypes.has(it.req))) return;
  const b = Math.sin(G.time * 3 + it.x) * 2;
  glowAt(it.x, it.y - 8 + b, 22, '255,235,170', 0.9);
  if (G.state === 'play' && Math.random() < 0.12) G.particles.push({ x: it.x + rand(-4, 4), y: it.y - 8, vx: rand(-5, 5), vy: rand(-30, -12), life: 0.9, max: 0.9, size: 1.6, col: '#fff2c8', grav: 0, glow: true });
}
function drawEntrance(e) {
  const d = e.d, x = e.x, y = e.y, th = d.theme;
  if (th === 'evergaol') {
    ctx.fillStyle = '#4a4c58'; ctx.beginPath(); ctx.ellipse(x, y, 70, 38, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a90a8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,150,255,${0.35 + 0.15 * Math.sin(G.time * 2)})`; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - 40 - i * 6, 64 - i * 8, 80 - i * 6, 0, Math.PI, TAU); ctx.stroke(); }
    ctx.restore();
    glowAt(x, y - 40, 90, '120,150,255', 0.25);
    return;
  }
  if (th === 'cave' || th === 'tunnel' || d.id === 'siofra' || d.id === 'ainsel') {
    ball(x, y - 24, 54, 36, th === 'tunnel' ? '#4a3a2a' : '#4a463e');
    ctx.fillStyle = '#060504'; ctx.beginPath(); ctx.ellipse(x, y - 10, 26, 20, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(x - 26, y - 10, 52, 12);
    if (th === 'tunnel') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 5; ctx.strokeRect(x - 26, y - 30, 52, 32); }
    if (d.id === 'siofra' || d.id === 'ainsel') glowAt(x, y - 10, 50, '120,160,255', 0.35);
    return;
  }
  if (th === 'catacomb' || th === 'tower') {
    ctx.fillStyle = '#5c564c'; ctx.fillRect(x - 40, y - 46, 80, 46);
    ctx.fillStyle = '#6a645a'; ctx.fillRect(x - 46, y - 52, 92, 8);
    ctx.fillStyle = '#0a0908'; ctx.fillRect(x - 16, y - 34, 32, 34);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(x - 40, y - 46, 80, 46);
    return;
  }
  ctx.fillStyle = '#4c4740'; ctx.fillRect(x - 70, y - 70, 140, 70);
  ctx.fillStyle = '#6a645a'; ctx.fillRect(x - 78, y - 80, 156, 12);
  ctx.fillStyle = '#100c08'; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x - 26, y - 40); ctx.arc(x, y - 40, 26, Math.PI, 0); ctx.lineTo(x + 26, y); ctx.fill();
  glowAt(x, y - 30, 70, '230,232,245', 0.22);
}
function drawLift(l) {
  const x = l.x * MU, y = l.y * MU;
  ctx.fillStyle = '#5a564c'; ctx.beginPath(); ctx.ellipse(x, y, 60, 30, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c9a95a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(201,169,90,0.5)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + G.time * 0.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 56, y + Math.sin(a) * 28); ctx.stroke(); }
}
function drawPortal(p) {
  if (p.after && !G.defeated.has(p.after)) return;
  const col = p.kind === 'leave' ? '200,210,230' : '255,220,140';
  glowAt(p.x, p.y - 20, 60, col, 0.5 + 0.15 * Math.sin(G.time * 3));
  ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 20, 18, 34, 0, 0, TAU); ctx.stroke();
}

// ---------------------------------------------------------------- player & enemies
function drawPlayer() {
  if (P.state === 'dead' && G.deadT > 1.6) return;
  const w = weapon();
  ctx.save();
  ctx.globalAlpha = P.state === 'dead' ? Math.max(0, 1 - G.deadT / 1.6) : 1;
  const lift = (P.air || 0) * 60;
  drawShadow(P.x, P.y, P.mounted ? P.r * 2.4 : P.r);
  let pose;
  if (P.state === 'attack' && P.atk) {
    const ph = P.t < P.atk.wind ? 'windup' : P.t < P.atk.wind + P.atk.act ? 'active' : 'rec';
    const tt = ph === 'windup' ? P.t : ph === 'active' ? P.t - P.atk.wind : P.t - P.atk.wind - P.atk.act;
    pose = attackPose(P.face, P.atk, ph, tt, 1);
    if (!P.atk.thrust) pose.trail = { a0: swingAngle(P.face, P.atk, 'active', 0), len: w.len + 6, col: P.atkEl && P.atkEl !== 'phys' ? elc(P.atkEl) : w.glow ? hexToRgb(w.glow) : '230,235,255' };
  } else if (P.state === 'skill' && P.skill) {
    const k = P.t / P.skill.dur;
    const spin = P.skill.kind === 'flurry' ? G.time * 20 : P.face + Math.PI * (1 - k) * 1.4;
    pose = { ang: spin, ext: 0, phase: 'active', trail: { a0: spin - 1.4, len: w.len + 6, col: elc(P.skill.el) } };
  } else if (P.state === 'roll') pose = { ang: P.rollDir + 2.2, ext: 0 };
  else if (P.state === 'heal') pose = { ang: P.face + 1.6, ext: 0 };
  else if (P.state === 'cast' || P.state === 'bell') pose = { ang: P.face + 0.4, ext: 0 };
  else pose = { ang: P.face + (['great', 'colossal', 'halberd'].includes(w.style) ? 1.4 : 1.0), ext: 0 };
  const twoHanded = ['great', 'colossal', 'halberd', 'spear'].includes(w.style);
  const look = { body: '#22252b', armor: '#575d68', cape: '#25272d', helm: 'tarnished', trim: '#c9a95a', shield: twoHanded ? null : 'kite', shieldCol: '#5a4630', capeLong: 0.95, aura: P.buffT > 0 ? '255,220,130' : null };
  if (P.mounted) drawHorse(P.x, P.y - lift, P.face, P.moveAnim * 0.5, '#4a4a52', '#c8ccd8', { horns: true, eye: '#c0d8ff' });
  let rollLift = 0;
  if (P.state === 'roll') {
    const k = P.t / (P.backstep ? 0.32 : 0.48);
    ctx.translate(P.x, P.y - 8); ctx.scale(1.1, 0.78); ctx.translate(-P.x, -(P.y - 8));
    rollLift = Math.sin(k * Math.PI) * (P.backstep ? 3 : 6);
  }
  drawHumanoid({
    x: P.x - (P.mounted ? Math.cos(P.face) * 4 : 0), y: P.y - (P.mounted ? 8 : 0), r: P.r, face: P.face, look, walk: P.mounted ? 0 : P.moveAnim, moving: P.mounted ? 0 : P.moving, flash: P.flash,
    lift: lift + (P.mounted ? 14 : 0) + rollLift,
    weapon: { type: w.rtype, len: w.len, w: w.w, col: w.blade, edge: w.edge, hilt: w.hilt, glow: w.glow }, pose,
  });
  if (P.state === 'cast' && P.cast) { const sp = P.cast.sp, hc = sp.type === 'incant' ? (sp.col || '255,220,130') : elc(sp.el); glowAt(P.x + Math.cos(P.face - 0.6) * 12, P.y - 18 + Math.sin(P.face - 0.6) * 8, 18 + Math.sin(G.time * 20) * 3, hc, 0.9); }
  if (P.state === 'bell') glowAt(P.x + Math.cos(P.face - 0.6) * 12, P.y - 18, 22, '150,190,255', 0.9);
  if (P.state === 'heal') glowAt(P.x + Math.cos(P.face + 0.9) * 10, P.y - 16 - lift + Math.sin(P.face + 0.9) * 7, 16, P.healKind === 'fp' ? '120,170,255' : '255,200,90', 0.9);
  ctx.restore();
}
function telegraphMarkers(e) {
  if (e.state === 'phase' && e.phFx === 'meteor' && e.t > 1.1 && e.t < 3.4 && e.mx !== undefined) {
    const k = clamp((e.t - 1.1) / 2.3, 0, 1);
    ctx.fillStyle = `rgba(176,112,255,${0.08 + 0.2 * k})`; ctx.beginPath(); ctx.arc(e.mx, e.my, 150, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(220,160,255,${0.35 + 0.5 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.mx, e.my, 150, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(e.mx, e.my, 150 * k, 0, TAU); ctx.stroke();
  }
  const a = e.atk;
  if (!a || e.dead) return;
  if (e.state === 'windup') {
    const k = clamp(e.t / (a.wind * windMul(e)), 0, 1);
    if (a.kind === 'circle') {
      const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
      ctx.fillStyle = `rgba(200,40,30,${0.06 + 0.16 * k})`; ctx.beginPath(); ctx.arc(cx, cy, a.rad, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,60,${0.2 + 0.4 * k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, a.rad * k, 0, TAU); ctx.stroke();
    } else if (a.kind === 'leap' && e.leapTo) {
      ctx.strokeStyle = `rgba(220,60,40,${0.25 + 0.4 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, a.rad, 0, TAU); ctx.stroke();
    } else if (a.kind === 'arrow' || a.kind === 'beam') {
      ctx.strokeStyle = `rgba(255,80,60,${0.1 + 0.35 * k})`; ctx.lineWidth = a.kind === 'beam' ? a.width : 1;
      ctx.setLineDash([6, 6]); const L = a.kind === 'beam' ? a.len : 420;
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x + Math.cos(e.face) * L, e.y - 12 + Math.sin(e.face) * L); ctx.stroke(); ctx.setLineDash([]);
    } else if (a.kind === 'breath') {
      ctx.fillStyle = `rgba(${elc(a.el)},${0.05 + 0.12 * k})`;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, a.range, e.face - a.cone, e.face + a.cone); ctx.closePath(); ctx.fill();
    } else if (a.kind === 'spin' || a.kind === 'stomps' || a.kind === 'nova') {
      // the marker is exactly the area the attack will cover
      const R = a.kind === 'spin' ? a.rad : a.kind === 'stomps' ? a.maxR + (a.n - 1) * 30 : a.maxR;
      ctx.fillStyle = `rgba(${a.el ? elc(a.el) : '200,40,30'},${0.05 + 0.1 * k})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${a.el ? elc(a.el) : '255,80,60'},${0.25 + 0.45 * k})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.stroke();
    }
  }
  // weapon-less creatures: show the exact melee wedge they are about to bite/claw/sweep
  const noWpn = !['humanoid', 'mounted', 'troll'].includes(e.def.look.kind);
  if (a.range && !a.kind && noWpn && (e.state === 'windup' || e.state === 'active')) {
    const R = a.range + P.r, half = a.arc / 2 + 0.15, k = e.state === 'active' ? 1 : clamp(e.t / (a.wind * windMul(e)), 0, 1);
    const col = a.el ? elc(a.el) : '255,80,60';
    ctx.fillStyle = `rgba(${col},${e.state === 'active' ? 0.3 : 0.05 + 0.12 * k})`;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, R, e.face - half, e.face + half); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(${col},${0.2 + 0.45 * k})`; ctx.lineWidth = 2; ctx.stroke();
    if (e.state === 'active') drawTrail(e.x, e.y - 10, e.face - half, e.face + half, e.r * 0.6, R, col, 1);
  }
  if (e.state === 'active' && a.kind === 'spin') {
    ctx.strokeStyle = `rgba(${a.el ? elc(a.el) : '255,80,60'},0.45)`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, a.rad, 0, TAU); ctx.stroke();
  }
  if (e.state === 'active' && a.kind === 'leap' && e.leapTo) { ctx.fillStyle = 'rgba(200,40,30,0.22)'; ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, a.rad, 0, TAU); ctx.fill(); }
}
function enemyPose(e) {
  const a = e.atk;
  if (e.state === 'stagger') return { ang: e.face + 2.4, ext: 0 };
  if (!a || !(e.state === 'windup' || e.state === 'active' || e.state === 'recover')) return { ang: e.face + 1.0, ext: 0 };
  const wm = windMul(e);
  let pose;
  if (a.kind === 'dash') pose = { ang: e.face + 0.35, ext: 0 };
  else if (a.kind === 'leap') pose = { ang: e.state === 'active' ? e.face + Math.PI * (1 - e.t / a.act) : e.face + 2.6, ext: 0 };
  else if (a.kind === 'spin') pose = { ang: e.state === 'active' ? G.time * 18 : e.face + 2.2, ext: 0, phase: e.state === 'active' ? 'active' : null };
  else if (['daggers', 'stomps', 'breath', 'volley', 'strikes', 'nova', 'pool', 'beam', 'blink'].includes(a.kind)) pose = { ang: e.face - Math.PI / 2 + (e.state === 'windup' ? -0.5 : 0), ext: 0 };
  else if (a.kind === 'arrow') { const k = clamp(e.t / (a.wind * wm), 0, 1); pose = { ang: e.face, ext: 0, pull: e.state === 'windup' ? k : 0 }; }
  else pose = attackPose(e.face, a, e.state, e.t, wm);
  if (a.range && !a.thrust && !a.kind && pose.phase) pose.trail = { a0: swingAngle(e.face, a, 'active', 0), len: (e.def.look.weapon && e.def.look.weapon.len) || 50, col: a.el ? elc(a.el) : e.boss ? '255,200,140' : '255,225,210' };
  if (a.glint && e.state === 'windup') { const gk = e.t - a.glint * wm; pose.glintK = gk > 0 && gk < 0.28 ? 1 - gk / 0.28 : 0; }
  return pose;
}
function drawEnemy(e) {
  if (e.hidden) { telegraphMarkers(e); return; }
  const L = e.def.look;
  ctx.save();
  if (e.spirit) { ctx.globalAlpha *= 0.72; glowAt(e.x, e.y - e.r, e.r * 2.2, '150,190,255', 0.3); }
  if (e.def.student && !e.dead) glowAt(e.x, e.y - 20, 50, '255,220,140', 0.5 + 0.2 * Math.sin(G.time * 5));
  if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deathT / 1.2);
  telegraphMarkers(e);
  const tel = e.state === 'windup' ? 0.5 + 0.5 * Math.sin(e.t * 30) : 0;
  const pose = enemyPose(e);
  if (e.dead && Math.random() < 0.5) G.particles.push({ x: e.x + rand(-e.r, e.r), y: e.y - rand(0, e.r * 2), vx: rand(-10, 10), vy: rand(-60, -20), life: 0.8, max: 0.8, size: 2, col: '#e7c46a', grav: 0, glow: true });
  switch (L.kind) {
    case 'humanoid': {
      drawShadow(e.x, e.y, e.r * (1 - e.air * 0.4), 0.35 * (1 - e.air * 0.5));
      let wpn = L.weapon;
      const summon = e.atk && (e.state === 'windup' || e.state === 'active' || e.state === 'recover') && (e.atk.summon || (e.def.summon && e.def.summon[e.atkName]));
      if (summon) wpn = { type: summon, len: summon === 'hammer' ? 74 : 96 };
      if (e.mimic) { const w = weapon(); wpn = { type: w.rtype, len: w.len, w: w.w, col: '#c8c8d8', edge: '#ffffff' }; }
      drawHumanoid({ x: e.x, y: e.y, r: e.r, face: e.face, look: L, walk: e.walk, moving: ['chase', 'return'].includes(e.state) || e.def.patrol ? 80 : 0, flash: e.flash, tel, weapon: wpn, pose, guard: guarding(e), lift: e.air * 70, phase2: e.phase2, air: e.air });
      break;
    }
    case 'quad': drawQuad(e, tel); break;
    case 'troll': drawTroll(e, tel, pose); break;
    case 'mounted': drawMounted(e, tel, pose); break;
    case 'dragon': drawDragon(e, tel, pose); break;
    case 'bird': drawBird(e, tel, pose); break;
    case 'serpent': drawSerpent(e, tel, pose); break;
    case 'flower': drawFlower(e, tel); break;
    case 'boat': drawBoat(e, tel); break;
    case 'astel': drawAstel(e, tel); break;
  }
  if (e.state === 'stagger') {
    ctx.fillStyle = '#ffd36a'; ctx.font = 'bold 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = G.time * 4 + i * TAU / 3; ctx.fillText('✦', e.x + Math.cos(a) * 14, e.y - e.r * 2.6 + Math.sin(a) * 4); }
  }
  if (e.frostT > 0) glowAt(e.x, e.y - e.r, e.r * 1.6, '200,235,255', 0.25);
  if (e.shielded) {
    // Rennala's golden barrier, held up by her students
    const by = e.y - e.r - e.air * 70, R = e.r * 2.4;
    glowAt(e.x, by, R * 1.2, '255,220,140', 0.25);
    ctx.strokeStyle = `rgba(255,225,150,${0.5 + 0.2 * Math.sin(G.time * 4)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, by, R, 0, TAU); ctx.stroke();
    for (const s of e.studs || []) if (!s.dead) {
      ctx.strokeStyle = 'rgba(255,225,150,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 30); ctx.lineTo(e.x, by); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- hazards
function drawFullMoon() {
  const r = G.enemies.find((e) => e.type === 'rennala' && !e.dead && (e.phase2 || e.phFx === 'moon'));
  if (!r) return;
  const k = r.phase2 ? 1 : clamp(r.t / 2, 0, 1), mx = W * 0.72, my = H * 0.2, R = Math.min(W, H) * 0.13;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(40,60,120,0.18)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(mx, my, R * 0.4, mx, my, R * 3);
  g.addColorStop(0, 'rgba(170,200,255,0.5)'); g.addColorStop(1, 'rgba(170,200,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, R * 3, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(150,170,210,0.35)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12]]) { ctx.beginPath(); ctx.arc(mx + dx * R, my + dy * R, rr * R, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawFieldArena(c) {
  // golden fog wall ringing a field boss's ground
  const n = 72;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = Math.sin(G.time * 1.3 + i * 1.7) * 0.5 + 0.5;
    const x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r;
    if (Math.abs(x - cam.x) > W / SCALE + 200 || Math.abs(y - cam.y) > H / SCALE + 200) continue;
    glowAt(x, y - 20, 70 + w * 30, '255,200,130', 0.16 + w * 0.08);
    if (Math.random() < 0.08) G.particles.push({ x: x + rand(-20, 20), y, vx: rand(-8, 8), vy: rand(-40, -15), life: 1.2, max: 1.2, size: 3, col: 'rgba(255,215,150,0.8)', grav: 0, glow: true });
  }
  ctx.strokeStyle = 'rgba(255,205,140,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.stroke();
  ctx.restore();
}
function drawHazards() {
  for (const p of G.pools) {
    const k = p.grow * Math.min(1, p.life / 0.6);
    ctx.fillStyle = `rgba(${elc(p.el)},${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * p.grow, p.r * p.grow * 0.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${elc(p.el)},${0.6 * k})`; ctx.lineWidth = 2; ctx.stroke();
    if (Math.random() < 0.3) G.particles.push({ x: p.x + rand(-p.r, p.r) * 0.7, y: p.y + rand(-p.r, p.r) * 0.4, vx: 0, vy: -30, life: 0.6, max: 0.6, size: 3, col: `rgb(${elc(p.el)})`, grav: 0, glow: true });
  }
  for (const s of G.strikes) {
    const col = elc(s.el);
    if (s.t > 0) {
      const k = 1 - s.t / s.max;
      ctx.strokeStyle = `rgba(${col},${0.3 + 0.5 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${0.1 + 0.2 * k})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * k, 0, TAU); ctx.fill();
    } else {
      const k = s.boom / 0.35;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (s.el === 'lightning' || s.el === 'redlightning') {
        ctx.strokeStyle = `rgba(${col},${k})`; ctx.lineWidth = 4;
        ctx.beginPath(); let x = s.x, y = s.y - 320; ctx.moveTo(x, y);
        for (let i = 0; i < 8; i++) { x += rand(-18, 18); y += 40; ctx.lineTo(x, y); }
        ctx.lineTo(s.x, s.y); ctx.stroke();
      } else {
        const g = ctx.createLinearGradient(s.x, s.y - 260, s.x, s.y);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.7 * k})`);
        ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 0.6, s.y - 260, s.r * 1.2, 260);
      }
      ctx.restore();
      glowAt(s.x, s.y, s.r * 1.6, col, 0.6 * k);
    }
  }
  // breath: the burning cone is drawn exactly where it deals damage
  for (const e of G.enemies) {
    if (e.dead || !e.atk || e.atk.kind !== 'breath' || e.state !== 'active') continue;
    const a = e.atk, col = elc(a.el);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y, e.r * 0.5, e.x, e.y, a.range);
    g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(0.7, `rgba(${col},0.3)`); g.addColorStop(1, `rgba(${col},0.05)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, a.range, e.face - a.cone, e.face + a.cone); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for (const e of G.enemies) {
    if (e.dead || !e.atk || e.atk.kind !== 'beam' || e.state !== 'active') continue;
    const a = e.atk, col = elc(a.el), bx = e.x + Math.cos(e.face) * a.len, by = e.y + Math.sin(e.face) * a.len;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${col},0.35)`; ctx.lineWidth = a.width * 1.6; ctx.beginPath(); ctx.moveTo(e.x, e.y - 16); ctx.lineTo(bx, by - 16); ctx.stroke();
    ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = a.width * 0.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = a.width * 0.2; ctx.stroke();
    ctx.restore();
  }
  if (P.state === 'skill' && P.skill && P.skill.kind === 'beam' && P.t > 0.25) {
    const col = elc(P.skill.el), bx = P.x + Math.cos(P.face) * 320, by = P.y + Math.sin(P.face) * 320;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${col},0.4)`; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(P.x, P.y - 14); ctx.lineTo(bx, by - 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
  }
  for (const p of G.projectiles) {
    if (p.type === 'arrow') {
      const a = Math.atan2(p.vy, p.vx);
      ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 18, p.y - Math.sin(a) * 18); ctx.stroke();
    } else if (p.type === 'dagger') {
      const a = p.hover > 0 ? p.ang : Math.atan2(p.vy, p.vx);
      glowAt(p.x, p.y, 16, '255,230,160', 0.7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,240,190,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10); ctx.lineTo(p.x - Math.cos(a) * 8, p.y - Math.sin(a) * 8); ctx.stroke();
      ctx.restore();
    } else {
      glowAt(p.x, p.y, p.r * 2.4, elc(p.el), 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.45, 0, TAU); ctx.fill();
    }
  }
  for (const p of G.pproj) {
    const col = elc(p.el);
    if (p.orb) {
      // spells: glowing orbs (black flame stays dark at the core)
      glowAt(p.x, p.y, p.r * 3, col, 0.7);
      ctx.fillStyle = p.el === 'blackflame' ? '#1a0e0e' : '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, TAU); ctx.fill();
      if (p.big) { ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); }
      continue;
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(p.x - Math.cos(p.ang) * 10, p.y - Math.sin(p.ang) * 10, p.r, p.ang - 1.1, p.ang + 1.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  for (const r of G.rings) {
    if (r.delay > 0) continue;
    const k = 1 - r.r / r.maxR;
    ctx.save();
    if (r.el && r.el !== 'phys') ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${r.col},${0.7 * k + 0.1})`; ctx.lineWidth = r.th;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.85, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.3 * k})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r + r.th / 2, (r.r + r.th / 2) * 0.85, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}
function drawParticles() {
  ctx.lineCap = 'round';
  for (const p of G.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    if (p.glow) ctx.globalCompositeOperation = 'lighter';
    if (p.streak) {
      ctx.strokeStyle = p.col; ctx.lineWidth = p.size;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
    } else {
      const s = p.grow ? p.size * (1.6 - a) : p.size;
      ctx.fillStyle = p.col;
      if (s > 3) { ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, TAU); ctx.fill(); }
      else ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- lighting & atmosphere
const lightCvs = document.createElement('canvas');
const lctx = lightCvs.getContext('2d');
const rgbArr = (s) => s.split(',').map(Number);
function collectLights(v) {
  const L = [], t = G.time;
  const near = (x, y) => Math.abs(x - cam.x) < 1400 && Math.abs(y - cam.y) < 1000;
  for (const l of LIGHTS) {
    if (l.x < v.x0 - l.r || l.x > v.x1 + l.r || l.y < v.y0 - l.r || l.y > v.y1 + l.r) continue;
    const f = 0.85 + 0.15 * Math.sin(t * 13 + l.flicker) * Math.sin(t * 7.3 + l.flicker);
    L.push({ x: l.x, y: l.y, r: l.r * (0.95 + 0.05 * f), a: l.a * f, col: l.col });
  }
  for (const g of G.graces) if (g.inst === G.inst && !(g.afterBoss && !G.defeated.has(g.afterBoss)) && near(g.x, g.y)) L.push({ x: g.x, y: g.y - 10, r: 260, a: 0.95, col: [255, 210, 120] });
  for (const it of G.items) if (it.inst === G.inst && !G.taken.has(it.id) && near(it.x, it.y)) L.push({ x: it.x, y: it.y - 8, r: 90, a: 0.7, col: [255, 230, 170] });
  for (const p of G.projectiles) if (p.type !== 'arrow') L.push({ x: p.x, y: p.y, r: 90, a: 0.6, col: rgbArr(elc(p.el || 'holy')) });
  for (const s of G.strikes) if (s.t <= 0) L.push({ x: s.x, y: s.y, r: 200, a: s.boom * 2.5, col: rgbArr(elc(s.el)) });
  for (const e of G.enemies) {
    if (e.dead || !near(e.x, e.y)) continue;
    const glow = e.def.look.aura || e.def.look.glow;
    if (glow) L.push({ x: e.x, y: e.y - 16, r: 160, a: 0.4, col: rgbArr(glow) });
    if (e.atk && (e.atk.kind === 'breath' || e.atk.kind === 'beam') && e.state === 'active') L.push({ x: e.x + Math.cos(e.face) * 120, y: e.y + Math.sin(e.face) * 120, r: 300, a: 1, col: rgbArr(elc(e.atk.el)) });
  }
  if (!G.inst) {
    for (const e of ENTRANCES) if (e.d.theme === 'evergaol' && near(e.x, e.y)) L.push({ x: e.x, y: e.y - 30, r: 180, a: 0.6, col: [120, 150, 255] });
    L.push({ x: 65 * MU, y: 22.6 * MU - 420, r: 1600, a: 0.9, col: [255, 214, 120] });
  } else for (const p of INST[G.inst].portals) if (!p.after || G.defeated.has(p.after)) L.push({ x: p.x, y: p.y - 20, r: 140, a: 0.7, col: [255, 220, 150] });
  if (G.bloodstain && G.bloodstain.inst === G.inst) L.push({ x: G.bloodstain.x, y: G.bloodstain.y, r: 60, a: 0.5, col: [255, 60, 40] });
  L.push({ x: P.x, y: P.y - 10, r: 150, a: 0.45, col: [255, 220, 170] });
  return L;
}
function renderLighting(amb, lights) {
  if (amb.dark < 0.02) return;
  const lw = Math.ceil(W / 2), lh = Math.ceil(H / 2);
  if (lightCvs.width !== lw || lightCvs.height !== lh) { lightCvs.width = lw; lightCvs.height = lh; }
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = `rgba(6,6,16,${Math.min(0.9, amb.dark)})`;
  lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const [sx, sy] = toScreen(l.x, l.y), r = l.r * SCALE;
    if (sx + r < 0 || sx - r > W || sy + r < 0 || sy - r > H) continue;
    const g = lctx.createRadialGradient(sx / 2, sy / 2, 0, sx / 2, sy / 2, r / 2);
    g.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a)})`); g.addColorStop(0.5, `rgba(0,0,0,${Math.min(1, l.a) * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx / 2 - r / 2, sy / 2 - r / 2, r, r);
  }
  ctx.drawImage(lightCvs, 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const [sx, sy] = toScreen(l.x, l.y), r = l.r * SCALE * 0.55;
    if (sx + r < 0 || sx - r > W || sy + r < 0 || sy - r > H) continue;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(${l.col[0]},${l.col[1]},${l.col[2]},${Math.min(0.35, 0.16 * l.a * amb.dark * 2)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.restore();
}
function drawCloudShadows(v, amb) {
  if (amb.sky < 0.2) return;
  const t = G.time, span = 1600;
  for (let i = 0; i < 6; i++) {
    let cx = (((i * 577 + t * 18) % span) + span) % span, cy = (((i * 911 + t * 9) % span) + span) % span;
    cx += Math.round((cam.x - cx) / span) * span; cy += Math.round((cam.y - cy) / span) * span;
    for (const ox of [-span, 0, span]) for (const oy of [-span, 0, span]) {
      const x = cx + ox, y = cy + oy;
      if (x < v.x0 - 400 || x > v.x1 + 400 || y < v.y0 - 300 || y > v.y1 + 300) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 380);
      g.addColorStop(0, `rgba(0,0,10,${0.16 * Math.min(1, amb.sky)})`); g.addColorStop(1, 'rgba(0,0,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 380, 230, 0.3, 0, TAU); ctx.fill();
    }
  }
}
function nightK() {
  if (G.inst) return 0;
  const c = G.clock;
  if (c >= 6 && c <= 18) return 0;
  if (c > 18 && c < 20) return (c - 18) / 2;
  if (c >= 4 && c < 6) return 1 - (c - 4) / 2;
  return 1;
}
function drawAtmosphere(amb) {
  const t = G.time;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(${amb.tint.map((c) => c | 0).join(',')},${Math.min(0.8, amb.tintA * 2.2)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const nk = nightK();
  if (amb.sky > 0.05 && nk < 1) {
    const sk = Math.min(1.2, amb.sky) * (1 - nk);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ox = W * 0.82, oy = -H * 0.25;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(W, H) * 0.9);
    g.addColorStop(0, `rgba(255,214,120,${0.3 * sk})`); g.addColorStop(0.4, `rgba(255,190,90,${0.08 * sk})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const a = 1.9 + i * 0.16 + Math.sin(t * 0.2 + i) * 0.03, w = 0.035 + (i % 2) * 0.02, L = Math.max(W, H) * 1.4;
      ctx.fillStyle = `rgba(255,220,140,${0.04 * sk})`;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); ctx.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); ctx.fill();
    }
    ctx.restore();
  }
  if (nk > 0) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(60,80,160,${0.5 * nk})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (G.motes.length < 70) for (let i = 0; i < 70; i++) G.motes.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.5, 2), p: Math.random() * TAU, rot: Math.random() * TAU });
  ctx.save();
  for (const m of G.motes) {
    m.p += 0.01;
    if (amb.leaves > 0.1) {
      m.x += 0.6 * m.s + Math.sin(t + m.p) * 0.3; m.y += 0.35 * m.s; m.rot += 0.03;
      if (m.x > W + 10) m.x = -10; if (m.y > H + 10) m.y = -10;
      ctx.globalAlpha = 0.5 * Math.min(1, amb.leaves);
      ctx.fillStyle = m.s > 1.4 ? '#d8a840' : '#e8c060';
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 3 * m.s, 1.4 * m.s, m.rot, 0, TAU); ctx.fill();
    }
    if (amb.snow > 0.1 || amb.ash > 0.1) {
      const sx = (m.x * 1.3 + t * 14 * m.s) % W, sy = (m.y * 1.1 + t * 40 * m.s) % H;
      ctx.globalAlpha = Math.min(0.85, 0.5 * (amb.snow + amb.ash));
      ctx.fillStyle = amb.ash > 0.1 ? '#b8b0a8' : '#ffffff';
      ctx.beginPath(); ctx.arc(sx + Math.sin(t + m.p) * 8, sy, m.s * 1.3, 0, TAU); ctx.fill();
    }
    if (amb.embers > 0.1 || amb.spores > 0.1) {
      ctx.globalCompositeOperation = 'lighter';
      const ex = (m.x * 1.7 + t * 10 * m.s) % W, ey = H - ((m.y * 1.3 + t * 25 * m.s) % (H + 20));
      ctx.globalAlpha = Math.min(1, 0.5 * (amb.embers + amb.spores)) * (0.5 + 0.5 * Math.sin(t * 3 + m.p));
      ctx.fillStyle = amb.spores > amb.embers ? (m.s > 1.2 ? '#e05a3a' : '#c8401a') : (m.s > 1.2 ? '#ff9a40' : '#ffcc70');
      ctx.fillRect(ex + Math.sin(t + m.p) * 6, ey, m.s * 1.6, m.s * 1.6);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (amb.stars > 0.1 || amb.dust > 0.1 || amb.mist > 0.1) {
      ctx.globalCompositeOperation = 'lighter';
      const ex = (m.x + Math.sin(t * 0.3 + m.p) * 30 + W) % W, ey = (m.y + Math.cos(t * 0.2 + m.p) * 20 + H) % H;
      ctx.globalAlpha = 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + m.p * 3));
      ctx.fillStyle = amb.stars > 0.1 ? '#a8c8ff' : amb.mist > 0.1 ? '#c8d8ff' : '#d8c8a0';
      ctx.fillRect(ex, ey, m.s * 1.2, m.s * 1.2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
  if (amb.mist > 0.1) {
    ctx.save(); ctx.globalAlpha = 0.12 * amb.mist;
    for (let i = 0; i < 4; i++) { const mx = ((i * 337 + t * 12) % (W + 400)) - 200, my = H * (0.2 + i * 0.2); const g = ctx.createRadialGradient(mx, my, 0, mx, my, W * 0.5); g.addColorStop(0, '#d0dcff'); g.addColorStop(1, 'rgba(208,220,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  if (amb.rain > 0.05) {
    if (G.rain.length < 160) for (let i = 0; i < 160; i++) G.rain.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.6, 1.2) });
    ctx.strokeStyle = `rgba(190,200,220,${0.28 * Math.min(1.2, amb.rain)})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of G.rain) {
      r.x -= 5 * r.s; r.y += 17 * r.s;
      if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 200); }
      if (r.x < -20) r.x = W + 20;
      ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 4 * r.s, r.y - 14 * r.s);
    }
    ctx.stroke();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, G.activeBosses.length ? 'rgba(25,5,0,0.7)' : 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (P.flash > 0) { ctx.fillStyle = `rgba(140,0,0,${P.flash * 1.2})`; ctx.fillRect(0, 0, W, H); }
  if (P.rotT > 0) { ctx.fillStyle = `rgba(160,50,20,${0.08 + 0.05 * Math.sin(t * 4)})`; ctx.fillRect(0, 0, W, H); }
  if (P.state !== 'dead' && P.hp < P.maxHp * 0.25) {
    const pulse = 0.12 + 0.1 * Math.sin(t * 6);
    const g2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, `rgba(120,0,0,${pulse})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  if (P.state === 'dead') { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, G.deadT * 0.2)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- frame
function render(dt = 0.016) {
  const s = G.shake;
  camOX = s > 0.3 ? rand(-s, s) / SCALE : 0; camOY = s > 0.3 ? rand(-s, s) / SCALE : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0c0a'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  applyWorldTransform();
  const v = view();
  const amb = ambNow(dt);
  const ambDraw = { ...amb, dark: Math.min(0.92, amb.dark + nightK() * 0.42) };
  G.amb = ambDraw;
  drawGround(v);
  if (G.bloodstain && G.bloodstain.inst === G.inst) {
    const b = G.bloodstain;
    ctx.fillStyle = 'rgba(120,10,10,0.6)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 14, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,60,40,${0.5 + 0.3 * Math.sin(G.time * 4)})`; ctx.beginPath(); ctx.ellipse(b.x, b.y, 6, 3, 0, 0, TAU); ctx.fill();
  }
  if (!G.inst) { for (const e of ENTRANCES) if (e.x > v.x0 - 100 && e.x < v.x1 + 100 && e.y > v.y0 && e.y < v.y1 + 100) drawEntrance(e); for (const l of LIFTS) drawLift(l); }
  else for (const p of INST[G.inst].portals) drawPortal(p);

  const list = [];
  for (const d of inView(DECOR_BK, v)) if (d.x > v.x0 - 60 && d.x < v.x1 + 60 && d.y > v.y0 && d.y < v.y1 + 220) list.push({ y: d.y, f: () => drawDecor(d) });
  for (const w of inView(WALL_BK, v)) if (w.x < v.x1 && w.x + w.w > v.x0 && w.y < v.y1 + 80 && w.y + w.h > v.y0 - 80) list.push({ y: w.y + w.h, f: () => drawWall(w) });
  for (const e of G.enemies) if (e.x > v.x0 - 120 && e.x < v.x1 + 120 && e.y > v.y0 - 60 && e.y < v.y1 + 140) list.push({ y: e.y, f: () => drawEnemy(e) });
  for (const g of G.graces) if (g.inst === G.inst && g.y > v.y0 && g.y < v.y1 + 60 && g.x > v.x0 && g.x < v.x1) list.push({ y: g.y, f: () => drawGrace(g) });
  for (const it of G.items) if (it.inst === G.inst && it.y > v.y0 && it.y < v.y1 && it.x > v.x0 && it.x < v.x1) list.push({ y: it.y, f: () => drawItem(it) });
  for (const f of FOGS) if (f.inst === G.inst && f.y > v.y0 - 80 && f.y < v.y1 && f.x > v.x0 - 80 && f.x < v.x1) list.push({ y: f.y + f.h + 1, f: () => drawFog(f) });
  list.push({ y: P.y, f: drawPlayer });
  for (const al of G.allies) list.push({ y: al.y, f: () => drawAlly(al) });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.f();
  if (!G.inst) drawErdtree(v);

  drawHazards();
  if (G.arenaCirc && !G.inst) drawFieldArena(G.arenaCirc);
  drawParticles();
  if (!G.inst) drawCloudShadows(v, ambDraw);

  if (P.lock && !P.lock.dead) {
    const e = P.lock, ry = e.y - e.r * 0.8 - e.air * 70;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, ry, 5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, ry, 1.6, 0, TAU); ctx.fill();
  }
  for (const e of G.enemies) {
    if (G.activeBosses.includes(e) || e.dead || (e.showHp <= 0 && P.lock !== e && e.bleed <= 0)) continue;
    const bw = e.r > 25 ? 60 : 36, bx = e.x - bw / 2, byy = e.y - e.r * 2.3 - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, 5);
    ctx.fillStyle = '#d8b860'; ctx.fillRect(bx, byy, bw * (e.hpLag / e.maxHp), 3);
    ctx.fillStyle = '#a3201a'; ctx.fillRect(bx, byy, bw * (e.hp / e.maxHp), 3);
    if (e.bleed > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, byy + 5, bw + 2, 3); ctx.fillStyle = '#c0182a'; ctx.fillRect(bx, byy + 5.5, bw * Math.min(1, e.bleed / (e.boss ? 160 : 100)), 2); }
    if (e.dmgAccum > 0) { ctx.fillStyle = '#ddd'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText(Math.round(e.dmgAccum), bx + bw + 4, byy + 4); }
  }
  ctx.textAlign = 'center';
  for (const n of G.numbers) {
    ctx.globalAlpha = clamp(n.life * 2, 0, 1);
    ctx.font = (n.big ? 'bold 15px' : 'bold 12px') + ' Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(n.text, n.x + 1, n.y + 1);
    ctx.fillStyle = n.col; ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  renderLighting(ambDraw, collectLights(v));
  drawAtmosphere(ambDraw);
  drawFullMoon();
  if (G.state === 'play' || G.state === 'pause' || G.state === 'menu') drawHUD();
  drawBanners();
}
