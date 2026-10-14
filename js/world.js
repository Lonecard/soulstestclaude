'use strict';
/* World engine: textures, overworld geometry, dungeon instances, decoration, collision, atmosphere. */

// ================================================================ textures
const TEX = {};
function makeTex(name, size, seedN, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const R = rng(seedN);
  const wrap = (px, py, m, fn) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const qx = px + dx, qy = py + dy;
      if (qx > -m && qx < size + m && qy > -m && qy < size + m) fn(qx, qy);
    }
  };
  draw(x, size, R, wrap);
  TEX[name] = ctx.createPattern(c, 'repeat');
  TEX[name + '_c'] = c;
}
function blotches(x, s, R, wrap, n, cols, r0, r1, a) {
  for (let i = 0; i < n; i++) {
    const px = R() * s, py = R() * s, r = r0 + R() * (r1 - r0), col = cols[(R() * cols.length) | 0];
    x.globalAlpha = a; x.fillStyle = col;
    wrap(px, py, r, (qx, qy) => { x.beginPath(); x.ellipse(qx, qy, r, r * (0.6 + R() * 0.4), R() * 3, 0, TAU); x.fill(); });
  }
  x.globalAlpha = 1;
}
function blades(x, s, R, wrap, n, cols, h0, h1, w = 1.1) {
  x.lineCap = 'round'; x.lineWidth = w;
  for (let i = 0; i < n; i++) {
    const px = R() * s, py = R() * s, h = h0 + R() * (h1 - h0), lean = (R() - 0.5) * 3;
    x.strokeStyle = cols[(R() * cols.length) | 0];
    wrap(px, py, 10, (qx, qy) => { x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + lean, qy - h); x.stroke(); });
  }
}
function cracks(x, s, R, wrap, n, col) {
  x.strokeStyle = col; x.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    let px = R() * s, py = R() * s;
    const pts = [[px, py]];
    for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 22; py += (R() - 0.5) * 22; pts.push([px, py]); }
    wrap(pts[0][0], pts[0][1], 50, (qx, qy) => {
      const ox = qx - pts[0][0], oy = qy - pts[0][1];
      x.beginPath(); pts.forEach((p, j) => (j ? x.lineTo(p[0] + ox, p[1] + oy) : x.moveTo(p[0] + ox, p[1] + oy))); x.stroke();
    });
  }
}
function dots(x, s, R, wrap, n, cols, r0, r1) {
  for (let i = 0; i < n; i++) {
    const px = R() * s, py = R() * s, r = r0 + R() * (r1 - r0);
    x.fillStyle = cols[(R() * cols.length) | 0];
    wrap(px, py, 3, (qx, qy) => { x.beginPath(); x.arc(qx, qy, r, 0, TAU); x.fill(); });
  }
}
function flagstones(x, s, R, tile, base, varr, mortar) {
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
    }
  }
}
function grassTex(name, seedN, base, blot, bladeCols, flowers) {
  makeTex(name, 256, seedN, (x, s, R, wrap) => {
    x.fillStyle = base; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 70, blot, 10, 34, 0.35);
    blotches(x, s, R, wrap, 260, blot, 1.5, 4, 0.5);
    blades(x, s, R, wrap, 1400, bladeCols, 3, 9);
    if (flowers) dots(x, s, R, wrap, 18, flowers, 1, 1.6);
  });
}
function rockTex(name, seedN, base, blot, crack, tuftCols) {
  makeTex(name, 256, seedN, (x, s, R, wrap) => {
    x.fillStyle = base; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 60, blot, 10, 30, 0.45);
    blotches(x, s, R, wrap, 220, blot, 1, 3.5, 0.6);
    cracks(x, s, R, wrap, 24, crack);
    if (tuftCols) blades(x, s, R, wrap, 240, tuftCols, 2, 6, 1);
  });
}
function genTextures() {
  grassTex('grass', 11, '#3c4925', ['#46552a', '#334020', '#4f5a2c', '#56562a'], ['#56662f', '#64723a', '#748043', '#40501f', '#857f45'], ['#e8cf6a', '#e9e4d0']);
  grassTex('weeping', 13, '#3d4a2a', ['#4a5a30', '#36442a', '#5a6036'], ['#5a6a34', '#6a7a3e', '#7a8a44', '#465a28'], ['#e8a0c0', '#f0d0e0', '#e8cf6a']);
  grassTex('liurnia', 17, '#36463a', ['#3e5044', '#2c3a30', '#46584a'], ['#4a5e4c', '#566a58', '#5e7462', '#3a4e3e'], ['#a8c0e8', '#e0e8f0']);
  grassTex('altus', 19, '#5a5a2a', ['#6a6630', '#4a4a24', '#7a7234'], ['#8a8240', '#9a8e48', '#a8984e', '#6a6a30', '#b8a454'], ['#f0d870', '#fff0b0']);
  rockTex('stormhill', 37, '#4a4840', ['#55534a', '#3e3d36', '#5d5a4e'], 'rgba(20,20,16,0.5)', ['#6e6c4a', '#7d7550']);
  rockTex('caelid', 41, '#5a2e22', ['#6a3426', '#4a241a', '#7a3e2a', '#5a3a2a'], 'rgba(20,6,4,0.5)', ['#8a4a2a', '#9a5a30', '#7a3a24']);
  rockTex('dragonbarrow', 43, '#4a2a26', ['#5a3028', '#3a201c', '#6a3a2e'], 'rgba(10,4,4,0.6)', ['#7a3a2a']);
  rockTex('gelmir', 47, '#2e2826', ['#3a322e', '#221e1c', '#4a3a30'], 'rgba(255,90,30,0.25)', ['#4a3a30']);
  rockTex('forbidden', 53, '#5a5a58', ['#6a6a68', '#4a4a48', '#7a7a78'], 'rgba(20,20,20,0.4)', ['#8a8a80']);
  rockTex('cliff', 79, '#34322c', ['#3f3c34', '#2a2924', '#47443a'], 'rgba(10,10,8,0.5)', null);
  rockTex('cave', 81, '#2e2a26', ['#38332e', '#24211e', '#403a32'], 'rgba(0,0,0,0.5)', null);
  rockTex('mine', 83, '#3a3026', ['#463a2e', '#2e261e', '#52432f'], 'rgba(0,0,0,0.5)', null);
  makeTex('snow', 256, 59, (x, s, R, wrap) => {
    x.fillStyle = '#d8dee6'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 70, ['#e8eef4', '#c8d0da', '#f2f6fa', '#b8c4d0'], 10, 36, 0.5);
    dots(x, s, R, wrap, 120, ['#ffffff', '#c0ccd8'], 0.6, 1.6);
  });
  makeTex('snowfield', 256, 61, (x, s, R, wrap) => {
    x.fillStyle = '#e4e8ee'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 70, ['#f2f4f8', '#d0d8e2', '#ffffff'], 10, 36, 0.5);
    blades(x, s, R, wrap, 120, ['#8a9a8a', '#a8b0a0'], 2, 5, 1);
  });
  makeTex('dirt', 256, 23, (x, s, R, wrap) => {
    x.fillStyle = '#5e4c33'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 60, ['#6a5639', '#52412b', '#705c3c'], 8, 26, 0.4);
    blotches(x, s, R, wrap, 260, ['#7d6a4a', '#4a3a26', '#8a7a5a'], 1, 3, 0.7);
  });
  makeTex('sand', 256, 29, (x, s, R, wrap) => {
    x.fillStyle = '#a08860'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 60, ['#b09868', '#907850', '#c0a878'], 10, 30, 0.4);
    dots(x, s, R, wrap, 300, ['#c8b088', '#806848'], 0.6, 1.2);
  });
  const waterTex = (name, seedN, base, lights) => makeTex(name, 256, seedN, (x, s, R, wrap) => {
    x.fillStyle = base; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 50, lights, 14, 40, 0.25);
    x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const px = R() * s, py = R() * s, l = 8 + R() * 18;
      wrap(px, py, 30, (qx, qy) => { x.beginPath(); x.moveTo(qx, qy); x.quadraticCurveTo(qx + l / 2, qy - 3, qx + l, qy); x.stroke(); });
    }
  });
  waterTex('sea', 31, '#1a2a38', ['#22384a', '#152230', '#2a4458']);
  waterTex('lake', 33, '#4a6a78', ['#5a7a88', '#3a5a68', '#6a8a98']);
  waterTex('rotwater', 35, '#7a2a1a', ['#8a3a22', '#6a2016', '#a04a2a']);
  waterTex('blood', 39, '#5a0a10', ['#6a1018', '#4a060c', '#7a1420']);
  makeTex('lava', 256, 45, (x, s, R, wrap) => {
    x.fillStyle = '#5a1a08'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 70, ['#ff7a20', '#c04010', '#ffaa40', '#801808'], 6, 26, 0.6);
    cracks(x, s, R, wrap, 30, 'rgba(30,8,4,0.8)');
  });
  makeTex('ice', 256, 49, (x, s, R, wrap) => {
    x.fillStyle = '#9ab8c8'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 40, ['#b8d4e0', '#8aa8b8', '#d0e8f0'], 12, 40, 0.4);
    cracks(x, s, R, wrap, 26, 'rgba(255,255,255,0.4)');
  });
  makeTex('stone', 256, 51, (x, s, R) => flagstones(x, s, R, 64, [74, 70, 64], 18, '#26231f'));
  makeTex('arena', 256, 67, (x, s, R) => flagstones(x, s, R, 128, [62, 58, 54], 14, '#1d1b18'));
  makeTex('academy', 256, 69, (x, s, R) => flagstones(x, s, R, 64, [64, 74, 98], 16, '#1e2230'));
  makeTex('capital', 256, 71, (x, s, R) => flagstones(x, s, R, 64, [120, 104, 70], 20, '#3a3020'));
  makeTex('farum', 256, 73, (x, s, R) => flagstones(x, s, R, 96, [110, 104, 96], 16, '#3a3632'));
  makeTex('ash', 256, 75, (x, s, R, wrap) => { flagstones(x, s, R, 64, [96, 94, 92], 12, '#3a3a3a'); blotches(x, s, R, wrap, 80, ['#c8c8c8', '#8a8a8a'], 4, 18, 0.25); });
  makeTex('evergaol', 256, 77, (x, s, R) => { flagstones(x, s, R, 128, [70, 72, 84], 10, '#20222c'); });
  makeTex('siofra', 256, 85, (x, s, R, wrap) => {
    flagstones(x, s, R, 96, [44, 48, 66], 14, '#14161e');
    dots(x, s, R, wrap, 40, ['#8ab0ff', '#c0d8ff'], 0.5, 1.2);
  });
  makeTex('halig', 256, 87, (x, s, R, wrap) => {
    x.fillStyle = '#8a7a5a'; x.fillRect(0, 0, s, s);
    blotches(x, s, R, wrap, 50, ['#a08a60', '#7a6a4a', '#c0a870'], 10, 30, 0.45);
    x.strokeStyle = 'rgba(60,40,20,0.5)'; x.lineWidth = 2;
    for (let i = 0; i < 20; i++) { const py = R() * s; wrap(0, py, 10, (qx, qy) => { x.beginPath(); x.moveTo(0, qy); x.bezierCurveTo(s / 3, qy + 10, 2 * s / 3, qy - 10, s, qy); x.stroke(); }); }
  });
  makeTex('wallTop', 128, 91, (x, s, R) => flagstones(x, s, R, 32, [96, 90, 80], 22, '#3a3530'));
  makeTex('wallFace', 128, 97, (x, s, R) => flagstones(x, s, R, 16, [66, 61, 54], 20, '#2a2622'));
  makeTex('ruinTop', 128, 103, (x, s, R) => flagstones(x, s, R, 32, [112, 104, 90], 26, '#4a443a'));
  makeTex('goldTop', 128, 105, (x, s, R) => flagstones(x, s, R, 32, [150, 128, 84], 22, '#5a4a30'));
}

