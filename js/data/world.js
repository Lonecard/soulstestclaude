'use strict';
/* The Lands Between (base game), laid out on a 0..100 map grid that mirrors the real world map.
   1 map unit = MU world units. Positions are approximate to the in-game map. */

const MU = 170;
const OW = { w: 100 * MU, h: 100 * MU };

// ---------------------------------------------------------------- regions
// biome -> ground texture / ambience; blocked regions are cliffs or walled cities you enter by other means.
const REGIONS = [
  { id: 'limgrave', name: 'Limgrave', biome: 'limgrave', tier: 1, poly: [[33, 64], [38, 61], [44, 62.5], [50, 60], [56, 60], [62, 61], [64, 66], [63, 74], [60, 79], [54, 80], [46, 80], [40, 78], [36, 75], [34, 70]] },
  { id: 'stormhill', name: 'Stormhill', biome: 'stormhill', tier: 1.2, poly: [[35, 56], [39, 53], [41, 53.5], [47, 56], [50, 57.5], [50, 60], [44, 62.5], [38, 61], [33, 64], [33, 60]] },
  { id: 'weeping', name: 'Weeping Peninsula', biome: 'weeping', tier: 1.3, poly: [[46, 80], [54, 80], [60, 79], [62, 84], [61, 90], [57, 96], [52, 99], [47, 97], [43, 92], [42, 86]] },
  { id: 'caelid', name: 'Caelid', biome: 'caelid', tier: 3, poly: [[62, 61], [68, 58], [76, 57], [84, 57.5], [90, 60], [93, 66], [92, 74], [88, 80], [80, 81], [70, 79], [63, 74], [64, 66]] },
  { id: 'dragonbarrow', name: 'Dragonbarrow', biome: 'dragonbarrow', tier: 4, poly: [[68, 58], [70, 52], [74, 46], [80, 42], [87, 39], [93, 42], [94, 50], [90, 60], [84, 57.5], [76, 57]] },
  { id: 'liurnia', name: 'Liurnia of the Lakes', biome: 'liurnia', tier: 2.2, poly: [[14, 22], [22, 17], [30, 16], [36, 20], [40, 24], [43, 30], [45, 36], [44, 42], [42, 46], [40, 49], [39, 53], [35, 56], [33, 60], [28, 61], [20, 58], [14, 52], [10, 44], [9, 34], [11, 27]] },
  { id: 'altus', name: 'Altus Plateau', biome: 'altus', tier: 3.6, poly: [[40, 24], [46, 20], [52, 16], [58, 15], [60, 18], [60, 28], [66, 30], [68, 34], [64, 40], [56, 43], [50, 44], [44, 42], [45, 36], [43, 30]] },
  { id: 'gelmir', name: 'Mt. Gelmir', biome: 'gelmir', tier: 4.2, poly: [[22, 17], [26, 10], [34, 5], [44, 3], [54, 6], [60, 6], [58, 12], [60, 18], [58, 15], [52, 16], [46, 20], [40, 24], [36, 20], [30, 16]] },
  { id: 'forbidden', name: 'Forbidden Lands', biome: 'forbidden', tier: 4.8, poly: [[66, 16], [70, 12], [74, 12], [78, 16], [76, 22], [72, 26], [70, 26], [70, 20]] },
  { id: 'mountaintops', name: 'Mountaintops of the Giants', biome: 'mountaintops', tier: 5.5, poly: [[74, 12], [78, 4], [86, 1], [95, 5], [98, 14], [96, 24], [90, 30], [82, 30], [76, 26], [76, 22], [78, 16]] },
  { id: 'snowfield', name: 'Consecrated Snowfield', biome: 'snowfield', tier: 6, poly: [[60, 6], [66, 2], [74, 2], [78, 4], [74, 12], [70, 12], [66, 16], [60, 18], [58, 12]] },
  // impassable land
  { id: 'stormveil', name: 'Stormveil Castle', biome: 'castle', blocked: true, poly: [[39, 53], [40, 49], [44, 47.5], [48, 49], [49, 53], [47, 56], [41, 53.5]] },
  { id: 'leyndell', name: 'Leyndell, Royal Capital', biome: 'capital', blocked: true, poly: [[60, 18], [66, 16], [70, 20], [70, 26], [66, 30], [60, 28]] },
  { id: 'cliffs', name: 'Cliffs', biome: 'cliff', blocked: true, poly: [[44, 42], [50, 44], [56, 43], [64, 40], [68, 34], [72, 36], [74, 46], [70, 52], [68, 58], [62, 61], [56, 60], [50, 60], [50, 57.5], [47, 56], [49, 53], [48, 49], [44, 47.5], [42, 46]] },
  { id: 'cliffs2', name: 'Cliffs', biome: 'cliff', blocked: true, poly: [[70, 26], [76, 26], [82, 30], [90, 30], [96, 24], [98, 34], [94, 50], [93, 42], [87, 39], [80, 42], [74, 46], [72, 36], [68, 34], [66, 30]] },
];

