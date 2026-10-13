'use strict';
/* Data: weapons, enemies, bosses and the world layout (Limgrave -> Stormhill -> Stormveil). */

// ---------------------------------------------------------------- weapons
// Light combo entries + heavy. wind/act/rec in seconds, range/arc in world units/radians.
const WEAPONS = {
  longsword: {
    name: 'Longsword', desc: 'A trusty straight sword. Balanced reach and speed.', style: 'sword',
    len: 46, w: 4, blade: '#c4c9d1', edge: '#f4f6f9', hilt: '#6a5528',
    l: [
      { wind: 0.11, act: 0.11, rec: 0.3, dmg: 24, range: 56, arc: 2.1, st: 13, lunge: 170, poise: 12, dir: 1 },
      { wind: 0.09, act: 0.11, rec: 0.3, dmg: 26, range: 56, arc: 2.2, st: 13, lunge: 160, poise: 12, dir: -1 },
      { wind: 0.16, act: 0.13, rec: 0.42, dmg: 34, range: 66, arc: 0.9, st: 17, lunge: 260, poise: 20, dir: 1, thrust: true },
    ],
    heavy: { wind: 0.4, act: 0.15, rec: 0.48, dmg: 56, range: 68, arc: 2.6, st: 28, lunge: 130, poise: 45, dir: 1 },
  },
  uchigatana: {
    name: 'Uchigatana', desc: 'Swift katana. Builds up blood loss.', style: 'katana', bleed: 32,
    len: 50, w: 3, blade: '#dadfe6', edge: '#ffffff', hilt: '#4a1c1c',
    l: [
      { wind: 0.08, act: 0.1, rec: 0.24, dmg: 20, range: 58, arc: 2.0, st: 11, lunge: 180, poise: 8, dir: 1 },
      { wind: 0.07, act: 0.1, rec: 0.24, dmg: 21, range: 58, arc: 2.1, st: 11, lunge: 170, poise: 8, dir: -1 },
      { wind: 0.09, act: 0.1, rec: 0.26, dmg: 22, range: 58, arc: 2.2, st: 12, lunge: 170, poise: 8, dir: 1 },
      { wind: 0.14, act: 0.12, rec: 0.4, dmg: 30, range: 70, arc: 0.8, st: 15, lunge: 290, poise: 14, dir: 1, thrust: true },
    ],
    heavy: { wind: 0.34, act: 0.14, rec: 0.44, dmg: 48, range: 70, arc: 2.8, st: 24, lunge: 210, poise: 30, dir: -1 },
  },
  zweihander: {
    name: 'Zweihander', desc: 'A colossal sword. Slow, but staggers anything.', style: 'great',
    len: 68, w: 7, blade: '#a9aeb6', edge: '#e8ebef', hilt: '#3c3020',
    l: [
      { wind: 0.22, act: 0.15, rec: 0.45, dmg: 46, range: 78, arc: 2.7, st: 20, lunge: 120, poise: 32, dir: 1 },
      { wind: 0.2, act: 0.15, rec: 0.48, dmg: 48, range: 78, arc: 2.7, st: 20, lunge: 120, poise: 32, dir: -1 },
    ],
    heavy: { wind: 0.6, act: 0.16, rec: 0.6, dmg: 96, range: 84, arc: 1.4, st: 36, lunge: 100, poise: 85, dir: 1, overhead: true },
  },
  halberd: {
    name: 'Golden Halberd', desc: 'The Tree Sentinel\'s halberd. Huge reach, blessed with gold.', style: 'halberd',
    len: 80, w: 4, blade: '#dcbc62', edge: '#fff2c4', hilt: '#5a4a2a',
    l: [
      { wind: 0.16, act: 0.14, rec: 0.38, dmg: 38, range: 90, arc: 2.3, st: 17, lunge: 110, poise: 22, dir: 1 },
      { wind: 0.14, act: 0.14, rec: 0.38, dmg: 40, range: 90, arc: 2.3, st: 17, lunge: 110, poise: 22, dir: -1 },
      { wind: 0.18, act: 0.14, rec: 0.46, dmg: 46, range: 104, arc: 0.6, st: 19, lunge: 220, poise: 28, dir: 1, thrust: true },
    ],
    heavy: { wind: 0.5, act: 0.16, rec: 0.56, dmg: 82, range: 96, arc: 1.3, st: 32, lunge: 120, poise: 70, dir: 1, overhead: true, holy: true },
  },
};