// ================================================================ biomes
// tex: ground, tuft: grass colours, trees: tree palette, amb: atmosphere
const BIOMES = {
  limgrave: { tex: 'grass', tuft: ['#4f6230', '#5f6f36', '#7a7a3e'], amb: { dark: 0.04, tint: [255, 205, 130], tintA: 0.12, sky: 1, leaves: 1 } },
  stormhill: { tex: 'stormhill', tuft: ['#7a7550', '#8d8458'], amb: { dark: 0.3, tint: [110, 130, 168], tintA: 0.24, sky: 0.45, rain: 1 } },
  weeping: { tex: 'weeping', tuft: ['#5a6a34', '#6a7a3e', '#8a8a4a'], amb: { dark: 0.05, tint: [255, 200, 180], tintA: 0.12, sky: 0.9, leaves: 0.7 } },
  liurnia: { tex: 'liurnia', tuft: ['#4a5e4c', '#566a58'], amb: { dark: 0.16, tint: [140, 170, 220], tintA: 0.22, sky: 0.6, mist: 1 } },
  caelid: { tex: 'caelid', tuft: ['#8a4a2a', '#9a5a30'], amb: { dark: 0.18, tint: [255, 80, 50], tintA: 0.3, sky: 0.2, spores: 1 } },
  dragonbarrow: { tex: 'dragonbarrow', tuft: ['#7a3a2a'], amb: { dark: 0.22, tint: [255, 70, 50], tintA: 0.3, sky: 0.2, spores: 0.6 } },
  altus: { tex: 'altus', tuft: ['#9a8e48', '#a8984e', '#b8a454'], amb: { dark: 0.02, tint: [255, 215, 120], tintA: 0.2, sky: 1.2, leaves: 1 } },
  gelmir: { tex: 'gelmir', tuft: ['#4a3a30'], amb: { dark: 0.32, tint: [255, 110, 50], tintA: 0.22, sky: 0.15, embers: 1.2 } },
  forbidden: { tex: 'forbidden', tuft: ['#8a8a80'], amb: { dark: 0.2, tint: [200, 210, 230], tintA: 0.16, sky: 0.5, snow: 0.3 } },
  mountaintops: { tex: 'snow', tuft: ['#8a9488'], amb: { dark: 0.12, tint: [180, 200, 240], tintA: 0.2, sky: 0.6, snow: 1 } },
  snowfield: { tex: 'snowfield', tuft: ['#8a9a8a'], amb: { dark: 0.16, tint: [200, 220, 255], tintA: 0.22, sky: 0.4, snow: 1.6 } },
  castle: { tex: 'stone', amb: { dark: 0.5, tint: [255, 150, 80], tintA: 0.1, embers: 1 } },
  capital: { tex: 'capital', amb: { dark: 0.1, tint: [255, 215, 120], tintA: 0.2, sky: 1.2, leaves: 0.8 } },
  cliff: { tex: 'cliff', amb: { dark: 0.2 } },
  // instance themes
  catacomb: { tex: 'stone', wall: 'castle', amb: { dark: 0.62, tint: [150, 140, 120], tintA: 0.12, dust: 1 } },
  cave: { tex: 'cave', wall: 'cliff', amb: { dark: 0.62, tint: [120, 130, 120], tintA: 0.12, dust: 1 } },
  tunnel: { tex: 'mine', wall: 'cliff', amb: { dark: 0.58, tint: [200, 160, 110], tintA: 0.12, dust: 1 } },
  evergaol: { tex: 'evergaol', wall: 'castle', amb: { dark: 0.38, tint: [120, 150, 255], tintA: 0.26, mist: 0.6 } },
  academy: { tex: 'academy', wall: 'castle', amb: { dark: 0.42, tint: [110, 150, 255], tintA: 0.24, mist: 0.6 } },
  manor: { tex: 'stone', wall: 'castle', amb: { dark: 0.45, tint: [130, 150, 230], tintA: 0.18 } },
  redmane: { tex: 'sand', wall: 'castle', amb: { dark: 0.12, tint: [255, 90, 50], tintA: 0.28, sky: 0.3, spores: 0.6 } },
  volcano: { tex: 'gelmir', wall: 'castle', amb: { dark: 0.45, tint: [255, 110, 50], tintA: 0.2, embers: 1.4 } },
  leyndell: { tex: 'capital', wall: 'gold', amb: { dark: 0.08, tint: [255, 215, 120], tintA: 0.2, sky: 1, leaves: 1 } },
  sol: { tex: 'snow', wall: 'castle', amb: { dark: 0.25, tint: [180, 200, 240], tintA: 0.2, snow: 1.4 } },
  haligtree: { tex: 'halig', wall: 'gold', amb: { dark: 0.12, tint: [255, 230, 160], tintA: 0.2, sky: 0.8, spores: 0.4 } },
  farum: { tex: 'farum', wall: 'ruin', amb: { dark: 0.3, tint: [200, 190, 160], tintA: 0.22, rain: 1.2, sky: 0.3 } },
  ashen: { tex: 'ash', wall: 'ruin', amb: { dark: 0.28, tint: [200, 190, 180], tintA: 0.26, snow: 1, ash: 1 } },
  underground: { tex: 'siofra', wall: 'cliff', amb: { dark: 0.42, tint: [100, 130, 255], tintA: 0.3, stars: 1 } },
  rot: { tex: 'rotwater', wall: 'cliff', amb: { dark: 0.3, tint: [255, 70, 40], tintA: 0.34, spores: 1.4 } },
  mohgwyn: { tex: 'blood', wall: 'cliff', amb: { dark: 0.3, tint: [255, 40, 60], tintA: 0.34, embers: 0.6, stars: 0.6 } },
  tower: { tex: 'stone', wall: 'castle', amb: { dark: 0.4, tint: [200, 180, 140], tintA: 0.14 } },
};

