# Ashen Reach

A tiny Elden Ring–style soulslike made for phones. It's plain HTML5 canvas with no dependencies and no build step.

**Play:** open `index.html` in a browser. To play on a phone, host the folder anywhere static (for example GitHub Pages: Settings → Pages → deploy from this branch). Landscape is recommended.

## Controls

| Action | Touch | Keyboard / Mouse |
|---|---|---|
| Move | Drag anywhere on the left half (floating stick) | WASD / arrows |
| Light attack (3-hit combo) | Big **Attack** button | J / left click |
| Heavy attack (hyper armor, big poise damage) | **Heavy** button | K / right click |
| Dodge roll (i-frames) / backstep | Tap **Roll** (no direction = backstep) | Tap Space |
| Sprint | Hold **Roll** | Hold Space or Shift |
| Drink flask | **Flask** button | E |
| Lock-on | **Lock** button | Q / Tab |
| Rest at grace / enter fog | Prompt button that appears | F |
| Pause | top-right **II** | Esc |

## What's in it

- **Combat:** stamina-based light combo, heavy attacks, buffered inputs, dodge i-frames, hit-stop, screen shake and haptics.
- **Poise:** break an enemy's poise to stagger it. Hits on a staggered enemy are critical hits; heavy attacks do the most.
- **Enemies:** Hollow Soldiers, Gaunt Wolves and Grave Brutes. Each attack has a clear wind-up tell (a red outline, plus ground markers for area attacks).
- **Boss: Morgrave, the Ashen Knight**
  - Combo slashes, a *delayed* overhead slam (watch for the glint), a charge, and a leap slam with a shockwave.
  - Phase 2 starts at 50% HP and adds fire orbs, a fire nova and faster attacks.
- **Soulslike loop:**
  - Sites of Grace refill your HP and flasks, respawn enemies and let you level up Vigor, Endurance and Strength with runes.
  - When you die you drop your runes as a bloodstain. Pick it up again before you die a second time.
- Progress is saved in `localStorage`.

## Files

- `index.html`: page and menus
- `style.css`: menu styling
- `game.js`: the whole game (input, combat, AI, rendering, audio)