// impassable cliff lines between walkable regions (the gaps are the real passages)
const BARRIERS = [
  // Stormhill / Liurnia cliffs, with the bypass path west of Stormveil
  [[33, 60], [33.6, 58.4]], [[34.6, 57.2], [35, 56], [39, 53]],
  // Limgrave / Weeping Peninsula coast, open only at the Bridge of Sacrifice
  [[44, 80], [46, 80], [49, 80]], [[51, 80], [54, 80], [60, 79]],
  // Limgrave / Caelid
  [[62, 61], [64, 66]], [[63.5, 71.5], [63, 74]],
  // Caelid / Dragonbarrow, open on the road north of Sellia
  [[68, 58], [76, 57], [78, 57.2]], [[80.5, 57.3], [84, 57.5], [90, 60]],
  // Liurnia / Altus Plateau (Grand Lift of Dectus and Ruin-Strewn Precipice are the ways up)
  [[40, 24], [43, 30], [45, 36], [44, 42]],
  // Liurnia / Mt. Gelmir
  [[14, 22], [22, 17], [30, 16], [36, 20], [40, 24]],
  // Altus / Mt. Gelmir, open along the Road of Iniquity
  [[40, 24], [46, 20], [47.5, 19]], [[50, 17.4], [52, 16], [58, 15], [60, 18]],
  // Snowfield / Mt. Gelmir, Forbidden Lands and Mountaintops (open at the snowy pass)
  [[60, 6], [58, 12], [60, 18]], [[66, 16], [70, 12], [74, 12]], [[74, 12], [75.6, 8.8]], [[76.6, 6.8], [78, 4]],
  // Forbidden Lands / Mountaintops: only the Grand Lift of Rold
  [[74, 12], [78, 16], [76, 22]],
];

// textured patches inside regions (lakes, swamps, lava, roads)
const PATCHES = [
  { poly: [[16, 30], [26, 26], [36, 30], [40, 40], [38, 50], [32, 57], [22, 56], [15, 48], [13, 38]], tex: 'lake' },           // Lake of Liurnia
  { circle: [24.5, 38.5, 4.4], tex: 'academy' },                                                                              // Raya Lucaria island
  { circle: [75.5, 70.5, 4.2], tex: 'rotwater', hazard: 'rot' },                                                              // Swamp of Aeonia
  { circle: [44.4, 76.4, 1.7], tex: 'lake' },                                                                                   // Agheel Lake
  { circle: [36, 8, 3.2], tex: 'lava', hazard: 'fire' }, { circle: [46, 9, 2.2], tex: 'lava', hazard: 'fire' },              // Mt. Gelmir lava
  { circle: [88, 7, 2.6], tex: 'ice' },                                                                                       // Freezing Lake
  { circle: [88, 78, 3.6], tex: 'sand' },                                                                                     // Wailing Dunes
];
const ROADS = [
  [[46, 73.6], [47.5, 72], [48.5, 69], [48, 66.5], [46, 62.5], [44.5, 59.5], [44.2, 57.2]],                                  // Limgrave main road -> Stormgate
  [[48.5, 69], [53, 69.5], [58, 69], [62, 68], [66, 68.5], [70, 70], [76, 66], [80, 62.5]],                                  // Limgrave -> Caelid -> Sellia
  [[47.5, 72], [50, 76], [50, 81.5], [50, 86], [51, 92]],                                                                     // to Bridge of Sacrifice / Castle Morne
  [[80, 62.5], [79.5, 57.2], [79, 52], [84, 49], [89, 45]],                                                                   // Caelid -> Dragonbarrow
  [[38.5, 51], [35, 50], [36, 46], [37, 40], [37, 34], [40, 30], [43, 33]],                                                  // Liurnia east highway -> Dectus
  [[29, 45], [30, 47.5], [35, 50]],                                                                                           // Gate Town
  [[45, 25], [49, 28], [52, 28], [56, 27], [59, 25], [60.5, 23.5]],                                                           // Altus -> Leyndell
  [[49, 28], [48.5, 22], [48.7, 18.2], [44, 15], [40, 9]],                                                                    // Road of Iniquity -> Gelmir
  [[72, 20], [75, 17.5], [77, 15]],                                                                                           // Forbidden Lands -> Grand Lift of Rold
  [[79, 13], [84, 10], [88, 12], [91, 18], [94, 21]],                                                                         // Mountaintops -> Flame Peak
  [[76, 8], [70, 9], [66, 6]],                                                                                                // Snowfield -> Ordina
];

