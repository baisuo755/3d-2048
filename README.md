# 3D 2048 — Grove

A 3D remake of 2048 built with plain HTML/CSS/JS ES modules and vendored Three.js (no build step, no npm dependencies). Numbers never appear on the board: every tile is a procedural low-poly tree on a floating grass island. Merge two identical trees to grow the next tier; grow the **World Tree** (2048) to win.

## How to run

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

Append `?seed=N` (numeric or string) to the URL for a deterministic spawn sequence across loads and restarts.

## Rules (exact 2048)

- 4×4 plot grid on a floating island. Each move slides every tree in one direction as far as it can go.
- Two identical trees merge into the next tier at the destination plot; each tree merges at most once per move.
- A move that changes nothing is not a turn and spawns nothing.
- After each effective move, one new tile spawns in a random empty plot: 90% Seed (2), 10% Sprout (4).
- Score adds each newly merged tile's face value. Best score persists in `localStorage` under `grove2048.best.v1`.
- Reaching the **World Tree** (2048) wins (`won`) and offers **Keep playing** (`continue`).
- Filling the island with no empty plots and no adjacent equal pairs ends the run (`lost`).

## Tiers

| Tier | Face value | Tree | Silhouette & palette |
| --- | --- | --- | --- |
| 1 | 2 | Seed | Tiny sprouting seed mound with chartreuse tip |
| 2 | 4 | Sprout | Short tender stem, first spring-green leaf pair |
| 3 | 8 | Sapling | Slim pale-bark trunk, single faceted canopy |
| 4 | 16 | Young Tree | Taller trunk with root flare, fuller emerald canopy |
| 5 | 32 | Mature Tree | Forked trunk, two-blob forest canopy |
| 6 | 64 | Great Tree | Broad buttressed trunk, three-blob deep-pine canopy |
| 7 | 128 | Grand Tree | Visible angled branches, layered jade canopy |
| 8 | 256 | Elder Tree | Gnarled twisting trunk, wide golden-olive layered crown |
| 9 | 512 | Ancient Tree | Massive moss-draped trunk with base rocks, moss-teal crown |
| 10 | 1024 | Giant Sequoia | Towering fluted redwood trunk, stacked conifer/bronze spire |
| 11 | 2048 | World Tree | Luminous ivory-gold trunk, glowing canopy, orbiting fireflies |

Hovering a tree on desktop shows its tier name in a bottom pill (no numbers on the board).

## Controls

| Action | Keyboard | Mouse / Touch | On-screen |
| --- | --- | --- | --- |
| Slide trees (camera-relative) | Arrow keys or `W`/`A`/`S`/`D` | Single-finger quick touch swipe | Bottom d-pad |
| Orbit / zoom camera | — | Drag to orbit, wheel or pinch to zoom | — |
| Inspect tree tier name | — | Hover any tree on desktop | Bottom pill |
| Restart | `R` | — | **Restart** button (HUD / Menu) |
| Menu & How to play | `Esc` | — | **Menu** button |

Moves are camera-relative: **up** always pushes trees away from the camera, snapped to the nearest grid axis.

## Game feel & accessibility

- Smooth slide easing on every move, merge growth pop with tinted low-poly leaf bursts, and drop-in bounce on new spawns.
- World Tree win gently lifts the camera and releases a surge of golden fireflies before showing the win panel; loss pauses briefly before showing the end panel.
- Respects `prefers-reduced-motion`: animations are shortened and damped, island bobbing and canopy wind sway stop, and particles are disabled.

## Project structure

- `index.html`, `styles.css` — warm botanical glass HUD, responsive 390px/1440px layout, menu, win/loss dialogs
- `src/tiers.js` — 11-tier progression metadata
- `src/engine.js` — pure-JS 2048 engine (no DOM, no Three.js)
- `src/scene.js` — Three.js renderer, portrait-aware camera framing, OrbitControls, sunlit sky & clouds
- `src/trees.js` — procedural low-poly mesh generator for all 11 tiers
- `src/board.js` — floating island, 16 plot pedestals, tile animation lifecycle, hover raycasting
- `src/particles.js` — merge leaf bursts and World Tree fireflies
- `src/main.js` — input wiring, localStorage best score, reduced motion, `window.__game` hook
- `vendor/three/` — vendored Three.js ES module and `OrbitControls`
- `tests/engine.test.mjs` — Node unit test suite for `src/engine.js`
- `scripts/e2e.mjs` — Playwright end-to-end verification and screenshot script

## Tests & debug hook

Run the pure-JS engine tests:

```bash
node --test tests/
```

Run the Playwright end-to-end suite (requires Playwright available in Node):

```bash
node scripts/e2e.mjs
```

Browser debug hook exposed on `window.__game`:

```js
window.__game = {
  state(),            // "ready" | "playing" | "won" | "continue" | "lost"
  start(seed?),       // reset; optional seed makes spawns deterministic
  move(dir),          // "up" | "down" | "left" | "right" (grid-relative)
  grid(),             // 4×4 array of face values, 0 = empty
  score(), best(),
  setGrid(grid, opts?), // load a 4×4 grid for deterministic scenario checks
  keepPlaying(),      // transition from "won" to "continue"
}
```
