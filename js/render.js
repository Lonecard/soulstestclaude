'use strict';
/* Rendering: world, characters, effects, lighting, atmosphere, HUD. */

const WALL_H = { castle: 50, ruin: 26, cliff: 40 };
let camOX = 0, camOY = 0;
function applyWorldTransform() {
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, DPR * (W / 2 - (cam.x + camOX) * SCALE), DPR * (H / 2 - (cam.y + camOY) * SCALE));
}
const toScreen = (x, y) => [(x - cam.x - camOX) * SCALE + W / 2, (y - cam.y - camOY) * SCALE + H / 2];
function view() {
  const hw = W / 2 / SCALE, hh = H / 2 / SCALE;
  return { x0: cam.x - hw - 90, x1: cam.x + hw + 90, y0: cam.y - hh - 90, y1: cam.y + hh + 140 };
}

// ---------------------------------------------------------------- color helpers
const _shade = new Map();
function shade(hex, f) {
  const k = hex + f;
  let v = _shade.get(k);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  v = `rgb(${r | 0},${g | 0},${b | 0})`;
  _shade.set(k, v);
  return v;
}
function ballGrad(x, y, r, col) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.45));
  return g;
}
function ball(x, y, rx, ry, col, rot = 0, outline = 'rgba(0,0,0,0.45)') {
  ctx.fillStyle = ballGrad(x, y, Math.max(rx, ry), col);
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function drawShadow(x, y, r, a = 0.35) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.3, r * 1.2, r * 0.55, 0, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- ground
function drawGround(v) {
  ctx.fillStyle = '#100e0c';
  ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  for (const g of GROUND) {
    const x0 = Math.max(g.x, v.x0), y0 = Math.max(g.y, v.y0), x1 = Math.min(g.x + g.w, v.x1), y1 = Math.min(g.y + g.h, v.y1);
    if (x1 <= x0 || y1 <= y0) continue;
    ctx.fillStyle = TEX[g.tex];
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // soft blend between Stormhill rock and Limgrave grass
  if (v.y0 < 4950 && v.y1 > 4700) {
    ctx.fillStyle = TEX.rock;
    for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.9 - i * 0.09; ctx.fillRect(v.x0, 4700 + i * 26, v.x1 - v.x0, 26); }
    ctx.globalAlpha = 1;
  }
  // paths
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of PATHS) {
    ctx.strokeStyle = TEX.dirt;
    ctx.globalAlpha = 0.45; ctx.lineWidth = 128; strokePath(p);
    ctx.globalAlpha = 0.9; ctx.lineWidth = 78; strokePath(p);
    ctx.globalAlpha = 1;
  }
  // castle carpet
  if (v.x0 < 1240 && v.x1 > 1160 && v.y0 < 2340) {
    const y0 = Math.max(700, v.y0), y1 = Math.min(2340, v.y1);
    if (y1 > y0) {
      ctx.fillStyle = '#5a1c18'; ctx.fillRect(1170, y0, 60, y1 - y0);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = Math.floor(y0 / 40) * 40; y < y1; y += 40) ctx.fillRect(1170, y, 60, 2);
      ctx.fillStyle = '#b08a3a'; ctx.fillRect(1170, y0, 4, y1 - y0); ctx.fillRect(1226, y0, 4, y1 - y0);
    }
  }
  // arena sigils
  for (const id of Object.keys(ARENAS)) {
    const a = ARENAS[id];
    if (a.cy + a.r < v.y0 || a.cy - a.r > v.y1) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(id === 'margit' ? 740 : 640, id === 'margit' ? 2380 : 120, id === 'margit' ? 920 : 1120, id === 'margit' ? 480 : 540); ctx.clip();
    ctx.strokeStyle = 'rgba(201,169,90,0.16)'; ctx.lineWidth = 3;
    for (const rr of [a.r * 0.35, a.r * 0.6, a.r * 0.85]) { ctx.beginPath(); ctx.arc(a.cx, a.cy, rr, 0, TAU); ctx.stroke(); }
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * TAU;
      ctx.beginPath(); ctx.moveTo(a.cx + Math.cos(an) * a.r * 0.35, a.cy + Math.sin(an) * a.r * 0.35); ctx.lineTo(a.cx + Math.cos(an) * a.r * 0.85, a.cy + Math.sin(an) * a.r * 0.85); ctx.stroke();
    }
    ctx.restore();
  }
  // decals
  for (const d of G.decals) {
    if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
    ctx.globalAlpha = Math.min(1, d.life / 3) * 0.75;
    ctx.fillStyle = d.col;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, d.rot, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(d.x + Math.cos(d.rot) * d.r * 1.1, d.y + Math.sin(d.rot) * d.r * 0.5, d.r * 0.3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // grass tufts (swaying)
  ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  const wind = Math.sin(G.time * 0.7) * 0.5 + 1;
  for (const t of TUFTS) {
    if (t.x < v.x0 || t.x > v.x1 || t.y < v.y0 || t.y > v.y1) continue;
    ctx.strokeStyle = t.dry ? (t.c < 0.5 ? '#7a7550' : '#8d8458') : t.c < 0.33 ? '#4f6230' : t.c < 0.66 ? '#5f6f36' : '#7a7a3e';
    const s = 7 * t.s, sw = Math.sin(G.time * 2 + t.x * 0.04 + t.y * 0.01) * 2 * wind + (t.dry ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(t.x - 3, t.y); ctx.quadraticCurveTo(t.x - 3, t.y - s * 0.6, t.x - 4 + sw, t.y - s);
    ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(t.x, t.y - s * 0.7, t.x + sw, t.y - s * 1.35);
    ctx.moveTo(t.x + 3, t.y); ctx.quadraticCurveTo(t.x + 3, t.y - s * 0.6, t.x + 4 + sw, t.y - s);
    ctx.stroke();
  }
}
function strokePath(p) { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }

// ---------------------------------------------------------------- props
function drawDecor(d) {
  const t = G.time;
  switch (d.type) {
    case 'tree': {
      drawShadow(d.x + 8, d.y, d.s * 0.7, 0.28);
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(d.x - 4, d.y - 30, 8, 32);
      ctx.fillStyle = '#2a1e14'; ctx.fillRect(d.x + 1, d.y - 30, 3, 32);
      const near = Math.hypot(P.x - d.x, P.y - (d.y - 30)) < d.s + 6;
      ctx.globalAlpha = near ? 0.4 : 1;
      const top = d.y - 40 - d.s * 0.45, sway = Math.sin(t * 1.2 + d.x) * 2;
      const pal = d.v < 0.45 ? ['#2f3d22', '#46582c', '#647236'] : d.v < 0.8 ? ['#4a4224', '#6c5f2c', '#9a8a3e'] : ['#5a3a1e', '#8a5a26', '#b88a3a'];
      ctx.fillStyle = pal[0]; ctx.beginPath(); ctx.arc(d.x + sway, top + 6, d.s, 0, TAU); ctx.fill();
      ctx.fillStyle = pal[1];
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + d.v * 5; ctx.beginPath(); ctx.arc(d.x + sway + Math.cos(a) * d.s * 0.4, top + Math.sin(a) * d.s * 0.35, d.s * 0.55, 0, TAU); ctx.fill(); }
      ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(d.x + sway - d.s * 0.3, top - d.s * 0.3, d.s * 0.38, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'deadtree': {
      drawShadow(d.x + 6, d.y, 12, 0.25);
      ctx.strokeStyle = '#2e2620'; ctx.lineCap = 'round';
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y - d.s * 1.4); ctx.stroke();
      ctx.lineWidth = 3;
      const sway = Math.sin(t * 1.5 + d.x) * 2;
      for (let i = 0; i < 5; i++) {
        const h = d.s * (0.5 + i * 0.18), a = (i % 2 ? 1 : -1) * (0.6 + d.v * 0.5) - Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(d.x + 1, d.y - h); ctx.lineTo(d.x + Math.cos(a) * d.s * 0.6 + sway, d.y - h + Math.sin(a) * d.s * 0.5); ctx.stroke();
      }
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
    case 'flowers': {
      const cols = d.v < 0.5 ? ['#e8cf6a', '#f2e08a'] : ['#e9e4d0', '#cfc4e8'];
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + d.v * 9, r = 3 + (i % 3) * 5, x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r * 0.5;
        ctx.strokeStyle = '#4a5a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
        ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.arc(x, y - 6, 1.8, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'boulder': {
      drawShadow(d.x + 4, d.y, d.r, 0.3);
      ball(d.x, d.y - d.r * 0.45, d.r * 1.1, d.r * 0.85, d.v < 0.5 ? '#6a665a' : '#5a5a52', d.v);
      ctx.fillStyle = 'rgba(90,110,60,0.35)'; ctx.beginPath(); ctx.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.9, d.r * 0.5, d.r * 0.25, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'grave': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(d.x - 6, d.y - 1, 14, 5);
      ctx.fillStyle = '#5f5b52'; ctx.beginPath(); ctx.moveTo(d.x - 6, d.y); ctx.lineTo(d.x - 6, d.y - 14); ctx.arc(d.x, d.y - 14, 6, Math.PI, 0); ctx.lineTo(d.x + 6, d.y); ctx.fill();
      ctx.fillStyle = '#767166'; ctx.fillRect(d.x - 6, d.y - 14, 3, 14);
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
    case 'torch': {
      ctx.fillStyle = '#2a2420'; ctx.fillRect(d.x - 2, d.y - 26, 4, 26);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(d.x - 4, d.y - 30, 8, 5);
      drawFlame(d.x, d.y - 32, 1, d.v);
      break;
    }
    case 'brazier': {
      drawShadow(d.x, d.y, 12, 0.35);
      ctx.fillStyle = '#2a2622'; ctx.fillRect(d.x - 3, d.y - 18, 6, 18);
      ball(d.x, d.y - 20, 13, 6, '#4a4038');
      drawFlame(d.x, d.y - 24, 1.7, d.v);
      break;
    }
  }
}
function drawFlame(x, y, s, v) {
  const t = G.time * 9 + v * 20;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const h = (10 + i * 3 + Math.sin(t + i) * 3) * s, w = (5 - i) * s;
    ctx.fillStyle = ['rgba(255,90,20,0.6)', 'rgba(255,160,50,0.6)', 'rgba(255,230,150,0.7)'][i];
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w, y - h * 0.5, x + Math.sin(t * 0.7) * 2 * s, y - h); ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w, y); ctx.fill();
  }
  ctx.restore();
  if (G.state === 'play' && Math.random() < 0.06 * s) G.particles.push({ x: x + rand(-3, 3), y, vx: rand(-8, 8), vy: rand(-50, -25), life: 0.8, max: 0.8, size: 1.5, col: '#ffb060', grav: 0, glow: true });
}

function drawWall(w) {
  const h = WALL_H[w.kind] || 30;
  const castle = w.kind === 'castle', cliff = w.kind === 'cliff';
  // front face
  ctx.fillStyle = cliff ? TEX.cliff : TEX.wallFace;
  ctx.fillRect(w.x, w.y + w.h - h, w.w, h);
  const g = ctx.createLinearGradient(0, w.y + w.h - h, 0, w.y + w.h);
  g.addColorStop(0, cliff ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(w.x, w.y + w.h - h, w.w, h);
  // banners
  if (w.banners) {
    for (let x = w.x + 130; x < w.x + w.w - 60; x += 260) {
      const sway = Math.sin(G.time * 1.5 + x) * 1.5, by = w.y + w.h - h + 4;
      ctx.fillStyle = '#6a1e18';
      ctx.beginPath(); ctx.moveTo(x - 11, by); ctx.lineTo(x + 11, by); ctx.lineTo(x + 11 + sway, by + h - 6); ctx.lineTo(x + sway, by + h - 14); ctx.lineTo(x - 11 + sway, by + h - 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#d8b25a'; ctx.beginPath(); ctx.arc(x + sway * 0.5, by + h * 0.38, 4.5, 0, TAU); ctx.fill();
    }
  }
  // top face
  ctx.fillStyle = cliff ? TEX.cliff : castle ? TEX.wallTop : TEX.ruinTop;
  ctx.fillRect(w.x, w.y - h, w.w, w.h);
  ctx.fillStyle = cliff ? 'rgba(255,255,255,0.03)' : 'rgba(255,240,210,0.06)';
  ctx.fillRect(w.x, w.y - h, w.w, 2);
  if (castle && w.w > w.h) {
    ctx.fillStyle = '#5c564c';
    for (let x = w.x + 4; x < w.x + w.w - 10; x += 22) ctx.fillRect(x, w.y + w.h - h - 7, 12, 7);
  } else if (castle) {
    ctx.fillStyle = '#5c564c';
    for (let y = w.y - h + 4; y < w.y + w.h - h - 10; y += 22) ctx.fillRect(w.x + w.w - 7, y, 7, 12);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(w.x + 0.5, w.y - h + 0.5, w.w - 1, w.h + h - 1);
}

function drawFog(f) {
  if (!fogSolid(f)) return;
  const t = G.time;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fighting = G.arenaFight === f.boss;
  const col = fighting ? '255,190,120' : '225,228,240';
  for (let i = 0; i < 10; i++) {
    const x = f.x + (i / 9) * f.w, y = f.y + f.h / 2 - 24 + Math.sin(t * 2 + i * 1.3) * 7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
    g.addColorStop(0, `rgba(${col},0.24)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - 34, y - 50, 68, 100);
  }
  ctx.strokeStyle = `rgba(${col},0.25)`; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const x = f.x + 6 + ((i * 13 + t * 20) % (f.w - 12));
    ctx.beginPath(); ctx.moveTo(x, f.y + f.h); ctx.quadraticCurveTo(x + Math.sin(t * 3 + i) * 8, f.y - 10, x, f.y - 50); ctx.stroke();
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
  // flame tendrils
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
  // guidance of grace
  if (g.guide && g.found) {
    const a = Math.atan2(g.guide[1] - y, g.guide[0] - x);
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.5 + i / 6) % 1), d = 20 + k * 170;
      const px = x + Math.cos(a) * d, py = y - 6 + Math.sin(a) * d - Math.sin(k * Math.PI) * 10;
      ctx.fillStyle = `rgba(255,220,140,${0.55 * Math.sin(k * Math.PI)})`;
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  if (G.state === 'play' && Math.random() < 0.18) G.particles.push({ x: x + rand(-10, 10), y: y - 6, vx: rand(-6, 6), vy: rand(-40, -15), life: 1.2, max: 1.2, size: 2, col: '#ffd77a', grav: 0, glow: true });
}
function drawItem(it) {
  if (G.taken.has(it.id)) return;
  const t = G.time, b = Math.sin(t * 3 + it.x) * 2;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(it.x, it.y - 8 + b, 0, it.x, it.y - 8 + b, 22);
  g.addColorStop(0, 'rgba(255,250,230,0.95)'); g.addColorStop(0.3, 'rgba(255,225,150,0.5)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(it.x - 22, it.y - 30 + b, 44, 44);
  ctx.restore();
  if (G.state === 'play' && Math.random() < 0.12) G.particles.push({ x: it.x + rand(-4, 4), y: it.y - 8, vx: rand(-5, 5), vy: rand(-30, -12), life: 0.9, max: 0.9, size: 1.6, col: '#fff2c8', grav: 0, glow: true });
}

// ---------------------------------------------------------------- weapons & trails
function drawTrail(cx, cy, a0, a1, rIn, rOut, col, alpha) {
  if (Math.abs(a1 - a0) < 0.05 || alpha <= 0) return;
  const ccw = a1 < a0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(${col},${0.18 * alpha})`;
  ctx.beginPath(); ctx.arc(cx, cy, rOut, a0, a1, ccw); ctx.arc(cx, cy, rIn, a1, a0, !ccw); ctx.closePath(); ctx.fill();
  const mid = a0 + (a1 - a0) * 0.45;
  ctx.fillStyle = `rgba(${col},${0.3 * alpha})`;
  ctx.beginPath(); ctx.arc(cx, cy, rOut, mid, a1, ccw); ctx.arc(cx, cy, rOut * 0.75, a1, mid, !ccw); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.55 * alpha})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, rOut, mid, a1, ccw); ctx.stroke();
  ctx.restore();
}
function blade(x, y, ang, len, w, col, edge, hiltCol, kind, ext = 0) {
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  const bx = x + c * 5, by = y + s * 5;
  const L = len + ext, tx = x + c * L, ty = y + s * L;
  // grip and pommel behind the hand
  ctx.strokeStyle = hiltCol; ctx.lineWidth = Math.max(2.5, w * 0.6); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - c * (kind === 'great' ? 14 : 8), y - s * (kind === 'great' ? 14 : 8)); ctx.lineTo(bx, by); ctx.stroke();
  // blade body
  const hw = w / 2, tip = kind === 'katana' ? 0.6 : 0.15;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(bx + px * hw, by + py * hw);
  ctx.lineTo(tx - c * w * 2 + px * hw * tip * (kind === 'katana' ? 1.6 : 1), ty - s * w * 2 + py * hw * tip);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx - c * w * 2 - px * hw * tip, ty - s * w * 2 - py * hw * tip);
  ctx.lineTo(bx - px * hw, by - py * hw);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.8, w * 0.22);
  ctx.beginPath(); ctx.moveTo(bx + px * hw * 0.6, by + py * hw * 0.6); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(bx - px * hw * 0.5, by - py * hw * 0.5); ctx.lineTo(tx - c * w * 2, ty - s * w * 2); ctx.stroke();
  // guard
  if (kind === 'katana') { ctx.fillStyle = '#3a3020'; ctx.beginPath(); ctx.arc(bx, by, w * 0.9, 0, TAU); ctx.fill(); }
  else {
    const gw = w * (kind === 'great' ? 2.2 : 1.7);
    ctx.strokeStyle = '#7a6230'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - px * gw, by - py * gw); ctx.lineTo(bx + px * gw, by + py * gw); ctx.stroke();
  }
  return { ex: tx, ey: ty };
}
function polearm(x, y, ang, len, col, edge, shaftCol, head, ext = 0) {
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  const L = len + ext, tx = x + c * L, ty = y + s * L;
  ctx.strokeStyle = shaftCol; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - c * len * 0.3, y - s * len * 0.3); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = col;
  if (head === 'spear') {
    ctx.beginPath(); ctx.moveTo(tx + c * 12, ty + s * 12); ctx.lineTo(tx + px * 3.5, ty + py * 3.5); ctx.lineTo(tx - px * 3.5, ty - py * 3.5); ctx.closePath(); ctx.fill();
  } else if (head === 'halberd' || head === 'axe') {
    const big = head === 'axe' ? 1.7 : 1;
    const hx = tx - c * 8, hy = ty - s * 8;
    ctx.beginPath();
    ctx.moveTo(hx - c * 10 * big, hy - s * 10 * big);
    ctx.quadraticCurveTo(hx + px * 22 * big - c * 4, hy + py * 22 * big - s * 4, hx + c * 10 * big + px * 2, hy + s * 10 * big + py * 2);
    ctx.lineTo(hx, hy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx - c * 10 * big + px * 6, hy - s * 10 * big + py * 6); ctx.quadraticCurveTo(hx + px * 22 * big, hy + py * 22 * big, hx + c * 10 * big + px * 4, hy + s * 10 * big + py * 4); ctx.stroke();
    if (head === 'halberd') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx + c * 14, ty + s * 14); ctx.lineTo(tx + px * 2.5, ty + py * 2.5); ctx.lineTo(tx - px * 2.5, ty - py * 2.5); ctx.closePath(); ctx.fill(); }
  }
  return { ex: tx, ey: ty };
}
// draws any weapon type at the hand
function drawWeaponType(type, x, y, ang, opt) {
  const ext = opt.ext || 0;
  switch (type) {
    case 'sword': return blade(x, y, ang, opt.len || 40, opt.w || 3.5, opt.col || '#9a958a', opt.edge || '#d0ccc0', opt.hilt || '#4a3a22', 'sword', ext);
    case 'katana': return blade(x, y, ang, opt.len, opt.w, opt.col, opt.edge, opt.hilt, 'katana', ext);
    case 'great': return blade(x, y, ang, opt.len, opt.w, opt.col, opt.edge, opt.hilt, 'great', ext);
    case 'spear': return polearm(x, y, ang, opt.len || 70, '#b8b4aa', '#eee', '#5a4428', 'spear', ext);
    case 'halberd': return polearm(x, y, ang, opt.len || 76, opt.col || '#8a8d94', opt.edge || '#d8dce2', '#3e3222', 'halberd', ext);
    case 'axe': return polearm(x, y, ang, opt.len || 80, opt.col || '#4a4a50', opt.edge || '#c9a24a', '#3a2a1c', 'axe', ext);
    case 'stick': case 'club': {
      const L = opt.len || 36, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
      ctx.strokeStyle = '#4a3828'; ctx.lineWidth = type === 'club' ? 7 : 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      if (type === 'club') { ball(tx, ty, 11, 10, '#5b4632'); }
      return { ex: tx, ey: ty };
    }
    case 'cane': {
      const L = opt.len || 50, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 7, y - Math.sin(ang) * 7, 3, 0, TAU); ctx.fill();
      return { ex: tx, ey: ty };
    }
    case 'bow': {
      const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c, pull = opt.pull || 0;
      const bx = x + c * 10, by = y + s * 10;
      ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx + px * 16, by + py * 16); ctx.quadraticCurveTo(bx + c * 12, by + s * 12, bx - px * 16, by - py * 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,230,220,0.7)'; ctx.lineWidth = 0.8;
      const sx = bx - c * pull * 14, sy = by - s * pull * 14;
      ctx.beginPath(); ctx.moveTo(bx + px * 16, by + py * 16); ctx.lineTo(sx, sy); ctx.lineTo(bx - px * 16, by - py * 16); ctx.stroke();
      if (pull > 0.05) { ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + c * 30, sy + s * 30); ctx.stroke(); }
      return { ex: bx, ey: by };
    }
    case 'hammer': case 'gsword': {
      ctx.save();
      ctx.shadowColor = '#ffd870'; ctx.shadowBlur = 14;
      let r;
      if (type === 'gsword') r = blade(x, y, ang, opt.len || 90, 7, 'rgba(255,224,140,0.85)', '#fff8d8', '#c9a24a', 'great', ext);
      else {
        const L = opt.len || 70, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
        ctx.strokeStyle = 'rgba(255,224,140,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,160,0.9)';
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang); ctx.fillRect(-10, -16, 20, 32); ctx.restore();
        r = { ex: tx, ey: ty };
      }
      ctx.restore();
      return r;
    }
  }
  return { ex: x, ey: y };
}
function swingAngle(face, a, phase, k) {
  const dir = a.dir || 1, half = (a.arc || 1.6) / 2;
  if (a.thrust) return face;
  if (a.kind === 'circle' || a.overhead) {
    if (phase === 'windup') return face + Math.PI * (0.55 + 0.35 * k) * dir;
    if (phase === 'active') return face + Math.PI * 0.9 * dir * (1 - k);
    return face;
  }
  if (phase === 'windup') return face + dir * (half + 0.45 * k);
  if (phase === 'active') return face + dir * (half + 0.45) - dir * (2 * half + 0.45) * k;
  return face - dir * half;
}
function drawGlint(x, y, k) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const s = 20 * (0.5 + k);
  ctx.fillStyle = `rgba(255,240,180,${k})`;
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + s); ctx.lineTo(x - 2.5, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + 2.5); ctx.lineTo(x + s, y); ctx.lineTo(x, y - 2.5); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.8);
  g.addColorStop(0, `rgba(255,250,220,${k * 0.8})`); g.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- humanoid model