// ---------------------------------------------------------------- sites of grace (overworld)
const GRACES_OW = [
  // Limgrave
  ['The First Step', 45.2, 72.2], ['Church of Elleh', 47.4, 71.8], ['Gatefront', 48.2, 67.2], ['Agheel Lake South', 43.6, 78], ['Agheel Lake North', 46, 74.8],
  ['Church of Dragon Communion', 34.6, 71.2], ['Seaside Ruins', 37.6, 69.2], ['Mistwood Outskirts', 56, 70.2], ['Murkwater Cave', 49.2, 64.6], ['Fort Haight West', 60.2, 74.2],
  ['Third Church of Marika', 60.6, 66.8], ['Artist\'s Shack', 54, 62.6], ['Summonwater Village Outskirts', 55.4, 65.2], ['Waypoint Ruins Cellar', 53.4, 74.4], ['Murkwater Coast', 40, 67.8],
  ['Dragon-Burnt Ruins', 42, 76.8], ['Limgrave Tunnels', 51, 63.2],
  // Stormhill
  ['Stormhill Shack', 44.6, 59.6], ['Warmaster\'s Shack', 47, 60.2], ['Saintsbridge', 48.6, 58.6], ['Stormgate', 44.2, 57.6],
  // Weeping Peninsula
  ['Bridge of Sacrifice', 50, 81.6], ['Castle Morne Rampart', 51, 92.4], ['Tombsward', 45, 84], ['Ailing Village Outskirts', 45, 90], ['Beside the Crater-Pocked Glade', 55, 86],
  ['Fourth Church of Marika', 49, 85], ['Isolated Merchant\'s Shack', 59, 83], ['Church of Pilgrimage', 44, 88], ['Callu Baptismal Church', 48, 82.6], ['Morne Moangrave', 49, 95],
  // Liurnia
  ['Lake-Facing Cliffs', 38.6, 51], ['Liurnia Lake Shore', 35, 53.6], ['Laskyar Ruins', 32, 52], ['Scenic Isle', 28, 51], ['Academy Gate Town', 29, 45],
  ['South Raya Lucaria Gate', 27, 43.2], ['Main Academy Gate', 26.2, 41.8], ['Gate Town Bridge', 30.4, 47.2], ['Liurnia Highway North', 35.4, 46.6], ['Liurnia Highway South', 36, 50],
  ['Eastern Liurnia Lake Shore', 37.4, 44], ['Church of Vows', 37, 40.4], ['Frenzied Flame Village Outskirts', 40, 36], ['Bellum Church', 36, 26.6], ['Grand Lift of Dectus', 43.2, 33.2],
  ['Ruined Labyrinth', 34, 33], ['The Four Belfries', 18, 40], ['Kingsrealm Ruins', 17.4, 33.6], ['Village of the Albinaurics', 21, 52], ['Revenger\'s Shack', 23, 56],
  ['Cathedral of Manus Celes', 14.4, 51], ['Converted Tower', 16, 46], ['Ravine-Veiled Village', 20.4, 27.4], ['Main Caria Manor Gate', 20, 26.4], ['Royal Moongazing Grounds', 17, 22.6],
  ['Ranni\'s Rise', 14.4, 23.4], ['Behind Caria Manor', 17.4, 21], ['Boilprawn Shack', 31, 48.6], ['Jarburg', 36.4, 37.4], ['Mausoleum Compound', 22, 31],
  // Caelid
  ['Caelid Highway South', 67, 72], ['Smoldering Church', 66, 69], ['Rotview Balcony', 65.6, 66], ['Fort Gael North', 70, 70], ['Caelem Ruins', 68, 64],
  ['Cathedral of Dragon Communion', 66.2, 61.6], ['Caelid Waypoint Ruins', 72, 65], ['Chair-Crypt of Sellia', 79.6, 62.6], ['Church of the Plague', 79, 67], ['Southern Aeonia Swamp Bank', 74, 75],
  ['Impassable Greatbridge', 76, 61.6], ['Sellia Under-Stair', 81.8, 60.4], ['Swamp Lookout Tower', 77.6, 72.6], ['Redmane Castle Plaza', 82, 76.4],
  // Dragonbarrow
  ['Dragonbarrow West', 75, 54], ['Isolated Merchant\'s Shack (Dragonbarrow)', 77, 51.6], ['Dragonbarrow Fork', 80, 50.6], ['Fort Faroth', 84, 49], ['Lenne\'s Rise', 88, 47],
  ['Farum Greatbridge', 90, 44], ['Bestial Sanctum', 88, 41.6],
  // Altus Plateau
  ['Altus Plateau', 45, 25], ['Abandoned Coffin', 47, 28], ['Erdtree-Gazing Hill', 49, 30.4], ['Altus Highway Junction', 52, 28], ['Forest-Spanning Greatbridge', 51, 33],
  ['Rampartside Path', 56, 27], ['Bower of Bounty', 56, 30.4], ['Road of Iniquity Side Path', 48.4, 22], ['Windmill Village', 58, 37], ['Windmill Heights', 57, 40],
  ['Outer Wall Phantom Tree', 59, 30.6], ['Outer Wall Battleground', 58.8, 26.4], ['Minor Erdtree Church', 55, 35], ['Capital Rampart', 58, 22.4], ['Shaded Castle Ramparts', 46.6, 21.4],
  // Mt. Gelmir
  ['Ninth Mt. Gelmir Campsite', 40, 8], ['Road of Iniquity', 44, 15], ['Seethewater River', 47, 19], ['Fort Laiedd', 30, 9.2], ['Hermit Village', 50, 10],
  ['Craftsman\'s Shack', 52.4, 12], ['Primeval Sorcerer Azur', 44, 5.4], ['Corpse-Stench Shack', 34, 17], ['Volcano Manor', 37, 13.6],
  // Forbidden Lands / Mountaintops / Snowfield
  ['Forbidden Lands', 72, 20.4], ['Grand Lift of Rold', 76.4, 15.6], ['Zamor Ruins', 80, 14], ['First Church of Marika', 84, 10], ['Stargazers\' Ruins', 79, 9],
  ['Freezing Lake', 87.6, 9], ['Giant\'s Gravepost', 90, 16], ['Guardian\'s Garrison', 93, 10], ['Church of Repose', 86, 13.4], ['Forge of the Giants', 94.4, 21.4],
  ['Castle Sol Main Gate', 83.6, 5.6], ['Consecrated Snowfield', 68, 10], ['Inner Consecrated Snowfield', 64, 7], ['Ordina, Liturgical Town', 66, 4.2], ['Apostate Derelict', 61.4, 5.4],
];