// ================================================================ overworld geometry (world units)
const toW = ([x, y]) => [x * MU, y * MU];
function pip(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const bboxOf = (pts) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
const RW = REGIONS.map((r) => { const pts = r.poly.map(toW); return { ...r, pts, bb: bboxOf(pts) }; });
const PW = PATCHES.map((p) => {
  if (p.circle) return { ...p, cx: p.circle[0] * MU, cy: p.circle[1] * MU, r: p.circle[2] * MU, bb: { x0: (p.circle[0] - p.circle[2]) * MU, y0: (p.circle[1] - p.circle[2]) * MU, x1: (p.circle[0] + p.circle[2]) * MU, y1: (p.circle[1] + p.circle[2]) * MU } };
  const pts = p.poly.map(toW); return { ...p, pts, bb: bboxOf(pts) };
});
const ROADS_W = ROADS.map((r) => r.map(toW));
const inPatch = (p, x, y) => (p.pts ? pip(x, y, p.pts) : Math.hypot(x - p.cx, y - p.cy) < p.r);

// region grid for fast lookup: cell -> region index (-1 = sea)
const RG_CELL = 80;
const RG_W = Math.ceil(OW.w / RG_CELL), RG_H = Math.ceil(OW.h / RG_CELL);
let RGRID = null;
function buildRegionGrid() {
  RGRID = new Int8Array(RG_W * RG_H).fill(-1);
  RW.forEach((r, i) => {
    const cx0 = Math.max(0, Math.floor(r.bb.x0 / RG_CELL)), cx1 = Math.min(RG_W - 1, Math.floor(r.bb.x1 / RG_CELL));
    const cy0 = Math.max(0, Math.floor(r.bb.y0 / RG_CELL)), cy1 = Math.min(RG_H - 1, Math.floor(r.bb.y1 / RG_CELL));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cy * RG_W + cx;
      if (RGRID[k] >= 0 && !RW[RGRID[k]].blocked) continue; // walkable regions win ties
      if (pip((cx + 0.5) * RG_CELL, (cy + 0.5) * RG_CELL, r.pts)) RGRID[k] = i;
    }
  });
}
function regionAt(x, y) {
  if (x < 0 || y < 0 || x >= OW.w || y >= OW.h) return null;
  const i = RGRID[Math.floor(y / RG_CELL) * RG_W + Math.floor(x / RG_CELL)];
  return i >= 0 ? RW[i] : null;
}
function patchAt(x, y) {
  for (const p of PW) if (x > p.bb.x0 && x < p.bb.x1 && y > p.bb.y0 && y < p.bb.y1 && inPatch(p, x, y)) return p;
  return null;
}

