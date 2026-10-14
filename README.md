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
  - Real second phases instead of a generic power-up:
    - Godrick grafts on a dragon's head; Radahn crashes down as a meteor.
    - Rennala hides behind her chanting students, then calls the Full Moon with a fresh health bar and summons spirits.
    - The God-Devouring Serpent splits open to reveal Rykard; the Beast Clergyman becomes Maliketh, whose Black Blade inflicts Destined Death.
    - Malenia blooms into the Goddess of Rot (Scarlet Aeonia, new health bar); Mohg performs his Nihil ritual.
    - Godfrey becomes Hoarah Loux and grabs you; the Fire Giant severs his own leg and crawls on.
  - Duos and escorts, and Great Runes from the shardbearers.

## Systems

- **Combat:** light combos, heavy attacks with hyper armor, rolls and backsteps with i-frames, poise breaks with critical hits, and lock-on.
- **Weapon skills (Ashes of War):** 19 weapons, each with a signature skill that costs FP. Examples: Moonveil's Transient Moonlight, Rivers of Blood's Corpse Piler and Malenia's Waterfowl Dance.
- **Status effects:**
  - On you: blood loss, scarlet rot, poison and frostbite.
  - On enemies: bleed and frost from your weapons.
- **Elemental attacks:** holy, magic, fire, lightning, gravity, death, black flame and more. Delivered as volleys, strikes, beams, novas, pools, breath, leaps, and Margit's golden daggers.
- **Incantations and sorceries:** you start with a Finger Seal and Heal. Find Golden Vow, Flame, Grant Me Strength, Lightning Spear, the Astrologer's Staff with Glintstone Pebble, Rock Sling and Comet Azur in the world; Black Flame and Rennala's Full Moon come from bosses. Memorise up to three at a grace (Magic tab). Damage scales with Mind.
- **Spirit Ashes:** Renna gives you the Spirit Calling Bell and Lone Wolf Ashes at the Church of Elleh, Roderika gives you Jellyfish Ashes at the Stormhill Shack, and Black Knife Tiche and the Mimic Tear come from their bosses. Summon one per boss fight from the prompt that appears; bosses fight back against them.
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
| Crimson Tears (HP flask) | Orange flask button | E |
| Cerulean Tears (FP flask) | Blue flask button | R |
| Spell / switch spell | Seal button / small arrow | C / V |
| Summon Spirit Ash | Prompt during boss fights | F |
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
