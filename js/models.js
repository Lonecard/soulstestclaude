'use strict';
/* Character & creature models: humanoids (with many helm/feature variants), riders, quadrupeds, giants,
   dragons, birds, serpents and a few unique beings. Everything is drawn in world space. */

// ---------------------------------------------------------------- colour helpers
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
  ctx.fillStyle = col.startsWith('#') && col.length === 7 ? ballGrad(x, y, Math.max(rx, ry), col) : col;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function drawShadow(x, y, r, a = 0.35) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.3, r * 1.2, r * 0.55, 0, 0, TAU); ctx.fill();
}
function glowAt(x, y, r, rgb, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
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
  ctx.strokeStyle = hiltCol; ctx.lineWidth = Math.max(2.5, w * 0.6); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - c * (kind === 'great' ? 14 : 8), y - s * (kind === 'great' ? 14 : 8)); ctx.lineTo(bx, by); ctx.stroke();
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
  } else if (head === 'trident') {
    for (const o of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(tx + px * o + c * 14, ty + py * o + s * 14); ctx.lineTo(tx + px * (o + 2), ty + py * (o + 2)); ctx.lineTo(tx + px * (o - 2), ty + py * (o - 2)); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx - px * 7, ty - py * 7); ctx.lineTo(tx + px * 7, ty + py * 7); ctx.stroke();
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
function drawWeaponType(type, x, y, ang, opt) {
  const ext = opt.ext || 0;
  let tip;
  switch (type) {
    case 'sword': tip = blade(x, y, ang, opt.len || 40, opt.w || 3.5, opt.col || '#9a958a', opt.edge || '#d0ccc0', opt.hilt || '#4a3a22', 'sword', ext); break;
    case 'katana': tip = blade(x, y, ang, opt.len || 50, opt.w || 3, opt.col || '#cfd4dc', opt.edge || '#fff', opt.hilt || '#3a2020', 'katana', ext); break;
    case 'great': tip = blade(x, y, ang, opt.len || 64, opt.w || 6, opt.col || '#a9aeb6', opt.edge || '#e8ebef', opt.hilt || '#3c3020', 'great', ext); break;
    case 'spear': tip = polearm(x, y, ang, opt.len || 70, opt.col || '#b8b4aa', '#eee', '#5a4428', 'spear', ext); break;
    case 'trident': tip = polearm(x, y, ang, opt.len || 90, opt.col || '#8a2a2a', opt.edge || '#ff5050', '#2a1010', 'trident', ext); break;
    case 'halberd': tip = polearm(x, y, ang, opt.len || 76, opt.col || '#8a8d94', opt.edge || '#d8dce2', '#3e3222', 'halberd', ext); break;
    case 'axe': tip = polearm(x, y, ang, opt.len || 80, opt.col || '#4a4a50', opt.edge || '#c9a24a', '#3a2a1c', 'axe', ext); break;
    case 'stick': case 'club': case 'staff': {
      const L = opt.len || 36, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
      ctx.strokeStyle = type === 'staff' ? '#3a3040' : '#4a3828'; ctx.lineWidth = type === 'club' ? 7 : 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      if (type === 'club') ball(tx, ty, 11, 10, '#5b4632');
      if (type === 'staff') { ctx.fillStyle = opt.col || '#9ac8ff'; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, TAU); ctx.fill(); glowAt(tx, ty, 14, '150,200,255', 0.5); }
      tip = { ex: tx, ey: ty }; break;
    }
    case 'cane': {
      const L = opt.len || 50, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 7, y - Math.sin(ang) * 7, 3, 0, TAU); ctx.fill();
      tip = { ex: tx, ey: ty }; break;
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
      tip = { ex: bx, ey: by }; break;
    }
    case 'hammer': case 'gsword': case 'cursed': {
      ctx.save();
      const holy = type !== 'cursed';
      ctx.shadowColor = holy ? '#ffd870' : '#ff2030'; ctx.shadowBlur = 14;
      if (type === 'gsword') tip = blade(x, y, ang, opt.len || 90, 7, 'rgba(255,224,140,0.85)', '#fff8d8', '#c9a24a', 'great', ext);
      else if (type === 'cursed') tip = blade(x, y, ang, opt.len || 96, 8, 'rgba(150,20,30,0.9)', '#ff6060', '#3a0a0a', 'great', ext);
      else {
        const L = opt.len || 70, tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
        ctx.strokeStyle = 'rgba(255,224,140,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,160,0.9)';
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang); ctx.fillRect(-10, -16, 20, 32); ctx.restore();
        tip = { ex: tx, ey: ty };
      }
      ctx.restore();
      break;
    }
    default: tip = { ex: x, ey: y };
  }
  if (opt.glow && tip) glowAt((x + tip.ex) / 2, (y + tip.ey) / 2, (opt.len || 50) * 0.6, hexToRgb(opt.glow), 0.25);
  return tip;
}
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
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
  ctx.restore();
  glowAt(x, y, s * 0.8, '255,240,190', k * 0.8);
}