// ---------------------------------------------------------------- enemies
// look: visual description used by the renderer.
const ETYPES = {
  noble: {
    name: 'Wandering Noble', hp: 48, r: 12, speed: 44, poise: 10, aggro: 200, runes: 35,
    look: { kind: 'humanoid', body: '#6d5d7a', armor: '#8a7a96', robe: true, helm: 'noble', skin: '#a8987a', weapon: 'stick' },
    atks: { flail: { wind: 0.75, act: 0.3, rec: 0.8, dmg: 10, range: 40, arc: 2.4, lunge: 60, min: 0, max: 46, w: 1, track: 3 } },
  },
  soldier: {
    name: 'Godrick Soldier', hp: 85, r: 13, speed: 76, poise: 30, aggro: 260, runes: 70,
    look: { kind: 'humanoid', body: '#4e4434', armor: '#8b7a50', cape: '#6b5526', helm: 'kettle', weapon: 'sword', shield: 'round', shieldCol: '#6b5526' },
    atks: {
      slash: { wind: 0.58, act: 0.14, rec: 0.62, dmg: 17, range: 52, arc: 1.9, lunge: 130, min: 0, max: 60, w: 3, next: 'slash2', chain: 0.4, track: 5 },
      slash2: { wind: 0.36, act: 0.14, rec: 0.8, dmg: 17, range: 52, arc: 1.9, dir: -1, lunge: 130, w: 0, track: 4 },
      thrust: { wind: 0.75, act: 0.16, rec: 0.7, dmg: 20, range: 66, arc: 0.6, lunge: 260, min: 40, max: 110, w: 1, thrust: true, track: 4 },
    },
  },
  spearman: {
    name: 'Godrick Soldier', hp: 80, r: 13, speed: 72, poise: 30, aggro: 270, runes: 70,
    look: { kind: 'humanoid', body: '#4e4434', armor: '#8b7a50', cape: '#6b5526', helm: 'kettle', weapon: 'spear', shield: 'round', shieldCol: '#5d4a22' },
    atks: {
      poke: { wind: 0.5, act: 0.14, rec: 0.5, dmg: 16, range: 86, arc: 0.45, lunge: 120, thrust: true, min: 0, max: 92, w: 3, next: 'poke2', chain: 0.5, track: 5 },
      poke2: { wind: 0.3, act: 0.14, rec: 0.7, dmg: 16, range: 86, arc: 0.45, lunge: 120, thrust: true, w: 0, track: 4 },
      sweep: { wind: 0.7, act: 0.18, rec: 0.8, dmg: 20, range: 80, arc: 2.6, lunge: 60, min: 0, max: 70, w: 1, track: 4 },
    },
  },
  archer: {
    name: 'Godrick Archer', hp: 60, r: 12, speed: 82, poise: 18, aggro: 380, runes: 60, ranged: { keep: 230, flee: 110 },
    look: { kind: 'humanoid', body: '#3e3a30', armor: '#6f6448', cape: '#4b3d22', helm: 'hood', weapon: 'bow' },
    atks: { shoot: { wind: 0.95, act: 0.1, rec: 0.75, kind: 'arrow', dmg: 15, spd: 560, min: 50, max: 440, w: 1, track: 9 } },
  },
  wolf: {
    name: 'Wolf', hp: 46, r: 11, speed: 168, poise: 12, aggro: 300, runes: 40,
    look: { kind: 'wolf', body: '#4a463e', fur: '#6e685c' },
    atks: { bite: { wind: 0.42, act: 0.22, rec: 0.6, dmg: 12, range: 30, arc: 1.4, lunge: 380, min: 0, max: 140, w: 1, track: 7 } },
  },
  knight: {
    name: 'Godrick Knight', hp: 240, r: 15, speed: 70, poise: 75, aggro: 260, runes: 260, guard: true,
    look: { kind: 'humanoid', body: '#4a4030', armor: '#a8955c', cape: '#7a2a20', helm: 'knight', plume: '#b8322a', weapon: 'sword', shield: 'tower', shieldCol: '#8a3a26' },
    atks: {
      cut1: { wind: 0.5, act: 0.15, rec: 0.35, dmg: 22, range: 58, arc: 2.1, lunge: 160, min: 0, max: 66, w: 3, next: 'cut2', chain: 0.65, track: 6 },
      cut2: { wind: 0.34, act: 0.15, rec: 0.75, dmg: 22, range: 58, arc: 2.1, dir: -1, lunge: 160, w: 0, track: 5 },
      bash: { wind: 0.45, act: 0.12, rec: 0.6, dmg: 14, range: 36, arc: 1.4, lunge: 220, min: 0, max: 44, w: 1, track: 6 },
      lunge: { wind: 0.8, act: 0.16, rec: 0.7, dmg: 26, range: 72, arc: 0.6, lunge: 330, thrust: true, min: 60, max: 150, w: 1.5, track: 4 },
    },
  },
  banished: {
    name: 'Banished Knight', hp: 400, r: 16, speed: 80, poise: 110, aggro: 280, runes: 480,
    look: { kind: 'humanoid', body: '#2e3034', armor: '#5d636b', cape: '#3a2626', helm: 'banished', weapon: 'halberd' },
    atks: {
      h1: { wind: 0.55, act: 0.16, rec: 0.3, dmg: 26, range: 88, arc: 2.4, lunge: 150, min: 0, max: 92, w: 3, next: 'h2', chain: 0.8, track: 6 },
      h2: { wind: 0.36, act: 0.16, rec: 0.35, dmg: 26, range: 88, arc: 2.4, dir: -1, lunge: 150, w: 0, next: 'h3', chain: 0.55, track: 6 },
      h3: { wind: 0.7, act: 0.16, rec: 0.9, dmg: 36, kind: 'circle', off: 62, rad: 46, lunge: 120, w: 0, track: 4, shake: 8 },
      stab: { wind: 0.85, act: 0.16, rec: 0.8, dmg: 30, range: 104, arc: 0.5, lunge: 320, thrust: true, min: 70, max: 170, w: 1.5, track: 4 },
      jump: { wind: 0.5, act: 0.55, rec: 0.9, dmg: 34, kind: 'leap', rad: 54, min: 170, max: 400, w: 1, track: 6, shake: 10 },
    },
  },
  troll: {
    name: 'Troll', hp: 720, r: 34, speed: 58, poise: 220, aggro: 300, runes: 1100,
    look: { kind: 'troll', skin: '#7b6a58', cloth: '#4a3a2a' },
    atks: {
      sweep: { wind: 0.95, act: 0.26, rec: 1.0, dmg: 38, range: 124, arc: 2.6, lunge: 60, min: 0, max: 112, w: 2, track: 3, shake: 8 },
      stomp: { wind: 1.0, act: 0.15, rec: 1.1, dmg: 42, kind: 'circle', off: 26, rad: 70, min: 0, max: 80, w: 2, track: 2, shake: 14, ring: 150 },
      slam: { wind: 1.3, act: 0.2, rec: 1.2, dmg: 50, kind: 'circle', off: 84, rad: 58, lunge: 80, min: 40, max: 150, w: 1.5, track: 3, shake: 16 },
    },
  },
  // ---- bosses
  sentinel: {
    name: 'Tree Sentinel', hp: 1300, r: 30, speed: 125, poise: 230, aggro: 300, runes: 3200, boss: true, field: true,
    felled: 'ENEMY FELLED', drop: 'halberd', patrol: true,
    look: { kind: 'mounted', armor: '#c9a24a', trim: '#f0d890', horse: '#3a2e26', mane: '#ccc3a8' },
    atks: {
      sweepR: { wind: 0.65, act: 0.18, rec: 0.4, dmg: 30, range: 108, arc: 2.6, lunge: 200, min: 0, max: 110, w: 3, next: 'sweepL', chain: 0.6, track: 5 },
      sweepL: { wind: 0.45, act: 0.18, rec: 0.8, dmg: 30, range: 108, arc: 2.6, dir: -1, lunge: 200, w: 0, track: 5 },
      charge: { wind: 0.75, act: 0.6, rec: 0.9, dmg: 34, kind: 'dash', dashSpd: 620, rad: 34, min: 160, max: 520, w: 2, track: 4 },
      slam: { wind: 1.2, act: 0.18, rec: 1.0, dmg: 42, kind: 'circle', off: 70, rad: 60, lunge: 120, min: 0, max: 120, w: 2, track: 3, glint: 0.8, shake: 12, ring: 180, holy: true },
      thrust: { wind: 0.85, act: 0.16, rec: 0.75, dmg: 32, range: 130, arc: 0.5, lunge: 340, thrust: true, min: 80, max: 180, w: 1.5, track: 4 },
    },
  },
  margit: {
    name: 'Margit, the Fell Omen', hp: 1600, r: 22, speed: 104, poise: 190, aggro: 99999, runes: 7000, boss: true,
    felled: 'GREAT ENEMY FELLED', drone: 55, p2: 0.5,
    look: { kind: 'margit' },
    atks: {
      cane1: { wind: 0.45, act: 0.14, rec: 0.25, dmg: 22, range: 76, arc: 2.4, lunge: 210, min: 0, max: 86, w: 3, next: 'cane2', chain: 0.85, track: 6 },
      cane2: { wind: 0.34, act: 0.14, rec: 0.35, dmg: 22, range: 76, arc: 2.4, dir: -1, lunge: 210, w: 0, next: 'cane3', chain: 0.7, track: 6 },
      cane3: { wind: 1.35, act: 0.16, rec: 0.8, dmg: 38, kind: 'circle', off: 54, rad: 50, lunge: 160, w: 0, track: 3.5, glint: 1.0, shake: 10 },
      daggers: { wind: 0.55, act: 0.1, rec: 0.55, dmg: 16, kind: 'daggers', n: 3, min: 110, max: 620, w: 2, track: 6 },
      leap: { wind: 0.55, act: 0.6, rec: 0.85, dmg: 36, kind: 'leap', rad: 62, min: 170, max: 520, w: 2, track: 6, shake: 14 },
      hammer: { wind: 1.5, act: 0.18, rec: 0.9, dmg: 52, kind: 'circle', off: 62, rad: 74, lunge: 120, min: 0, max: 130, w: 2.5, p2: true, track: 3, glint: 1.1, shake: 18, ring: 190, holy: true, summon: 'hammer' },
      gsword: { wind: 0.75, act: 0.18, rec: 0.35, dmg: 36, range: 116, arc: 2.8, lunge: 240, min: 0, max: 120, w: 2, p2: true, track: 5, next: 'gsword2', chain: 0.75, summon: 'gsword' },
      gsword2: { wind: 0.5, act: 0.18, rec: 0.85, dmg: 36, range: 116, arc: 2.8, dir: -1, lunge: 240, w: 0, track: 5, summon: 'gsword' },
    },
  },
  godrick: {
    name: 'Godrick the Grafted', hp: 2300, r: 30, speed: 92, poise: 250, aggro: 99999, runes: 15000, boss: true,
    felled: 'DEMIGOD FELLED', drone: 41, p2: 0.5, p2roar: true,
    look: { kind: 'godrick' },
    atks: {
      axe1: { wind: 0.6, act: 0.18, rec: 0.3, dmg: 28, range: 100, arc: 2.6, lunge: 200, min: 0, max: 104, w: 3, next: 'axe2', chain: 0.8, track: 5 },
      axe2: { wind: 0.42, act: 0.18, rec: 0.4, dmg: 30, range: 100, arc: 2.6, dir: -1, lunge: 200, w: 0, next: 'axe3', chain: 0.6, track: 5 },
      axe3: { wind: 1.0, act: 0.18, rec: 0.9, dmg: 42, kind: 'circle', off: 70, rad: 64, lunge: 140, w: 0, track: 3, shake: 14, ring: 160 },
      stomps: { wind: 0.75, act: 0.9, rec: 0.9, dmg: 22, kind: 'stomps', n: 3, min: 0, max: 260, w: 2, track: 2, shake: 9 },
      whirl: { wind: 0.85, act: 1.1, rec: 1.0, dmg: 18, kind: 'spin', rad: 96, min: 0, max: 140, w: 1.5, track: 2 },
      leap: { wind: 0.6, act: 0.65, rec: 1.0, dmg: 44, kind: 'leap', rad: 74, min: 190, max: 560, w: 2, track: 6, shake: 18 },
      breath: { wind: 0.9, act: 1.4, rec: 0.9, dmg: 13, kind: 'breath', range: 250, cone: 0.42, min: 0, max: 240, w: 2.5, p2: true, track: 1.6 },
      dragon: { wind: 1.1, act: 0.18, rec: 0.9, dmg: 46, kind: 'circle', off: 76, rad: 66, lunge: 120, min: 0, max: 140, w: 2, p2: true, track: 3, glint: 0.85, shake: 16, ring: 220, fire: true },
    },
  },
};

