'use strict';
/* Attack building blocks. Every enemy/boss moveset is composed from these. */

// element colours (rgb strings) and the status they build up on the player
const EL = {
  phys: { c: '220,205,180', status: null },
  fire: { c: '255,140,60', status: null },
  holy: { c: '255,224,140', status: null },
  magic: { c: '120,180,255', status: null },
  frost: { c: '190,232,255', status: 'frost' },
  rot: { c: '220,90,40', status: 'rot' },
  blood: { c: '210,25,45', status: 'bleed' },
  lightning: { c: '255,232,110', status: null },
  redlightning: { c: '255,70,60', status: null },
  death: { c: '200,40,80', status: null },
  gravity: { c: '176,112,255', status: null },
  dark: { c: '150,110,255', status: null },
  blackflame: { c: '255,80,50', status: null },
  poison: { c: '130,190,70', status: 'poison' },
};
const elc = (el) => (EL[el] || EL.phys).c;

const M = {
  // chained melee swings: name1 -> name2 -> ...
  combo(name, n, o) {
    const out = {};
    for (let i = 1; i <= n; i++) {
      const last = i === n;
      out[name + i] = {
        wind: i === 1 ? o.wind || 0.55 : (o.wind || 0.55) * 0.65, act: o.act || 0.15, rec: last ? o.rec || 0.75 : 0.3,
        dmg: o.dmg * (last && o.fin ? o.fin : 1), range: o.range, arc: o.arc || 2.3, dir: i % 2 ? 1 : -1, lunge: o.lunge ?? 180,
        min: 0, max: o.max || o.range + 10, w: i === 1 ? o.w ?? 3 : 0, next: last ? undefined : name + (i + 1), chain: o.chain ?? 0.75,
        track: o.track || 5, el: o.el, status: o.status, p2: o.p2, thrust: last && o.finThrust,
      };
    }
    return out;
  },
  thrust(name, o) { return { [name]: { wind: o.wind || 0.75, act: 0.16, rec: o.rec || 0.7, dmg: o.dmg, range: o.range, arc: 0.55, lunge: o.lunge || 320, thrust: true, min: o.min ?? 50, max: o.max || o.range + 80, w: o.w ?? 1.5, track: 4, el: o.el, status: o.status, p2: o.p2 } }; },
  slam(name, o) { return { [name]: { wind: o.wind || 1.0, act: 0.16, rec: o.rec || 0.9, dmg: o.dmg, kind: 'circle', off: o.off, rad: o.rad, lunge: o.lunge ?? 100, min: 0, max: o.max || o.off + o.rad, w: o.w ?? 2, track: o.track || 3, glint: o.glint, shake: o.shake || 10, ring: o.ring, el: o.el, status: o.status, p2: o.p2, summon: o.summon, next: o.next, chain: o.chain } }; },
  leap(name, o) { return { [name]: { wind: o.wind || 0.55, act: o.air || 0.6, rec: o.rec || 0.9, dmg: o.dmg, kind: 'leap', rad: o.rad, min: o.min || 160, max: o.max || 480, w: o.w ?? 1.5, track: 6, shake: o.shake || 12, ring: o.ring, el: o.el, p2: o.p2 } }; },
  charge(name, o) { return { [name]: { wind: o.wind || 0.7, act: o.act || 0.55, rec: o.rec || 0.8, dmg: o.dmg, kind: 'dash', dashSpd: o.spd || 620, rad: o.rad || 30, min: o.min || 150, max: o.max || 500, w: o.w ?? 1.5, track: 4, el: o.el, p2: o.p2 } }; },
  spin(name, o) { return { [name]: { wind: o.wind || 0.8, act: o.act || 1.0, rec: o.rec || 0.9, dmg: o.dmg, kind: 'spin', rad: o.rad, chase: o.chase ?? 70, min: 0, max: o.max || o.rad + 40, w: o.w ?? 1.2, track: 2, el: o.el, status: o.status, p2: o.p2 } }; },
  stomps(name, o) { return { [name]: { wind: o.wind || 0.75, act: 0.9, rec: o.rec || 0.9, dmg: o.dmg, kind: 'stomps', n: o.n || 3, maxR: o.maxR || 200, min: 0, max: o.max || 220, w: o.w ?? 1.5, track: 2, shake: 9, el: o.el, p2: o.p2 } }; },
  breath(name, o) { return { [name]: { wind: o.wind || 0.9, act: o.act || 1.3, rec: o.rec || 0.9, dmg: o.dmg, kind: 'breath', range: o.range || 240, cone: o.cone || 0.42, min: 0, max: o.max || o.range || 240, w: o.w ?? 2, track: o.track || 1.6, el: o.el || 'fire', status: o.status, p2: o.p2 } }; },
  volley(name, o) { return { [name]: { wind: o.wind || 0.7, act: 0.12, rec: o.rec || 0.6, dmg: o.dmg, kind: 'volley', n: o.n || 3, spread: o.spread ?? 0.22, spd: o.spd || 300, homing: o.homing || 0, pr: o.pr || 8, min: o.min ?? 90, max: o.max || 600, w: o.w ?? 1.5, track: 6, el: o.el || 'magic', status: o.status, p2: o.p2, delayEach: o.delayEach || 0 } }; },
  strikes(name, o) { return { [name]: { wind: o.wind || 0.7, act: 0.1, rec: o.rec || 0.7, dmg: o.dmg, kind: 'strikes', n: o.n || 4, rad: o.rad || 46, spread: o.spread ?? 90, delay: o.delay || 0.9, min: o.min ?? 0, max: o.max || 650, w: o.w ?? 1.5, track: 4, el: o.el || 'lightning', status: o.status, p2: o.p2 } }; },
  beam(name, o) { return { [name]: { wind: o.wind || 1.0, act: o.act || 0.9, rec: o.rec || 0.8, dmg: o.dmg, kind: 'beam', len: o.len || 420, width: o.width || 26, sweep: o.sweep || 0, min: o.min ?? 80, max: o.max || 420, w: o.w ?? 1.3, track: o.track || 2, el: o.el || 'magic', p2: o.p2, glint: o.glint } }; },
  nova(name, o) { return { [name]: { wind: o.wind || 1.0, act: 0.1, rec: o.rec || 1.0, dmg: o.dmg, kind: 'nova', maxR: o.maxR || 260, min: 0, max: o.max || 160, w: o.w ?? 1.2, track: 0, shake: 10, el: o.el || 'fire', status: o.status, p2: o.p2 } }; },
  pool(name, o) { return { [name]: { wind: o.wind || 0.8, act: 0.1, rec: o.rec || 0.8, dmg: o.dmg, kind: 'pool', rad: o.rad || 70, life: o.life || 5, n: o.n || 1, min: o.min ?? 0, max: o.max || 500, w: o.w ?? 1.2, track: 4, el: o.el || 'rot', status: o.status, p2: o.p2 } }; },
  daggers(name, o) { return { [name]: { wind: o.wind || 0.55, act: 0.1, rec: o.rec || 0.55, dmg: o.dmg, kind: 'daggers', n: o.n || 3, min: o.min ?? 110, max: o.max || 620, w: o.w ?? 1.5, track: 6, el: o.el || 'holy', p2: o.p2 } }; },
  blink(name, o) { return { [name]: { wind: o.wind || 0.35, act: 0.1, rec: 0.05, dmg: 0, kind: 'blink', min: o.min || 120, max: o.max || 600, w: o.w ?? 1, track: 6, next: o.next, chain: 1, p2: o.p2, el: o.el } }; },
  arrow(name, o) { return { [name]: { wind: o.wind || 0.95, act: 0.1, rec: o.rec || 0.75, dmg: o.dmg, kind: 'arrow', spd: o.spd || 560, min: o.min ?? 50, max: o.max || 460, w: o.w ?? 1, track: 9, el: o.el, p2: o.p2 } }; },
};
const merge = (...parts) => Object.assign({}, ...parts);