function drawCape(x, by, r, face, col, walk, long = 1) {
  const back = face + Math.PI, c = Math.cos(back), s = Math.sin(back);
  const px = -Math.sin(face), py = Math.cos(face);
  const L = r * 1.5 * long, sway = Math.sin(G.time * 3 + walk * 0.8) * r * 0.15;
  const sl = [x + px * r * 0.85, by + py * r * 0.55 - r * 0.25], sr = [x - px * r * 0.85, by - py * r * 0.55 - r * 0.25];
  const bl = [x + px * r * 0.95 + c * L + sway, by + py * r * 0.6 + s * L * 0.75 + r * 0.7];
  const br = [x - px * r * 0.95 + c * L - sway, by - py * r * 0.6 + s * L * 0.75 + r * 0.7];
  const g = ctx.createLinearGradient(x, by - r, x + c * L, by + s * L + r);
  g.addColorStop(0, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(sl[0], sl[1]);
  ctx.quadraticCurveTo(sl[0] + c * L * 0.5, sl[1] + s * L * 0.4, bl[0], bl[1]);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const k = i / n, mx = lerp(bl[0], br[0], k), my = lerp(bl[1], br[1], k);
    const dep = (i % 2 ? 0.25 : 0) * r + Math.sin(G.time * 4 + i + walk) * r * 0.08;
    ctx.lineTo(mx - c * dep, my - s * dep - dep * 0.3);
  }
  ctx.quadraticCurveTo(sr[0] + c * L * 0.5, sr[1] + s * L * 0.4, sr[0], sr[1]);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawHead(hx, hy, hr, face, look, flash) {
  const helm = look.helm, c = Math.cos(face), s = Math.sin(face), px = -s, py = c;
  const f = flash ? '#ffffff' : null;
  switch (helm) {
    case 'kettle':
      ctx.fillStyle = f || shade(look.armor, -0.15); ctx.beginPath(); ctx.ellipse(hx, hy + hr * 0.15, hr * 1.4, hr * 0.85, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ball(hx, hy - hr * 0.1, hr * 0.85, hr * 0.8, f || look.armor);
      break;
    case 'knight':
      ball(hx, hy, hr, hr * 0.95, f || look.armor);
      ctx.strokeStyle = 'rgba(10,8,6,0.85)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(hx + c * hr * 0.75 + px * hr * 0.5, hy + s * hr * 0.55 + py * hr * 0.35); ctx.lineTo(hx + c * hr * 0.75 - px * hr * 0.5, hy + s * hr * 0.55 - py * hr * 0.35); ctx.stroke();
      if (look.plume) {
        ctx.strokeStyle = look.plume; ctx.lineWidth = hr * 0.6; ctx.lineCap = 'round';
        const wv = Math.sin(G.time * 4) * hr * 0.2;
        ctx.beginPath(); ctx.moveTo(hx, hy - hr * 0.7); ctx.quadraticCurveTo(hx - c * hr * 0.8 + wv, hy - hr * 1.6, hx - c * hr * 1.8, hy - hr * 0.6 - s * hr); ctx.stroke();
      }
      break;
    case 'banished':
      ball(hx, hy, hr * 0.95, hr * 1.1, f || look.armor);
      ctx.fillStyle = shade(look.armor, -0.3);
      ctx.beginPath(); ctx.moveTo(hx - px * 2, hy - hr * 1.4); ctx.lineTo(hx + px * 2, hy - hr * 1.4); ctx.lineTo(hx + px * 3, hy); ctx.lineTo(hx - px * 3, hy); ctx.fill();
      ctx.strokeStyle = 'rgba(10,8,6,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hx + c * hr * 0.8 + px * hr * 0.4, hy + s * hr * 0.5 + py * hr * 0.3); ctx.lineTo(hx + c * hr * 0.8 - px * hr * 0.4, hy + s * hr * 0.5 - py * hr * 0.3); ctx.stroke();
      break;
    case 'hood':
      ball(hx, hy, hr * 1.05, hr, f || shade(look.cape || '#3a3226', -0.1));
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.45, hy + s * hr * 0.35, hr * 0.5, hr * 0.38, face, 0, TAU); ctx.fill();
      break;
    case 'noble':
      ball(hx, hy, hr * 0.8, hr * 0.8, f || look.skin || '#a8987a');
      ctx.fillStyle = f || '#4a3a5a'; ctx.beginPath(); ctx.ellipse(hx - c * hr * 0.2, hy - hr * 0.35, hr * 1.35, hr * 0.7, 0, 0, TAU); ctx.fill();
      ball(hx - c * hr * 0.2, hy - hr * 0.7, hr * 0.7, hr * 0.55, f || '#5a4a6a');
      break;
    case 'tarnished': {
      ball(hx, hy, hr * 1.05, hr, f || '#2a2c32');
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.42, hy + s * hr * 0.32, hr * 0.55, hr * 0.42, face, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9a95a'; ctx.beginPath(); ctx.arc(hx + c * hr * 0.55, hy + s * hr * 0.4, hr * 0.14, 0, TAU); ctx.fill();
      break;
    }
    case 'margit': {
      // long pale hair falling behind
      ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const sx = hx + px * i * hr * 0.25, sy = hy - hr * 0.3 + py * i * hr * 0.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - c * hr * 1.4 + Math.sin(G.time * 2 + i) * 2, sy + hr, sx - c * hr * 2.2, sy + hr * 2.4 - s * hr); ctx.stroke();
      }
      ball(hx, hy, hr, hr * 0.95, f || '#3a3430');
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3;
      for (const sd of [1, -1]) {
        ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.6, hy - hr * 0.5);
        ctx.quadraticCurveTo(hx + px * sd * hr * 1.6, hy - hr * 1.4, hx + px * sd * hr * 1.1 - c * hr * 0.6, hy - hr * 2.0); ctx.stroke();
      }
      break;
    }
    case 'crown': {
      ball(hx, hy, hr, hr * 0.95, f || '#8a7450');
      ctx.fillStyle = '#d8b25a';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        const r1 = hr * 0.75, r2 = hr * 1.25;
        ctx.lineTo(hx + Math.cos(a) * r1, hy - hr * 0.3 + Math.sin(a) * r1 * 0.5);
        ctx.lineTo(hx + Math.cos(a + 0.22) * r2, hy - hr * 0.5 + Math.sin(a + 0.22) * r2 * 0.5 - hr * 0.3);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.55, hy + hr * 0.45 + s * hr * 0.3, hr * 0.45, hr * 0.55, face, 0, TAU); ctx.fill();
      break;
    }
    default:
      ball(hx, hy, hr, hr, f || look.armor || '#777');
  }
  // eyes for creepy bosses
  if (helm === 'margit' || helm === 'crown') {
    ctx.fillStyle = helm === 'margit' ? '#f0d060' : '#ffb040';
    ctx.beginPath();
    ctx.arc(hx + c * hr * 0.6 + px * hr * 0.25, hy + s * hr * 0.4 + py * hr * 0.15, 1.6, 0, TAU);
    ctx.arc(hx + c * hr * 0.6 - px * hr * 0.25, hy + s * hr * 0.4 - py * hr * 0.15, 1.6, 0, TAU);
    ctx.fill();
  }
}

