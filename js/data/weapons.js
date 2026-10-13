'use strict';
/* Armaments. Movesets come from a few weapon-class templates, scaled by each weapon's base damage.
   `where` names the real in-game location; `drop` marks a boss remembrance/drop. */

function wsMoves(style, b) {
  const L = (wind, act, rec, k, range, arc, st, lunge, poise, dir, extra = {}) => ({ wind, act, rec, dmg: Math.round(b * k), range, arc, st, lunge, poise, dir, ...extra });
  switch (style) {
    case 'katana': return {
      l: [L(0.08, 0.1, 0.24, 0.85, 60, 2.0, 11, 180, 8, 1), L(0.07, 0.1, 0.24, 0.9, 60, 2.1, 11, 170, 8, -1), L(0.09, 0.1, 0.26, 0.95, 60, 2.2, 12, 170, 8, 1), L(0.14, 0.12, 0.4, 1.25, 72, 0.8, 15, 290, 14, 1, { thrust: true })],
      heavy: L(0.34, 0.14, 0.44, 2.0, 72, 2.8, 24, 210, 30, -1) };
    case 'great': return {
      l: [L(0.22, 0.15, 0.45, 1.0, 80, 2.7, 20, 120, 32, 1), L(0.2, 0.15, 0.48, 1.05, 80, 2.7, 20, 120, 32, -1)],
      heavy: L(0.6, 0.16, 0.6, 2.1, 86, 1.4, 36, 100, 85, 1, { overhead: true }) };
    case 'colossal': return {
      l: [L(0.3, 0.17, 0.55, 1.0, 88, 2.9, 25, 110, 45, 1), L(0.28, 0.17, 0.58, 1.05, 88, 2.9, 25, 110, 45, -1)],
      heavy: L(0.75, 0.18, 0.7, 2.2, 94, 1.5, 42, 90, 110, 1, { overhead: true }) };
    case 'halberd': return {
      l: [L(0.16, 0.14, 0.38, 1.0, 92, 2.3, 17, 110, 22, 1), L(0.14, 0.14, 0.38, 1.05, 92, 2.3, 17, 110, 22, -1), L(0.18, 0.14, 0.46, 1.2, 106, 0.6, 19, 220, 28, 1, { thrust: true })],
      heavy: L(0.5, 0.16, 0.56, 2.1, 98, 1.3, 32, 120, 70, 1, { overhead: true }) };
    case 'spear': return {
      l: [L(0.1, 0.12, 0.3, 0.9, 98, 0.5, 13, 160, 12, 1, { thrust: true }), L(0.1, 0.12, 0.3, 0.95, 98, 0.5, 13, 160, 12, 1, { thrust: true }), L(0.16, 0.14, 0.4, 1.2, 90, 2.2, 16, 140, 20, -1)],
      heavy: L(0.42, 0.15, 0.5, 2.0, 110, 0.6, 28, 280, 50, 1, { thrust: true }) };
    case 'claw': return {
      l: [L(0.06, 0.09, 0.2, 0.7, 48, 1.8, 9, 190, 6, 1), L(0.06, 0.09, 0.2, 0.7, 48, 1.8, 9, 190, 6, -1), L(0.06, 0.09, 0.2, 0.75, 48, 1.8, 9, 190, 6, 1), L(0.08, 0.1, 0.3, 0.85, 52, 2.0, 10, 200, 8, -1)],
      heavy: L(0.3, 0.14, 0.4, 1.7, 56, 2.4, 20, 230, 25, 1) };
    default: return { // straight sword
      l: [L(0.11, 0.11, 0.3, 1.0, 58, 2.1, 13, 170, 12, 1), L(0.09, 0.11, 0.3, 1.08, 58, 2.2, 13, 160, 12, -1), L(0.16, 0.13, 0.42, 1.4, 68, 0.9, 17, 260, 20, 1, { thrust: true })],
      heavy: L(0.4, 0.15, 0.48, 2.3, 70, 2.6, 28, 130, 45, 1) };
  }
}
function WPNDEF(name, style, base, look, skill, info) {
  return { name, style, base, ...wsMoves(style, base), ...look, skill, ...info };
}
// look: render type, blade length/width/colors
const LK = (type, len, w, blade, edge, hilt, glow) => ({ rtype: type, len, w, blade, edge, hilt, glow });