// ---------------------------------------------------------------- humanoid
function drawCape(x, by, r, face, col, walk, long = 1) {
  const back = face + Math.PI, c = Math.cos(back), s = Math.sin(back);
  const px = -Math.sin(face), py = Math.cos(face);
  const L = r * 1.5 * long, sway = Math.sin(G.time * 3 + walk * 0.8) * r * 0.15;
  const sl = [x + px * r * 0.85, by + py * r * 0.55 - r * 0.25], sr = [x - px * r * 0.85, by - py * r * 0.55 - r * 0.25];
  const bl = [x + px * r * 0.95 + c * L + sway, by + py * r * 0.6 + s * L * 0.75 + r * 0.7];
  const br = [x - px * r * 0.95 + c * L - sway, by - py * r * 0.6 + s * L * 0.75 + r * 0.7];
  if (col.startsWith('#')) {
    const g = ctx.createLinearGradient(x, by - r, x + c * L, by + s * L + r);
    g.addColorStop(0, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.45));
    ctx.fillStyle = g;
  } else ctx.fillStyle = col;
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
function drawWings(x, by, r, face, col, flap, span = 2.6) {
  const back = face + Math.PI;
  const px = -Math.sin(face), py = Math.cos(face);
  for (const sd of [1, -1]) {
    const bx = x + Math.cos(back) * r * 0.5, byy = by + Math.sin(back) * r * 0.4 - r * 0.3;
    const tipx = bx + px * sd * r * span + Math.cos(back) * r * 0.8, tipy = byy + py * sd * r * span * 0.6 - r * (0.8 + flap * 0.6);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(bx, byy);
    ctx.quadraticCurveTo(bx + px * sd * r * span * 0.5, byy - r * (1.2 + flap), tipx, tipy);
    ctx.lineTo(bx + px * sd * r * span * 0.7 + Math.cos(back) * r, byy + py * sd * r * span * 0.4 + r * 0.3);
    ctx.lineTo(bx + px * sd * r * span * 0.4 + Math.cos(back) * r * 1.2, byy + r * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
}
function drawHead(hx, hy, hr, face, look, flash) {
  const helm = look.helm, c = Math.cos(face), s = Math.sin(face), px = -s, py = c;
  const f = flash ? '#ffffff' : null;
  const slit = (col = 'rgba(10,8,6,0.85)') => {
    ctx.strokeStyle = col; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(hx + c * hr * 0.75 + px * hr * 0.5, hy + s * hr * 0.55 + py * hr * 0.35); ctx.lineTo(hx + c * hr * 0.75 - px * hr * 0.5, hy + s * hr * 0.55 - py * hr * 0.35); ctx.stroke();
  };
  const eyes = (col, sz = 1.6) => {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(hx + c * hr * 0.6 + px * hr * 0.25, hy + s * hr * 0.4 + py * hr * 0.15, sz, 0, TAU);
    ctx.arc(hx + c * hr * 0.6 - px * hr * 0.25, hy + s * hr * 0.4 - py * hr * 0.15, sz, 0, TAU); ctx.fill();
  };
  const horns = (col, len = 1.6, w = 3) => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.6, hy - hr * 0.5); ctx.quadraticCurveTo(hx + px * sd * hr * len, hy - hr * 1.3, hx + px * sd * hr * (len - 0.4) - c * hr * 0.6, hy - hr * 2.0); ctx.stroke(); }
  };
  switch (helm) {
    case 'kettle':
      ctx.fillStyle = f || shade(look.armor, -0.15); ctx.beginPath(); ctx.ellipse(hx, hy + hr * 0.15, hr * 1.4, hr * 0.85, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ball(hx, hy - hr * 0.1, hr * 0.85, hr * 0.8, f || look.armor); break;
    case 'knight': case 'gideon':
      ball(hx, hy, hr, hr * 0.95, f || look.armor); slit();
      if (look.plume) {
        ctx.strokeStyle = look.plume; ctx.lineWidth = hr * 0.6; ctx.lineCap = 'round';
        const wv = Math.sin(G.time * 4) * hr * 0.2;
        ctx.beginPath(); ctx.moveTo(hx, hy - hr * 0.7); ctx.quadraticCurveTo(hx - c * hr * 0.8 + wv, hy - hr * 1.6, hx - c * hr * 1.8, hy - hr * 0.6 - s * hr); ctx.stroke();
      }
      if (helm === 'gideon') { ctx.fillStyle = '#c0b080'; ctx.beginPath(); ctx.arc(hx, hy - hr * 0.8, hr * 0.3, 0, TAU); ctx.fill(); }
      break;
    case 'crucible':
      ball(hx, hy, hr, hr * 0.95, f || '#8a6a3a'); slit(); horns('#b08a4a', 1.4, 3.5); break;
    case 'banished': case 'gargoyle':
      ball(hx, hy, hr * 0.95, hr * 1.1, f || look.armor);
      ctx.fillStyle = shade(look.armor, -0.3);
      ctx.beginPath(); ctx.moveTo(hx - px * 2, hy - hr * 1.4); ctx.lineTo(hx + px * 2, hy - hr * 1.4); ctx.lineTo(hx + px * 3, hy); ctx.lineTo(hx - px * 3, hy); ctx.fill();
      slit(); if (helm === 'gargoyle') horns('#5a5a50', 1.3, 3); break;
    case 'hood': case 'nox':
      ball(hx, hy, hr * 1.05, hr, f || shade(look.cape || look.armor || '#3a3226', -0.1));
      ctx.fillStyle = helm === 'nox' ? 'rgba(220,220,230,0.8)' : 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.45, hy + s * hr * 0.35, hr * 0.5, hr * 0.38, face, 0, TAU); ctx.fill(); break;
    case 'noble':
      ball(hx, hy, hr * 0.8, hr * 0.8, f || look.skin || '#a8987a');
      ctx.fillStyle = f || '#4a3a5a'; ctx.beginPath(); ctx.ellipse(hx - c * hr * 0.2, hy - hr * 0.35, hr * 1.35, hr * 0.7, 0, 0, TAU); ctx.fill();
      ball(hx - c * hr * 0.2, hy - hr * 0.7, hr * 0.7, hr * 0.55, f || '#5a4a6a'); break;
    case 'tarnished':
      ball(hx, hy, hr * 1.05, hr, f || '#2a2c32');
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.42, hy + s * hr * 0.32, hr * 0.55, hr * 0.42, face, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9a95a'; ctx.beginPath(); ctx.arc(hx + c * hr * 0.55, hy + s * hr * 0.4, hr * 0.14, 0, TAU); ctx.fill(); break;
    case 'margit': case 'omen':
      ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const sx = hx + px * i * hr * 0.25, sy = hy - hr * 0.3 + py * i * hr * 0.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - c * hr * 1.4 + Math.sin(G.time * 2 + i) * 2, sy + hr, sx - c * hr * 2.2, sy + hr * 2.4 - s * hr); ctx.stroke();
      }
      ball(hx, hy, hr, hr * 0.95, f || '#3a3430'); horns('#2a2420', 1.6, 3); eyes('#f0d060'); break;
    case 'crown':
      ball(hx, hy, hr, hr * 0.95, f || '#8a7450');
      ctx.fillStyle = '#d8b25a'; ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU, r1 = hr * 0.75, r2 = hr * 1.25;
        ctx.lineTo(hx + Math.cos(a) * r1, hy - hr * 0.3 + Math.sin(a) * r1 * 0.5);
        ctx.lineTo(hx + Math.cos(a + 0.22) * r2, hy - hr * 0.5 + Math.sin(a + 0.22) * r2 * 0.5 - hr * 0.3);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.55, hy + hr * 0.45 + s * hr * 0.3, hr * 0.45, hr * 0.55, face, 0, TAU); ctx.fill();
      eyes('#ffb040'); break;
    case 'lion': case 'beast': case 'maliketh': {
      const mane = look.mane || '#b07a3a';
      ctx.fillStyle = f || mane;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, rr = hr * (1.35 + (i % 2) * 0.35); ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.9); }
      ctx.closePath(); ctx.fill();
      ball(hx + c * hr * 0.2, hy + s * hr * 0.15, hr * 0.8, hr * 0.75, f || (helm === 'maliketh' ? '#2a2a2a' : shade(mane, -0.2)));
      ctx.fillStyle = f || (helm === 'maliketh' ? '#4a4040' : shade(mane, 0.2)); ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.75, hy + s * hr * 0.55, hr * 0.38, hr * 0.3, face, 0, TAU); ctx.fill();
      eyes(helm === 'maliketh' ? '#ff4050' : '#ffd060', 1.4); break;
    }
    case 'godskin':
      ball(hx, hy, hr * 1.05, hr, f || '#e0d8c8');
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(hx + c * hr * 0.5, hy + s * hr * 0.35, hr * 0.42, hr * 0.32, face, 0, TAU); ctx.fill();
      eyes('#ffffff', 1.2); break;
    case 'queen': {
      ball(hx, hy, hr * 0.85, hr * 0.85, f || '#d8d0e0');
      ctx.fillStyle = f || '#2a3a7a';
      ctx.beginPath(); ctx.moveTo(hx - hr * 1.1, hy - hr * 0.2); ctx.lineTo(hx + hr * 1.1, hy - hr * 0.2); ctx.lineTo(hx + hr * 0.2, hy - hr * 3.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c0d0ff'; ctx.lineWidth = 1.2; ctx.stroke();
      glowAt(hx + hr * 0.2, hy - hr * 3.2, 10, '170,200,255', 0.6); break;
    }
    case 'malenia': {
      ball(hx, hy, hr, hr * 0.95, f || '#c8a050'); slit('rgba(30,20,10,0.8)');
      ctx.fillStyle = f || '#e0c070';
      for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.6, hy - hr * 0.4); ctx.quadraticCurveTo(hx + px * sd * hr * 2, hy - hr * 1.6, hx + px * sd * hr * 1.4 - c * hr, hy - hr * 2.1); ctx.lineTo(hx + px * sd * hr * 0.4, hy - hr * 0.8); ctx.fill(); }
      break;
    }
    case 'redhair':
      ball(hx, hy, hr, hr * 0.95, f || '#c8a050'); eyes('#ffe0a0'); break;
    case 'skull':
      ball(hx, hy, hr * 0.9, hr * 0.9, f || '#d8d0b8');
      ctx.fillStyle = '#1a1814'; ctx.beginPath();
      ctx.arc(hx + c * hr * 0.45 + px * hr * 0.3, hy + s * hr * 0.3 + py * hr * 0.2, hr * 0.22, 0, TAU);
      ctx.arc(hx + c * hr * 0.45 - px * hr * 0.3, hy + s * hr * 0.3 - py * hr * 0.2, hr * 0.22, 0, TAU); ctx.fill(); break;
    case 'mohg':
      ball(hx, hy, hr, hr * 0.95, f || '#5a2a28'); horns('#2a1414', 1.5, 4); eyes('#ff3040', 1.8); break;
    case 'zamor':
      ball(hx, hy, hr, hr, f || '#b8d0e0');
      ctx.fillStyle = f || '#d8e8f0'; ctx.beginPath(); ctx.moveTo(hx - hr * 0.6, hy - hr * 0.5); ctx.lineTo(hx, hy - hr * 2.2); ctx.lineTo(hx + hr * 0.6, hy - hr * 0.5); ctx.fill();
      slit('rgba(20,30,40,0.8)'); break;
    case 'pumpkin':
      ball(hx, hy, hr * 1.4, hr * 1.3, f || '#6a5a3a');
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
      for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(hx + o * hr, hy, hr * 0.5, hr * 1.25, 0, 0, TAU); ctx.stroke(); }
      break;
    case 'cat':
      ball(hx, hy, hr, hr * 0.9, f || '#8a8070');
      ctx.fillStyle = f || '#7a7060';
      for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.3, hy - hr * 0.7); ctx.lineTo(hx + px * sd * hr * 0.9, hy - hr * 1.6); ctx.lineTo(hx + px * sd * hr * 0.9, hy - hr * 0.5); ctx.fill(); }
      eyes('#ffb040'); break;
    case 'demi': case 'imp':
      ball(hx, hy, hr * 0.95, hr * 0.85, f || (helm === 'imp' ? '#6a4a4a' : '#8a8070'));
      if (helm === 'imp') horns('#3a2a2a', 1.2, 2.5);
      eyes(helm === 'imp' ? '#ff6040' : '#e8d070', 1.3); break;
    case 'crystal':
      ctx.fillStyle = f || 'rgba(170,210,255,0.9)';
      ctx.beginPath(); ctx.moveTo(hx, hy - hr * 1.3); ctx.lineTo(hx + hr * 0.9, hy); ctx.lineTo(hx, hy + hr * 0.8); ctx.lineTo(hx - hr * 0.9, hy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e0f0ff'; ctx.lineWidth = 1; ctx.stroke(); break;
    case 'glint':
      ball(hx, hy, hr, hr, f || '#2a3a6a');
      glowAt(hx + c * hr * 0.4, hy + s * hr * 0.3, hr * 1.2, '120,180,255', 0.7);
      ctx.fillStyle = '#c0e0ff'; ctx.beginPath(); ctx.arc(hx + c * hr * 0.4, hy + s * hr * 0.3, hr * 0.45, 0, TAU); ctx.fill(); break;
    case 'bug':
      ball(hx, hy, hr * 1.1, hr * 0.9, f || '#8a7a3a');
      ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1.5;
      for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.3, hy - hr * 0.5); ctx.quadraticCurveTo(hx + px * sd * hr + c * hr, hy - hr * 1.5, hx + px * sd * hr * 1.4 + c * hr * 1.4, hy - hr * 1.2); ctx.stroke(); }
      eyes('#e0ff80', 2); break;
    case 'serpent':
      ball(hx + c * hr * 0.3, hy + s * hr * 0.2, hr * 1.1, hr * 0.8, f || '#5a4a40', face); eyes('#ffcc30'); break;
    case 'antler':
      ball(hx, hy, hr, hr, f || '#5a5a48');
      ctx.strokeStyle = '#c8c0a8'; ctx.lineWidth = 2;
      for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * hr * 0.5, hy - hr * 0.6); ctx.lineTo(hx + px * sd * hr * 1.5, hy - hr * 1.8); ctx.moveTo(hx + px * sd * hr, hy - hr * 1.2); ctx.lineTo(hx + px * sd * hr * 0.6, hy - hr * 2); ctx.stroke(); }
      break;
    default:
      ball(hx, hy, hr, hr, f || look.armor || '#777');
  }
}

