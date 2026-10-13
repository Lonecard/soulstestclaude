# Ashen Reach

A 2D, mobile-first soulslike recreation of Elden Ring's Lands Between (base game), in plain HTML5 canvas with no dependencies.

**Play:** open `index.html` in a browser. For a single self-contained file (easiest on a phone), run `python3 tools/build.py` and open `dist/ashen-reach.html`. Landscape is recommended.

## The world

The overworld is laid out like the real map, with every region in its true relative position:

- Limgrave and Stormhill
- the Weeping Peninsula
- Liurnia of the Lakes
- Caelid and Dragonbarrow
- the Altus Plateau and Mt. Gelmir
- the Forbidden Lands
- the Mountaintops of the Giants
- the Consecrated Snowfield

Regions connect through the real passages:

| Passage | Connects |
|---|---|
| Bridge of Sacrifice | Limgrave and the Weeping Peninsula |
| Stormveil (or the cliffside bypass) | Stormhill and Liurnia |
| Grand Lift of Dectus (both medallion halves) | Liurnia and Altus |
| Ruin-Strewn Precipice | Liurnia and Altus |
| Leyndell (two Great Runes) | Altus and the Forbidden Lands |
| Grand Lift of Rold (after Morgott) | Forbidden Lands and the Mountaintops |
| Forge of the Giants (after the Fire Giant) | Mountaintops and Crumbling Farum Azula |

What's in the world:

- **121 overworld Sites of Grace** with their in-game names, plus graces inside dungeons (306 total).
- **About 80 named locations**: churches, ruins, forts, villages, Minor Erdtrees, Divine Towers, and Leyndell with the Erdtree.
- **70 enterable dungeons**:
  - Legacy dungeons: Stormveil, Raya Lucaria, Caria Manor, Castle Morne, Redmane, Shaded Castle, Volcano Manor, Leyndell, Castle Sol, the Haligtree, Farum Azula, the Ashen Capital, and Mohgwyn.
  - The underground: Siofra, Nokron, Deeproot, Ainsel, and the Lake of Rot.
  - Catacombs, caves, tunnels and hero's graves, each with its real boss.
  - Evergaols.
- **About 80 boss types and roughly 115 boss encounters.** Examples include:
  - Margit, Godrick, Rennala, Radahn, Rykard, Morgott, Mohg, Malenia, Maliketh, Placidusax, Godfrey/Hoarah Loux, Radagon and the Elden Beast.
  - Dragons, Tree Sentinels, Night's Cavalry, Erdtree Avatars, Astel and many more.
  - Phase 2 transitions, duos, and Great Runes from the shardbearers.

## Systems

- **Combat:** light combos, heavy attacks with hyper armor, rolls and backsteps with i-frames, poise breaks with critical hits, and lock-on.
- **Weapon skills (Ashes of War):** 19 weapons, each with a signature skill that costs FP. Examples: Moonveil's Transient Moonlight, Rivers of Blood's Corpse Piler and Malenia's Waterfowl Dance.
- **Status effects:**
  - On you: blood loss, scarlet rot, poison and frostbite.
  - On enemies: bleed and frost from your weapons.
- **Elemental attacks:** holy, magic, fire, lightning, gravity, death, black flame and more. Delivered as volleys, strikes, beams, novas, pools, breath, leaps, and Margit's golden daggers.
- **Torrent:** a mountable spirit steed in the overworld, plus a day/night cycle where Night's Cavalry and Deathbirds appear after dark.
- **Sites of Grace:**
  - Level up Vigor, Mind, Endurance and Strength.
  - Upgrade weapons (+10).
  - Fast travel and pass time.
- **World map:** parchment-style, with fast travel to discovered graces.
- **Saving:** progress is saved to `localStorage`.

## Controls

| Action | Touch | Keyboard / Mouse |
|---|---|---|
| Move | Left half (floating stick) | WASD / arrows |
| Attack / Heavy | Attack / Heavy buttons | J or click / K or right-click |
| Skill | Skill (star) button | L |
| Roll / Sprint | Tap / hold Roll | Tap / hold Space (Shift sprints) |
| Flask | Flask button | E |
| Lock-on | Lock button | Q / Tab |
| Interact | Prompt button | F |
| Torrent / Map / Pause | Top-right buttons | T / M / Esc |

## Accuracy notes

Region shapes and positions follow the in-game map but are approximate, since everything is drawn on a 100×100 grid. Bosses, graces and dungeon names come from the base game. Movesets are simplified 2D interpretations built from a shared library of attack types.

## Code layout

| File | Contents |
|---|---|
| `js/data/world.js` | Regions, barriers, graces, locations, dungeons, field bosses, items, lifts |
| `js/data/bosses.js` | Boss definitions (look, moveset, rank, drops, Great Runes) |
| `js/data/enemies.js` | Regular enemies and spawn tables |
| `js/data/weapons.js` | Armaments and skills |
| `js/data/moves.js` | Reusable attack builders and archetype kits |
| `js/world.js` | Textures, terrain, dungeon generation, collision, atmosphere |
| `js/combat.js` | Player, Torrent, skills, enemy AI, hazards, travel, day/night |
| `js/models.js` | Character and creature models |
| `js/render.js` | World drawing, lighting, weather |
| `js/hud.js` | HUD and touch controls |
| `js/map.js` | World map |
| `js/main.js` | Menus, saving, boot |
