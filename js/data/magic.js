'use strict';
/* Incantations (Finger Seal), sorceries (Astrologer's Staff) and Spirit Ashes (Spirit Calling Bell). */

// kind: heal | buff | proj | multi | beam ; dmg values are scaled by Mind and level when cast
const SPELLS = {
  heal: { name: 'Heal', type: 'incant', fp: 32, kind: 'heal', amt: 0.35, cast: 0.9, col: '255,220,130', desc: 'Restores HP to you and your summoned spirits.' },
  golden_vow: { name: 'Golden Vow', type: 'incant', fp: 28, kind: 'buff', dmg: 1.15, def: 0.88, dur: 80, cast: 1.0, col: '255,220,130', desc: 'Raises attack and defense for you and your spirits.' },
  flame_strength: { name: 'Flame, Grant Me Strength', type: 'incant', fp: 27, kind: 'buff', dmg: 1.2, def: 1, dur: 30, cast: 0.9, col: '255,140,60', desc: 'Raises physical and fire attack.' },
  black_flame: { name: 'Black Flame', type: 'incant', fp: 20, kind: 'proj', dmg: 40, spd: 430, r: 14, el: 'blackflame', burn: 5, cast: 0.6, desc: 'Godskin black flame. Burns away a share of the foe\'s HP.' },
  lightning_spear: { name: 'Lightning Spear', type: 'incant', fp: 18, kind: 'proj', dmg: 58, spd: 760, r: 10, el: 'lightning', cast: 0.55, desc: 'Hurls a spear of ancient dragon lightning.' },
  glintstone_pebble: { name: 'Glintstone Pebble', type: 'sorc', fp: 7, kind: 'proj', dmg: 32, spd: 560, r: 8, el: 'magic', homing: 2.5, cast: 0.45, desc: 'Fires a glintstone shard that seeks its target.' },
  rock_sling: { name: 'Rock Sling', type: 'sorc', fp: 18, kind: 'multi', n: 3, dmg: 30, spd: 520, r: 12, el: 'gravity', cast: 0.6, desc: 'Pulls rocks from the earth with gravity and flings them.' },
  comet_azur: { name: 'Comet Azur', type: 'sorc', fp: 40, kind: 'beam', dmg: 16, len: 460, dur: 2.2, el: 'magic', cast: 0.8, desc: 'A torrent of glintstone magic. Hold still while it flows.' },
  full_moon: { name: "Rennala's Full Moon", type: 'sorc', fp: 50, kind: 'proj', dmg: 170, spd: 170, r: 34, el: 'magic', homing: 0.7, cast: 1.4, desc: 'Calls the Full Moon of the Carian queen.' },
};

// summoned with the Spirit Calling Bell during boss fights
const ASHES = {
  wolves: { name: 'Lone Wolf Ashes', fp: 42, n: 3, kind: 'wolf', hp: 110, dmg: 14, desc: 'Summons three spirit wolves that hunt in a pack.' },
  jellyfish: { name: 'Jellyfish Ashes', fp: 31, n: 1, kind: 'jelly', hp: 170, dmg: 13, desc: 'Summons a jellyfish that floats behind you and spits poison.' },
  tiche: { name: 'Black Knife Tiche', fp: 98, n: 1, kind: 'tiche', hp: 260, dmg: 24, desc: 'A Black Knife Assassin. Her blades carry Destined Death.' },
  mimic: { name: 'Mimic Tear Ashes', hpCost: 0.3, n: 1, kind: 'mimic', hp: 0, dmg: 0, desc: 'A perfect copy of you, wielding your weapon. Costs HP instead of FP.' },
};

// where things are earned: boss kills, graces where NPCs wait, and items lying in the world
const MAGIC_FROM_BOSS = {
  godskin_apostle: { spell: 'black_flame' },
  rennala: { spell: 'full_moon' },
  alecto: { ash: 'tiche' },
  mimic_tear: { ash: 'mimic' },
};
const MAGIC_FROM_GRACE = {
  'Church of Elleh': { bell: true, ash: 'wolves', who: 'Renna' },
  'Stormhill Shack': { ash: 'jellyfish', who: 'Roderika' },
};
const MAGIC_ITEMS = [
  { id: 'm_staff', x: 39.4, y: 51.6, staff: true, spell: 'glintstone_pebble' },
  { id: 'm_vow', x: 53, y: 27.2, spell: 'golden_vow' },
  { id: 'm_flame', x: 70.8, y: 71, spell: 'flame_strength' },
  { id: 'm_rock', x: 65.2, y: 68.2, spell: 'rock_sling' },
  { id: 'm_spear', x: 89.2, y: 45.2, spell: 'lightning_spear' },
  { id: 'm_comet', x: 41, y: 8.8, spell: 'comet_azur' },
];
