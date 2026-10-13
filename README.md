# Ashen Reach

A small, mobile-first soulslike inspired by Elden Ring's opening: cross Limgrave and Stormhill, beat Margit at the Stormgate, and take on Godrick the Grafted in Stormveil Castle.

It's plain HTML5 canvas with no dependencies.

**Play:** open `index.html` in a browser. To get the whole game as one file (easiest on a phone), run `python3 tools/build.py`, which writes `dist/ashen-reach.html`. Landscape is recommended.

## Controls

| Action | Touch | Keyboard / Mouse |
|---|---|---|
| Move | Drag anywhere on the left half (floating stick) | WASD / arrows |
| Light attack (combo) | Big **Attack** button | J / left click |
| Heavy attack (hyper armor, big poise damage) | **Heavy** button | K / right click |
| Dodge roll (i-frames) / backstep | Tap **Roll** (no direction = backstep) | Tap Space |
| Sprint | Hold **Roll** | Hold Space or Shift |
| Drink flask | **Flask** button | E |
| Lock-on | **Lock** button | Q / Tab |
| Rest / pick up / enter fog | Prompt button that appears | F |
| Pause | top-right **II** | Esc |

## The journey

1. **Limgrave**
   - Graces: The First Step, Church of Elleh and Gatefront.
   - Enemies: Wandering Nobles, Godrick Soldiers, archers and wolves.
   - Field boss: the **Tree Sentinel** patrols the fields on horseback.
2. **Stormhill**
   - A rainy pass with wolf packs, soldiers and a **Troll**.
3. **Margit, the Fell Omen** guards the Stormgate.
   - Phase 1: cane combos, delayed slams and holy daggers.
   - Phase 2: golden hammer and sword.
4. **Stormveil Castle**
   - Godrick Knights block with their shields, so flank them or use heavy attacks.
   - A Banished Knight, plus archers on the walls.
5. **Godrick the Grafted**
   - Axe combos, stomps and a whirlwind.
   - Phase 2: he grafts on a dragon head that breathes fire.

## Weapons

| Weapon | Found | Style |
|---|---|---|
| Longsword | Start | Balanced |
| Uchigatana | Gatefront Ruins | Fast, causes blood loss |
| Zweihander | Stormhill | Slow, staggers |
| Golden Halberd | Tree Sentinel drop | Huge reach |

Equip weapons at any Site of Grace. **Golden Seeds** add flask charges.

## Systems

- **Sites of Grace**
  - Resting heals you and respawns enemies.
  - From a grace you can level up (Vigor, Endurance, Strength), change equipment and fast travel.
  - Golden guidance rays point the way.
- **Combat**
  - Breaking an enemy's poise staggers it, and hits on a staggered enemy are critical hits.
  - Attacks have clear wind-up tells: a red outline, ground markers and a glint before delayed swings.
- **Runes:** when you die you drop your runes. Pick them up again before you die a second time.
- **Saving:** progress saves to `localStorage`.
- **Performance:** rendering resolution drops automatically if a phone struggles.

## Code layout

| File | Contents |
|---|---|
| `js/core.js` | Utilities, canvas, audio, shared state |
| `js/data.js` | Weapons, enemies, bosses, world layout |
| `js/world.js` | Textures, decoration, collision, atmosphere |
| `js/input.js` | Touch, keyboard and mouse |
| `js/combat.js` | Player, enemy AI, bosses, hazards |
| `js/render.js` | Drawing, lighting, weather, HUD |
| `js/main.js` | Menus, saving, game loop |