// ================================================================ dungeon instances
const POCKET_X = OW.w + 4000;
const INST = {};
const INST_LIST = [];
const FLOOR = new Set(); // walkable 100-unit cells inside instances
const FL_CELL = 100;
function markFloor(r) {
  for (let x = Math.floor(r.x / FL_CELL); x <= Math.floor((r.x + r.w - 1) / FL_CELL); x++)
    for (let y = Math.floor(r.y / FL_CELL); y <= Math.floor((r.y + r.h - 1) / FL_CELL); y++) FLOOR.add(x + ',' + y);
}
const ROOM_DIMS = { entry: [520, 440], fight: [620, 480], boss: [960, 720], bossBig: [1300, 980], arena: [900, 900] };
function genInstance(d, idx) {
  const R = rng(9001 + idx * 131);
  const theme = d.theme, x0 = POCKET_X, y0 = 1200 + idx * 3000;
  const plan = [];
  const fights = { arena: 0, small: 1, large: 2, legacy: 3 }[d.size] ?? 1;
  if (d.size !== 'arena') { plan.push({ type: 'entry' }); for (let i = 0; i < fights; i++) plan.push({ type: 'fight' }); }
  d.bosses.forEach((b, i) => {
    plan.push({ type: 'boss', enc: i, ids: Array.isArray(b) ? b : [b] });
    if (i < d.bosses.length - 1) for (let k = 0; k < (d.size === 'legacy' ? 2 : 1); k++) plan.push({ type: 'fight' });
  });
  const inst = { id: d.id, d, theme, rooms: [], walls: [], floors: [], fogs: [], bossRooms: [], mobs: [], graces: [], portals: [], props: [], lights: [], x0, y0 };
  let cx = x0, cyPrev = y0;
  plan.forEach((p, i) => {
    const big = p.type === 'boss' && (d.arenaBig || ['radahn', 'rykard', 'elden_beast', 'fire_giant', 'placidusax', 'malenia', 'mohg', 'astel'].includes(p.ids[0]));
    const [w, h] = d.size === 'arena' ? ROOM_DIMS.arena : p.type === 'boss' ? (big ? ROOM_DIMS.bossBig : ROOM_DIMS.boss) : ROOM_DIMS[p.type];
    const cy = i === 0 ? y0 : clamp(cyPrev + (R() - 0.5) * 260, y0 - 300, y0 + 300);
    const room = { ...p, x: cx, y: cy - h / 2, w, h, cx: cx + w / 2, cy };
    inst.rooms.push(room); inst.floors.push(room);
    cx += w + 180;
    cyPrev = cy;
  });
  // corridors + walls with gaps
  const T = 40, GAP = 140;
  const gaps = inst.rooms.map(() => ({ l: null, r: null }));
  for (let i = 0; i < inst.rooms.length - 1; i++) {
    const a = inst.rooms[i], b = inst.rooms[i + 1];
    const top = Math.max(a.y, b.y) + 90, bot = Math.min(a.y + a.h, b.y + b.h) - 90;
    const gy = (top + bot) / 2;
    gaps[i].r = gy; gaps[i + 1].l = gy;
    const cor = { x: a.x + a.w, y: gy - GAP / 2, w: b.x - (a.x + a.w), h: GAP, corridor: true };
    inst.floors.push(cor);
    inst.walls.push({ x: cor.x, y: cor.y - T, w: cor.w, h: T, kind: 'inst' }, { x: cor.x, y: cor.y + cor.h, w: cor.w, h: T, kind: 'inst' });
  }
  inst.rooms.forEach((r, i) => {
    const g = gaps[i];
    inst.walls.push({ x: r.x - T, y: r.y - T, w: r.w + 2 * T, h: T, kind: 'inst' }, { x: r.x - T, y: r.y + r.h, w: r.w + 2 * T, h: T, kind: 'inst' });
    for (const [side, gy] of [['l', g.l], ['r', g.r]]) {
      const wx = side === 'l' ? r.x - T : r.x + r.w;
      if (gy == null) inst.walls.push({ x: wx, y: r.y, w: T, h: r.h, kind: 'inst' });
      else {
        inst.walls.push({ x: wx, y: r.y, w: T, h: gy - GAP / 2 - r.y, kind: 'inst' });
        inst.walls.push({ x: wx, y: gy + GAP / 2, w: T, h: r.y + r.h - (gy + GAP / 2), kind: 'inst' });
      }
    }
    // fog walls around boss rooms
    if (r.type === 'boss') {
      inst.bossRooms.push(r);
      if (g.l != null) inst.fogs.push({ x: r.x - T, y: g.l - GAP / 2, w: T, h: GAP, key: bossKey(d.id, r.enc), enter: true, inst: d.id });
      if (g.r != null) inst.fogs.push({ x: r.x + r.w, y: g.r - GAP / 2, w: T, h: GAP, key: bossKey(d.id, r.enc), inst: d.id });
    }
  });
  // spawn, graces, mobs, props
  const first = inst.rooms[0];
  inst.spawn = { x: first.x + 90, y: first.cy };
  if (d.size !== 'arena') inst.portals.push({ x: first.x + 40, y: first.cy, kind: 'leave', label: 'Leave', inst: d.id });
  // Sites of Grace: one at the entrance and one in the room right before each boss
  // (unless a grace is already close), never two in neighbouring rooms.
  const graceNames = (d.graces && d.graces.length) ? [...d.graces] : [d.name];
  let gi = 0, lastGraceRoom = -9;
  const nextName = (fallback) => (gi < graceNames.length ? graceNames[gi++] : fallback);
  inst.rooms.forEach((r, i) => {
    if (r.type === 'entry') { inst.graces.push({ name: nextName(d.name), x: r.cx + 40, y: r.cy - 40, inst: d.id, room: i }); lastGraceRoom = i; }
    const next = inst.rooms[i + 1];
    if (r.type === 'fight' && next && next.type === 'boss' && i - lastGraceRoom >= 2) {
      inst.graces.push({ name: nextName(d.name + ' - ' + BOSSES[next.ids[0]].name.split(',')[0] + '\'s Gate'), x: r.x + r.w - 110, y: r.y + 70, inst: d.id, room: i });
      lastGraceRoom = i;
    }
    if (r.type === 'boss') lastGraceRoom = i;
    if (r.type === 'fight') {
      const pool = THEME_MOBS[theme] || THEME_MOBS.catacomb;
      const n = 3 + ((R() * 3) | 0);
      const roomGraces = inst.graces.filter((g) => g.room === i);
      for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
        const mx = r.x + 80 + R() * (r.w - 160), my = r.y + 80 + R() * (r.h - 160);
        if (roomGraces.some((g) => Math.hypot(g.x - mx, g.y - my) < 360)) continue;
        inst.mobs.push({ type: pick2(pool, R), x: mx, y: my }); k++;
      }
    }
    if (r.type === 'boss') {
      const nm = r.ids.length > 1 ? (BOSSES[r.ids[0]].name + (r.ids[0] === r.ids[1] ? 's' : ' & ' + BOSSES[r.ids[1]].name)) : BOSSES[r.ids[0]].name;
      inst.graces.push({ name: nm, x: r.cx, y: r.cy + r.h * 0.3, inst: d.id, afterBoss: bossKey(d.id, r.enc) });
      const last = r.enc === d.bosses.length - 1;
      if (last) {
        if (d.next) inst.portals.push({ x: r.x + r.w - 70, y: r.cy, kind: 'next', to: d.next, label: 'Continue: ' + DUNGEON_BY_ID[d.next].name, after: bossKey(d.id, r.enc), inst: d.id });
        else inst.portals.push({ x: r.x + r.w - 70, y: r.cy, kind: 'exit', label: d.id === 'ashen' ? 'Mend the Elden Ring' : 'Return to the Lands Between', after: bossKey(d.id, r.enc), inst: d.id });
      }
    }
    // props by theme
    const torchy = ['castle', 'catacomb', 'tower', 'manor', 'volcano', 'redmane', 'sol', 'leyndell', 'academy', 'evergaol', 'mohgwyn', 'ashen', 'farum'].includes(theme);
    if (torchy) {
      for (let tx = r.x + 60; tx < r.x + r.w - 40; tx += 180) {
        inst.props.push({ type: theme === 'academy' || theme === 'evergaol' ? 'bluetorch' : 'torch', x: tx, y: r.y + 10, r: 6 });
      }
    }
    if (r.type !== 'entry' && R() < 0.8) {
      const n = r.type === 'boss' ? 4 : 2;
      for (let k = 0; k < n; k++) {
        const px = r.x + 70 + R() * (r.w - 140), py = r.y + 70 + R() * (r.h - 140);
        if (Math.hypot(px - r.cx, py - r.cy) < 220) continue;
        const t = theme === 'cave' || theme === 'tunnel' ? 'boulder' : theme === 'underground' || theme === 'rot' ? 'crystal' : theme === 'haligtree' ? 'branch' : 'pillar';
        inst.props.push({ type: t, x: px, y: py, r: t === 'branch' ? 0 : 14, v: R() });
      }
    }
    if (theme === 'rot' || theme === 'mohgwyn') inst.props.push({ type: 'pool', x: r.cx + (R() - 0.5) * r.w * 0.5, y: r.cy + (R() - 0.5) * r.h * 0.5, r: 0, rad: 70 + R() * 60, el: theme === 'rot' ? 'rot' : 'blood' });
  });
  if (d.pickup) {
    const r = inst.bossRooms[0] ? inst.rooms[inst.rooms.indexOf(inst.bossRooms[0]) - 1] || first : first;
    inst.pickup = { id: 'inst_' + d.id, x: r.cx, y: r.cy + 60, weapon: d.pickup, inst: d.id };
  }
  inst.bounds = { x0: x0 - 200, y0: y0 - 1000, x1: cx, y1: y0 + 1000 };
  for (const f of inst.floors) markFloor(f);
  INST[d.id] = inst; INST_LIST.push(inst);
}
const pick2 = (arr, R) => arr[(R() * arr.length) | 0];
const bossKey = (instId, enc) => 'd:' + instId + ':' + enc;
const DUNGEON_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
const instAt = (x, y) => {
  if (x < POCKET_X - 1000) return null;
  for (const i of INST_LIST) if (x > i.bounds.x0 && x < i.bounds.x1 && y > i.bounds.y0 && y < i.bounds.y1) return i;
  return null;
};

