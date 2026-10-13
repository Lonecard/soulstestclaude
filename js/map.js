'use strict';
/* The world map: parchment-style overview of the Lands Between with fast travel. */

const MAP_COL = {
  limgrave: '#7f8446', stormhill: '#757160', weeping: '#86844e', liurnia: '#5f7884', caelid: '#94472e', dragonbarrow: '#7d3527',
  altus: '#ad9a4c', gelmir: '#53453c', forbidden: '#848480', mountaintops: '#c3c8cc', snowfield: '#dde1e6', cliff: '#463f34', castle: '#6a6458', capital: '#b4975a',
};
const PATCH_COL = { lake: '#6f8f9e', rotwater: '#a24b2c', lava: '#c0501c', ice: '#a9c4d2', sand: '#b29c70', academy: '#7084a8' };
const MAPPX = 16; // pixels per map unit in the cached base map
let mapBase = null;
const MV = { zoom: 1, cx: 50, cy: 55, sel: null, drag: null, pinch: null };

function buildMapBase() {
  const c = document.createElement('canvas');
  c.width = c.height = 100 * MAPPX;
  const m = c.getContext('2d');
  const S = MAPPX;
  m.fillStyle = '#26343a'; m.fillRect(0, 0, c.width, c.height);
  // sea texture
  m.strokeStyle = 'rgba(255,255,255,0.05)'; m.lineWidth = 1;
  for (let y = 0; y < c.height; y += 14) { m.beginPath(); for (let x = 0; x < c.width; x += 20) m.lineTo(x, y + Math.sin(x * 0.05 + y) * 3); m.stroke(); }
  const path = (poly) => { m.beginPath(); poly.forEach(([x, y], i) => (i ? m.lineTo(x * S, y * S) : m.moveTo(x * S, y * S))); m.closePath(); };
  for (const r of REGIONS) { path(r.poly); m.strokeStyle = 'rgba(200,180,130,0.5)'; m.lineWidth = 10; m.stroke(); }
  for (const r of REGIONS) { path(r.poly); m.fillStyle = MAP_COL[r.biome] || '#666'; m.fill(); }
  // relief noise
  const R = rng(55);
  for (let i = 0; i < 9000; i++) {
    const x = R() * 100, y = R() * 100, reg = REGIONS.find((r) => pip(x, y, r.poly));
    if (!reg) continue;
    m.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
    m.fillRect(x * S, y * S, 2 + R() * 4, 2 + R() * 4);
  }
  m.save();
  m.beginPath();
  for (const r of REGIONS) r.poly.forEach(([x, y], i) => (i ? m.lineTo(x * S, y * S) : m.moveTo(x * S, y * S)));
  m.clip('nonzero');
  for (const p of PATCHES) {
    m.fillStyle = PATCH_COL[p.tex] || '#888';
    if (p.poly) path(p.poly); else { m.beginPath(); m.arc(p.circle[0] * S, p.circle[1] * S, p.circle[2] * S, 0, TAU); }
    m.fill();
  }
  m.restore();
  for (const r of REGIONS) if (r.blocked) {
    path(r.poly); m.fillStyle = r.biome === 'cliff' ? 'rgba(30,26,20,0.35)' : 'rgba(255,255,255,0.08)'; m.fill();
    if (r.biome !== 'cliff') { m.strokeStyle = '#3a3226'; m.lineWidth = 4; m.stroke(); }
  }
  m.strokeStyle = 'rgba(30,24,16,0.85)'; m.lineWidth = 4; m.lineCap = 'round';
  for (const line of BARRIERS) { m.beginPath(); line.forEach(([x, y], i) => (i ? m.lineTo(x * S, y * S) : m.moveTo(x * S, y * S))); m.stroke(); }
  m.setLineDash([6, 5]); m.strokeStyle = 'rgba(240,220,170,0.55)'; m.lineWidth = 2;
  for (const road of ROADS) { m.beginPath(); road.forEach(([x, y], i) => (i ? m.lineTo(x * S, y * S) : m.moveTo(x * S, y * S))); m.stroke(); }
  m.setLineDash([]);
  // Erdtree
  const g = m.createRadialGradient(65 * S, 22.6 * S, 0, 65 * S, 22.6 * S, 9 * S);
  g.addColorStop(0, 'rgba(255,220,120,0.8)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  m.fillStyle = g; m.beginPath(); m.arc(65 * S, 22.6 * S, 9 * S, 0, TAU); m.fill();
  // parchment tint
  m.globalCompositeOperation = 'multiply';
  const pg = m.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.2, c.width / 2, c.height / 2, c.width * 0.75);
  pg.addColorStop(0, '#f0e2c0'); pg.addColorStop(1, '#a08860');
  m.fillStyle = pg; m.fillRect(0, 0, c.width, c.height);
  m.globalCompositeOperation = 'source-over';
  mapBase = c;
}