// pose: {ang, ext, phase, k, atk, trailA0, glintK, pull}
function drawHumanoid(o) {
  const { x, y, r, face, look } = o;
  const flash = o.flash > 0;
  const lift = o.lift || 0;
  const by = y - r * 0.75 - lift;
  const c = Math.cos(face), s = Math.sin(face), px = -s, py = c;
  const behind = s < -0.2;
  const step = Math.sin(o.walk) * r * 0.35 * Math.min(1, o.moving / 60);

  // feet
  ctx.fillStyle = shade(look.body || '#333', -0.4);
  for (const sd of [1, -1]) {
    const st = step * sd;
    ctx.beginPath(); ctx.ellipse(x + px * r * 0.42 * sd + c * st, y - 3 - lift + s * st * 0.6, r * 0.3, r * 0.22, face, 0, TAU); ctx.fill();
  }
  if (look.cape && !behind) drawCape(x, by, r, face, flash ? '#ffffff' : look.cape, o.walk, look.capeLong || 1);
  if (o.extraBehind) o.extraBehind(by);

  const weaponFn = () => {
    if (!o.weapon) return;
    const handA = face + 0.95;
    const hx = x + Math.cos(handA) * r * 0.85, hy = by + Math.sin(handA) * r * 0.62;
    const sx = o.pose.phase ? x : hx, sy = o.pose.phase ? by : hy;
    if (o.pose.phase === 'active' && o.pose.trail) {
      const tr = o.pose.trail;
      drawTrail(x, by, tr.a0, o.pose.ang, tr.len * 0.25, tr.len * 0.95, tr.col, 1);
    } else if (o.pose.phase === 'rec' && o.pose.trail && o.pose.recT < 0.12) {
      const tr = o.pose.trail;
      drawTrail(x, by, tr.a0, o.pose.ang, tr.len * 0.25, tr.len * 0.95, tr.col, 1 - o.pose.recT / 0.12);
    }
    const tip = drawWeaponType(o.weapon.type, sx, sy, o.pose.ang, { ...o.weapon, ext: o.pose.ext, pull: o.pose.pull });
    if (o.pose.glintK > 0) drawGlint(tip.ex, tip.ey, o.pose.glintK);
  };
  const shieldFn = () => {
    if (!look.shield) return;
    const up = o.guard ? 0.45 : 1.0;
    const sa = face - up;
    const sx = x + Math.cos(sa) * r * 0.95, sy = by + Math.sin(sa) * r * 0.72;
    const col = flash ? '#fff' : look.shieldCol || '#5a4630';
    if (look.shield === 'tower') ball(sx, sy, r * 0.45, r * 0.85, col, sa);
    else if (look.shield === 'kite') ball(sx, sy, r * 0.45, r * 0.65, col, sa);
    else ball(sx, sy, r * 0.55, r * 0.55, col);
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(sx, sy, r * 0.22, 0, TAU); ctx.stroke();
  };

  if (behind) { weaponFn(); shieldFn(); }

  // torso
  const body = flash ? '#ffffff' : look.armor;
  if (look.robe) ball(x, by + r * 0.25, r * 1.05, r * 0.9, flash ? '#fff' : look.body);
  ball(x, by, r, r * 1.05, body);
  if (look.trim) { ctx.strokeStyle = look.trim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, by, r * 0.98, r * 1.03, 0, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // belt
  ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, by + r * 0.35, r * 0.85, r * 0.3, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  // pauldrons
  for (const sd of [1, -1]) ball(x + px * r * 0.78 * sd, by + py * r * 0.5 * sd - r * 0.25, r * 0.42, r * 0.36, flash ? '#fff' : shade(look.armor, 0.08));
  if (o.extraFront) o.extraFront(by);
  // head
  const hr = r * (o.headScale || 0.5);
  drawHead(x + c * r * 0.18, by - r * 0.82 + s * r * 0.12, hr, face, look, flash);
  if (look.cape && behind) drawCape(x, by, r, face, flash ? '#ffffff' : look.cape, o.walk, look.capeLong || 1);
  if (!behind) { shieldFn(); weaponFn(); }
  // telegraph outline
  if (o.tel > 0) {
    ctx.strokeStyle = `rgba(255,60,40,${o.tel * 0.85})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, by, r + 3, r * 1.05 + 3, 0, 0, TAU); ctx.stroke();
  }
}

// pose from an attack state
function attackPose(face, atk, state, t, wm) {
  if (!atk) return { ang: face + 1.0, ext: 0, phase: null };
  const phase = state === 'windup' ? 'windup' : state === 'active' ? 'active' : state === 'recover' || state === 'rec' ? 'rec' : null;
  if (!phase) return { ang: face + 1.0, ext: 0, phase: null };
  const k = phase === 'windup' ? clamp(t / (atk.wind * wm), 0, 1) : phase === 'active' ? clamp(t / atk.act, 0, 1) : 1;
  let ang = swingAngle(face, atk, phase, k), ext = 0;
  if (atk.thrust) ext = phase === 'windup' ? -14 * k : phase === 'active' ? 18 * k : 10;
  return { ang, ext, phase, k, recT: phase === 'rec' ? t : 0 };
}

// ---------------------------------------------------------------- player
function drawPlayer() {
  if (P.state === 'dead' && G.deadT > 1.6) return;
  const w = weapon();
  ctx.save();
  ctx.globalAlpha = P.state === 'dead' ? Math.max(0, 1 - G.deadT / 1.6) : 1;
  drawShadow(P.x, P.y, P.r);
  let pose;
  if (P.state === 'attack') {
    const ph = P.t < P.atk.wind ? 'windup' : P.t < P.atk.wind + P.atk.act ? 'active' : 'rec';
    const tt = ph === 'windup' ? P.t : ph === 'active' ? P.t - P.atk.wind : P.t - P.atk.wind - P.atk.act;
    pose = attackPose(P.face, P.atk, ph, tt, 1);
    if (!P.atk.thrust) pose.trail = { a0: swingAngle(P.face, P.atk, 'active', 0), len: w.len + 6, col: w.style === 'halberd' ? '255,225,150' : P.atk === w.heavy ? '255,235,190' : '230,235,255' };
  } else if (P.state === 'roll') pose = { ang: P.rollDir + 2.2, ext: 0 };
  else if (P.state === 'heal') pose = { ang: P.face + 1.6, ext: 0 };
  else pose = { ang: P.face + (w.style === 'great' || w.style === 'halberd' ? 1.4 : 1.0), ext: 0 };

  const twoHanded = w.style === 'great' || w.style === 'halberd';
  const look = { body: '#22252b', armor: '#575d68', cape: '#25272d', helm: 'tarnished', trim: '#c9a95a', shield: twoHanded ? null : 'kite', shieldCol: '#5a4630', capeLong: 0.95 };
  const wtype = w.style === 'katana' ? 'katana' : w.style === 'great' ? 'great' : w.style === 'halberd' ? 'halberd' : 'sword';
  let lift = 0, rx = P.x, ry = P.y;
  if (P.state === 'roll') {
    const k = P.t / (P.backstep ? 0.32 : 0.48);
    lift = Math.sin(k * Math.PI) * (P.backstep ? 3 : 6);
    ctx.translate(rx, ry - 8); ctx.scale(1.1, 0.78); ctx.translate(-rx, -(ry - 8));
  }
  drawHumanoid({
    x: rx, y: ry, r: P.r, face: P.face, look, walk: P.moveAnim, moving: P.moving, flash: P.flash, lift,
    weapon: { type: wtype, len: w.len, w: w.w, col: w.blade, edge: w.edge, hilt: w.hilt }, pose,
  });
  if (P.state === 'heal') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fx = P.x + Math.cos(P.face + 0.9) * 10, fy = P.y - 16 + Math.sin(P.face + 0.9) * 7;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 16);
    g.addColorStop(0, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 16, fy - 16, 32, 32);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- enemies
function telegraphMarkers(e) {
  const a = e.atk;
  if (!a || e.dead) return;
  if (e.state === 'windup') {
    const k = clamp(e.t / (a.wind * windMul(e)), 0, 1);
    if (a.kind === 'circle') {
      const cx = e.x + Math.cos(e.face) * a.off, cy = e.y + Math.sin(e.face) * a.off;
      ctx.fillStyle = `rgba(200,40,30,${0.06 + 0.16 * k})`;
      ctx.beginPath(); ctx.arc(cx, cy, a.rad, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,60,${0.2 + 0.4 * k})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, a.rad * k, 0, TAU); ctx.stroke();
    } else if (a.kind === 'leap' && e.leapTo) {
      ctx.strokeStyle = `rgba(220,60,40,${0.25 + 0.4 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, a.rad, 0, TAU); ctx.stroke();
    } else if (a.kind === 'arrow') {
      ctx.strokeStyle = `rgba(255,80,60,${0.1 + 0.35 * k})`; ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x + Math.cos(e.face) * 420, e.y - 12 + Math.sin(e.face) * 420); ctx.stroke();
      ctx.setLineDash([]);
    } else if (a.kind === 'breath') {
      ctx.fillStyle = `rgba(255,100,30,${0.05 + 0.12 * k})`;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, a.range, e.face - a.cone, e.face + a.cone); ctx.closePath(); ctx.fill();
    } else if (a.kind === 'spin' || a.kind === 'stomps') {
      ctx.strokeStyle = `rgba(255,80,60,${0.15 + 0.35 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, (a.rad || 120) * (0.6 + 0.4 * k), 0, TAU); ctx.stroke();
    }
  }
  if (e.state === 'active' && a.kind === 'leap' && e.leapTo) {
    ctx.fillStyle = 'rgba(200,40,30,0.22)';
    ctx.beginPath(); ctx.arc(e.leapTo.x, e.leapTo.y, a.rad, 0, TAU); ctx.fill();
  }
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
  else if (a.kind === 'daggers' || a.kind === 'stomps' || a.kind === 'breath') pose = { ang: e.face - Math.PI / 2, ext: 0 };
  else if (a.kind === 'arrow') { const k = clamp(e.t / (a.wind * wm), 0, 1); pose = { ang: e.face, ext: 0, pull: e.state === 'windup' ? k : 0 }; }
  else pose = attackPose(e.face, a, e.state, e.t, wm);
  if (a.range && !a.thrust && !a.kind && pose.phase) pose.trail = { a0: swingAngle(e.face, a, 'active', 0), len: (e.def.look.weaponLen || 50), col: e.type === 'margit' && e.phase2 ? '255,220,130' : e.boss ? '255,200,140' : '255,225,210' };
  if (a.glint && e.state === 'windup') {
    const gk = e.t - a.glint * wm;
    pose.glintK = gk > 0 && gk < 0.28 ? 1 - gk / 0.28 : 0;
  }
  return pose;
}

const ENEMY_WEAPON = {
  soldier: { type: 'sword', len: 38 }, knight: { type: 'sword', len: 46, w: 4, col: '#b8bcc4', edge: '#eef' },
  spearman: { type: 'spear', len: 72 }, archer: { type: 'bow' }, noble: { type: 'stick', len: 30 },
  banished: { type: 'halberd', len: 80 },
};
function drawEnemy(e) {
  const d = e.def, look = d.look;
  ctx.save();
  if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deathT / 1.2);
  telegraphMarkers(e);
  const tel = e.state === 'windup' ? 0.5 + 0.5 * Math.sin(e.t * 30) : 0;
  const pose = enemyPose(e);
  const lift = e.air * 70;
  if (e.dead && Math.random() < 0.5) G.particles.push({ x: e.x + rand(-e.r, e.r), y: e.y - rand(0, e.r * 2), vx: rand(-10, 10), vy: rand(-60, -20), life: 0.8, max: 0.8, size: 2, col: '#e7c46a', grav: 0, glow: true });
  switch (look.kind) {
    case 'humanoid': {
      drawShadow(e.x, e.y, e.r);
      const wpn = ENEMY_WEAPON[e.type];
      if (wpn) look.weaponLen = wpn.len || 50;
      drawHumanoid({ x: e.x, y: e.y, r: e.r, face: e.face, look, walk: e.walk, moving: e.state === 'chase' || e.state === 'return' || e.def.patrol ? 80 : 0, flash: e.flash, tel, weapon: wpn, pose, guard: guarding(e) });
      break;
    }
    case 'wolf': drawWolf(e, tel); break;
    case 'troll': drawTroll(e, tel, pose); break;
    case 'mounted': drawMounted(e, tel, pose); break;
    case 'margit': {
      drawShadow(e.x, e.y, e.r * (1 - e.air * 0.4), 0.38 * (1 - e.air * 0.5));
      look.weaponLen = 64;
      const summon = e.atk && e.atk.summon && (e.state === 'windup' || e.state === 'active' || e.state === 'recover') ? e.atk.summon : null;
      const wpn = summon ? { type: summon, len: summon === 'hammer' ? 74 : 96 } : { type: 'cane', len: 54 };
      drawHumanoid({
        x: e.x, y: e.y, r: e.r, face: e.face, walk: e.walk, moving: e.state === 'chase' ? 80 : 0, flash: e.flash, tel, lift, pose, weapon: wpn, headScale: 0.55,
        look: { body: '#2a2420', armor: '#4a423a', cape: '#2c2420', capeLong: 1.2, helm: 'margit', trim: '#8a7a50' },
        extraFront: (by) => { // fur collar
          ctx.fillStyle = e.flash > 0 ? '#fff' : '#5a5048';
          ctx.beginPath(); ctx.ellipse(e.x, by - e.r * 0.45, e.r * 0.95, e.r * 0.45, 0, 0, TAU); ctx.fill();
        },
      });
      break;
    }
    case 'godrick': {
      drawShadow(e.x, e.y, e.r * (1 - e.air * 0.4), 0.4 * (1 - e.air * 0.5));
      look.weaponLen = 96;
      const r = e.r;
      drawHumanoid({
        x: e.x, y: e.y, r, face: e.face, walk: e.walk, moving: e.state === 'chase' ? 80 : 0, flash: e.flash, tel, lift, pose, headScale: 0.42,
        weapon: { type: 'axe', len: 96, col: '#3e3c42', edge: '#d8b25a' },
        look: { body: '#3a2e22', armor: '#8a7444', cape: '#5a1f1a', capeLong: 1.3, helm: 'crown', trim: '#d8b25a' },
        extraBehind: (by) => {
          // grafted arms sprouting from the back
          const back = e.face + Math.PI;
          ctx.strokeStyle = e.flash > 0 ? '#fff' : '#9a8270'; ctx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            const a = back + (i - 2.5) * 0.42 + Math.sin(G.time * 2 + i) * 0.12;
            const L = r * (1.1 + (i % 2) * 0.35);
            const ex = e.x + Math.cos(a) * L, ey = by + Math.sin(a) * L * 0.75 - r * 0.3;
            ctx.lineWidth = 4.5;
            ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r * 0.4, by + Math.sin(a) * r * 0.3 - r * 0.3);
            ctx.quadraticCurveTo(e.x + Math.cos(a + 0.4) * L * 0.7, by + Math.sin(a + 0.4) * L * 0.5 - r * 0.6, ex, ey); ctx.stroke();
            ctx.fillStyle = e.flash > 0 ? '#fff' : '#b09a86'; ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, TAU); ctx.fill();
          }
        },
        extraFront: (by) => {
          if (!e.phase2) return;
          // grafted dragon head on the left arm
          const a = e.face - 1.15;
          const sx = e.x + Math.cos(a) * r * 0.95, sy = by + Math.sin(a) * r * 0.7;
          const hx = sx + Math.cos(e.face) * r * 0.9, hy = sy + Math.sin(e.face) * r * 0.7;
          ctx.strokeStyle = '#4a2a22'; ctx.lineWidth = 9; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(e.face);
          ball(4, 0, 15, 9, e.flash > 0 ? '#fff' : '#5a2a20', 0);
          ctx.fillStyle = '#3a1a14'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-16, -14); ctx.lineTo(-3, -9); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-16, 14); ctx.lineTo(-3, 9); ctx.fill();
          const glow = e.atk && e.atk.kind === 'breath' && (e.state === 'windup' || e.state === 'active') ? 1 : 0.5;
          ctx.fillStyle = `rgba(255,${140 + glow * 80},60,${glow})`; ctx.beginPath(); ctx.ellipse(18, 0, 5, 3.5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffcc55'; ctx.beginPath(); ctx.arc(6, -4, 1.6, 0, TAU); ctx.arc(6, 4, 1.6, 0, TAU); ctx.fill();
          ctx.restore();
        },
      });
      break;
    }
  }
  if (e.state === 'stagger') {
    ctx.fillStyle = '#ffd36a'; ctx.font = 'bold 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = G.time * 4 + i * TAU / 3; ctx.fillText('✦', e.x + Math.cos(a) * 14, e.y - e.r * 2.6 + Math.sin(a) * 4); }
  }
  ctx.restore();
}
function drawWolf(e, tel) {
  const look = e.def.look;
  drawShadow(e.x, e.y, e.r);
  const by = e.y - 8, t = e.walk * 1.3;
  ctx.save(); ctx.translate(e.x, by); ctx.rotate(e.face);
  const flash = e.flash > 0;
  // legs
  ctx.strokeStyle = shade(look.body, -0.3); ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [lx, ly, ph] of [[9, 6, 0], [9, -6, Math.PI], [-9, 6, Math.PI], [-9, -6, 0]]) {
    const sw = Math.sin(t + ph) * 4;
    ctx.beginPath(); ctx.moveTo(lx, ly * 0.6); ctx.lineTo(lx + sw, ly * 1.3); ctx.stroke();
  }
  ctx.strokeStyle = flash ? '#fff' : look.body; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-24, Math.sin(G.time * 8) * 4, -29, Math.sin(G.time * 8 + 1) * 6); ctx.stroke();
  ball(-2, 0, 17, 9, flash ? '#fff' : look.body, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(-2, 2, 14, 4, 0, 0, Math.PI); ctx.fill();
  ball(13, 0, 8.5, 7, flash ? '#fff' : look.fur, 0);
  ctx.fillStyle = flash ? '#fff' : shade(look.fur, -0.2);
  ctx.beginPath(); ctx.ellipse(21, 0, 5, 3.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : look.body;
  ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(7, -12); ctx.lineTo(14, -6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(7, 12); ctx.lineTo(14, 6); ctx.fill();
  ctx.fillStyle = e.state === 'windup' ? '#ff4a3a' : '#d8a040';
  ctx.beginPath(); ctx.arc(17, -3, 1.5, 0, TAU); ctx.arc(17, 3, 1.5, 0, TAU); ctx.fill();
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 21, 12, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawTroll(e, tel, pose) {
  const look = e.def.look, r = e.r, flash = e.flash > 0;
  drawShadow(e.x, e.y, r, 0.4);
  const by = e.y - r * 0.9, c = Math.cos(e.face), s = Math.sin(e.face), px = -s, py = c;
  const step = Math.sin(e.walk * 0.7) * r * 0.25;
  ctx.fillStyle = shade(look.skin, -0.35);
  for (const sd of [1, -1]) { ctx.beginPath(); ctx.ellipse(e.x + px * r * 0.45 * sd + c * step * sd, e.y - 4 + s * step * sd * 0.5, r * 0.32, r * 0.24, e.face, 0, TAU); ctx.fill(); }
  const behind = s < -0.2;
  const club = () => {
    const hx = e.x + Math.cos(e.face + 1.1) * r * 0.95, hy = by + Math.sin(e.face + 1.1) * r * 0.7;
    if (pose.phase === 'active' && pose.trail) drawTrail(e.x, by, pose.trail.a0, pose.ang, r * 0.8, r * 3.4, '230,210,170', 1);
    const L = r * 3, tx = e.x + Math.cos(pose.ang) * L, ty = by + Math.sin(pose.ang) * L;
    ctx.strokeStyle = '#4a3624'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pose.phase ? e.x : hx, pose.phase ? by : hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#5c4630'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(lerp(e.x, tx, 0.7), lerp(by, ty, 0.7)); ctx.lineTo(tx, ty); ctx.stroke();
  };
  if (pose.trail === undefined && e.atk && e.atk.range && pose.phase) pose.trail = { a0: swingAngle(e.face, e.atk, 'active', 0) };
  if (behind) club();
  ball(e.x, by + r * 0.3, r * 0.9, r * 0.6, flash ? '#fff' : look.cloth);
  ball(e.x, by, r, r * 0.95, flash ? '#fff' : look.skin);
  for (const sd of [1, -1]) ball(e.x + px * r * 0.85 * sd, by + py * r * 0.5 * sd - r * 0.2, r * 0.45, r * 0.4, flash ? '#fff' : shade(look.skin, 0.05));
  const hx = e.x + c * r * 0.35, hy = by - r * 0.55 + s * r * 0.2;
  ball(hx, hy, r * 0.36, r * 0.32, flash ? '#fff' : shade(look.skin, -0.1));
  ctx.fillStyle = '#e8dfc8';
  ctx.beginPath(); ctx.arc(hx + c * r * 0.3 + px * 4, hy + s * r * 0.2 + py * 3, 2.2, 0, TAU); ctx.arc(hx + c * r * 0.3 - px * 4, hy + s * r * 0.2 - py * 3, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(hx + c * r * 0.25 + px * 3, hy + s * r * 0.15 + py * 2 - 3, 1.6, 0, TAU); ctx.arc(hx + c * r * 0.25 - px * 3, hy + s * r * 0.15 - py * 2 - 3, 1.6, 0, TAU); ctx.fill();
  if (!behind) club();
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, by, r + 4, r * 0.95 + 4, 0, 0, TAU); ctx.stroke(); }
}
function drawMounted(e, tel, pose) {
  const look = e.def.look, r = e.r, flash = e.flash > 0;
  drawShadow(e.x, e.y, r * 1.3, 0.4);
  const by = e.y - 16, t = e.walk * 1.2;
  ctx.save(); ctx.translate(e.x, by); ctx.rotate(e.face);
  // legs
  ctx.strokeStyle = shade(look.horse, -0.3); ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [lx, ly, ph] of [[22, 10, 0], [22, -10, Math.PI], [-20, 10, Math.PI], [-20, -10, 0]]) {
    const sw = Math.sin(t + ph) * 8;
    ctx.beginPath(); ctx.moveTo(lx, ly * 0.6); ctx.lineTo(lx + sw, ly * 1.5); ctx.stroke();
  }
  // tail
  ctx.strokeStyle = look.mane; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-46, Math.sin(G.time * 5) * 6, -54, Math.sin(G.time * 5 + 1) * 9); ctx.stroke();
  ball(0, 0, 36, 15, flash ? '#fff' : look.horse, 0);
  // golden barding
  ctx.fillStyle = flash ? '#fff' : 'rgba(201,162,74,0.9)';
  ctx.beginPath(); ctx.ellipse(-4, 0, 26, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = look.trim; ctx.lineWidth = 1.5; ctx.stroke();
  // neck + head
  ctx.strokeStyle = flash ? '#fff' : look.horse; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(42, 0); ctx.stroke();
  ball(48, 0, 12, 7, flash ? '#fff' : look.horse, 0);
  ctx.fillStyle = look.armor; ctx.beginPath(); ctx.ellipse(48, 0, 8, 5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = look.mane; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(28 + i * 4, -3); ctx.lineTo(26 + i * 4 + Math.sin(G.time * 6 + i) * 2, -10); ctx.stroke(); }
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.8})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 40, 18, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  // rider
  const pr = { ...pose };
  if (e.atk && e.atk.range && !e.atk.thrust && pr.phase) pr.trail = { a0: swingAngle(e.face, e.atk, 'active', 0), len: 92, col: '255,225,150' };
  drawHumanoid({
    x: e.x - Math.cos(e.face) * 4, y: e.y - 8, r: 15, face: e.face, walk: 0, moving: 0, flash: e.flash, tel: 0, pose: pr,
    look: { body: '#5a4a2a', armor: look.armor, cape: '#7a6a3a', helm: 'knight', plume: '#e8d8a8', trim: look.trim, shield: 'round', shieldCol: '#b8923e' },
    weapon: { type: 'halberd', len: 92, col: '#dcbc62', edge: '#fff2c4' }, lift: 14,
  });
}

// ---------------------------------------------------------------- hazards
function drawProjectiles() {
  for (const p of G.projectiles) {
    if (p.type === 'arrow') {
      const a = Math.atan2(p.vy, p.vx);
      ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * 18, p.y - Math.sin(a) * 18); ctx.stroke();
      ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, TAU); ctx.fill();
    } else if (p.type === 'dagger') {
      const a = p.hover > 0 ? p.ang : Math.atan2(p.vy, p.vx);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
      g.addColorStop(0, 'rgba(255,240,180,0.7)'); g.addColorStop(1, 'rgba(255,210,110,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - 16, p.y - 16, 32, 32);
      ctx.strokeStyle = 'rgba(255,240,190,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10); ctx.lineTo(p.x - Math.cos(a) * 8, p.y - Math.sin(a) * 8); ctx.stroke();
      ctx.restore();
    }
  }
  for (const r of G.rings) {
    if (r.delay > 0) continue;
    const k = 1 - r.r / r.maxR;
    ctx.save();
    if (r.col.startsWith('255')) ctx.globalCompositeOperation = 'lighter';
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
function collectLights(v) {
  const L = [];
  const t = G.time;
  for (const l of LIGHTS) {
    if (l.x < v.x0 - l.r || l.x > v.x1 + l.r || l.y < v.y0 - l.r || l.y > v.y1 + l.r) continue;
    const f = 0.85 + 0.15 * Math.sin(t * 13 + l.flicker) * Math.sin(t * 7.3 + l.flicker);
    L.push({ x: l.x, y: l.y, r: l.r * (0.95 + 0.05 * f), a: l.a * f, col: l.col });
  }
  for (const g of G.graces) if (!(g.afterBoss && !G.defeated.has(g.afterBoss))) L.push({ x: g.x, y: g.y - 10, r: 260, a: 0.95, col: [255, 210, 120] });
  for (const it of ITEMS) if (!G.taken.has(it.id)) L.push({ x: it.x, y: it.y - 8, r: 90, a: 0.7, col: [255, 230, 170] });
  for (const p of G.projectiles) if (p.type === 'dagger') L.push({ x: p.x, y: p.y, r: 80, a: 0.6, col: [255, 220, 130] });
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.phase2) L.push({ x: e.x, y: e.y - 16, r: 200, a: 0.55, col: e.type === 'margit' ? [255, 220, 130] : [255, 120, 50] });
    if (e.atk && e.atk.kind === 'breath' && e.state === 'active') L.push({ x: e.x + Math.cos(e.face) * 120, y: e.y + Math.sin(e.face) * 120, r: 280, a: 1, col: [255, 130, 40] });
  }
  if (G.bloodstain) L.push({ x: G.bloodstain.x, y: G.bloodstain.y, r: 60, a: 0.5, col: [255, 60, 40] });
  L.push({ x: P.x, y: P.y - 10, r: 170, a: 0.5, col: [255, 220, 170] });
  return L;
}
function renderLighting(amb, lights) {
  if (amb.dark < 0.02) return;
  const lw = Math.ceil(W / 2), lh = Math.ceil(H / 2);
  if (lightCvs.width !== lw || lightCvs.height !== lh) { lightCvs.width = lw; lightCvs.height = lh; }
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = `rgba(6,5,12,${amb.dark})`;
  lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const [sx, sy] = toScreen(l.x, l.y), r = l.r * SCALE;
    const g = lctx.createRadialGradient(sx / 2, sy / 2, 0, sx / 2, sy / 2, r / 2);
    g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(0.5, `rgba(0,0,0,${l.a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx / 2 - r / 2, sy / 2 - r / 2, r, r);
  }
  ctx.drawImage(lightCvs, 0, 0, W, H);
  // warm additive glow
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const [sx, sy] = toScreen(l.x, l.y), r = l.r * SCALE * 0.55;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(${l.col[0]},${l.col[1]},${l.col[2]},${0.16 * l.a * amb.dark * 2})`); g.addColorStop(1, 'rgba(0,0,0,0)');
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
      g.addColorStop(0, `rgba(0,0,10,${0.16 * amb.sky})`); g.addColorStop(1, 'rgba(0,0,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 380, 230, 0.3, 0, TAU); ctx.fill();
    }
  }
}
function drawAtmosphere(amb) {
  const t = G.time;
  // colour grade
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(${amb.tint.map((c) => c | 0).join(',')},${amb.tintA * 2.2})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Erdtree radiance from the sky
  if (amb.sky > 0.05) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ox = W * 0.82, oy = -H * 0.25;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(W, H) * 0.9);
    g.addColorStop(0, `rgba(255,214,120,${0.3 * amb.sky})`); g.addColorStop(0.4, `rgba(255,190,90,${0.08 * amb.sky})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const a = 1.9 + i * 0.16 + Math.sin(t * 0.2 + i) * 0.03, w = 0.035 + (i % 2) * 0.02, L = Math.max(W, H) * 1.4;
      ctx.fillStyle = `rgba(255,220,140,${0.04 * amb.sky})`;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); ctx.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); ctx.fill();
    }
    ctx.restore();
  }
  // golden motes / leaves / embers
  if (G.motes.length < 60) for (let i = 0; i < 60; i++) G.motes.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.5, 2), p: Math.random() * TAU, rot: Math.random() * TAU });
  ctx.save();
  for (const m of G.motes) {
    m.p += 0.01;
    if (amb.leaves > 0.1) {
      m.x += 0.6 * m.s + Math.sin(t + m.p) * 0.3; m.y += 0.35 * m.s;
      if (m.x > W + 10) m.x = -10; if (m.y > H + 10) m.y = -10;
      m.rot += 0.03;
      ctx.globalAlpha = 0.55 * amb.leaves;
      ctx.fillStyle = m.s > 1.4 ? '#d8a840' : '#e8c060';
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 3 * m.s, 1.4 * m.s, m.rot, 0, TAU); ctx.fill();
    }
    if (amb.embers > 0.1) {
      ctx.globalCompositeOperation = 'lighter';
      const ex = (m.x * 1.7 + t * 10 * m.s) % W, ey = H - ((m.y * 1.3 + t * 25 * m.s) % (H + 20));
      ctx.globalAlpha = Math.min(1, 0.5 * amb.embers) * (0.5 + 0.5 * Math.sin(t * 3 + m.p));
      ctx.fillStyle = m.s > 1.2 ? '#ff9a40' : '#ffcc70';
      ctx.fillRect(ex + Math.sin(t + m.p) * 6, ey, m.s * 1.4, m.s * 1.4);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
  // rain
  if (amb.rain > 0.05) {
    if (G.rain.length < 160) for (let i = 0; i < 160; i++) G.rain.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.6, 1.2) });
    ctx.strokeStyle = `rgba(190,200,220,${0.28 * amb.rain})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of G.rain) {
      r.x -= 5 * r.s; r.y += 17 * r.s;
      if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 200); }
      if (r.x < -20) r.x = W + 20;
      ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 4 * r.s, r.y - 14 * r.s);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(40,50,70,${0.12 * amb.rain})`; ctx.fillRect(0, 0, W, H);
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, G.activeBoss ? 'rgba(25,5,0,0.7)' : 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (P.flash > 0) { ctx.fillStyle = `rgba(140,0,0,${P.flash * 1.2})`; ctx.fillRect(0, 0, W, H); }
  if (P.state !== 'dead' && P.hp < P.maxHp * 0.25) {
    const pulse = 0.12 + 0.1 * Math.sin(t * 6);
    const g2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, `rgba(120,0,0,${pulse})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  if (P.state === 'dead') { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, G.deadT * 0.2)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- frame
function render() {
  const s = G.shake;
  camOX = s > 0.3 ? rand(-s, s) / SCALE : 0; camOY = s > 0.3 ? rand(-s, s) / SCALE : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0c0a'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  applyWorldTransform();
  const v = view();
  const amb = ambAt(G.state === 'title' ? cam.y : P.y);
  G.amb = amb;
  drawGround(v);

  if (G.bloodstain) {
    const b = G.bloodstain;
    ctx.fillStyle = 'rgba(120,10,10,0.6)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 14, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,60,40,${0.5 + 0.3 * Math.sin(G.time * 4)})`;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 6, 3, 0, 0, TAU); ctx.fill();
  }

  const list = [];
  for (const d of DECOR) if (d.x > v.x0 - 60 && d.x < v.x1 + 60 && d.y > v.y0 && d.y < v.y1 + 90) list.push({ y: d.y, f: () => drawDecor(d) });
  for (const w of WALLS) if (w.x < v.x1 && w.x + w.w > v.x0 && w.y < v.y1 + 60 && w.y + w.h > v.y0 - 60) list.push({ y: w.y + w.h, f: () => drawWall(w) });
  for (const e of G.enemies) if (e.x > v.x0 - 60 && e.x < v.x1 + 60 && e.y > v.y0 && e.y < v.y1 + 80) list.push({ y: e.y, f: () => drawEnemy(e) });
  for (const g of G.graces) if (g.y > v.y0 && g.y < v.y1 + 60) list.push({ y: g.y, f: () => drawGrace(g) });
  for (const it of ITEMS) if (it.y > v.y0 && it.y < v.y1) list.push({ y: it.y, f: () => drawItem(it) });
  for (const f of FOGS) if (f.y > v.y0 - 80 && f.y < v.y1) list.push({ y: f.y + f.h + 1, f: () => drawFog(f) });
  list.push({ y: P.y, f: drawPlayer });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.f();

  drawProjectiles();
  drawParticles();
  drawCloudShadows(v, amb);

  // lock reticle
  if (P.lock && !P.lock.dead) {
    const e = P.lock, ry = e.y - e.r * 0.8 - e.air * 70;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, ry, 5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, ry, 1.6, 0, TAU); ctx.fill();
  }
  // enemy bars
  for (const e of G.enemies) {
    if (e === G.activeBoss || e.dead || (e.showHp <= 0 && P.lock !== e && e.bleed <= 0)) continue;
    const bw = e.r > 25 ? 60 : 36, bx = e.x - bw / 2, byy = e.y - e.r * 2.3 - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, 5);
    ctx.fillStyle = '#d8b860'; ctx.fillRect(bx, byy, bw * (e.hpLag / e.maxHp), 3);
    ctx.fillStyle = '#a3201a'; ctx.fillRect(bx, byy, bw * (e.hp / e.maxHp), 3);
    if (e.bleed > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, byy + 5, bw + 2, 3); ctx.fillStyle = '#c0182a'; ctx.fillRect(bx, byy + 5.5, bw * Math.min(1, e.bleed / (e.boss ? 150 : 100)), 2); }
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
  renderLighting(amb, collectLights(v));
  drawAtmosphere(amb);
  if (G.state === 'play' || G.state === 'pause' || G.state === 'menu') drawHUD();
  drawBanners();
}