// ---------------------------------------------------------------- archetype kits
// s = size scale (1 = man-sized), d = base damage
const K = {
  sword: (s, d, o = {}) => merge(
    M.combo('sl', o.hits || 3, { dmg: d, range: 60 * s, arc: 2.2, lunge: 190, el: o.el, status: o.status, wind: o.wind || 0.5 }),
    M.thrust('th', { dmg: d * 1.3, range: 80 * s, el: o.el }),
    M.leap('lp', { dmg: d * 1.4, rad: 50 * s, el: o.el })),
  greatsword: (s, d, o = {}) => merge(
    M.combo('gs', 2, { dmg: d, range: 80 * s, arc: 2.6, lunge: 160, wind: 0.75, el: o.el, status: o.status, fin: 1.2 }),
    M.slam('ov', { dmg: d * 1.6, off: 60 * s, rad: 52 * s, wind: 1.1, glint: o.glint, ring: o.ring, el: o.el }),
    M.spin('sp', { dmg: d * 0.7, rad: 80 * s, act: 0.8, el: o.el })),
  axe: (s, d, o = {}) => merge(
    M.combo('ax', 3, { dmg: d, range: 72 * s, arc: 2.5, lunge: 190, wind: 0.6, el: o.el, fin: 1.3 }),
    M.slam('ch', { dmg: d * 1.6, off: 58 * s, rad: 50 * s, wind: 1.0, ring: o.ring, el: o.el }),
    M.leap('lp', { dmg: d * 1.5, rad: 56 * s, el: o.el })),
  halberd: (s, d, o = {}) => merge(
    M.combo('hb', 2, { dmg: d, range: 96 * s, arc: 2.6, lunge: 200, wind: 0.65, el: o.el, status: o.status }),
    M.thrust('th', { dmg: d * 1.2, range: 120 * s, lunge: 340, el: o.el }),
    M.slam('ov', { dmg: d * 1.5, off: 70 * s, rad: 56 * s, glint: o.glint, ring: o.ring, el: o.el })),
  katana: (s, d, o = {}) => merge(
    M.combo('kt', o.hits || 4, { dmg: d * 0.75, range: 64 * s, arc: 2.2, lunge: 220, wind: 0.4, el: o.el, status: o.status || 'bleed', chain: 0.85 }),
    M.thrust('th', { dmg: d * 1.2, range: 86 * s, lunge: 380, el: o.el, status: o.status || 'bleed' }),
    M.blink('bl', { next: 'kt1' })),
  twinblade: (s, d, o = {}) => merge(
    M.combo('tw', 4, { dmg: d * 0.7, range: 66 * s, arc: 2.6, lunge: 170, wind: 0.42, el: o.el, chain: 0.85 }),
    M.spin('sp', { dmg: d * 0.5, rad: 74 * s, act: 1.0, chase: 110, el: o.el })),
  colossal: (s, d, o = {}) => merge(
    M.combo('sw', 2, { dmg: d, range: 110 * s, arc: 2.8, lunge: 60, wind: 0.95, rec: 1.0, el: o.el }),
    M.slam('sm', { dmg: d * 1.4, off: 70 * s, rad: 58 * s, wind: 1.2, shake: 14, ring: 150 * s, el: o.el }),
    M.stomps('st', { dmg: d * 0.6, n: 2, maxR: 160 * s, el: o.el })),
  beast: (s, d, o = {}) => merge(
    M.combo('bt', 3, { dmg: d * 0.8, range: 46 * s, arc: 1.8, lunge: 300, wind: 0.42, el: o.el, status: o.status, chain: 0.7 }),
    M.charge('pn', { dmg: d * 1.2, spd: 560, rad: 24 * s, min: 120, max: 420, el: o.el }),
    M.leap('lp', { dmg: d * 1.4, rad: 48 * s, el: o.el, min: 130, max: 380 })),
  dragon: (s, d, o = {}) => merge(
    M.combo('bi', 2, { dmg: d, range: 90 * s, arc: 1.8, lunge: 160, wind: 0.75, el: 'phys', track: 4 }),
    M.slam('cl', { dmg: d * 1.3, off: 60 * s, rad: 60 * s, wind: 0.9, shake: 12 }),
    M.breath('br', { dmg: d * 0.35, range: 260 * s, cone: 0.5, el: o.el || 'fire', status: o.status, act: 1.6 }),
    M.leap('fl', { dmg: d * 1.5, rad: 80 * s, air: 1.0, wind: 0.8, min: 200, max: 700, shake: 18, ring: 220 }),
    o.wing === false ? {} : M.nova('wg', { dmg: d * 0.5, maxR: 220 * s, el: 'phys', w: 0.8 }),
    o.strikes ? M.strikes('ls', { dmg: d * 0.8, n: 5, rad: 50, el: o.el, spread: 110 }) : {}),
  caster: (s, d, o = {}) => merge(
    M.volley('vo', { dmg: d * 0.6, n: 5, spread: 0.18, spd: 340, homing: 1.2, el: o.el || 'magic' }),
    M.beam('bm', { dmg: d * 0.5, len: 460, width: 30, el: o.el || 'magic' }),
    M.nova('nv', { dmg: d * 0.8, maxR: 230, el: o.el || 'magic' }),
    M.strikes('st', { dmg: d * 0.9, n: 5, rad: 55, el: o.el || 'magic', spread: 120 })),
  bird: (s, d, o = {}) => merge(
    M.combo('pk', 2, { dmg: d, range: 80 * s, arc: 2.2, lunge: 160, wind: 0.65, el: o.el }),
    M.leap('dv', { dmg: d * 1.4, rad: 64 * s, air: 0.9, min: 150, max: 560, el: o.el }),
    M.volley('df', { dmg: d * 0.6, n: 3, spread: 0.3, spd: 220, homing: 1.6, el: o.el || 'death', pr: 10 }),
    M.nova('cw', { dmg: d * 0.7, maxR: 200, el: o.el || 'death' })),
  tree: (s, d, o = {}) => merge(
    M.combo('hm', 2, { dmg: d, range: 110 * s, arc: 2.6, lunge: 80, wind: 0.95, rec: 1.0 }),
    M.slam('sm', { dmg: d * 1.5, off: 76 * s, rad: 64 * s, wind: 1.2, shake: 16, ring: 180 }),
    M.strikes('ho', { dmg: d * 0.9, n: 6, rad: 48, el: o.el || 'holy', spread: 140 }),
    M.charge('rl', { dmg: d * 1.2, spd: 520, rad: 40 * s, min: 160, max: 460 })),
  serpent: (s, d, o = {}) => merge(
    M.combo('bi', 2, { dmg: d, range: 96 * s, arc: 1.4, lunge: 340, wind: 0.6, el: o.el, status: o.status }),
    M.spin('wh', { dmg: d * 0.6, rad: 110 * s, act: 1.0, chase: 40, el: o.el }),
    M.pool('pl', { dmg: d * 0.18, rad: 80, n: 3, life: 6, el: o.el || 'fire', status: o.status })),
};
