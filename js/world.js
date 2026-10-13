'use strict';
/* World: procedural textures, decoration, collision grid, zone + atmosphere lookup. */

// ---------------------------------------------------------------- textures
const TEX = {};
function makeTex(name, size, seedN, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const R = rng(seedN);
  // draws fn at (px,py) plus wrapped copies near edges, so the texture tiles seamlessly
  const wrap = (px, py, m, fn) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const qx = px + dx, qy = py + dy;
      if (qx > -m && qx < size + m && qy > -m && qy < size + m) fn(qx, qy);
    }
  };
  draw(x, size, R, wrap);
  TEX[name] = ctx.createPattern(c, 'repeat');
}
function blotches(x, s, R, wrap, n, cols, r0, r1, a) {
  for (let i = 0; i < n; i++) {
    const px = R() * s, py = R() * s, r = r0 + R() * (r1 - r0), col = cols[(R() * cols.length) | 0];
    x.globalAlpha = a;
    x.fillStyle = col;
    wrap(px, py, r, (qx, qy) => { x.beginPath(); x.ellipse(qx, qy, r, r * (0.6 + R() * 0.4), R() * 3, 0, TAU); x.fill(); });
  }
  x.globalAlpha = 1;
}
function genTextures() {
  makeTex('grass', 256, 11, (x, s, R, wrap) => {
    x.fillStyle = '#3c4925'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 70, ['#46552a', '#334020', '#4f5a2c', '#56562a'], 10, 34, 0.35);
    blotches(x, s, R, wrap, 300, ['#5a6a30', '#2e3a1c', '#6a7036'], 1.5, 4, 0.5);
    x.lineCap = 'round'; x.lineWidth = 1.1;
    const cols = ['#56662f', '#64723a', '#748043', '#40501f', '#857f45', '#6b7a35'];
    for (let i = 0; i < 1500; i++) {
      const px = R() * s, py = R() * s, h = 3 + R() * 6, lean = (R() - 0.5) * 3;
      x.strokeStyle = cols[(R() * cols.length) | 0];
      wrap(px, py, 10, (qx, qy) => { x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + lean, qy - h); x.stroke(); });
    }
    for (let i = 0; i < 16; i++) {
      const px = R() * s, py = R() * s, c = R() < 0.6 ? '#e8cf6a' : '#e9e4d0';
      x.fillStyle = c;
      wrap(px, py, 3, (qx, qy) => { x.beginPath(); x.arc(qx, qy, 1.3, 0, TAU); x.fill(); });
    }
  });
  makeTex('dirt', 256, 23, (x, s, R, wrap) => {
    x.fillStyle = '#5e4c33'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 60, ['#6a5639', '#52412b', '#705c3c'], 8, 26, 0.4);
    blotches(x, s, R, wrap, 260, ['#7d6a4a', '#4a3a26', '#8a7a5a'], 1, 3, 0.7);
    x.strokeStyle = 'rgba(40,30,18,0.35)'; x.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const px = R() * s, py = R() * s, l = 10 + R() * 20, a = R() * 0.6 - 0.3 - Math.PI / 2;
      wrap(px, py, 30, (qx, qy) => { x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a) * l, qy + Math.sin(a) * l); x.stroke(); });
    }
  });
  makeTex('rock', 256, 37, (x, s, R, wrap) => {
    x.fillStyle = '#4a4840'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 60, ['#55534a', '#3e3d36', '#5d5a4e', '#4b4a3a'], 10, 30, 0.45);
    blotches(x, s, R, wrap, 220, ['#6b685c', '#33322c', '#5a5a44'], 1, 3.5, 0.6);
    x.strokeStyle = 'rgba(20,20,16,0.5)'; x.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      let px = R() * s, py = R() * s;
      const pts = [[px, py]];
      for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 22; py += (R() - 0.5) * 22; pts.push([px, py]); }
      wrap(pts[0][0], pts[0][1], 50, (qx, qy) => {
        const ox = qx - pts[0][0], oy = qy - pts[0][1];
        x.beginPath(); pts.forEach((p, j) => (j ? x.lineTo(p[0] + ox, p[1] + oy) : x.moveTo(p[0] + ox, p[1] + oy))); x.stroke();
      });
    }
    x.lineWidth = 1; x.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const px = R() * s, py = R() * s, h = 2 + R() * 5;
      x.strokeStyle = R() < 0.5 ? '#6e6c4a' : '#7d7550';
      wrap(px, py, 8, (qx, qy) => { x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + (R() - 0.5) * 2, qy - h); x.stroke(); });
    }
  });
  const flagstones = (x, s, R, tile, base, varr, mortar) => {
    x.fillStyle = mortar; x.fillRect(0, 0, s, s);
    for (let ty = 0; ty < s; ty += tile) {
      const off = ((ty / tile) % 2) * (tile / 2);
      for (let tx = -tile; tx < s + tile; tx += tile) {
        const v = (R() - 0.5) * varr;
        const c = base.map((b) => clamp(Math.round(b + v), 0, 255));
        x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        const px = tx + off + 1.5, py = ty + 1.5, w = tile - 3, h = tile - 3;
        x.fillRect(px, py, w, h);
        x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(px, py, w, 2); x.fillRect(px, py, 2, h);
        x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(px, py + h - 2, w, 2); x.fillRect(px + w - 2, py, 2, h);
        if (R() < 0.35) {
          x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1;
          x.beginPath(); let cx = px + R() * w, cy = py + R() * h; x.moveTo(cx, cy);
          for (let k = 0; k < 3; k++) { cx += (R() - 0.5) * 18; cy += (R() - 0.5) * 18; x.lineTo(clamp(cx, px, px + w), clamp(cy, py, py + h)); }
          x.stroke();
        }
        if (R() < 0.25) { x.fillStyle = 'rgba(80,96,50,0.35)'; x.beginPath(); x.arc(px + R() * w, py + h - 3, 2 + R() * 4, 0, TAU); x.fill(); }
      }
    }
  };
  makeTex('stone', 256, 51, (x, s, R) => flagstones(x, s, R, 64, [74, 70, 64], 18, '#26231f'));
  makeTex('arena', 256, 67, (x, s, R) => flagstones(x, s, R, 128, [62, 58, 54], 14, '#1d1b18'));
  makeTex('cliff', 256, 79, (x, s, R, wrap) => {
    x.fillStyle = '#34322c'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 80, ['#3f3c34', '#2a2924', '#47443a'], 8, 30, 0.6);
    blotches(x, s, R, wrap, 200, ['#56534a', '#22211d'], 1, 4, 0.6);
  });
  makeTex('wallTop', 128, 91, (x, s, R) => flagstones(x, s, R, 32, [96, 90, 80], 22, '#3a3530'));
  makeTex('wallFace', 128, 97, (x, s, R) => flagstones(x, s, R, 16, [66, 61, 54], 20, '#2a2622'));
  makeTex('ruinTop', 128, 103, (x, s, R) => flagstones(x, s, R, 32, [112, 104, 90], 26, '#4a443a'));
}