const mapCvs = document.getElementById('mapc');
const mctx = mapCvs.getContext('2d');
function openMap() {
  if (G.state !== 'play') return;
  if (!mapBase) buildMapBase();
  G.state = 'map'; G.menuOpenedAt = performance.now();
  clearPointers();
  const px = G.inst ? INST[G.inst].d.x : P.x / MU, py = G.inst ? INST[G.inst].d.y : P.y / MU;
  MV.cx = px; MV.cy = py; MV.zoom = 2.2; MV.sel = null;
  document.getElementById('map').classList.add('show');
  sizeMap(); drawMap(); updateMapPanel();
}
function closeMap() {
  document.getElementById('map').classList.remove('show');
  G.state = 'play'; last = performance.now(); clearPointers();
}
function sizeMap() {
  const r = mapCvs.getBoundingClientRect();
  mapCvs.width = Math.round(r.width * DPR); mapCvs.height = Math.round(r.height * DPR);
}
const mapScale = () => (Math.min(mapCvs.width, mapCvs.height) / 100) * MV.zoom;
const m2s = (x, y) => { const s = mapScale(); return [(x - MV.cx) * s + mapCvs.width / 2, (y - MV.cy) * s + mapCvs.height / 2]; };
const s2m = (sx, sy) => { const s = mapScale(); return [(sx - mapCvs.width / 2) / s + MV.cx, (sy - mapCvs.height / 2) / s + MV.cy]; };
function mapGraces() { return G.graces.map((g, i) => ({ g, i })).filter(({ g }) => !g.inst && g.found); }
function drawMap() {
  const m = mctx, w = mapCvs.width, h = mapCvs.height, s = mapScale(), k = DPR;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.fillStyle = '#1a1612'; m.fillRect(0, 0, w, h);
  const [ox, oy] = m2s(0, 0);
  m.imageSmoothingEnabled = true;
  m.drawImage(mapBase, ox, oy, 100 * s, 100 * s);
  m.textAlign = 'center';
  // region names
  for (const r of REGIONS) {
    if (r.blocked && r.biome === 'cliff') continue;
    const cx = r.poly.reduce((a, p) => a + p[0], 0) / r.poly.length, cy = r.poly.reduce((a, p) => a + p[1], 0) / r.poly.length;
    const [sx, sy] = m2s(cx, cy);
    m.font = `700 ${Math.round(Math.min(26, 6 + s * 0.9))}px Cinzel, Georgia, serif`;
    m.fillStyle = 'rgba(30,22,12,0.75)'; m.fillText(r.name.toUpperCase(), sx + k, sy + k);
    m.fillStyle = '#f2e6c4'; m.fillText(r.name.toUpperCase(), sx, sy);
  }
  // locations
  if (s > 18) {
    m.font = `${Math.round(9 * k)}px Georgia, serif`;
    for (const L of LOCS) {
      const [sx, sy] = m2s(L[1], L[2]);
      if (sx < -50 || sx > w + 50 || sy < -20 || sy > h + 20) continue;
      m.fillStyle = 'rgba(30,22,12,0.85)'; m.fillText(L[0], sx + 1, sy - 6 * k + 1);
      m.fillStyle = '#e8dcb8'; m.fillText(L[0], sx, sy - 6 * k);
    }
  }
  // dungeon markers
  for (const d of DUNGEONS) {
    if (d.hidden) continue;
    const [sx, sy] = m2s(d.x, d.y);
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    const done = d.bosses.every((_, i) => G.defeated.has(bossKey(d.id, i)));
    m.fillStyle = done ? 'rgba(120,110,90,0.9)' : d.theme === 'evergaol' ? '#7a8aff' : d.size === 'legacy' || d.size === 'large' ? '#e8c060' : '#c8b8a0';
    m.strokeStyle = '#1a140c'; m.lineWidth = 1.5 * k;
    m.beginPath();
    if (d.theme === 'evergaol') m.arc(sx, sy, 4 * k, 0, TAU);
    else if (d.size === 'legacy' || d.size === 'large') { m.moveTo(sx, sy - 6 * k); m.lineTo(sx + 5 * k, sy); m.lineTo(sx, sy + 6 * k); m.lineTo(sx - 5 * k, sy); m.closePath(); }
    else m.rect(sx - 3.5 * k, sy - 3.5 * k, 7 * k, 7 * k);
    m.fill(); m.stroke();
    if (s > 26) { m.font = `${Math.round(8 * k)}px Georgia, serif`; m.fillStyle = 'rgba(250,240,210,0.85)'; m.fillText(d.name, sx, sy + 14 * k); }
  }
  // defeated field bosses
  FIELD_BOSSES.forEach(([id, x, y], i) => {
    if (!G.defeated.has('f:' + i)) return;
    const [sx, sy] = m2s(x, y);
    m.strokeStyle = 'rgba(40,20,10,0.8)'; m.lineWidth = 2 * k;
    m.beginPath(); m.moveTo(sx - 4 * k, sy - 4 * k); m.lineTo(sx + 4 * k, sy + 4 * k); m.moveTo(sx + 4 * k, sy - 4 * k); m.lineTo(sx - 4 * k, sy + 4 * k); m.stroke();
  });
  // graces
  for (const { g, i } of mapGraces()) {
    const [sx, sy] = m2s(g.x / MU, g.y / MU);
    const sel = MV.sel === i;
    const gr = m.createRadialGradient(sx, sy, 0, sx, sy, (sel ? 14 : 9) * k);
    gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    m.fillStyle = gr; m.beginPath(); m.arc(sx, sy, (sel ? 14 : 9) * k, 0, TAU); m.fill();
    m.fillStyle = '#fff6d8'; m.beginPath(); m.arc(sx, sy, 2.4 * k, 0, TAU); m.fill();
    if (sel || s > 30) { m.font = `${Math.round((sel ? 11 : 8) * k)}px Cinzel, Georgia, serif`; m.fillStyle = 'rgba(20,14,8,0.85)'; m.fillText(g.name, sx + 1, sy - 10 * k + 1); m.fillStyle = '#ffe9a8'; m.fillText(g.name, sx, sy - 10 * k); }
  }
  // player
  const ppx = G.inst ? INST[G.inst].d.x : P.x / MU, ppy = G.inst ? INST[G.inst].d.y : P.y / MU;
  const [px, py] = m2s(ppx, ppy);
  m.save(); m.translate(px, py); m.rotate(P.face + Math.PI / 2);
  m.fillStyle = '#ffffff'; m.strokeStyle = '#000'; m.lineWidth = 1.5 * k;
  m.beginPath(); m.moveTo(0, -9 * k); m.lineTo(6 * k, 7 * k); m.lineTo(0, 3 * k); m.lineTo(-6 * k, 7 * k); m.closePath(); m.fill(); m.stroke();
  m.restore();
  // frame
  m.strokeStyle = 'rgba(201,169,90,0.6)'; m.lineWidth = 2 * k; m.strokeRect(k, k, w - 2 * k, h - 2 * k);
}
function updateMapPanel() {
  const info = document.getElementById('mapInfo'), btn = document.getElementById('mapTravel');
  if (MV.sel == null) {
    const r = G.inst ? INST[G.inst].d.name : (regionAt(P.x, P.y) || { name: 'The Lands Between' }).name;
    info.textContent = 'You are in ' + r + '. Tap a Site of Grace to travel.';
    btn.style.display = 'none';
  } else {
    const g = G.graces[MV.sel];
    info.textContent = g.name;
    btn.style.display = '';
    btn.disabled = !!G.arenaFight || G.activeBosses.length > 0;
    btn.textContent = btn.disabled ? 'Cannot travel during battle' : 'Travel';
  }
}
// interaction
const mptrs = new Map();
mapCvs.addEventListener('pointerdown', (e) => {
  mapCvs.setPointerCapture(e.pointerId);
  mptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (mptrs.size === 2) { const [a, b] = [...mptrs.values()]; MV.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: MV.zoom }; }
});
mapCvs.addEventListener('pointermove', (e) => {
  const p = mptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (mptrs.size === 2 && MV.pinch) {
    const [a, b] = [...mptrs.values()];
    MV.zoom = clamp(MV.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / MV.pinch.d, 0.9, 8);
  } else if (mptrs.size === 1) {
    const s = mapScale() / DPR;
    MV.cx -= dx / s; MV.cy -= dy / s;
  }
  drawMap();
});
function mapUp(e) {
  const p = mptrs.get(e.pointerId); if (!p) return;
  mptrs.delete(e.pointerId);
  if (mptrs.size < 2) MV.pinch = null;
  if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 8 && performance.now() - G.menuOpenedAt > 300) {
    const r = mapCvs.getBoundingClientRect();
    const sx = (e.clientX - r.left) * DPR, sy = (e.clientY - r.top) * DPR;
    let best = null, bd = 22 * DPR;
    for (const { g, i } of mapGraces()) { const [gx, gy] = m2s(g.x / MU, g.y / MU); const d = Math.hypot(gx - sx, gy - sy); if (d < bd) { bd = d; best = i; } }
    MV.sel = best; drawMap(); updateMapPanel();
  }
}
mapCvs.addEventListener('pointerup', mapUp);
mapCvs.addEventListener('pointercancel', mapUp);
mapCvs.addEventListener('wheel', (e) => { e.preventDefault(); MV.zoom = clamp(MV.zoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.9, 8); drawMap(); }, { passive: false });
document.getElementById('mapZoomIn').addEventListener('click', () => { MV.zoom = clamp(MV.zoom * 1.4, 0.9, 8); drawMap(); });
document.getElementById('mapZoomOut').addEventListener('click', () => { MV.zoom = clamp(MV.zoom / 1.4, 0.9, 8); drawMap(); });
document.getElementById('mapClose').addEventListener('click', closeMap);
document.getElementById('mapTravel').addEventListener('click', () => {
  if (MV.sel == null || G.arenaFight || G.activeBosses.length) return;
  G.graceIdx = MV.sel;
  closeMap();
  respawnAtGrace();
  sfx('fog');
  save();
});
window.addEventListener('resize', () => { if (G.state === 'map') { sizeMap(); drawMap(); } });