const WEAPONS = {
  longsword: WPNDEF('Longsword', 'sword', 24, LK('sword', 46, 4, '#c4c9d1', '#f4f6f9', '#6a5528'),
    { name: 'Square Off', kind: 'thrustup', fp: 6, mul: 2.0 }, { desc: 'A trusty straight sword carried by the Tarnished.', where: 'Starting armament' }),
  uchigatana: WPNDEF('Uchigatana', 'katana', 22, LK('katana', 50, 3, '#dadfe6', '#ffffff', '#4a1c1c'),
    { name: 'Unsheathe', kind: 'unsheathe', fp: 8, mul: 3.0 }, { bleed: 30, desc: 'Katana of the Land of Reeds. Causes blood loss.', where: 'Deathtouched Catacombs, Limgrave' }),
  claymore: WPNDEF('Claymore', 'great', 40, LK('great', 62, 6, '#b8bcc4', '#eef0f2', '#4a3a22'),
    { name: "Lion's Claw", kind: 'leapslam', fp: 10, mul: 2.6 }, { desc: 'A great sword wielded by the knights of Castle Morne.', where: 'Castle Morne, Weeping Peninsula' }),
  zweihander: WPNDEF('Zweihander', 'colossal', 46, LK('great', 70, 7, '#a9aeb6', '#e8ebef', '#3c3020'),
    { name: 'Stamp (Upward Cut)', kind: 'stomp', fp: 8, mul: 2.2 }, { desc: 'A colossal sword. Slow, but staggers anything.', where: 'Stormhill graveyard, Limgrave' }),
  bloodhound: WPNDEF("Bloodhound's Fang", 'great', 38, LK('great', 56, 6, '#8a2a2a', '#d06060', '#2a1a1a'),
    { name: "Bloodhound's Finesse", kind: 'quickstep', fp: 6, mul: 2.0 }, { bleed: 34, desc: 'Curved greatsword of the Bloodhound Knights.', where: 'Bloodhound Knight Darriwil, Forlorn Hound Evergaol' }),
  halberd: WPNDEF('Golden Halberd', 'halberd', 38, LK('halberd', 80, 4, '#dcbc62', '#fff2c4', '#5a4a2a', '#ffe08a'),
    { name: 'Golden Vow', kind: 'buff', fp: 12, mul: 1.2 }, { desc: "The Tree Sentinel's halberd, blessed with gold.", where: 'Tree Sentinel, Limgrave' }),
  grafted: WPNDEF('Grafted Blade Greatsword', 'colossal', 52, LK('great', 72, 8, '#9a8a6a', '#e0d0a0', '#3a2a1a'),
    { name: 'Oath of Vengeance', kind: 'buff', fp: 10, mul: 1.25 }, { desc: 'Made of countless grafted blades. Heavy and cruel.', where: 'Leonine Misbegotten, Castle Morne' }),
  moonveil: WPNDEF('Moonveil', 'katana', 30, LK('katana', 54, 3, '#bcd8ff', '#ffffff', '#2a2a4a', '#8ac0ff'),
    { name: 'Transient Moonlight', kind: 'wave', fp: 12, mul: 2.6, el: 'magic' }, { bleed: 25, desc: 'A katana that unleashes waves of glintstone light.', where: 'Magma Wyrm, Gael Tunnel (Caelid)' }),
  nightflame: WPNDEF('Sword of Night and Flame', 'sword', 32, LK('sword', 50, 4, '#9ab0d8', '#ffd0a0', '#3a2a4a', '#ffb070'),
    { name: 'Night-and-Flame Stance', kind: 'beam', fp: 18, mul: 1.0, el: 'fire' }, { desc: 'Treasured sword of House Caria, imbued with night and flame.', where: 'Caria Manor, Liurnia' }),
  darkmoon: WPNDEF('Dark Moon Greatsword', 'great', 44, LK('great', 64, 6, '#a8d0ff', '#ffffff', '#2a3a5a', '#9ad0ff'),
    { name: 'Moonlight Greatsword', kind: 'wave', fp: 16, mul: 2.8, el: 'frost' }, { frost: 30, desc: "Ranni's gift. A blade of the cold dark moon.", where: 'Cathedral of Manus Celes, Liurnia' }),
  riversofblood: WPNDEF('Rivers of Blood', 'katana', 34, LK('katana', 54, 3, '#c03030', '#ff8080', '#1a0a0a', '#ff4040'),
    { name: 'Corpse Piler', kind: 'flurry', fp: 14, mul: 0.8, el: 'blood' }, { bleed: 40, desc: 'Weapon of Okina, swordsman of the Land of Reeds.', where: 'Church of Repose, Mountaintops of the Giants' }),
  starscourge: WPNDEF('Starscourge Greatsword', 'colossal', 54, LK('great', 70, 8, '#7a6a8a', '#d0b0ff', '#3a2a2a', '#b080ff'),
    { name: 'Starcaller Cry', kind: 'gravity', fp: 18, mul: 2.4, el: 'gravity' }, { desc: "Twin greatswords of General Radahn.", where: 'Remembrance of the Starscourge (Radahn)' }),
  blasphemous: WPNDEF('Blasphemous Blade', 'great', 50, LK('great', 62, 6, '#c8a060', '#ffd080', '#4a2a1a', '#ff9a40'),
    { name: "Taker's Flames", kind: 'wave', fp: 18, mul: 3.0, el: 'fire', lifesteal: 0.08 }, { desc: "Rykard's blade. Its flames heal its wielder.", where: 'Remembrance of the Blasphemous (Rykard)' }),
  morgott: WPNDEF("Morgott's Cursed Sword", 'curved', 46, LK('katana', 56, 4, '#8a2020', '#ff6060', '#2a1a1a', '#ff3030'),
    { name: 'Cursed-Blood Slice', kind: 'blink', fp: 14, mul: 3.2, el: 'blood' }, { bleed: 30, desc: "Morgott's sword, forged of his own cursed blood.", where: 'Remembrance of the Omen King (Morgott)' }),
  godslayer: WPNDEF("Godslayer's Greatsword", 'great', 50, LK('great', 64, 6, '#3a3030', '#ff5a3a', '#1a1010', '#ff4a2a'),
    { name: "The Queen's Black Flame", kind: 'nova', fp: 18, mul: 2.6, el: 'blackflame' }, { desc: 'A greatsword of the Godskins, wreathed in black flame.', where: 'Divine Tower of Caelid' }),
  mohgspear: WPNDEF("Mohgwyn's Sacred Spear", 'spear', 52, LK('spear', 92, 4, '#a01020', '#ff5060', '#3a0a0a', '#ff2040'),
    { name: 'Bloodboon Ritual', kind: 'nova', fp: 20, mul: 3.2, el: 'blood' }, { bleed: 34, desc: "Mohg's trident. Summons the bloodflame of the Formless Mother.", where: 'Remembrance of the Blood Lord (Mohg)' }),
  malenia: WPNDEF('Hand of Malenia', 'katana', 50, LK('katana', 60, 4, '#d8c890', '#fff4d0', '#6a4a2a', '#ffd070'),
    { name: 'Waterfowl Dance', kind: 'flurry', fp: 20, mul: 1.1, el: 'phys' }, { desc: "Malenia's prosthetic blade. Its dance never tires.", where: 'Remembrance of the Rot Goddess (Malenia)' }),
  blackblade: WPNDEF("Maliketh's Black Blade", 'colossal', 62, LK('great', 74, 7, '#2a2228', '#c04050', '#1a1018', '#c02040'),
    { name: 'Destined Death', kind: 'wave', fp: 24, mul: 3.0, el: 'death' }, { desc: 'The blade that sealed Destined Death.', where: 'Remembrance of the Black Blade (Maliketh)' }),
  ruins: WPNDEF('Ruins Greatsword', 'colossal', 58, LK('great', 70, 9, '#8a8478', '#c8c0b0', '#3a3428', '#d0b0ff'),
    { name: 'Wave of Destruction', kind: 'nova', fp: 16, mul: 2.6, el: 'magic' }, { desc: 'Greatsword of the Misbegotten Warrior.', where: 'Redmane Castle, Caelid' }),
};