// o: {x,y,r,face,look,walk,moving,flash,lift,tel,weapon,pose,guard,phase2}
function drawHumanoid(o) {
  const { x, y, r, face, look } = o;
  const flash = o.flash > 0;
  const feats = look.features || [];
  const float = feats.includes('float');
  const lift = (o.lift || 0) + (float ? 8 + Math.sin(G.time * 2) * 3 : 0);
  const by = y - r * 0.75 - lift;
  const c = Math.cos(face), s = Math.sin(face), px = -s, py = c;
  const behind = s < -0.2;
  const step = Math.sin(o.walk) * r * 0.35 * Math.min(1, o.moving / 60);
  const ghost = look.ghost;
  if (ghost) ctx.globalAlpha *= 0.72;
  if (look.aura) glowAt(x, by, r * 2.6, look.aura, 0.22 + 0.06 * Math.sin(G.time * 3));

  if (!float) {
    ctx.fillStyle = shade(look.body || '#333333', -0.4);
    for (const sd of [1, -1]) {
      const st = step * sd;
      ctx.beginPath(); ctx.ellipse(x + px * r * 0.42 * sd + c * st, y - 3 - (o.lift || 0) + s * st * 0.6, r * 0.3, r * 0.22, face, 0, TAU); ctx.fill();
    }
  }
  const wingsOn = feats.includes('wings') || (feats.includes('rotwings_p2') && o.phase2);
  if (wingsOn) drawWings(x, by, r, face, feats.includes('rotwings_p2') ? 'rgba(200,60,40,0.75)' : (look.wing || '#3a3a3a'), Math.sin(G.time * (o.air ? 12 : 3)), feats.includes('rotwings_p2') ? 3.2 : 2.4);
  if (feats.includes('hair') && !behind) {
    ctx.strokeStyle = look.hair || '#c03020'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      const sx = x + px * i * r * 0.12, sy = by - r * 0.9;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - c * r * 0.9 + Math.sin(G.time * 2 + i) * 2, sy + r * 0.6, sx - c * r * 1.5, sy + r * 1.6); ctx.stroke();
    }
  }
  if (look.cape && !behind) drawCape(x, by, r, face, flash ? '#ffffff' : look.cape, o.walk, look.capeLong || 1);
  if (feats.includes('grafted')) {
    const back = face + Math.PI;
    ctx.strokeStyle = flash ? '#fff' : '#9a8270'; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = back + (i - 2.5) * 0.42 + Math.sin(G.time * 2 + i) * 0.12;
      const L = r * (1.1 + (i % 2) * 0.35);
      const ex = x + Math.cos(a) * L, ey = by + Math.sin(a) * L * 0.75 - r * 0.3;
      ctx.lineWidth = Math.max(2.5, r * 0.15);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.4, by + Math.sin(a) * r * 0.3 - r * 0.3);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * L * 0.7, by + Math.sin(a + 0.4) * L * 0.5 - r * 0.6, ex, ey); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#b09a86'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.1, 0, TAU); ctx.fill();
    }
  }
  if (feats.includes('halo')) glowAt(x, by - r * 1.6, r * 1.4, '255,220,130', 0.35);

  const weaponFn = () => {
    if (!o.weapon) return;
    const handA = face + 0.95;
    const hx = x + Math.cos(handA) * r * 0.85, hy = by + Math.sin(handA) * r * 0.62;
    const sx = o.pose.phase ? x : hx, sy = o.pose.phase ? by : hy;
    if (o.pose.phase === 'active' && o.pose.trail) drawTrail(x, by, o.pose.trail.a0, o.pose.ang, o.pose.trail.len * 0.25, o.pose.trail.len * 0.95, o.pose.trail.col, 1);
    else if (o.pose.phase === 'rec' && o.pose.trail && o.pose.recT < 0.12) drawTrail(x, by, o.pose.trail.a0, o.pose.ang, o.pose.trail.len * 0.25, o.pose.trail.len * 0.95, o.pose.trail.col, 1 - o.pose.recT / 0.12);
    const tip = drawWeaponType(o.weapon.type, sx, sy, o.pose.ang, { ...o.weapon, ext: o.pose.ext, pull: o.pose.pull });
    if (o.pose.glintK > 0) drawGlint(tip.ex, tip.ey, o.pose.glintK);
    if (o.dual) drawWeaponType(o.weapon.type, x - Math.cos(handA) * r * 0.85, by - Math.sin(handA) * r * 0.62, o.pose.ang + 0.6, { ...o.weapon, ext: o.pose.ext });
  };
  const shieldFn = () => {
    if (!look.shield) return;
    const up = o.guard ? 0.45 : 1.0;
    const sa = face - up;
    const sx = x + Math.cos(sa) * r * 0.95, sy = by + Math.sin(sa) * r * 0.72;
    const col = flash ? '#ffffff' : look.shieldCol || '#5a4630';
    if (look.shield === 'tower') ball(sx, sy, r * 0.45, r * 0.85, col, sa);
    else if (look.shield === 'kite') ball(sx, sy, r * 0.45, r * 0.65, col, sa);
    else ball(sx, sy, r * 0.55, r * 0.55, col);
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(sx, sy, r * 0.22, 0, TAU); ctx.stroke();
  };

  if (behind) { weaponFn(); shieldFn(); }
  const body = flash ? '#ffffff' : look.armor;
  if (look.robe) ball(x, by + r * 0.25, r * 1.05, r * 0.9, flash ? '#ffffff' : look.body);
  ball(x, by, r * (look.fat ? 1.35 : 1), r * 1.05, body);
  if (look.trim) { ctx.strokeStyle = look.trim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, by, r * 0.98, r * 1.03, 0, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, by + r * 0.35, r * 0.85, r * 0.3, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  for (const sd of [1, -1]) ball(x + px * r * 0.78 * sd, by + py * r * 0.5 * sd - r * 0.25, r * 0.42, r * 0.36, flash ? '#ffffff' : shade(look.armor, 0.08));
  if (feats.includes('furcollar')) { ctx.fillStyle = flash ? '#fff' : '#5a5048'; ctx.beginPath(); ctx.ellipse(x, by - r * 0.45, r * 0.95, r * 0.45, 0, 0, TAU); ctx.fill(); }
  if (feats.includes('briar')) { ctx.strokeStyle = '#4a2a1a'; ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.4, by + Math.sin(a) * r * 0.4, r * 0.3, 0, 4); ctx.stroke(); } }
  if (feats.includes('dragonhead_p2') && o.phase2) {
    const a = face - 1.15;
    const sx = x + Math.cos(a) * r * 0.95, sy = by + Math.sin(a) * r * 0.7;
    const hx = sx + Math.cos(face) * r * 0.9, hy = sy + Math.sin(face) * r * 0.7;
    ctx.strokeStyle = '#4a2a22'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(face);
    ball(4, 0, r * 0.5, r * 0.3, flash ? '#ffffff' : '#5a2a20', 0);
    ctx.fillStyle = '#3a1a14'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-16, -14); ctx.lineTo(-3, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-16, 14); ctx.lineTo(-3, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,80,0.9)'; ctx.beginPath(); ctx.ellipse(r * 0.6, 0, 5, 3.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const hr = r * (o.headScale || look.headScale || 0.5);
  drawHead(x + c * r * 0.18, by - r * 0.82 + s * r * 0.12, hr, face, look, flash);
  if (feats.includes('hair') && behind) {
    ctx.strokeStyle = look.hair || '#c03020'; ctx.lineWidth = 2.2;
    for (let i = -3; i <= 3; i++) { const sx = x + px * i * r * 0.12, sy = by - r * 0.9; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - c * r * 0.9, sy + r * 0.6, sx - c * r * 1.5, sy + r * 1.6); ctx.stroke(); }
  }
  if (look.cape && behind) drawCape(x, by, r, face, flash ? '#ffffff' : look.cape, o.walk, look.capeLong || 1);
  if (!behind) { shieldFn(); weaponFn(); }
  if (o.tel > 0) {
    ctx.strokeStyle = `rgba(255,60,40,${o.tel * 0.85})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, by, r + 3, r * 1.05 + 3, 0, 0, TAU); ctx.stroke();
  }
}
function attackPose(face, atk, state, t, wm) {
  if (!atk) return { ang: face + 1.0, ext: 0, phase: null };
  const phase = state === 'windup' ? 'windup' : state === 'active' ? 'active' : state === 'recover' || state === 'rec' ? 'rec' : null;
  if (!phase) return { ang: face + 1.0, ext: 0, phase: null };
  const k = phase === 'windup' ? clamp(t / (atk.wind * wm), 0, 1) : phase === 'active' ? clamp(t / atk.act, 0, 1) : 1;
  const ang = swingAngle(face, atk, phase, k);
  let ext = 0;
  if (atk.thrust) ext = phase === 'windup' ? -14 * k : phase === 'active' ? 18 * k : 10;
  return { ang, ext, phase, k, recT: phase === 'rec' ? t : 0 };
}

// ---------------------------------------------------------------- horse (Torrent / mounts)
function drawHorse(x, y, face, walk, col, mane, opt = {}) {
  const sc = opt.small ? 0.7 : 1;
  const flash = opt.flash;
  ctx.save(); ctx.translate(x, y - 16 * sc); ctx.rotate(face); ctx.scale(sc, sc);
  ctx.strokeStyle = shade(col, -0.3); ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [lx, ly, ph] of [[22, 10, 0], [22, -10, Math.PI], [-20, 10, Math.PI], [-20, -10, 0]]) {
    const sw = Math.sin(walk * 1.2 + ph) * 8;
    ctx.beginPath(); ctx.moveTo(lx, ly * 0.6); ctx.lineTo(lx + sw, ly * 1.5); ctx.stroke();
  }
  ctx.strokeStyle = mane; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-46, Math.sin(G.time * 5) * 6, -54, Math.sin(G.time * 5 + 1) * 9); ctx.stroke();
  ball(0, 0, 36, 15, flash ? '#ffffff' : col, 0);
  if (opt.barding) { ctx.fillStyle = flash ? '#fff' : opt.barding; ctx.beginPath(); ctx.ellipse(-4, 0, 26, 13, 0, 0, TAU); ctx.fill(); if (opt.trim) { ctx.strokeStyle = opt.trim; ctx.lineWidth = 1.5; ctx.stroke(); } }
  ctx.strokeStyle = flash ? '#fff' : col; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(42, 0); ctx.stroke();
  ball(48, 0, 12, 7, flash ? '#ffffff' : col, 0);
  if (opt.horns) { ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(46, -4); ctx.lineTo(38, -14); ctx.moveTo(46, 4); ctx.lineTo(38, 14); ctx.stroke(); }
  ctx.strokeStyle = mane; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(28 + i * 4, -3); ctx.lineTo(26 + i * 4 + Math.sin(G.time * 6 + i) * 2, -10); ctx.stroke(); }
  if (opt.eye) { ctx.fillStyle = opt.eye; ctx.beginPath(); ctx.arc(52, -3, 1.6, 0, TAU); ctx.arc(52, 3, 1.6, 0, TAU); ctx.fill(); }
  if (opt.tel) { ctx.strokeStyle = `rgba(255,60,40,${opt.tel * 0.8})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 40, 18, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------- creatures
function drawQuad(e, tel) {
  const L = e.def.look, sc = L.scale || 1, flash = e.flash > 0;
  drawShadow(e.x, e.y, e.r * (1 - e.air * 0.4));
  const lift = e.air * 70;
  const by = e.y - 8 * sc - lift, t = e.walk * 1.3;
  if (L.ghost) ctx.globalAlpha *= 0.8;
  if (L.glow) glowAt(e.x, by, e.r * 2.4, L.glow, 0.25);
  ctx.save(); ctx.translate(e.x, by); ctx.rotate(e.face); ctx.scale(sc, sc);
  const bodyCol = flash ? '#ffffff' : L.body, furCol = flash ? '#ffffff' : L.fur;
  ctx.strokeStyle = shade(L.body, -0.3); ctx.lineWidth = L.bear ? 5 : 3; ctx.lineCap = 'round';
  for (const [lx, ly, ph] of [[9, 6, 0], [9, -6, Math.PI], [-9, 6, Math.PI], [-9, -6, 0]]) {
    const sw = Math.sin(t + ph) * 4;
    ctx.beginPath(); ctx.moveTo(lx, ly * 0.6); ctx.lineTo(lx + sw, ly * 1.35); ctx.stroke();
  }
  if (!L.bear) {
    ctx.strokeStyle = L.tailGlow ? `rgba(${L.glow},0.9)` : bodyCol; ctx.lineWidth = L.tailGlow ? 3 : 4;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-24, Math.sin(G.time * 8) * 4, -29 - (L.tailGlow ? 10 : 0), Math.sin(G.time * 8 + 1) * 6); ctx.stroke();
  }
  ball(-2, 0, L.bear ? 18 : 17, L.bear ? 12 : 9, bodyCol, 0);
  ball(13, 0, L.bear ? 10 : 8.5, L.bear ? 9 : 7, furCol, 0);
  ctx.fillStyle = flash ? '#ffffff' : shade(L.fur, -0.2);
  ctx.beginPath(); ctx.ellipse(L.bear ? 20 : 21, 0, 5, 3.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = bodyCol;
  if (!L.antlers && !L.horns) {
    ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(7, -12); ctx.lineTo(14, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(7, 12); ctx.lineTo(14, 6); ctx.fill();
  }
  if (L.antlers) {
    ctx.strokeStyle = flash ? '#fff' : '#e8f4ff'; ctx.lineWidth = 1.6;
    for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(12, sd * 4); ctx.lineTo(4, sd * 16); ctx.lineTo(-6, sd * 22); ctx.moveTo(6, sd * 13); ctx.lineTo(10, sd * 22); ctx.moveTo(0, sd * 18); ctx.lineTo(-2, sd * 27); ctx.stroke(); }
  }
  if (L.horns) {
    ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 3;
    for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(14, sd * 4); ctx.quadraticCurveTo(10, sd * 18, 22, sd * 20); ctx.stroke(); }
  }
  ctx.fillStyle = e.state === 'windup' ? '#ff4a3a' : L.glow ? `rgb(${L.glow})` : '#d8a040';
  ctx.beginPath(); ctx.arc(17, -3, 1.5, 0, TAU); ctx.arc(17, 3, 1.5, 0, TAU); ctx.fill();
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.8})`; ctx.lineWidth = 2 / sc; ctx.beginPath(); ctx.ellipse(0, 0, 21, 13, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawTroll(e, tel, pose) {
  const L = e.def.look, r = e.r, flash = e.flash > 0, v = L.variant;
  drawShadow(e.x, e.y, r, 0.4);
  if (L.ghost) { ctx.globalAlpha *= 0.75; glowAt(e.x, e.y - r, r * 2.2, '255,80,50', 0.25); }
  const lift = e.air * 80;
  const by = e.y - r * (L.crawl ? 0.5 : 0.9) - lift, c = Math.cos(e.face), s = Math.sin(e.face), px = -s, py = c;
  const step = Math.sin(e.walk * 0.7) * r * 0.25;
  const skin = L.skin;
  ctx.fillStyle = shade(skin, -0.35);
  if (L.crawl) glowAt(e.x - px * r * 0.45, e.y - 6, r * 0.7, '255,120,40', 0.6); // the severed leg still burns
  for (const sd of L.crawl ? [1] : [1, -1]) { ctx.beginPath(); ctx.ellipse(e.x + px * r * 0.45 * sd + c * step * sd, e.y - 4 + s * step * sd * 0.5 - lift, r * 0.32, r * 0.24, e.face, 0, TAU); ctx.fill(); }
  const behind = s < -0.2;
  const weapon = () => {
    const hx = e.x + Math.cos(e.face + 1.1) * r * 0.95, hy = by + Math.sin(e.face + 1.1) * r * 0.7;
    if (pose.phase === 'active' && pose.trail) drawTrail(e.x, by, pose.trail.a0, pose.ang, r * 0.8, r * 3.4, '230,210,170', 1);
    const Lw = r * 3, tx = e.x + Math.cos(pose.ang) * Lw, ty = by + Math.sin(pose.ang) * Lw;
    const sx = pose.phase ? e.x : hx, sy = pose.phase ? by : hy;
    if (v === 'golem' || v === 'dragonkin') { polearm(sx, sy, pose.ang, Lw, '#6a6a6a', '#c0c0c0', '#3a3a3a', 'halberd'); return; }
    if (v === 'giant') { ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.fill(); return; }
    if (v === 'avatar') { ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ball(tx, ty, 18, 14, '#5a4428'); return; }
    if (v === 'omen') { blade(sx, sy, pose.ang, Lw, 10, '#c03020', '#ff8060', '#3a1010', 'great'); return; }
    ctx.strokeStyle = '#4a3624'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#5c4630'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(lerp(e.x, tx, 0.7), lerp(by, ty, 0.7)); ctx.lineTo(tx, ty); ctx.stroke();
  };
  if (e.atk && e.atk.range && pose.phase && !pose.trail) pose.trail = { a0: swingAngle(e.face, e.atk, 'active', 0) };
  if (behind) weapon();
  ball(e.x, by + r * 0.3, r * 0.9, r * 0.6, flash ? '#ffffff' : L.cloth);
  ball(e.x, by, r, r * 0.95, flash ? '#ffffff' : skin);
  if (v === 'stone' || v === 'golem') { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(e.x - r * 0.6 + i * r * 0.3, by - r * 0.6); ctx.lineTo(e.x - r * 0.4 + i * r * 0.25, by + r * 0.5); ctx.stroke(); } }
  if (v === 'avatar') { ctx.strokeStyle = shade(skin, -0.3); ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(e.x - r * 0.7 + i * r * 0.28, by - r * 0.8); ctx.quadraticCurveTo(e.x - r * 0.6 + i * r * 0.3, by, e.x - r * 0.75 + i * r * 0.3, by + r * 0.8); ctx.stroke(); } }
  for (const sd of [1, -1]) ball(e.x + px * r * 0.85 * sd, by + py * r * 0.5 * sd - r * 0.2, r * 0.45, r * 0.4, flash ? '#ffffff' : shade(skin, 0.05));
  const hx = e.x + c * r * 0.35, hy = by - r * 0.55 + s * r * 0.2;
  if (v === 'avatar') {
    const lc = L.leaves || '#e8c050';
    glowAt(hx, hy - r * 0.6, r * 1.6, hexToRgb(lc), 0.35);
    ctx.fillStyle = lc; for (let i = 0; i < 7; i++) { const a = i * 0.9 + G.time * 0.2; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * r * 0.6, hy - r * 0.7 + Math.sin(a) * r * 0.3, r * 0.35, 0, TAU); ctx.fill(); }
  }
  ball(hx, hy, r * 0.36, r * 0.32, flash ? '#ffffff' : shade(skin, -0.1));
  if (v === 'giant') {
    ctx.fillStyle = L.beard || '#c08040'; ctx.beginPath(); ctx.ellipse(hx + c * r * 0.2, hy + r * 0.25, r * 0.35, r * 0.4, 0, 0, TAU); ctx.fill();
    glowAt(hx + c * r * 0.25, hy - r * 0.05, r * 0.5, '255,140,40', 0.7);
    ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.arc(hx + c * r * 0.25, hy - r * 0.05, r * 0.1, 0, TAU); ctx.fill();
  } else if (v === 'dragonkin') {
    ctx.fillStyle = '#8aa0b0'; ctx.beginPath(); ctx.ellipse(hx + c * r * 0.3, hy + s * r * 0.2, r * 0.3, r * 0.18, e.face, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#e8dfc8';
    ctx.beginPath(); ctx.arc(hx + c * r * 0.3 + px * 4, hy + s * r * 0.2 + py * 3, 2.2, 0, TAU); ctx.arc(hx + c * r * 0.3 - px * 4, hy + s * r * 0.2 - py * 3, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = v === 'omen' ? '#ffd040' : '#ffb040'; ctx.beginPath(); ctx.arc(hx + c * r * 0.25 + px * 3, hy + s * r * 0.15 + py * 2 - 3, 1.6, 0, TAU); ctx.arc(hx + c * r * 0.25 - px * 3, hy + s * r * 0.15 - py * 2 - 3, 1.6, 0, TAU); ctx.fill();
  }
  if (!behind) weapon();
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, by, r + 4, r * 0.95 + 4, 0, 0, TAU); ctx.stroke(); }
}
function drawMounted(e, tel, pose) {
  const L = e.def.look, flash = e.flash > 0;
  drawShadow(e.x, e.y, e.r * 1.3, 0.4);
  if (L.ghost) { ctx.globalAlpha *= 0.75; glowAt(e.x, e.y - 20, e.r * 2.4, '160,200,255', 0.3); }
  if (L.aura) glowAt(e.x, e.y - 30, e.r * 2.8, L.aura, 0.25);
  const lift = e.air * 70;
  drawHorse(e.x, e.y - lift, e.face, e.walk, L.horse, L.mane, { small: L.small, flash, barding: L.small ? null : L.armor, trim: L.trim, eye: L.eyeGlow, tel, horns: L.small });
  const pr = { ...pose };
  if (e.atk && e.atk.range && !e.atk.thrust && pr.phase) pr.trail = { a0: swingAngle(e.face, e.atk, 'active', 0), len: (L.weapon && L.weapon.len) || 90, col: L.ghost ? '180,210,255' : '255,225,150' };
  const rr = L.rider || 15;
  drawHumanoid({
    x: e.x - Math.cos(e.face) * 4, y: e.y - 8 - lift, r: rr, face: e.face, walk: 0, moving: 0, flash: e.flash, tel: 0, pose: pr, phase2: e.phase2, dual: L.dual,
    look: { body: '#3a3020', armor: L.armor, cape: L.small ? '#6a2a1a' : shade(L.armor, -0.3), helm: L.small ? 'lion' : 'knight', mane: L.mane2 || L.mane, features: L.small ? ['mane'] : [], plume: L.plume, trim: L.trim, shield: L.dual ? null : 'round', shieldCol: L.shieldCol, ghost: false },
    weapon: L.weapon, lift: (L.small ? 6 : 14),
  });
}
function drawDragon(e, tel, pose) {
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  const lift = e.air * 120;
  drawShadow(e.x, e.y, r * (1.3 - e.air * 0.4), 0.4 * (1 - e.air * 0.5));
  const by = e.y - r * 0.5 - lift;
  const flap = e.air > 0.05 ? Math.sin(G.time * 10) : Math.sin(G.time * 1.5) * 0.3;
  const c = Math.cos(e.face), s = Math.sin(e.face), px = -s, py = c;
  if (L.wings !== false) {
    for (const sd of [1, -1]) {
      const bx = e.x - c * r * 0.2, byy = by - r * 0.2;
      const span = r * (2.6 + flap * 0.4);
      const tx = bx + px * sd * span - c * r * 0.6, ty = byy + py * sd * span * 0.6 - r * (0.6 + flap * 0.8);
      ctx.fillStyle = flash ? '#ffffff' : L.wing;
      ctx.beginPath(); ctx.moveTo(bx + c * r * 0.4, byy);
      ctx.quadraticCurveTo(bx + px * sd * span * 0.5 + c * r * 0.3, byy - r * (1 + flap), tx, ty);
      for (let k = 1; k <= 3; k++) ctx.lineTo(bx + px * sd * span * (1 - k * 0.25) - c * r * (0.6 + k * 0.25), byy + py * sd * span * 0.5 * (1 - k * 0.25) + r * 0.3 * k);
      ctx.lineTo(bx - c * r * 0.8, byy + r * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(L.wing, -0.4); ctx.lineWidth = 2; ctx.stroke();
    }
  }
  // tail
  ctx.strokeStyle = flash ? '#ffffff' : L.body; ctx.lineCap = 'round';
  let tx = e.x - c * r * 0.9, ty = by - s * r * 0.6;
  for (let i = 0; i < 6; i++) {
    const w = r * (0.45 - i * 0.06), a = e.face + Math.PI + Math.sin(G.time * 2 + i * 0.6) * 0.25;
    const nx = tx + Math.cos(a) * r * 0.45, ny = ty + Math.sin(a) * r * 0.35;
    ctx.lineWidth = Math.max(2, w); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(nx, ny); ctx.stroke();
    tx = nx; ty = ny;
  }
  ctx.strokeStyle = shade(L.body, -0.35); ctx.lineWidth = r * 0.22;
  for (const [fx, sd] of [[0.5, 1], [0.5, -1], [-0.5, 1], [-0.5, -1]]) {
    const lx = e.x + c * r * fx + px * sd * r * 0.55, ly = e.y + s * r * fx * 0.6 + py * sd * r * 0.4 - lift;
    ctx.beginPath(); ctx.moveTo(e.x + c * r * fx * 0.8, by + s * r * fx * 0.5); ctx.lineTo(lx, ly); ctx.stroke();
  }
  ball(e.x, by, r * 1.1, r * 0.75, flash ? '#ffffff' : L.body, e.face);
  ctx.fillStyle = flash ? '#fff' : L.belly; ctx.globalAlpha *= 0.6;
  ctx.beginPath(); ctx.ellipse(e.x + c * r * 0.1, by + r * 0.15, r * 0.7, r * 0.4, e.face, 0, TAU); ctx.fill();
  ctx.globalAlpha /= 0.6;
  if (L.crystals) { ctx.fillStyle = 'rgba(160,210,255,0.85)'; for (let i = 0; i < 5; i++) { const a = e.face + Math.PI + (i - 2) * 0.4; const cx = e.x + Math.cos(a) * r * 0.5, cy = by + Math.sin(a) * r * 0.35 - r * 0.2; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 3, cy); ctx.fill(); } }
  const heads = L.heads || 1;
  for (let h = 0; h < heads; h++) {
    const off = heads > 1 ? (h === 0 ? -0.35 : 0.35) : 0;
    const neckA = e.face + off + Math.sin(G.time * 1.3 + h) * 0.1;
    const reach = e.atk && e.state === 'active' && e.atk.range ? 1.5 : 1.15;
    const nx = e.x + Math.cos(neckA) * r * reach, ny = by + Math.sin(neckA) * r * reach * 0.75 - r * 0.25;
    ctx.strokeStyle = flash ? '#ffffff' : L.body; ctx.lineWidth = r * 0.38;
    ctx.beginPath(); ctx.moveTo(e.x + c * r * 0.6, by - r * 0.1); ctx.quadraticCurveTo(e.x + Math.cos(neckA) * r * 0.9, by - r * 0.6, nx, ny); ctx.stroke();
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(neckA);
    ball(r * 0.15, 0, r * 0.42, r * 0.26, flash ? '#ffffff' : L.body, 0);
    ctx.fillStyle = shade(L.body, -0.4);
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.18); ctx.lineTo(-r * 0.45, -r * 0.4); ctx.lineTo(-r * 0.05, -r * 0.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.18); ctx.lineTo(-r * 0.45, r * 0.4); ctx.lineTo(-r * 0.05, r * 0.1); ctx.fill();
    ctx.fillStyle = L.eye; ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.1, 2.2, 0, TAU); ctx.arc(r * 0.25, r * 0.1, 2.2, 0, TAU); ctx.fill();
    const breathing = e.atk && (e.atk.kind === 'breath' || e.atk.kind === 'beam') && (e.state === 'windup' || e.state === 'active');
    if (breathing) glowAt(r * 0.55, 0, r * 0.5, elc(e.atk.el), 0.7);
    ctx.restore();
  }
  if (L.sword) {
    const hx = e.x + Math.cos(e.face + 1.1) * r * 0.9, hy = by + Math.sin(e.face + 1.1) * r * 0.6;
    if (pose.phase === 'active' && pose.trail) drawTrail(e.x, by, pose.trail.a0, pose.ang, r * 0.6, r * 2.2, '255,170,90', 1);
    blade(pose.phase ? e.x : hx, pose.phase ? by : hy, pose.ang, r * 2, 6, '#6a5a50', '#c0a080', '#2a1a10', 'great');
  }
  if (L.rot) for (let i = 0; i < 2; i++) if (Math.random() < 0.4) G.particles.push({ x: e.x + rand(-r, r), y: by + rand(-r, r) * 0.5, vx: 0, vy: -20, life: 0.8, max: 0.8, size: 3, col: '#e05a2a', grav: 0 });
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, by, r * 1.2, r * 0.85, e.face, 0, TAU); ctx.stroke(); }
}
function drawBird(e, tel, pose) {
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  const lift = e.air * 90 + (L.small ? 0 : 6);
  drawShadow(e.x, e.y, r * (1 - e.air * 0.3), 0.35);
  if (L.glow) glowAt(e.x, e.y - r - lift, r * 2.2, L.glow, 0.22);
  const by = e.y - r * 0.8 - lift;
  const flap = Math.sin(G.time * (e.air > 0.05 ? 12 : 2.5)) * (e.air > 0.05 ? 1 : 0.4);
  drawWings(e.x, by + r * 0.3, r * 0.9, e.face, flash ? '#ffffff' : L.wing, flap, 2.6);
  ball(e.x, by, r * 0.75, r * 0.9, flash ? '#ffffff' : L.body);
  ctx.strokeStyle = L.bone; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(e.x, by + r * 0.1, r * (0.3 + i * 0.1), 0.3, Math.PI - 0.3); ctx.stroke(); }
  const c = Math.cos(e.face), s = Math.sin(e.face);
  const hx = e.x + c * r * 0.5, hy = by - r * 1.0 + s * r * 0.3;
  ctx.strokeStyle = flash ? '#fff' : L.body; ctx.lineWidth = r * 0.25;
  ctx.beginPath(); ctx.moveTo(e.x, by - r * 0.5); ctx.lineTo(hx, hy); ctx.stroke();
  ball(hx, hy, r * 0.32, r * 0.3, flash ? '#ffffff' : L.bone);
  ctx.fillStyle = shade(L.bone, -0.3);
  ctx.beginPath(); ctx.moveTo(hx + c * r * 0.2, hy + s * r * 0.15); ctx.lineTo(hx + c * r * 0.75, hy + s * r * 0.45 + r * 0.1); ctx.lineTo(hx + c * r * 0.2 + 2, hy + s * r * 0.15 + 4); ctx.fill();
  ctx.fillStyle = L.glow ? `rgb(${L.glow})` : '#ff6040'; ctx.beginPath(); ctx.arc(hx + c * r * 0.12, hy + s * r * 0.08, 2, 0, TAU); ctx.fill();
  if (!L.small) {
    const handA = e.face + 0.9, hx2 = e.x + Math.cos(handA) * r * 0.7, hy2 = by + Math.sin(handA) * r * 0.5;
    drawWeaponType('cane', pose.phase ? e.x : hx2, pose.phase ? by : hy2, pose.ang, { len: r * 2.2 });
  }
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, by, r * 0.85, r, 0, 0, TAU); ctx.stroke(); }
}
function drawSerpent(e, tel) {
  const a = e.atk, atkOn = a && (e.state === 'windup' || e.state === 'active');
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  const tr = e.trail.length > 4 ? e.trail : [{ x: e.x, y: e.y }];
  const segs = 14, col = flash ? '#ffffff' : L.body;
  if (L.nebula) glowAt(e.x, e.y - r, r * 4, '255,220,130', 0.25);
  // body follows recorded trail (or curls when idle)
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = tr[Math.min(tr.length - 1, i * 2)] || tr[tr.length - 1];
    const idle = tr.length < 6;
    const a = e.face + Math.PI + Math.sin(G.time * 1.6 + i * 0.6) * 0.5;
    pts.push(idle ? { x: e.x + Math.cos(a) * i * r * 0.32, y: e.y + Math.sin(a) * i * r * 0.22 } : { x: t.x + Math.sin(G.time * 2 + i) * 4, y: t.y });
  }
  // spinning tail whip: a real, visible tail sweeping the whole hit radius
  if (atkOn && a.kind === 'spin') {
    const ta = e.face + Math.PI, R = a.rad, col = a.el ? elc(a.el) : '230,210,180';
    if (e.state === 'active') drawTrail(e.x, e.y - r * 0.3, ta - 1.6, ta, r * 0.5, R, col, 1);
    const reach = e.state === 'active' ? R : r * 1.6;
    for (let i = 10; i >= 0; i--) {
      const k = i / 10, bend = Math.sin(k * 2.2) * 0.35 * (e.state === 'active' ? 1 : 0.3);
      const tx = e.x + Math.cos(ta - bend) * reach * k, ty = e.y - r * 0.3 + Math.sin(ta - bend) * reach * k * 0.85;
      const w = r * (0.7 - k * 0.5);
      drawShadow(tx, ty + r * 0.3, w * 0.8, 0.18);
      ball(tx, ty, w, w * 0.8, flash ? '#ffffff' : i % 2 ? L.body : shade(L.body, -0.15));
      if (L.glow && i % 3 === 0) glowAt(tx, ty, w * 1.2, L.glow, 0.25);
    }
  }
  for (let i = segs - 1; i >= 0; i--) {
    const p = pts[i], w = r * (0.8 - i * 0.045);
    drawShadow(p.x, p.y, w * 0.8, 0.2);
    ball(p.x, p.y - r * 0.4, w, w * 0.8, i % 2 ? col : (flash ? '#ffffff' : shade(L.body, -0.12)));
    if (L.nebula && i % 3 === 0) glowAt(p.x, p.y - r * 0.4, w * 1.4, '255,230,160', 0.35);
  }
  let lunge = 0;
  if (atkOn && a.range && !a.kind) lunge = e.state === 'active' ? a.range * 0.55 : -r * 0.3 * clamp(e.t / Math.max(0.01, a.wind), 0, 1);
  const hx = e.x + Math.cos(e.face) * lunge, hy = e.y - r * 0.6 - e.air * 80 + Math.sin(e.face) * lunge, c = Math.cos(e.face), s = Math.sin(e.face), px = -s, py = c;
  if (lunge > 0) { ctx.strokeStyle = flash ? '#ffffff' : L.body; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x, e.y - r * 0.6); ctx.lineTo(hx, hy); ctx.stroke(); ctx.lineCap = 'butt'; }
  if (L.head === 'rykard') {
    ball(hx + c * r * 0.4, hy + s * r * 0.3, r * 0.9, r * 0.8, flash ? '#ffffff' : '#5a3a30');
    ball(hx + c * r * 0.75, hy + s * r * 0.55 - r * 0.1, r * 0.4, r * 0.38, flash ? '#ffffff' : '#c8a088');
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(hx + c * r * 0.95, hy + s * r * 0.7, r * 0.2, r * 0.1, e.face, 0, TAU); ctx.fill();
    glowAt(hx + c * r * 0.9, hy + s * r * 0.6, r * 0.8, '255,110,40', 0.35);
  } else if (L.head === 'beast') {
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath(); ctx.moveTo(hx + c * r * 1.6, hy + s * r * 1.2); ctx.lineTo(hx + px * r * 0.6, hy + py * r * 0.5); ctx.lineTo(hx - px * r * 0.6, hy - py * r * 0.5); ctx.closePath(); ctx.fill();
    glowAt(hx + c * r * 0.6, hy, r * 1.6, '255,230,150', 0.5);
    ctx.strokeStyle = 'rgba(255,220,130,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy - r * 1.4, r * 0.8, 0, TAU); ctx.stroke();
  } else {
    ball(hx + c * r * 0.5, hy + s * r * 0.35, r * 0.7, r * 0.6, flash ? '#ffffff' : shade(L.body, 0.1));
    ctx.fillStyle = '#1a0e0a'; ctx.beginPath(); ctx.arc(hx + c * r * 0.95, hy + s * r * 0.7, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.arc(hx + c * r * 0.95 + Math.cos(a) * r * 0.26, hy + s * r * 0.7 + Math.sin(a) * r * 0.26, 1.6, 0, TAU); ctx.fill(); }
  }
  if (L.glow && Math.random() < 0.3) G.particles.push({ x: e.x + rand(-r, r), y: e.y - rand(0, r), vx: 0, vy: -30, life: 0.6, max: 0.6, size: 3, col: `rgb(${L.glow})`, grav: 0, glow: true });
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); }
}
function drawFlower(e, tel) {
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  drawShadow(e.x, e.y, r, 0.35);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.sin(G.time + i) * 0.08;
    ball(e.x + Math.cos(a) * r * 0.8, e.y - r * 0.4 + Math.sin(a) * r * 0.55, r * 0.55, r * 0.3, flash ? '#ffffff' : L.petal, a);
  }
  ball(e.x, e.y - r * 0.5, r * 0.45, r * 0.4, flash ? '#ffffff' : L.core);
  ctx.strokeStyle = '#3a5a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(e.x, e.y - r * 0.5); ctx.lineTo(e.x, e.y - r * 2.4); ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + G.time * 0.3; ball(e.x + Math.cos(a) * r * 0.45, e.y - r * 2.5 + Math.sin(a) * r * 0.25, r * 0.3, r * 0.18, flash ? '#ffffff' : L.petal, a); }
  if (tel) glowAt(e.x, e.y - r, r * 2, '200,120,255', tel * 0.4);
}
function drawBoat(e, tel) {
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  ctx.save(); ctx.globalAlpha *= 0.85;
  glowAt(e.x, e.y - 10, r * 2.4, L.glow, 0.2);
  ctx.translate(e.x, e.y - 6); ctx.rotate(e.face);
  ctx.fillStyle = flash ? '#ffffff' : '#7a7a8a';
  ctx.beginPath(); ctx.moveTo(-r * 1.3, -r * 0.4); ctx.quadraticCurveTo(0, -r * 0.8, r * 1.5, 0); ctx.quadraticCurveTo(0, r * 0.8, -r * 1.3, r * 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c0c0d0'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  drawHumanoid({ x: e.x - Math.cos(e.face) * 6, y: e.y - 14, r: 12, face: e.face, walk: 0, moving: 0, flash: e.flash, tel, pose: { ang: e.face - 1.2 }, look: { body: '#4a4a5a', armor: '#8a8a9a', robe: true, helm: 'skull', ghost: true }, weapon: { type: 'staff', len: 40 } });
}
function drawAstel(e, tel) {
  const L = e.def.look, r = e.r, flash = e.flash > 0;
  const lift = 14 + Math.sin(G.time * 1.5) * 6 + e.air * 60;
  drawShadow(e.x, e.y, r * 0.8, 0.3);
  glowAt(e.x, e.y - r - lift, r * 3, L.glow, 0.3);
  const by = e.y - r * 0.6 - lift;
  ctx.strokeStyle = flash ? '#ffffff' : '#3a2a4a'; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = e.face + Math.PI + (i - 2.5) * 0.45, w = Math.sin(G.time * 2 + i) * 0.3;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(e.x, by);
    ctx.bezierCurveTo(e.x + Math.cos(a + w) * r, by + Math.sin(a + w) * r * 0.6, e.x + Math.cos(a - w) * r * 1.6, by + Math.sin(a - w) * r, e.x + Math.cos(a) * r * 2.2, by + Math.sin(a) * r * 1.3 + r * 0.3);
    ctx.stroke();
  }
  ball(e.x, by, r * 0.8, r * 0.65, flash ? '#ffffff' : L.body);
  ctx.fillStyle = 'rgba(200,180,255,0.8)';
  for (let i = 0; i < 12; i++) { const a = i * 2.4; ctx.fillRect(e.x + Math.cos(a) * r * 0.5 * ((i % 3) / 3 + 0.3), by + Math.sin(a) * r * 0.4 * ((i % 4) / 4 + 0.2), 1.5, 1.5); }
  const c = Math.cos(e.face), s = Math.sin(e.face), px = -s, py = c;
  const hx = e.x + c * r * 0.7, hy = by - r * 0.3 + s * r * 0.4;
  ball(hx, hy, r * 0.45, r * 0.42, flash ? '#ffffff' : '#d8d0e0');
  ctx.fillStyle = '#1a0a2a'; ctx.beginPath(); ctx.arc(hx + c * r * 0.15 + px * r * 0.15, hy + s * r * 0.1 + py * r * 0.1, r * 0.1, 0, TAU); ctx.arc(hx + c * r * 0.15 - px * r * 0.15, hy + s * r * 0.1 - py * r * 0.1, r * 0.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#d8d0e0'; ctx.lineWidth = 3;
  for (const sd of [1, -1]) { ctx.beginPath(); ctx.moveTo(hx + px * sd * r * 0.3, hy + py * sd * r * 0.2); ctx.quadraticCurveTo(hx + c * r * 0.8 + px * sd * r * 0.6, hy + s * r * 0.6 + py * sd * r * 0.4, hx + c * r * 1.2 + px * sd * r * 0.2, hy + s * r * 0.9); ctx.stroke(); }
  if (tel) { ctx.strokeStyle = `rgba(255,60,40,${tel * 0.85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, by, r, 0, TAU); ctx.stroke(); }
}