// ================================================================ overworld structures, decoration, lights
const WALLS = [];       // collidable rects {x,y,w,h,kind}
const COLLIDERS = [];   // collidable circles
const SEGS = [];        // barrier segments {ax,ay,bx,by}
const DECOR = [];       // drawn props
const TUFTS = [];
const LIGHTS = [];
const ENTRANCES = [];   // overworld dungeon entrances {d, x, y}
const LOC_W = LOCS.map(([name, x, y, kind]) => ({ name, x: x * MU, y: y * MU, kind }));
const GRACE_W = GRACES_OW.map(([name, x, y]) => ({ name, x: x * MU, y: y * MU }));

function nearRoad(x, y) {
  let m = 1e9;
  for (const p of ROADS_W) for (let i = 0; i < p.length - 1; i++) m = Math.min(m, segDist(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return m;
}
function addStructure(L, R) {
  const { x, y, kind } = L;
  const rect = (rx, ry, w, h, k = 'ruin') => WALLS.push({ x: rx, y: ry, w, h, kind: k });
  const keepClear = (px, py) => ENTRANCES.some((e) => Math.hypot(e.x - px, e.y - py) < 160) || GRACE_W.some((g) => Math.hypot(g.x - px, g.y - py) < 120);
  switch (kind) {
    case 'church': {
      const w = 170, h = 220, x0 = x - w / 2, yy = y - h / 2;
      if (keepClear(x, y)) break;
      rect(x0, yy, w, 22); rect(x0, yy, 22, h); rect(x0 + w - 22, yy, 22, h - 30);
      rect(x0, yy + h - 22, w / 2 - 34, 22); rect(x0 + w / 2 + 34, yy + h - 22, w / 2 - 34, 22);
      DECOR.push({ type: 'altar', x, y: yy + 50, r: 0 });
      break;
    }
    case 'ruins': {
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU, d = 90 + R() * 160, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (keepClear(px, py) || nearRoad(px, py) < 50) continue;
        if (R() < 0.5) rect(px - 50, py - 11, 100 + R() * 60, 22); else rect(px - 11, py - 50, 22, 100 + R() * 60);
      }
      break;
    }
    case 'fort': {
      const s = 380, x0 = x - s / 2, yy = y - s / 2;
      if (keepClear(x, y)) { rect(x0, yy, s, 30, 'castle'); break; }
      rect(x0, yy, s, 30, 'castle'); rect(x0, yy, 30, s, 'castle'); rect(x0 + s - 30, yy, 30, s, 'castle');
      rect(x0, yy + s - 30, s / 2 - 60, 30, 'castle'); rect(x0 + s / 2 + 60, yy + s - 30, s / 2 - 60, 30, 'castle');
      LIGHTS.push({ x, y, r: 220, col: [255, 160, 70], a: 0.8, flicker: R() * 9 });
      DECOR.push({ type: 'torch', x: x - 60, y: yy + s - 40, r: 6, v: R() }, { type: 'torch', x: x + 60, y: yy + s - 40, r: 6, v: R() });
      break;
    }
    case 'village': {
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU, d = 80 + R() * 200, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (keepClear(px, py) || nearRoad(px, py) < 60) continue;
        rect(px - 40, py - 30, 80, 60, 'hut');
      }
      break;
    }
    case 'castle': {
      // a castle keep: a solid walled block with towers, kept clear of the entrance
      let w = 520, h = 380, cx = x, cy = y;
      const ent = ENTRANCES.find((e) => Math.hypot(e.x - x, e.y - y) < 600);
      if (ent) { const a = Math.atan2(y - ent.y, x - ent.x); cx = ent.x + Math.cos(a) * 340; cy = ent.y + Math.sin(a) * 300; }
      const reg = regionAt(cx, cy);
      if (!reg || reg.blocked) break;
      rect(cx - w / 2, cy - h / 2, w, h, 'keep');
      for (const [tx, ty] of [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2]]) DECOR.push({ type: 'tower', x: tx, y: ty + 20, r: 40, v: R() });
      break;
    }
    case 'tower': {
      if (keepClear(x, y)) break;
      DECOR.push({ type: 'tower', x, y, r: 46, v: R(), tall: true });
      break;
    }
    case 'erdtree': {
      if (keepClear(x, y)) break;
      DECOR.push({ type: 'minorerdtree', x, y, r: 36, v: R() });
      LIGHTS.push({ x, y: y - 60, r: 320, col: [255, 210, 110], a: 0.9, flicker: 0 });
      break;
    }
  }
}
// spread out Sites of Grace that sit almost on top of each other at this map scale
function spreadGraces() {
  const MIN = 700;
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (let i = 0; i < GRACE_W.length; i++) for (let j = i + 1; j < GRACE_W.length; j++) {
      const a = GRACE_W[i], b = GRACE_W[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d >= MIN) continue;
      const push = Math.min(40, (MIN - d) / 2), ux = dx / d, uy = dy / d;
      if (walkable(a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; moved = true; }
      if (walkable(b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; moved = true; }
    }
    if (!moved) break;
  }
}
function genWorld() {
  const R = rng(4242);
  spreadGraces();
  // barrier segments
  for (const line of BARRIERS) for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = toW(line[i]), [bx, by] = toW(line[i + 1]);
    SEGS.push({ ax, ay, bx, by });
  }
  // dungeon entrances on the overworld
  for (const d of DUNGEONS) {
    if (d.hidden) continue;
    ENTRANCES.push({ d, x: d.x * MU, y: d.y * MU });
  }
  for (const L of LOC_W) addStructure(L, R);
  // overworld shacks at graces named "...Shack"
  for (const g of GRACE_W) if (/Shack/.test(g.name)) WALLS.push({ x: g.x - 50, y: g.y - 110, w: 100, h: 60, kind: 'hut' });
  // scatter decor per region
  const avoid = (x, y, pad) => {
    if (nearRoad(x, y) < pad) return true;
    if (ENTRANCES.some((e) => Math.hypot(e.x - x, e.y - y) < 130)) return true;
    if (GRACE_W.some((g) => Math.hypot(g.x - x, g.y - y) < 130)) return true;
    if (FIELD_BOSSES.some((b) => Math.hypot(b[1] * MU - x, b[2] * MU - y) < 180)) return true;
    if (ITEMS_OW.some((i) => Math.hypot(i.x * MU - x, i.y * MU - y) < 60)) return true;
    if (WALLS.some((w) => x > w.x - 40 && x < w.x + w.w + 40 && y > w.y - 40 && y < w.y + w.h + 40)) return true;
    return false;
  };
  const recipes = {
    limgrave: [['tree', 0.9], ['bush', 0.8], ['flowers', 0.6], ['boulder', 0.12]],
    stormhill: [['deadtree', 0.5], ['boulder', 0.4], ['bones', 0.3], ['drybush', 0.6]],
    weeping: [['tree', 0.9, 'pink'], ['bush', 0.8], ['flowers', 0.9], ['boulder', 0.1]],
    liurnia: [['tree', 0.4, 'blue'], ['bush', 0.5], ['flowers', 0.3], ['boulder', 0.15]],
    caelid: [['rottree', 0.6], ['boulder', 0.3], ['bones', 0.3], ['rotbloom', 0.5]],
    dragonbarrow: [['rottree', 0.4], ['boulder', 0.6], ['bones', 0.4]],
    altus: [['tree', 0.8, 'gold'], ['bush', 0.6], ['flowers', 0.6], ['boulder', 0.12]],
    gelmir: [['deadtree', 0.5], ['boulder', 0.8], ['bones', 0.3]],
    forbidden: [['pine', 0.5], ['boulder', 0.4]],
    mountaintops: [['pine', 0.8], ['boulder', 0.5], ['icerock', 0.3]],
    snowfield: [['pine', 0.7], ['icerock', 0.4], ['boulder', 0.2]],
  };
  const TUFT_DENS = { limgrave: 1, weeping: 1, liurnia: 0.7, altus: 1, stormhill: 0.5, caelid: 0.5, dragonbarrow: 0.3, gelmir: 0.2, forbidden: 0.2, mountaintops: 0.2, snowfield: 0.2 };
  for (const reg of RW) {
    if (reg.blocked) continue;
    const area = (reg.bb.x1 - reg.bb.x0) * (reg.bb.y1 - reg.bb.y0);
    const base = area / (400 * 400);
    for (const [type, dens, variant] of recipes[reg.biome] || []) {
      const n = Math.round(base * dens * 0.55);
      let made = 0, tries = 0;
      while (made < n && tries++ < n * 4) {
        const x = reg.bb.x0 + R() * (reg.bb.x1 - reg.bb.x0), y = reg.bb.y0 + R() * (reg.bb.y1 - reg.bb.y0);
        if (!pip(x, y, reg.pts)) continue;
        const pt = patchAt(x, y);
        if (pt && pt.tex !== 'sand') continue;
        const collides = ['tree', 'deadtree', 'rottree', 'pine', 'boulder', 'icerock'].includes(type);
        if (avoid(x, y, collides ? 90 : 40)) continue;
        const d = { type, x, y, r: collides ? (type === 'boulder' || type === 'icerock' ? 14 + R() * 10 : 10) : 0, s: type.includes('tree') || type === 'pine' ? 24 + R() * 22 : 0.7 + R() * 0.7, v: R(), variant };
        DECOR.push(d); made++;
      }
    }
    const nt = Math.round(base * 4 * (TUFT_DENS[reg.biome] || 0));
    const tc = BIOMES[reg.biome].tuft;
    for (let i = 0, made = 0; i < nt * 2 && made < nt; i++) {
      const x = reg.bb.x0 + R() * (reg.bb.x1 - reg.bb.x0), y = reg.bb.y0 + R() * (reg.bb.y1 - reg.bb.y0);
      if (!pip(x, y, reg.pts) || patchAt(x, y) || nearRoad(x, y) < 45) continue;
      TUFTS.push({ x, y, s: 0.6 + R() * 0.8, col: tc[(R() * tc.length) | 0], dry: reg.biome === 'stormhill' || reg.biome === 'caelid' });
      made++;
    }
  }
  // graveyard stones around The First Step
  const fs = GRACE_W[0];
  for (let i = 0; i < 26; i++) {
    const a = R() * TAU, d = 120 + R() * 240, x = fs.x + Math.cos(a) * d * 1.4, y = fs.y + Math.sin(a) * d * 0.55;
    if (avoid(x, y, 50) || !regionAt(x, y) || regionAt(x, y).blocked) continue;
    DECOR.push({ type: 'grave', x, y, r: 0, v: R() });
  }
  // dungeon instances
  DUNGEONS.forEach((d, i) => genInstance(d, i));
  for (const inst of INST_LIST) {
    for (const w of inst.walls) WALLS.push(w);
    for (const p of inst.props) {
      DECOR.push(p);
      if (p.type === 'torch' || p.type === 'bluetorch') LIGHTS.push({ x: p.x, y: p.y - 26, r: 230, col: p.type === 'bluetorch' ? [120, 160, 255] : [255, 160, 70], a: 0.95, flicker: Math.random() * 10 });
    }
  }
  for (const d of DECOR) if (d.r) COLLIDERS.push(d);
  bucketize();
}