// ---------------------------------------------------------------- world layout
const WORLD = { w: 2400, h: 7200 };
const WALLS = [
  // borders
  [0, 0, 2400, 40, 'cliff'], [0, 7160, 2400, 40, 'cliff'], [0, 0, 40, 7200, 'cliff'], [2360, 0, 40, 7200, 'cliff'],
  // Godrick's arena + castle top wall
  [600, 80, 1200, 40, 'castle'], [600, 80, 40, 620, 'castle'], [1760, 80, 40, 620, 'castle'],
  [40, 660, 1120, 40, 'castle'], [1240, 660, 1120, 40, 'castle'],
  // Stormveil outer walls
  [500, 700, 40, 1640, 'castle'], [1860, 700, 40, 1640, 'castle'],
  // Stormveil inner walls and towers
  [540, 1880, 560, 36, 'castle'], [1300, 1880, 560, 36, 'castle'],
  [540, 1280, 160, 36, 'castle'], [880, 1280, 980, 36, 'castle'],
  [1300, 1480, 120, 110, 'castle'], [760, 1560, 100, 90, 'castle'],
  [1080, 860, 30, 200, 'castle'], [1500, 960, 140, 30, 'castle'],
  // Margit's arena (Stormgate)
  [500, 2340, 660, 40, 'castle'], [1240, 2340, 660, 40, 'castle'],
  [700, 2380, 40, 480, 'castle'], [1660, 2380, 40, 480, 'castle'],
  [40, 2860, 1120, 40, 'castle'], [1240, 2860, 1120, 40, 'castle'],
  // Stormhill cliffs
  [40, 2900, 560, 640, 'cliff'], [40, 3540, 420, 600, 'cliff'], [40, 4140, 540, 560, 'cliff'],
  [1800, 2900, 560, 700, 'cliff'], [1700, 3600, 660, 500, 'cliff'], [1860, 4100, 500, 600, 'cliff'],
  [900, 3280, 140, 80, 'cliff'], [1420, 3920, 170, 70, 'cliff'], [680, 4200, 110, 110, 'cliff'], [1280, 3480, 60, 150, 'cliff'],
  // Limgrave: Church of Elleh
  [560, 6120, 100, 24, 'ruin'], [740, 6120, 100, 24, 'ruin'], [560, 6120, 24, 220, 'ruin'], [816, 6120, 24, 130, 'ruin'], [560, 6340, 150, 24, 'ruin'],
  // Limgrave: Gatefront Ruins
  [1380, 4900, 24, 180, 'ruin'], [1380, 4900, 150, 24, 'ruin'], [1600, 5080, 160, 24, 'ruin'], [1736, 4920, 24, 140, 'ruin'],
  // Limgrave misc ruins
  [300, 6700, 140, 24, 'ruin'], [1900, 5300, 24, 160, 'ruin'], [700, 5400, 120, 24, 'ruin'], [2000, 6800, 160, 24, 'ruin'],
].map(([x, y, w, h, kind]) => ({ x, y, w, h, kind }));