// ---------------------------------------------------------------- HUD
function bar(x, y, w, h, frac, lagFrac, col, col2) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (lagFrac > frac) { ctx.fillStyle = '#d8c070'; ctx.fillRect(x, y, w * clamp(lagFrac, 0, 1), h); }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col2); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = 'rgba(201,169,90,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
}
function drawHUD() {
  const x0 = 16 + SAFE.l, y0 = 14 + SAFE.t;
  const maxBar = W * 0.4;
  const hpW = Math.min(maxBar, 110 + P.maxHp * 0.65), stW = Math.min(maxBar, 90 + P.maxSt * 0.7);
  bar(x0, y0, hpW, 9, P.hp / P.maxHp, P.hpLag / P.maxHp, '#7a1410', '#c0302a');
  bar(x0, y0 + 16, stW, 6, Math.max(0, P.st) / P.maxSt, 0, '#2c6a2a', '#5aa850');
  // flasks + weapon
  ctx.textAlign = 'left';
  const fy = y0 + 30;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0 - 2, fy - 2, 30, 26);
  ctx.strokeStyle = 'rgba(201,169,90,0.5)'; ctx.strokeRect(x0 - 2.5, fy - 2.5, 31, 27);
  ctx.fillStyle = P.flasks > 0 ? '#e39a3a' : 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.arc(x0 + 13, fy + 13, 6.5, 0, TAU); ctx.fill(); ctx.fillRect(x0 + 10.5, fy + 2, 5, 6);
  ctx.font = 'bold 11px Georgia, serif'; ctx.fillStyle = '#efe3c2'; ctx.fillText(P.flasks, x0 + 20, fy + 22);
  ctx.font = '11px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(232,223,200,0.75)';
  ctx.fillText(weapon().name, x0 + 36, fy + 16);
  // runes
  ctx.textAlign = 'right';
  const rx = W - 16 - SAFE.r - (showTouch ? 40 : 0), ry = 30 + SAFE.t;
  ctx.font = 'bold 15px Cinzel, Georgia, serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('✧ ' + P.runes, rx + 1, ry + 1);
  ctx.fillStyle = G.runeShow > 0 ? '#ffe39a' : '#d8c38e'; ctx.fillText('✧ ' + P.runes, rx, ry);
  ctx.font = '10px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(216,195,142,0.6)';
  ctx.fillText('LV ' + level(), rx, ry + 14);

  // boss bar (bottom centre, Elden Ring style)
  const b = G.activeBoss;
  if (b && !b.dead && b.state !== 'dormant') {
    const bw = Math.min(W * (showTouch ? 0.42 : 0.6), 560), bx = (W - bw) / 2, by = H - 30 - SAFE.b - (showTouch ? 6 : 0);
    ctx.textAlign = 'left'; ctx.font = '13px Cinzel, Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(b.def.name, bx + 1, by - 7);
    ctx.fillStyle = '#e8dfc8'; ctx.fillText(b.def.name, bx, by - 8);
    bar(bx, by, bw, 7, b.hp / b.maxHp, b.hpLag / b.maxHp, '#6a1410', b.phase2 ? '#d0502a' : '#b0281e');
    ctx.fillStyle = '#c9a95a';
    for (const ex of [bx - 6, bx + bw + 6]) { ctx.beginPath(); ctx.moveTo(ex, by - 2); ctx.lineTo(ex + 4, by + 3.5); ctx.lineTo(ex, by + 9); ctx.lineTo(ex - 4, by + 3.5); ctx.fill(); }
    if (b.dmgAccum > 0) { ctx.textAlign = 'right'; ctx.fillStyle = '#eee'; ctx.fillText(Math.round(b.dmgAccum), bx + bw, by - 8); }
  }

  if (showTouch && G.state === 'play') drawControls();
  else if (G.ctxAction && G.state === 'play') {
    ctx.textAlign = 'center'; ctx.font = '14px Cinzel, Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 120, H * 0.62 - 20, 240, 30);
    ctx.fillStyle = '#e8dfc8'; ctx.fillText('[F]  ' + G.ctxAction.label, W / 2, H * 0.62);
  }
}
function drawControls() {
  if (joy.id !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(201,169,90,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.bx, joy.by, joy.R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,220,190,0.35)';
    ctx.beginPath(); ctx.arc(joy.x, joy.y, joy.R * 0.42, 0, TAU); ctx.fill();
  } else {
    const gx = 30 + SAFE.l + joy.R, gy = H - 30 - SAFE.b - joy.R;
    ctx.strokeStyle = 'rgba(201,169,90,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy, joy.R, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(230,220,190,0.12)'; ctx.beginPath(); ctx.arc(gx, gy, joy.R * 0.42, 0, TAU); ctx.fill();
  }
  for (const b of buttons) {
    if (b.visible && !b.visible()) continue;
    if (b.pill) {
      const w = b.r * 5.4, h = b.r * 1.3;
      ctx.fillStyle = b.down ? 'rgba(201,169,90,0.4)' : 'rgba(10,8,5,0.65)';
      ctx.strokeStyle = 'rgba(201,169,90,0.85)'; ctx.lineWidth = 1.5;
      roundRect(b.x - w / 2, b.y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe3c2'; ctx.textAlign = 'center'; ctx.font = `${Math.round(h * 0.38)}px Cinzel, Georgia, serif`;
      ctx.fillText(G.ctxAction.label, b.x, b.y + h * 0.13);
      continue;
    }
    let active = b.down;
    const dim = b.name === 'heal' && P.flasks <= 0;
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
    const a = Math.max(0, Math.min(fin, fout));
    const big = b.style === 'big';
    const cy = big ? H * 0.45 : b.style === 'zone' ? H * 0.2 : H * 0.3 + (b.style === 'small' ? 30 : 0);
    if (big) {
      const g = ctx.createLinearGradient(0, cy - 55, 0, cy + 45);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.7 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, cy - 55, W, 100);
    }
    let fs = Math.round(Math.min(W * 0.085, 64) * b.size);
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = big || b.style === 'zone' ? '0.14em' : '0.06em';
    ctx.font = `${big ? 700 : 400} ${fs}px Cinzel, Georgia, serif`;
    const tw = ctx.measureText(b.text).width;
    if (tw > W * 0.86) { fs = Math.floor(fs * (W * 0.86) / tw); ctx.font = `${big ? 700 : 400} ${fs}px Cinzel, Georgia, serif`; }
    const scale = 1 + (1 - fin) * 0.06 + b.t * 0.01;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(scale, scale);
    ctx.globalAlpha = a;
    if (b.style === 'zone') {
      const w2 = Math.min(W * 0.4, ctx.measureText(b.text).width * 0.8 + 60);
      const g = ctx.createLinearGradient(-w2, 0, w2, 0);
      g.addColorStop(0, 'rgba(201,169,90,0)'); g.addColorStop(0.5, 'rgba(201,169,90,0.8)'); g.addColorStop(1, 'rgba(201,169,90,0)');
      ctx.fillStyle = g; ctx.fillRect(-w2, fs * 0.7, w2 * 2, 1.2);
    }
    ctx.shadowColor = b.col; ctx.shadowBlur = big ? 24 : 10;
    ctx.fillStyle = b.col; ctx.fillText(b.text, 0, fs * 0.35);
    ctx.shadowBlur = 0;
    if (b.sub) { ctx.font = `${Math.round(Math.max(12, fs * 0.36))}px Cinzel, Georgia, serif`; ctx.fillStyle = '#d8ccae'; ctx.fillText(b.sub, 0, fs * 0.35 + Math.max(16, fs * 0.6)); }
    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.globalAlpha = 1;
}