// ---------------------------------------------------------------- ground regions
const GROUND = [
  { x: 0, y: 0, w: 2400, h: 2900, tex: 'cliff' },
  { x: 640, y: 120, w: 1120, h: 540, tex: 'arena' },
  { x: 540, y: 700, w: 1320, h: 1640, tex: 'stone' },
  { x: 740, y: 2380, w: 920, h: 480, tex: 'arena' },
  { x: 0, y: 2900, w: 2400, h: 1800, tex: 'rock' },
  { x: 0, y: 4700, w: 2400, h: 2500, tex: 'grass' },
];

// ---------------------------------------------------------------- decoration
const DECOR = [];   // drawn props (trees, rocks, torches...)
const TUFTS = [];   // animated grass
const LIGHTS = [];  // static light sources {x,y,r,col,flicker}
const COLLIDERS = []; // circles
function nearPath(x, y) {
  let m = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) m = Math.min(m, segDist(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return m;
}
const inRect = (x, y, r, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
function genDecor() {
  const R = rng(4242);
  const blocked = (x, y, pathPad, gap) => {
    if (nearPath(x, y) < pathPad) return true;
    if (WALLS.some((w) => inRect(x, y, w, 36))) return true;
    if (GRACE_DEFS.some((g) => Math.hypot(g.x - x, g.y - y) < 110)) return true;
    if (SPAWNS.some((s) => Math.hypot(s[1] - x, s[2] - y) < 60)) return true;
    if (ITEMS.some((s) => Math.hypot(s.x - x, s.y - y) < 60)) return true;
    if (DECOR.some((d) => d.r && Math.hypot(d.x - x, d.y - y) < gap)) return true;
    return false;
  };
  const scatter = (n, x0, y0, x1, y1, pathPad, gap, make) => {
    let tries = 0, made = 0;
    while (made < n && tries++ < n * 30) {
      const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0);
      if (blocked(x, y, pathPad, gap)) continue;
      DECOR.push(make(x, y)); made++;
    }
  };
  // sentinel patrol lane stays clear
  const lane = (x, y) => Math.abs(x - 1650) < 90 && y > 5400 && y < 6500;
  // Limgrave
  scatter(150, 60, 4760, 2340, 7140, 110, 70, (x, y) => lane(x, y) ? { type: 'bush', x, y, r: 0, s: 0.8 + R() * 0.6, v: R() } : { type: 'tree', x, y, r: 11, s: 26 + R() * 24, v: R() });
  scatter(120, 60, 4760, 2340, 7140, 60, 0, (x, y) => ({ type: 'bush', x, y, r: 0, s: 0.7 + R() * 0.7, v: R() }));
  scatter(90, 60, 4760, 2340, 7140, 50, 0, (x, y) => ({ type: 'flowers', x, y, r: 0, s: 1, v: R() }));
  scatter(16, 60, 4760, 2340, 7140, 120, 80, (x, y) => ({ type: 'boulder', x, y, r: 18 + R() * 8, s: 1, v: R() }));
  for (let i = 0; i < 24; i++) {
    const a = R() * TAU, d = 120 + R() * 220, x = 1200 + Math.cos(a) * d * 1.4, y = 6950 + Math.sin(a) * d * 0.55;
    if (nearPath(x, y) < 60 || y > 7130) continue;
    DECOR.push({ type: 'grave', x, y, r: 0, s: 1, v: R() });
  }
  // Stormhill
  scatter(46, 460, 2920, 1860, 4690, 100, 70, (x, y) => ({ type: 'deadtree', x, y, r: 9, s: 24 + R() * 18, v: R() }));
  scatter(30, 460, 2920, 1860, 4690, 90, 70, (x, y) => ({ type: 'boulder', x, y, r: 14 + R() * 12, s: 1, v: R() }));
  scatter(30, 460, 2920, 1860, 4690, 30, 0, (x, y) => ({ type: 'bones', x, y, r: 0, s: 1, v: R() }));
  scatter(90, 460, 2920, 1860, 4690, 40, 0, (x, y) => ({ type: 'drybush', x, y, r: 0, s: 0.7 + R() * 0.6, v: R() }));
  // Castle torches along wall faces
  for (const w of WALLS) {
    if (w.kind !== 'castle') continue;
    if (w.y < 700 || w.y > 2350) continue;
    if (w.w > w.h) {
      for (let x = w.x + 80; x < w.x + w.w - 40; x += 200) {
        const y = w.y + w.h + 8;
        if (y > 2340 || x < 540 || x > 1860) continue;
        DECOR.push({ type: 'torch', x, y, r: 6, s: 1, v: R() });
        LIGHTS.push({ x, y: y - 26, r: 190, col: [255, 160, 70], a: 0.9, flicker: R() * 10 });
      }
    }
  }
  for (const [x0] of [[548], [1852]]) {
    for (let y = 820; y < 2300; y += 260) DECOR.push({ type: 'torch', x: x0 + (x0 < 1000 ? 4 : -4), y, r: 6, s: 1, v: R() }), LIGHTS.push({ x: x0, y: y - 26, r: 190, col: [255, 160, 70], a: 0.9, flicker: R() * 10 });
  }
  // banners hang from horizontal castle walls
  for (const w of WALLS) if (w.kind === 'castle' && w.w > 200 && w.y > 600 && w.y < 2350) w.banners = true;
  // arena braziers
  for (const [x, y] of [[790, 2430], [1610, 2430], [790, 2810], [1610, 2810], [690, 170], [1710, 170], [690, 610], [1710, 610]]) {
    DECOR.push({ type: 'brazier', x, y, r: 12, s: 1, v: R() });
    LIGHTS.push({ x, y: y - 16, r: 260, col: [255, 150, 60], a: 1, flicker: R() * 10 });
  }
  scatter(10, 600, 760, 1820, 2300, 0, 120, (x, y) => ({ type: 'pillar', x, y, r: 14, s: 1, v: R() }));

  for (const d of DECOR) if (d.r) COLLIDERS.push(d);

  // grass tufts
  const T = rng(777);
  for (let i = 0; i < 2600; i++) {
    const x = T() * WORLD.w, y = 4700 + T() * 2500;
    if (nearPath(x, y) < 45) continue;
    TUFTS.push({ x, y, s: 0.7 + T() * 0.8, c: T(), dry: false });
  }
  for (let i = 0; i < 700; i++) {
    const x = 460 + T() * 1400, y = 2900 + T() * 1800;
    TUFTS.push({ x, y, s: 0.5 + T() * 0.7, c: T(), dry: true });
  }
}

// ---------------------------------------------------------------- collision (uniform grid)
const CELL = 200;
const GRID = new Map();
function gridAdd(obj, x0, y0, x1, y1) {
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
    for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const k = cx + ',' + cy;
      if (!GRID.has(k)) GRID.set(k, []);
      GRID.get(k).push(obj);
    }
}
function buildGrid() {
  for (const w of WALLS) gridAdd({ rect: w }, w.x, w.y, w.x + w.w, w.y + w.h);
  for (const c of COLLIDERS) gridAdd({ circ: c }, c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r);
}
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
const fogSolid = (f) => !G.defeated.has(f.boss);
function collide(e) {
  let hit = false;
  const k = Math.floor(e.x / CELL) + ',' + Math.floor(e.y / CELL);
  const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
  const seen = new Set();
  for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
    const list = GRID.get(ix + ',' + iy); if (!list) continue;
    for (const o of list) {
      if (seen.has(o)) continue; seen.add(o);
      if (o.rect) hit = circleRect(e, o.rect) || hit;
      else {
        const t = o.circ, dx = e.x - t.x, dy = e.y - t.y, rr = e.r + t.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); e.x = t.x + (dx / d) * rr; e.y = t.y + (dy / d) * rr; hit = true; }
      }
    }
  }
  void k;
  for (const f of FOGS) if (fogSolid(f) && Math.abs(e.x - (f.x + f.w / 2)) < 120 && Math.abs(e.y - (f.y + f.h / 2)) < 80) hit = circleRect(e, f) || hit;
  return hit;
}
function moveEnt(e, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  let hit = false;
  for (let i = 0; i < steps; i++) { e.x += dx / steps; e.y += dy / steps; hit = collide(e) || hit; }
  return hit;
}
function pointBlocked(x, y) {
  const list = GRID.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL));
  if (list) for (const o of list) {
    if (o.rect && x > o.rect.x && x < o.rect.x + o.rect.w && y > o.rect.y && y < o.rect.y + o.rect.h) return true;
    if (o.circ && o.circ.type !== 'torch' && Math.hypot(x - o.circ.x, y - o.circ.y) < o.circ.r) return true;
  }
  return false;
}

// ---------------------------------------------------------------- zones & atmosphere
const zoneAt = (y) => ZONES.find((z) => y >= z.y0 && y < z.y1) || ZONES[ZONES.length - 1];
function ambAt(y) {
  const z = zoneAt(y);
  let a = AMB[z.id], b = null, t = 0;
  const BAND = 220;
  const i = ZONES.indexOf(z);
  if (y - z.y0 < BAND && i > 0) { b = AMB[ZONES[i - 1].id]; t = 0.5 - (y - z.y0) / BAND / 2; }
  else if (z.y1 - y < BAND && i < ZONES.length - 1) { b = AMB[ZONES[i + 1].id]; t = 0.5 - (z.y1 - y) / BAND / 2; }
  if (!b) return a;
  const mix = {};
  for (const k of Object.keys(a)) mix[k] = Array.isArray(a[k]) ? a[k].map((v, j) => lerp(v, b[k][j], t)) : lerp(a[k], b[k], t);
  return mix;
}