// ---------------------------------------------------------------- named places (map labels, location titles, structures)
// kinds: church, ruins, castle, fort, village, tower, shack, landmark, erdtree, gaol
const LOCS = [
  ['Church of Elleh', 47.8, 71.2, 'church'], ['Gatefront Ruins', 48.6, 66.4, 'ruins'], ['Agheel Lake', 44.4, 76.4, 'landmark'], ['Dragon-Burnt Ruins', 41.6, 77, 'ruins'],
  ['Waypoint Ruins', 53, 74.8, 'ruins'], ['Mistwood', 57.4, 71.6, 'landmark'], ['Fort Haight', 61, 74.8, 'fort'], ['Third Church of Marika', 60.8, 67.4, 'church'],
  ['Summonwater Village', 56.2, 64.4, 'village'], ['Murkwater River', 47, 64, 'landmark'], ['Church of Dragon Communion', 35, 71.6, 'church'], ['Seaside Ruins', 37.8, 70, 'ruins'],
  ['Stormhill', 42, 58.4, 'landmark'], ['Stormveil Castle', 44, 51.5, 'castle'], ['Saintsbridge', 49, 58, 'ruins'], ['Mistwood Ruins', 58.2, 72.8, 'ruins'],
  ['Castle Morne', 52, 96, 'castle'], ['Ailing Village', 45.6, 91.6, 'village'], ['Oridys\'s Rise', 47, 94, 'tower'], ['Tower of Return', 59, 92, 'tower'],
  ['Witchbane Ruins', 60, 89.4, 'ruins'], ['Minor Erdtree (Weeping)', 56, 92, 'erdtree'], ['Fourth Church of Marika', 49.4, 85.6, 'church'],
  ['Raya Lucaria Academy', 24.5, 38.5, 'castle'], ['Academy Gate Town', 29, 44.4, 'ruins'], ['Caria Manor', 18.6, 24.6, 'castle'], ['Three Sisters', 14.8, 22.8, 'tower'],
  ['Moonlight Altar', 14, 49.6, 'landmark'], ['Carian Study Hall', 14, 38, 'tower'], ['Laskyar Ruins', 32.4, 52.6, 'ruins'], ['Village of the Albinaurics', 21.4, 52.8, 'village'],
  ['Purified Ruins', 24, 55, 'ruins'], ['Frenzied Flame Village', 40.6, 36.6, 'village'], ['Jarburg', 36, 38, 'village'], ['Church of Vows', 37.4, 41, 'church'],
  ['Bellum Highway', 37.6, 30, 'landmark'], ['Kingsrealm Ruins', 17.8, 33, 'ruins'], ['Minor Erdtree (Liurnia)', 40, 31.4, 'erdtree'],
  ['Sellia, Town of Sorcery', 80.4, 62, 'village'], ['Fort Gael', 70.6, 72, 'fort'], ['Swamp of Aeonia', 75.5, 70.5, 'landmark'], ['Redmane Castle', 83, 77.4, 'castle'],
  ['Wailing Dunes', 88, 78, 'landmark'], ['Caelem Ruins', 68.4, 64.6, 'ruins'], ['Minor Erdtree (Caelid)', 82, 69, 'erdtree'], ['Cathedral of Dragon Communion', 66.4, 61, 'church'],
  ['Fort Faroth', 84.4, 49.6, 'fort'], ['Bestial Sanctum', 88, 41, 'church'], ['Divine Tower of Caelid', 92, 45.4, 'tower'], ['Farum Greatbridge', 90, 44.6, 'landmark'],
  ['Erdtree-Gazing Hill', 49.4, 30, 'landmark'], ['Dominula, Windmill Village', 58.4, 37.6, 'village'], ['Shaded Castle', 46, 19.6, 'castle'], ['Lux Ruins', 52, 37, 'ruins'],
  ['Wyndham Ruins', 49, 25.4, 'ruins'], ['Leyndell, Royal Capital', 64.6, 23, 'castle'], ['Outer Wall', 59.6, 28, 'landmark'], ['Minor Erdtree (Altus)', 55.4, 34, 'erdtree'],
  ['Volcano Manor', 36.4, 12.4, 'castle'], ['Fort Laiedd', 30.6, 8.6, 'fort'], ['Hermit Village', 50, 9.4, 'village'], ['Seethewater Terminus', 30, 14, 'landmark'],
  ['Forbidden Lands', 72.4, 19.6, 'landmark'], ['Castle Sol', 85, 3, 'castle'], ['Zamor Ruins', 80.4, 13.4, 'ruins'], ['Flame Peak', 91.6, 19.4, 'landmark'],
  ['Freezing Lake', 88, 7, 'landmark'], ['Minor Erdtree (Mountaintops)', 90.4, 12, 'erdtree'], ['Ordina, Liturgical Town', 66.4, 3.6, 'village'],
  ['Yelough Anix Ruins', 62.6, 13, 'ruins'], ['Minor Erdtree (Snowfield)', 70.4, 6, 'erdtree'],
];