// spatial buckets for drawing
const BK = 400;
const DECOR_BK = new Map(), TUFT_BK = new Map(), WALL_BK = new Map();
function bkAdd(map, o, x0, y0, x1, y1) {
  for (let cx = Math.floor(x0 / BK); cx <= Math.floor(x1 / BK); cx++)
    for (let cy = Math.floor(y0 / BK); cy <= Math.floor(y1 / BK); cy++) {
      const k = cx + ',' + cy; if (!map.has(k)) map.set(k, []); map.get(k).push(o);
    }
}
function bucketize() {
  for (const d of DECOR) bkAdd(DECOR_BK, d, d.x, d.y, d.x, d.y);
  for (const t of TUFTS) bkAdd(TUFT_BK, t, t.x, t.y, t.x, t.y);
  for (const w of WALLS) bkAdd(WALL_BK, w, w.x, w.y, w.x + w.w, w.y + w.h);
}
function inView(map, v) {
  const out = new Set();
  for (let cx = Math.floor(v.x0 / BK); cx <= Math.floor(v.x1 / BK); cx++)
    for (let cy = Math.floor(v.y0 / BK); cy <= Math.floor(v.y1 / BK); cy++) {
      const l = map.get(cx + ',' + cy); if (l) for (const o of l) out.add(o);
    }
  return out;
}

