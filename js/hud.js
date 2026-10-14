'use strict';
/* HUD, on-screen controls and title banners. */

function bar(x, y, w, h, frac, lagFrac, col, col2) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (lagFrac > frac) { ctx.fillStyle = '#d8c070'; ctx.fillRect(x, y, w * clamp(lagFrac, 0, 1), h); }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col2); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = 'rgba(201,169,90,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
}
function drawHUD() {
  const x0 = 16 + SAFE.l, y0 = 12 + SAFE.t;
  const maxBar = W * 0.4;
  const hpW = Math.min(maxBar, 110 + P.maxHp * 0.45), fpW = Math.min(maxBar, 80 + P.maxFp * 0.8), stW = Math.min(maxBar, 90 + P.maxSt * 0.7);
  bar(x0, y0, hpW, 9, P.hp / P.maxHp, P.hpLag / P.maxHp, '#7a1410', '#c0302a');
  if (P.dd) { ctx.fillStyle = 'rgba(30,8,14,0.9)'; ctx.fillRect(x0 + hpW * (1 - P.dd), y0, hpW * P.dd, 9); ctx.fillStyle = '#c83250'; ctx.fillRect(x0 + hpW * (1 - P.dd), y0, 1.5, 9); }
  bar(x0, y0 + 14, fpW, 5, P.fp / P.maxFp, 0, '#1a3a8a', '#4a7ae0');
  bar(x0, y0 + 24, stW, 5, Math.max(0, P.st) / P.maxSt, 0, '#2c6a2a', '#5aa850');
  // statuses building up
  let sy = y0 + 36;
  for (const [k, col, label] of [['bleed', '#c0182a', 'Blood'], ['rot', '#e05a2a', 'Rot'], ['poison', '#8ac050', 'Poison'], ['frost', '#bfe8ff', 'Frost']]) {
    const v = P.status[k] || 0;
    if (v < 1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0, sy, 60, 4);
    ctx.fillStyle = col; ctx.fillRect(x0, sy, 60 * Math.min(1, v / 100), 4);
    ctx.font = '9px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillStyle = col; ctx.fillText(label, x0 + 64, sy + 5);
    sy += 8;
  }
  // flask + weapon box
  ctx.textAlign = 'left';
  const fy = Math.max(sy + 2, y0 + 38);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0 - 2, fy - 2, 58, 26);
  ctx.strokeStyle = 'rgba(201,169,90,0.5)'; ctx.strokeRect(x0 - 2.5, fy - 2.5, 59, 27);
  for (const [i, n, col] of [[0, P.flasks, '#e39a3a'], [1, P.fpFlasks, '#6a98f0']]) {
    const fx = x0 + i * 28;
    ctx.fillStyle = n > 0 ? col : 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(fx + 13, fy + 13, 6.5, 0, TAU); ctx.fill(); ctx.fillRect(fx + 10.5, fy + 2, 5, 6);
    ctx.font = 'bold 11px Georgia, serif'; ctx.fillStyle = '#efe3c2'; ctx.fillText(n, fx + 20, fy + 22);
  }
  ctx.font = '11px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(232,223,200,0.8)';
  const wl = wLevel();
  ctx.fillText(weapon().name + (wl ? ' +' + wl : ''), x0 + 64, fy + 10);
  if (weapon().skill) { ctx.font = '9px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(150,180,255,0.75)'; ctx.fillText(weapon().skill.name + ' (' + weapon().skill.fp + ' FP)', x0 + 64, fy + 22); }
  let byy = fy + 38;
  if (P.buffT > 0) { ctx.fillStyle = '#ffe08a'; ctx.fillText('✦ ' + Math.ceil(P.buffT) + 's', x0, byy); byy += 12; }
  ctx.font = '9px Cinzel, Georgia, serif';
  for (const b of P.buffs) { ctx.fillStyle = `rgb(${b.col || '255,220,130'})`; ctx.fillText('✦ ' + b.name + '  ' + Math.ceil(b.t) + 's', x0, byy); byy += 11; }
  // runes, level, clock, great runes
  ctx.textAlign = 'right';
  const rx = W - 16 - SAFE.r - (showTouch ? 140 : 0), ry = 30 + SAFE.t;
  ctx.font = 'bold 15px Cinzel, Georgia, serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('✧ ' + P.runes, rx + 1, ry + 1);
  ctx.fillStyle = G.runeShow > 0 ? '#ffe39a' : '#d8c38e'; ctx.fillText('✧ ' + P.runes, rx, ry);
  ctx.font = '10px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(216,195,142,0.7)';
  const hh = Math.floor(G.clock), mm = Math.floor((G.clock % 1) * 60);
  ctx.fillText('LV ' + level() + (G.inst ? '' : '   ' + (isNight() ? '☾ ' : '☀ ') + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')), rx, ry + 14);
  if (P.greatRunes.length) { ctx.fillStyle = '#ffe8a0'; ctx.fillText('Great Runes ' + P.greatRunes.length, rx, ry + 27); }

  // boss bars (bottom centre, Elden Ring style)
  const bosses = G.activeBosses;
  const bw = Math.min(W * (showTouch ? 0.42 : 0.6), 560), bx = (W - bw) / 2;
  bosses.forEach((b, i) => {
    const by = H - 28 - SAFE.b - (showTouch ? 6 : 0) - (bosses.length - 1 - i) * 34;
    ctx.textAlign = 'left'; ctx.font = '13px Cinzel, Georgia, serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(b.name, bx + 1, by - 7);
    ctx.fillStyle = '#e8dfc8'; ctx.fillText(b.name, bx, by - 8);
    bar(bx, by, bw, 7, b.hp / b.maxHp, b.hpLag / b.maxHp, '#6a1410', '#b0281e');
    ctx.fillStyle = '#c9a95a';
    for (const ex of [bx - 6, bx + bw + 6]) { ctx.beginPath(); ctx.moveTo(ex, by - 2); ctx.lineTo(ex + 4, by + 3.5); ctx.lineTo(ex, by + 9); ctx.lineTo(ex - 4, by + 3.5); ctx.fill(); }
    if (b.dmgAccum > 0) { ctx.textAlign = 'right'; ctx.fillStyle = '#eee'; ctx.fillText(Math.round(b.dmgAccum), bx + bw, by - 8); }
  });

  if (showTouch && G.state === 'play') drawControls();
  else if (G.state === 'play') {
    ctx.textAlign = 'center'; ctx.font = '14px Cinzel, Georgia, serif';
    if (G.ctxAction) {
      const tw = ctx.measureText('[F]  ' + G.ctxAction.label).width + 40;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - tw / 2, H * 0.62 - 20, tw, 30);
      ctx.fillStyle = '#e8dfc8'; ctx.fillText('[F]  ' + G.ctxAction.label, W / 2, H * 0.62);
    }
    ctx.font = '10px Georgia, serif'; ctx.fillStyle = 'rgba(232,223,200,0.45)'; ctx.textAlign = 'right';
    ctx.fillText('M map · T Torrent · L skill · Q lock · E flask', W - 16, H - 12);
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
      ctx.font = `${Math.round(b.r * 0.5)}px Cinzel, Georgia, serif`;
      const w = Math.max(b.r * 5.4, ctx.measureText(G.ctxAction.label).width + 40), h = b.r * 1.3;
      ctx.fillStyle = b.down ? 'rgba(201,169,90,0.4)' : 'rgba(10,8,5,0.65)';
      ctx.strokeStyle = 'rgba(201,169,90,0.85)'; ctx.lineWidth = 1.5;
      roundRect(b.x - w / 2, b.y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe3c2'; ctx.textAlign = 'center';
      ctx.fillText(G.ctxAction.label, b.x, b.y + h * 0.13);
      continue;
    }
    let active = b.down;
    const dim = (b.name === 'heal' && P.flasks <= 0) || (b.name === 'fpheal' && P.fpFlasks <= 0) || (b.name === 'skill' && (!weapon().skill || P.fp < weapon().skill.fp)) || (b.name === 'whistle' && !!G.inst) || (b.name === 'spell' && (!curSpell() || P.fp < curSpell().fp || (curSpell().type === 'sorc' && !P.staff)));
    if (b.name === 'lock') active = active || !!P.lock;
    if (b.name === 'whistle') active = active || P.mounted;
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
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = dim ? 'rgba(239,227,194,0.3)' : '#efe3c2'; ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const s = r * 0.42;
  switch (b.name) {
    case 'attack':
      ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(s, -s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.3); ctx.lineTo(-s * 0.3, s * 0.9); ctx.stroke(); break;
    case 'heavy':
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(s, -s); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.lineTo(s * 0.2, s); ctx.stroke(); break;
    case 'roll':
      ctx.beginPath(); ctx.arc(0, 0, s * 0.8, -Math.PI * 0.2, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.85); ctx.lineTo(s * 0.7, -s * 0.35); ctx.lineTo(s * 0.2, -s * 0.4); ctx.stroke(); break;
    case 'heal':
      ctx.fillStyle = dim ? 'rgba(227,154,58,0.3)' : '#e39a3a';
      ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.6, 0, TAU); ctx.fill();
      ctx.fillRect(-s * 0.2, -s * 0.8, s * 0.4, s * 0.6);
      ctx.fillStyle = '#efe3c2'; ctx.font = `bold ${Math.round(r * 0.4)}px Georgia, serif`; ctx.textAlign = 'center';
      ctx.fillText(P.flasks, s * 0.95, s * 1.15); break;
    case 'fpheal':
      ctx.fillStyle = dim ? 'rgba(106,152,240,0.3)' : '#6a98f0';
      ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.6, 0, TAU); ctx.fill();
      ctx.fillRect(-s * 0.2, -s * 0.8, s * 0.4, s * 0.6);
      ctx.fillStyle = '#efe3c2'; ctx.font = `bold ${Math.round(r * 0.45)}px Georgia, serif`; ctx.textAlign = 'center';
      ctx.fillText(P.fpFlasks, s * 1.05, s * 1.25); break;
    case 'lock':
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); break;
    case 'skill':
      ctx.fillStyle = dim ? 'rgba(120,160,255,0.3)' : '#8ab0ff';
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? s * 0.35 : s * 0.85; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); break;
    case 'spell': {
      const sp = curSpell(), inc = sp && sp.type === 'incant';
      ctx.fillStyle = dim ? 'rgba(239,227,194,0.3)' : inc ? '#ffe08a' : '#9ab8ff';
      if (inc) { // finger seal
        ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.45, s * 0.55, 0, 0, TAU); ctx.fill();
        ctx.fillRect(-s * 0.1, -s * 0.9, s * 0.2, s * 0.7);
      } else { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.8); ctx.lineTo(s * 0.4, -s * 0.5); ctx.stroke(); ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.6, s * 0.28, 0, TAU); ctx.fill(); }
      if (sp) { ctx.font = `${Math.round(r * 0.3)}px Cinzel, Georgia, serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(239,227,194,0.85)'; ctx.fillText(sp.name.length > 14 ? sp.name.slice(0, 13) + '…' : sp.name, 0, r + 11); }
      break;
    }
    case 'cycle':
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s * 0.8, -2.6, 1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.0, s * 0.8); ctx.lineTo(-s * 0.5, s * 0.55); ctx.lineTo(-s * 0.1, s * 0.3); ctx.stroke(); break;
    case 'pause':
      ctx.fillRect(-5, -6, 3.5, 12); ctx.fillRect(1.5, -6, 3.5, 12); break;
    case 'map':
      ctx.lineWidth = 1.6; ctx.strokeRect(-7, -6, 14, 12); ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, 6); ctx.moveTo(3, -6); ctx.lineTo(3, 6); ctx.stroke(); break;
    case 'whistle':
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(-1, 2, 6, 4, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(8, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, -6); ctx.lineTo(5, -9); ctx.stroke(); break;
  }
  if (!['pause', 'map', 'whistle'].includes(b.name) && r > 26) {
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
    const cy = big ? H * 0.45 : b.style === 'zone' ? H * 0.2 : b.style === 'loc' ? H * 0.32 : H * 0.36;
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
    if (b.style === 'zone' || b.style === 'loc') {
      const w2 = Math.min(W * 0.4, ctx.measureText(b.text).width * 0.8 + 60);
      const g = ctx.createLinearGradient(-w2, 0, w2, 0);
      g.addColorStop(0, 'rgba(201,169,90,0)'); g.addColorStop(0.5, 'rgba(201,169,90,0.8)'); g.addColorStop(1, 'rgba(201,169,90,0)');
      ctx.fillStyle = g; ctx.fillRect(-w2, fs * 0.7, w2 * 2, 1.2);
    }
    ctx.shadowColor = b.col; ctx.shadowBlur = big ? 24 : 10;
    ctx.fillStyle = b.col; ctx.fillText(b.text, 0, fs * 0.35);
    ctx.shadowBlur = 0;
    if (b.sub) {
      let sfs = Math.round(Math.max(12, fs * 0.36));
      ctx.font = `${sfs}px Cinzel, Georgia, serif`;
      const sw = ctx.measureText(b.sub).width;
      if (sw > W * 0.9) { sfs = Math.max(9, Math.floor(sfs * (W * 0.9) / sw)); ctx.font = `${sfs}px Cinzel, Georgia, serif`; }
      ctx.fillStyle = '#d8ccae'; ctx.fillText(b.sub, 0, fs * 0.35 + Math.max(16, fs * 0.6));
    }
    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.globalAlpha = 1;
}