// ---------------------------------------------------------------- dungeons & legacy dungeons (each is a playable instance)
// bosses: list of encounters; an encounter is a boss id or an array of ids (duos).
// exit: where you come out after the final boss (map coords) - defaults to the entrance.
const DUNGEONS = [
  // ---- Legacy dungeons
  { id: 'stormveil', name: 'Stormveil Castle', x: 44.2, y: 56.4, theme: 'castle', size: 'legacy', tier: 1.6, bosses: ['margit', 'godrick'],
    graces: ['Stormveil Main Gate', 'Castleward Tunnel', 'Rampart Tower', 'Liftside Chamber', 'Secluded Cell'], exit: [38.6, 50.4], label: 'Stormveil Castle' },
  { id: 'morne', name: 'Castle Morne', x: 52, y: 94.4, theme: 'castle', size: 'large', tier: 1.5, bosses: ['leonine'], graces: ['Castle Morne Lift', 'Behind the Castle'], pickup: 'claymore' },
  { id: 'raya', name: 'Raya Lucaria Academy', x: 26.4, y: 41.2, theme: 'academy', size: 'legacy', tier: 2.6, bosses: ['red_wolf', 'rennala'],
    graces: ['Raya Lucaria Grand Library', 'Debate Parlor', 'Church of the Cuckoo', 'Schoolhouse Classroom'], req: { boss: 'smarag', msg: 'Sealed. The Academy Glintstone Key is held by Glintstone Dragon Smarag.' } },
  { id: 'caria', name: 'Caria Manor', x: 20.2, y: 25.6, theme: 'manor', size: 'large', tier: 2.6, bosses: ['loretta'], graces: ['Manor Upper Level', 'Manor Lower Level'], exit: [14.6, 23.6] },
  { id: 'redmane', name: 'Redmane Castle', x: 82.4, y: 76.6, theme: 'redmane', size: 'large', tier: 3.2, bosses: [['misbegotten_warrior', 'crucible_knight'], 'radahn'],
    graces: ['Chamber Outside the Plaza', 'Redmane Castle Plaza'], arenaBig: true },
  { id: 'shaded', name: 'Shaded Castle', x: 46.4, y: 20.6, theme: 'castle', size: 'large', tier: 3.8, bosses: ['elemer'], graces: ['Shaded Castle Inner Gate', 'Castellan\'s Hall'] },
  { id: 'volcano', name: 'Volcano Manor', x: 37, y: 13, theme: 'volcano', size: 'legacy', tier: 4.4, bosses: ['godskin_noble', 'rykard'],
    graces: ['Prison Town Church', 'Temple of Eiglay', 'Audience Pathway'], arenaBig: true },
  { id: 'leyndell', name: 'Leyndell, Royal Capital', x: 59.4, y: 23.6, theme: 'leyndell', size: 'legacy', tier: 4.6, bosses: ['godfrey_shade', 'morgott'],
    graces: ['Outer Wall Phantom Tree', 'Lower Capital Church', 'Avenue Balcony', 'West Capital Rampart', 'Erdtree Sanctuary', 'Queen\'s Bedchamber'], exit: [71, 21],
    req: { runes: 2, msg: 'The Erdtree\'s barrier denies you. Two Great Runes are required.' } },
  { id: 'shunning', name: 'Subterranean Shunning-Grounds', x: 59.4, y: 28.4, theme: 'catacomb', size: 'large', tier: 4.8, bosses: ['mohg_omen'], graces: ['Underground Roadside', 'Forsaken Depths', 'Leyndell Catacombs'], req: { boss: 'morgott', msg: 'The sewer gate is sealed from within the capital.' } },
  { id: 'sol', name: 'Castle Sol', x: 85, y: 4.4, theme: 'sol', size: 'large', tier: 5.6, bosses: ['niall'], graces: ['Church of the Eclipse', 'Castle Sol Rooftop'] },
  { id: 'haligtree', name: "Miquella's Haligtree", x: 66, y: 3.4, theme: 'haligtree', size: 'legacy', tier: 6.8, bosses: ['loretta_hali', 'malenia'],
    graces: ['Haligtree Canopy', 'Haligtree Town', 'Elphael Inner Wall', 'Drainage Channel', 'Haligtree Roots'] },
  { id: 'farum', name: 'Crumbling Farum Azula', x: 95, y: 21.4, theme: 'farum', size: 'legacy', tier: 6.4, bosses: [['godskin_apostle', 'godskin_noble'], 'placidusax', 'maliketh'],
    graces: ['Crumbling Beast Grave', 'Tempest-Facing Balcony', 'Dragon Temple', 'Beside the Great Bridge'], next: 'ashen',
    req: { boss: 'fire_giant', msg: 'The Forge of the Giants is cold. Defeat the Fire Giant first.' }, label: 'Forge of the Giants' },
  { id: 'ashen', name: 'Leyndell, Ashen Capital', x: 95, y: 21.4, theme: 'ashen', size: 'large', tier: 7, bosses: ['gideon', 'godfrey', 'radagon', 'elden_beast'],
    graces: ['Leyndell, Capital of Ash', 'Elden Throne', 'Fractured Marika'], hidden: true },
  { id: 'mohgwyn', name: 'Mohgwyn Palace', x: 60.6, y: 8.6, theme: 'mohgwyn', size: 'large', tier: 6.4, bosses: ['mohg'], graces: ['Palace Approach Ledge-Road', 'Dynasty Mausoleum Entrance', 'Cocoon of the Empyrean'], label: 'Waygate to Mohgwyn' },
  { id: 'divine_caelid', name: 'Divine Tower of Caelid', x: 92, y: 45.6, theme: 'tower', size: 'small', tier: 4.2, bosses: ['godskin_apostle'], pickup: 'godslayer' },
  // ---- Underground
  { id: 'siofra', name: 'Siofra River', x: 58.6, y: 70.8, theme: 'underground', size: 'large', tier: 2.2, bosses: ['dragonkin', 'ancestor_spirit'], graces: ['Siofra River Bank', 'Worshippers\' Woods', 'Ancestral Woods', 'Hallowhorn Grounds'], label: 'Siofra River Well' },
  { id: 'nokron', name: 'Nokron, Eternal City', x: 57.6, y: 72.6, theme: 'underground', size: 'legacy', tier: 4, bosses: ['mimic_tear', 'regal_ancestor', ['valiant_gargoyle', 'valiant_gargoyle']],
    graces: ['Nokron, Eternal City', 'Night\'s Sacred Ground', 'Aqueduct-Facing Cliffs', 'Great Waterfall Basin'], next: 'deeproot',
    req: { boss: 'radahn', msg: 'A star must fall here first. (Defeat Starscourge Radahn.)' }, label: 'Fallen star crater' },
  { id: 'deeproot', name: 'Deeproot Depths', x: 57.6, y: 72.6, theme: 'underground', size: 'large', tier: 5, bosses: ['siluria', ['fia_champion', 'fia_champion'], 'fortissax'], graces: ['Deeproot Depths', 'Great Waterfall Crest', 'The Nameless Eternal City', 'Prince of Death\'s Throne'], hidden: true },
  { id: 'ainsel', name: 'Ainsel River', x: 22.4, y: 48.6, theme: 'underground', size: 'large', tier: 3, bosses: ['dragonkin'], graces: ['Ainsel River Well Depths', 'Ainsel River Sluice Gate', 'Nokstella, Eternal City'], next: 'lakeofrot', label: 'Ainsel River Well' },
  { id: 'lakeofrot', name: 'Lake of Rot', x: 22.4, y: 48.6, theme: 'rot', size: 'large', tier: 5.4, bosses: ['dragonkin', 'astel'], graces: ['Lake of Rot Shoreside', 'Grand Cloister'], hidden: true, hazard: 'rot' },
  // ---- Evergaols
  { id: 'ev_stormhill', name: 'Stormhill Evergaol', x: 40, y: 57, theme: 'evergaol', size: 'arena', bosses: ['crucible_knight'] },
  { id: 'ev_forlorn', name: 'Forlorn Hound Evergaol', x: 52.6, y: 78, theme: 'evergaol', size: 'arena', bosses: ['darriwil'] },
  { id: 'ev_weeping', name: 'Weeping Evergaol', x: 58, y: 88, theme: 'evergaol', size: 'arena', bosses: ['zamor_hero'] },
  { id: 'ev_cuckoo', name: "Cuckoo's Evergaol", x: 23.4, y: 47.4, theme: 'evergaol', size: 'arena', bosses: ['bols'] },
  { id: 'ev_ringleader', name: "Ringleader's Evergaol", x: 16, y: 30, theme: 'evergaol', size: 'arena', bosses: ['alecto'] },
  { id: 'ev_malefactor', name: "Malefactor's Evergaol", x: 33.4, y: 35.6, theme: 'evergaol', size: 'arena', bosses: ['adan'] },
  { id: 'ev_sellia', name: 'Sellia Evergaol', x: 82.4, y: 63.6, theme: 'evergaol', size: 'arena', bosses: ['hugues'] },
  { id: 'ev_golden', name: 'Golden Lineage Evergaol', x: 51, y: 42, theme: 'evergaol', size: 'arena', bosses: ['godefroy'] },
  { id: 'ev_contender', name: "Lord Contender's Evergaol", x: 87, y: 25, theme: 'evergaol', size: 'arena', bosses: ['vyke'] },
  // ---- Catacombs, caves, tunnels, hero's graves
  { id: 'deathtouched', name: 'Deathtouched Catacombs', x: 53.6, y: 61.8, theme: 'catacomb', size: 'small', bosses: ['black_knife'], pickup: 'uchigatana' },
  { id: 'stormfoot', name: 'Stormfoot Catacombs', x: 42.6, y: 61.4, theme: 'catacomb', size: 'small', bosses: ['watchdog'] },
  { id: 'murkwater_cat', name: 'Murkwater Catacombs', x: 46.6, y: 69.4, theme: 'catacomb', size: 'small', bosses: ['grave_warden'] },
  { id: 'murkwater_cave', name: 'Murkwater Cave', x: 49.4, y: 63.8, theme: 'cave', size: 'small', bosses: ['patches'] },
  { id: 'groveside', name: 'Groveside Cave', x: 42, y: 65, theme: 'cave', size: 'small', bosses: ['beastman'] },
  { id: 'coastal', name: 'Coastal Cave', x: 35.8, y: 72.6, theme: 'cave', size: 'small', bosses: [['demi_chief', 'demi_chief']] },
  { id: 'highroad', name: 'Highroad Cave', x: 51.6, y: 60.6, theme: 'cave', size: 'small', bosses: ['golem'] },
  { id: 'limgrave_tunnels', name: 'Limgrave Tunnels', x: 51.4, y: 62.6, theme: 'tunnel', size: 'small', bosses: ['stonedigger'] },
  { id: 'fringefolk', name: "Fringefolk Hero's Grave", x: 44, y: 79, theme: 'catacomb', size: 'small', tier: 2, bosses: ['ulcerated_spirit'] },
  { id: 'waypoint', name: 'Waypoint Ruins Cellar', x: 53, y: 75.2, theme: 'catacomb', size: 'small', bosses: ['pumpkin_head'] },
  { id: 'tombsward_cat', name: 'Tombsward Catacombs', x: 44.6, y: 86, theme: 'catacomb', size: 'small', bosses: ['cemetery_shade'] },
  { id: 'tombsward_cave', name: 'Tombsward Cave', x: 46, y: 83, theme: 'cave', size: 'small', bosses: ['miranda'] },
  { id: 'earthbore', name: 'Earthbore Cave', x: 55.6, y: 84, theme: 'cave', size: 'small', bosses: ['runebear'] },
  { id: 'impaler', name: "Impaler's Catacombs", x: 53, y: 83, theme: 'catacomb', size: 'small', bosses: ['watchdog'] },
  { id: 'morne_tunnel', name: 'Morne Tunnel', x: 53.6, y: 89.6, theme: 'tunnel', size: 'small', bosses: ['scaly_misbegotten'] },
  { id: 'lakeside_crystal', name: 'Lakeside Crystal Cave', x: 27, y: 55, theme: 'cave', size: 'small', bosses: ['bloodhound_knight'] },
  { id: 'stillwater', name: 'Stillwater Cave', x: 17, y: 50, theme: 'cave', size: 'small', bosses: ['cleanrot_knight'] },
  { id: 'academy_crystal', name: 'Academy Crystal Cave', x: 24, y: 43.6, theme: 'cave', size: 'small', bosses: [['crystalian', 'crystalian']] },
  { id: 'black_knife_cat', name: 'Black Knife Catacombs', x: 19, y: 36, theme: 'catacomb', size: 'small', bosses: ['cemetery_shade'] },
  { id: 'cliffbottom', name: 'Cliffbottom Catacombs', x: 40.4, y: 40, theme: 'catacomb', size: 'small', bosses: ['watchdog'] },
  { id: 'precipice', name: 'Ruin-Strewn Precipice', x: 41, y: 26.4, theme: 'tunnel', size: 'large', bosses: ['makar'], exit: [45, 25.6], graces: ['Ruin-Strewn Precipice', 'Ruin-Strewn Precipice Overlook'] },
  { id: 'gael_tunnel', name: 'Gael Tunnel', x: 70.4, y: 62.6, theme: 'tunnel', size: 'small', bosses: ['magma_wyrm'], pickup: 'moonveil' },
  { id: 'sellia_crystal', name: 'Sellia Crystal Tunnel', x: 78, y: 59.4, theme: 'tunnel', size: 'small', bosses: ['fallingstar'] },
  { id: 'war_dead', name: 'War-Dead Catacombs', x: 85.4, y: 74, theme: 'catacomb', size: 'small', bosses: ['putrid_spirit'] },
  { id: 'gaol_cave', name: 'Gaol Cave', x: 68.6, y: 76.8, theme: 'cave', size: 'small', bosses: ['frenzied_duelist'] },
  { id: 'abandoned_cave', name: 'Abandoned Cave', x: 73, y: 67, theme: 'cave', size: 'small', bosses: [['cleanrot_knight', 'cleanrot_knight']] },
  { id: 'nox_sellia', name: 'Sellia, Town of Sorcery', x: 80.8, y: 61.2, theme: 'catacomb', size: 'small', bosses: [['nox_swordstress', 'nox_monk']], label: 'Sellia hideaway' },
  { id: 'dragonbarrow_cave', name: 'Dragonbarrow Cave', x: 79, y: 55.6, theme: 'cave', size: 'small', bosses: ['beastman'] },
  { id: 'sainted', name: "Sainted Hero's Grave", x: 53, y: 39.4, theme: 'catacomb', size: 'small', bosses: ['black_knife'] },
  { id: 'lux', name: 'Lux Ruins Cellar', x: 52.4, y: 36.6, theme: 'catacomb', size: 'small', bosses: ['demi_queen'] },
  { id: 'writheblood', name: 'Writheblood Ruins', x: 46, y: 32, theme: 'catacomb', size: 'small', bosses: ['sanguine_noble'] },
  { id: 'old_altus', name: 'Old Altus Tunnel', x: 50, y: 40, theme: 'tunnel', size: 'small', bosses: ['stonedigger'] },
  { id: 'divine_east', name: 'Divine Tower of East Altus', x: 63.6, y: 36.6, theme: 'tower', size: 'small', bosses: [['fell_twin', 'fell_twin']] },
  { id: 'gelmir_hero', name: "Gelmir Hero's Grave", x: 31, y: 13, theme: 'catacomb', size: 'small', bosses: ['red_wolf_champion'] },
  { id: 'seethewater_cave', name: 'Seethewater Cave', x: 45, y: 16, theme: 'cave', size: 'small', bosses: [['kindred_rot', 'kindred_rot']] },
  { id: 'giants_cat', name: "Giants' Mountaintop Catacombs", x: 81, y: 22, theme: 'catacomb', size: 'small', bosses: ['ulcerated_spirit'] },
  { id: 'spiritcaller', name: 'Spiritcaller Cave', x: 83.4, y: 24.6, theme: 'cave', size: 'small', bosses: [['godskin_apostle', 'godskin_noble']] },
  { id: 'zamor_grave', name: "Giant-Conquering Hero's Grave", x: 82, y: 18, theme: 'catacomb', size: 'small', bosses: ['zamor_hero'] },
  { id: 'forlorn_cave', name: 'Cave of the Forlorn', x: 69, y: 10.6, theme: 'cave', size: 'small', bosses: ['misbegotten_crusader'] },
  { id: 'snowfield_cat', name: 'Consecrated Snowfield Catacombs', x: 72, y: 8, theme: 'catacomb', size: 'small', bosses: ['putrid_duelist'] },
  { id: 'yelough', name: 'Yelough Anix Tunnel', x: 62, y: 12, theme: 'tunnel', size: 'small', bosses: ['astel'] },
];