// ================================================================ collision
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
  for (const s of SEGS) gridAdd({ seg: s }, Math.min(s.ax, s.bx) - 20, Math.min(s.ay, s.by) - 20, Math.max(s.ax, s.bx) + 20, Math.max(s.ay, s.by) + 20);
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
function circleSeg(e, s) {
  const R2 = e.r + 12;
  const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((e.x - s.ax) * dx + (e.y - s.ay) * dy) / l2, 0, 1);
  const px = s.ax + dx * t, py = s.ay + dy * t, ex = e.x - px, ey = e.y - py, d = Math.hypot(ex, ey);
  if (d >= R2) return false;
  if (d > 1e-3) { e.x = px + (ex / d) * R2; e.y = py + (ey / d) * R2; }
  return true;
}
// all fog gates: dungeon fogs (from instances)
const FOGS = [];
function fogSolid(f) { return !G.defeated.has(f.key); }
function walkable(x, y) {
  if (x < OW.w + 500) { const r = regionAt(x, y); return !!r && !r.blocked; }
  return FLOOR.has(Math.floor(x / FL_CELL) + ',' + Math.floor(y / FL_CELL));
}
function collide(e) {
  let hit = false;
  const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
  const seen = new Set();
  for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
    const list = GRID.get(ix + ',' + iy); if (!list) continue;
    for (const o of list) {
      if (seen.has(o)) continue; seen.add(o);
      if (o.rect) hit = circleRect(e, o.rect) || hit;
      else if (o.seg) hit = circleSeg(e, o.seg) || hit;
      else {
        const t = o.circ, dx = e.x - t.x, dy = e.y - t.y, rr = e.r + t.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); e.x = t.x + (dx / d) * rr; e.y = t.y + (dy / d) * rr; hit = true; }
      }
    }
  }
  for (const f of FOGS) if (fogSolid(f) && Math.abs(e.x - (f.x + f.w / 2)) < 140 && Math.abs(e.y - (f.y + f.h / 2)) < 140) hit = circleRect(e, f) || hit;
  return hit;
}
function moveEnt(e, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    const ox = e.x, oy = e.y;
    e.x += dx / steps; e.y += dy / steps;
    hit = collide(e) || hit;
    if (!walkable(e.x, e.y)) {
      // slide along the coast/edge: try each axis on its own
      if (walkable(e.x, oy)) e.y = oy;
      else if (walkable(ox, e.y)) e.x = ox;
      else { e.x = ox; e.y = oy; }
      hit = true;
    }
  }
  return hit;
}
function pointBlocked(x, y) {
  if (!walkable(x, y)) return true;
  const list = GRID.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL));
  if (list) for (const o of list) {
    if (o.rect && x > o.rect.x && x < o.rect.x + o.rect.w && y > o.rect.y && y < o.rect.y + o.rect.h) return true;
    if (o.circ && o.circ.r > 10 && Math.hypot(x - o.circ.x, y - o.circ.y) < o.circ.r) return true;
  }
  return false;
}

// ================================================================ atmosphere
const AMB_KEYS = ['dark', 'tintA', 'sky', 'rain', 'leaves', 'embers', 'snow', 'spores', 'mist', 'dust', 'stars', 'ash'];
function ambFor(biome) {
  const a = (BIOMES[biome] || BIOMES.limgrave).amb;
  const o = { tint: a.tint || [255, 255, 255] };
  for (const k of AMB_KEYS) o[k] = a[k] || 0;
  return o;
}
const _ambCur = ambFor('limgrave');
function ambNow(dt) {
  // blend toward the current place's atmosphere for smooth transitions
  let target;
  if (G.inst) target = ambFor(INST[G.inst].theme);
  else { const r = regionAt(P.x, P.y); target = ambFor(r ? r.biome : 'limgrave'); }
  const k = Math.min(1, dt * 1.5);
  for (const key of AMB_KEYS) _ambCur[key] += (target[key] - _ambCur[key]) * k;
  _ambCur.tint = _ambCur.tint.map((v, i) => v + (target.tint[i] - v) * k);
  return _ambCur;
}