const FOGS = [
  { id: 'margitS', x: 1160, y: 2860, w: 80, h: 40, boss: 'margit', enter: true },
  { id: 'margitN', x: 1160, y: 2340, w: 80, h: 40, boss: 'margit' },
  { id: 'godrick', x: 1160, y: 660, w: 80, h: 40, boss: 'godrick', enter: true },
];
const ARENAS = {
  margit: { cx: 1200, cy: 2620, r: 420, spawn: [1200, 2500], rect: { x: 740, y: 2380, w: 920, h: 480 } },
  godrick: { cx: 1200, cy: 390, r: 520, spawn: [1200, 300], rect: { x: 640, y: 120, w: 1120, h: 540 } },
};

const PATHS = [
  [[1200, 7120], [1180, 6750], [1020, 6350], [1150, 5950], [1300, 5450], [1220, 5050], [1200, 4700]],
  [[1200, 4700], [1080, 4380], [1260, 4000], [1060, 3620], [1200, 3250], [1200, 2900]],
];

const ZONES = [
  { id: 'godrick', y0: 0, y1: 700, name: 'Stormveil Castle', ground: 'arena' },
  { id: 'castle', y0: 700, y1: 2340, name: 'Stormveil Castle', ground: 'stone' },
  { id: 'margit', y0: 2340, y1: 2900, name: 'Stormgate', ground: 'arena' },
  { id: 'stormhill', y0: 2900, y1: 4700, name: 'Stormhill', ground: 'rock' },
  { id: 'limgrave', y0: 4700, y1: 7200, name: 'Limgrave', ground: 'grass' },
];
// Atmosphere per zone: darkness, color grade, weather.
const AMB = {
  limgrave: { dark: 0.05, tint: [255, 205, 130], tintA: 0.12, sky: 1, rain: 0, leaves: 1, embers: 0 },
  stormhill: { dark: 0.32, tint: [110, 130, 168], tintA: 0.24, sky: 0.45, rain: 1, leaves: 0, embers: 0 },
  margit: { dark: 0.4, tint: [150, 140, 175], tintA: 0.2, sky: 0.2, rain: 0.45, leaves: 0, embers: 0.3 },
  castle: { dark: 0.5, tint: [255, 150, 80], tintA: 0.1, sky: 0, rain: 0, leaves: 0, embers: 1 },
  godrick: { dark: 0.46, tint: [255, 130, 70], tintA: 0.17, sky: 0, rain: 0, leaves: 0, embers: 1.6 },
};