// ---------------------------------------------------------------- field bosses roaming the overworld
// [bossId, x, y, extra]  extra.night = only at night
const FIELD_BOSSES = [
  ['tree_sentinel', 48.6, 70.4], ['agheel', 44.2, 76.6], ['nights_cavalry', 47.4, 75.6, { night: true }], ['deathbird', 46.6, 60.8, { night: true }],
  ['tibia_mariner', 56.4, 64.6], ['erdtree_avatar', 56, 91.4], ['nights_cavalry', 52.6, 88.6, { night: true }], ['deathbird', 50.6, 88, { night: true }],
  ['smarag', 30.6, 42.4], ['adula', 13.4, 49], ['royal_revenant', 17.8, 33.4], ['omenkiller', 21.6, 53.4], ['erdtree_avatar', 40, 31.6], ['erdtree_avatar', 17.4, 54.6],
  ['nights_cavalry', 34.6, 49, { night: true }], ['deathbird', 24, 26, { night: true }], ['death_rite_bird', 29, 41.6, { night: true }],
  ['oneil', 75.6, 71.2], ['ekzykes', 69, 68.4], ['putrid_avatar', 82, 69.6], ['nights_cavalry', 77, 66, { night: true }],
  ['greyoll', 74.4, 55.6], ['greyll', 89.4, 45.8], ['kindred_bb', 87.6, 42.4], ['putrid_avatar', 82, 46], ['nights_cavalry', 83, 52, { night: true }],
  ['lansseax', 54.4, 24.4], ['tree_sentinel', 57.4, 31.4], ['draconic_sentinel', 57.8, 24.6], ['godskin_apostle', 58.6, 38.4], ['nights_cavalry', 50.4, 30.6, { night: true }], ['deathbird', 58, 28.6, { night: true }],
  ['fallingstar', 40, 9.6], ['magma_wyrm_gelmir', 31, 8.4], ['demi_queen', 50.4, 10.4], ['ulcerated_spirit', 26.4, 11.4],
  ['kindred_bb', 73, 22.4], ['fire_giant', 91.4, 18.6], ['borealis', 88, 7.4], ['erdtree_avatar', 90.6, 12.6], ['death_rite_bird', 82, 12, { night: true }],
  ['theodorix', 63.4, 10], ['putrid_avatar', 70, 6.4], ['nights_cavalry', 67, 12.4, { night: true }], ['death_rite_bird', 73, 5.4, { night: true }],
];

// ---------------------------------------------------------------- items lying in the world
const ITEMS_OW = [
  { id: 'zwei', x: 41.4, y: 60.6, weapon: 'zweihander' }, { id: 'darkmoon', x: 15, y: 51.4, weapon: 'darkmoon', req: 'adula' },
  { id: 'rob', x: 86.4, y: 13.8, weapon: 'riversofblood' },
  { id: 'dectus_l', x: 61.4, y: 75.2, medallion: 'left', label: 'Dectus Medallion (Left)' }, { id: 'dectus_r', x: 84.8, y: 49.2, medallion: 'right', label: 'Dectus Medallion (Right)' },
  { id: 'seed1', x: 47, y: 75.8, seed: true }, { id: 'seed2', x: 56.2, y: 72.8, seed: true }, { id: 'seed3', x: 49, y: 87.4, seed: true }, { id: 'seed4', x: 33.2, y: 52.8, seed: true },
  { id: 'seed5', x: 22, y: 50.6, seed: true }, { id: 'seed6', x: 67.6, y: 65.2, seed: true }, { id: 'seed7', x: 52.6, y: 30.2, seed: true }, { id: 'seed8', x: 46.8, y: 11.8, seed: true },
  { id: 'seed9', x: 80, y: 16, seed: true }, { id: 'seed10', x: 65, y: 9, seed: true },
  { id: 'gr1', x: 39, y: 72.6, runes: 400 }, { id: 'gr2', x: 59, y: 86, runes: 700 }, { id: 'gr3', x: 25, y: 33, runes: 1500 }, { id: 'gr4', x: 86, y: 64, runes: 3000 },
  { id: 'gr5', x: 53, y: 20, runes: 4000 }, { id: 'gr6', x: 92, y: 26, runes: 8000 },
];

// lifts that carry you between overworld points
const LIFTS = [
  { id: 'dectus', name: 'Grand Lift of Dectus', x: 43.6, y: 33.4, to: [46.4, 31.6], req: { medallion: 2, msg: 'Both halves of the Dectus Medallion are needed. (Fort Haight and Fort Faroth.)' } },
  { id: 'dectus_down', name: 'Grand Lift of Dectus', x: 46.4, y: 31.2, to: [43.2, 33.8] },
  { id: 'rold', name: 'Grand Lift of Rold', x: 77, y: 15.2, to: [79.4, 13.4], req: { boss: 'morgott', msg: 'The lift requires the Rold Medallion, carried by the Omen King.' } },
  { id: 'rold_down', name: 'Grand Lift of Rold', x: 79.2, y: 13, to: [76.6, 15.6] },
];

// the starting point
const START = { grace: 'The First Step' };