const GRACE_DEFS = [
  { x: 1200, y: 6950, name: 'The First Step', guide: [1100, 6450] },
  { x: 700, y: 6230, name: 'Church of Elleh', guide: [1150, 5900] },
  { x: 1250, y: 5120, name: 'Gatefront', guide: [1100, 4400] },
  { x: 1000, y: 4500, name: 'Stormhill Shack', guide: [1150, 3700] },
  { x: 1000, y: 3150, name: 'Stormgate', guide: [1200, 2900] },
  { x: 1200, y: 2620, name: 'Castleward Tunnel', afterBoss: 'margit', guide: [1200, 2300] },
  { x: 1650, y: 1760, name: 'Rampart Tower', guide: [780, 1250] },
  { x: 880, y: 800, name: 'Liftside Chamber', guide: [1200, 690] },
  { x: 1200, y: 240, name: 'Godrick the Grafted', afterBoss: 'godrick' },
];

const SPAWNS = [
  // Limgrave
  ['noble', 1100, 6650], ['noble', 1260, 6600], ['noble', 1180, 6480],
  ['soldier', 950, 6020], ['soldier', 1080, 5980],
  ['wolf', 1900, 6400], ['wolf', 1980, 6460], ['wolf', 1850, 6520],
  ['wolf', 360, 5700], ['wolf', 430, 5640],
  ['soldier', 1460, 5010], ['spearman', 1620, 5150], ['archer', 1680, 4990], ['soldier', 1150, 5320],
  ['sentinel', 1650, 5950],
  // Stormhill
  ['wolf', 1000, 4300], ['wolf', 1070, 4250], ['wolf', 940, 4240],
  ['spearman', 1200, 3960], ['soldier', 1310, 3900],
  ['troll', 1500, 3720], ['archer', 820, 3800],
  ['soldier', 700, 3420], ['soldier', 770, 3470],
  ['spearman', 1300, 3350], ['soldier', 1100, 3420],
  // Stormveil Castle
  ['soldier', 1080, 2240], ['soldier', 1320, 2240],
  ['archer', 780, 2100], ['archer', 1620, 2100],
  ['spearman', 1000, 2010], ['spearman', 1400, 2010],
  ['knight', 1200, 1700], ['archer', 1720, 1420], ['soldier', 900, 1680], ['soldier', 1500, 1650],
  ['knight', 800, 1150], ['banished', 1250, 1060], ['spearman', 1550, 1100], ['archer', 1700, 860],
];

const ITEMS = [
  { id: 'uchi', x: 1560, y: 4990, weapon: 'uchigatana' },
  { id: 'zwei', x: 640, y: 3350, weapon: 'zweihander' },
  { id: 'seed1', x: 330, y: 5620, seed: true },
  { id: 'seed2', x: 1660, y: 3640, seed: true },
  { id: 'seed3', x: 1760, y: 1180, seed: true },
  { id: 'rune1', x: 2150, y: 6200, runes: 400 },
  { id: 'rune2', x: 640, y: 1400, runes: 900 },
];
