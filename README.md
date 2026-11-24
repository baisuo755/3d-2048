# 3D 2048 — Grove

A 3D remake of 2048 built with plain HTML/CSS/JS ES modules and vendored Three.js (no build step, no npm dependencies). Numbers never appear on the board: every tile is a procedural low-poly tree on a floating sunlit sanctuary island. Merge two identical trees to grow the next tier; grow the **World Tree** (2048) to win.

**Play live:** https://baisuo755.github.io/3d-2048/

## Run locally

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

## Art direction

**Sunlit Sky-Sanctuary Diorama** — a handcrafted low-poly floating island suspended above a misty two-altitude cloud sea:

- Cool cerulean sky with an off-axis warm solar halo so the warm honey-gold World Tree and green/ochre/redwood canopy ladder stay legible at a glance.
- Sculpted floating island with stepped two-tone meadow patches, carved sandstone garden terrace with glowing corner lantern bollards, asymmetric cliff crags and hanging vines, coral & cream wildflowers, and a spring pond feeding a tapered misty waterfall.
- Every tree tier is built procedurally in `src/trees.js` with distinct height, silhouette, trunk structure, and foliage hue so the board plays cleanly without numbers.

## Tiers

| Tier | Face value | Tree | Silhouette & palette |
| --- | --- | --- | --- |
| 1 | 2 | Seed | Soil mound, glossy chestnut acorn nut, twin chartreuse shoot |
| 2 | 4 | Sprout | Tender curved stem, spring-green leaf pair, sunlit dew bud |
| 3 | 8 | Sapling | Slim pale-bark trunk with root nub, dual-tone faceted bud |
| 4 | 16 | Young Tree | Flared trunk, fuller emerald crown, tiny sunlit blossoms |
| 5 | 32 | Mature Tree | Forked trunk, wide twin-blob warm forest canopy |
| 6 | 64 | Great Tree | Broad buttressed trunk, three-blob deep-pine clover canopy |
| 7 | 128 | Grand Tree | Tall open visible branches, flat layered aqua-jade umbrella pads |
| 8 | 256 | Elder Tree | Gnarled twisting trunk, wide golden-olive crown with lantern buds |
| 9 | 512 | Ancient Tree | Massive moss-draped trunk, mossy boulders, misty sage-teal crown |
| 10 | 1024 | Giant Sequoia | Fluted crimson redwood buttress trunk, towering 5-tier conifer spire |
| 11 | 2048 | World Tree | Golden-ivory trunk, glowing crown, ground rune-aura, rotating apex halo & fireflies |

Hover any tree on desktop—or quick-tap any tree on touch screens—to see its tier name in a bottom pill (no numbers on the board).

## Controls

| Action | Keyboard | Mouse | Touch | On-screen |
| --- | --- | --- | --- | --- |
| Slide trees (camera-relative) | Arrow keys or `W`/`A`/`S`/`D` | — | Single-finger swipe anywhere (in **Slide** mode) | Bottom-left d-pad (tap or hold to repeat) |
| Orbit / zoom camera | — | Drag to orbit, wheel to zoom | Two-finger drag/pinch anytime, or switch to **Orbit** mode for one-handed drag | **Slide / Orbit** toggle & **Reset view** (touch / mobile) |
| Inspect tree tier name | — | Hover any tree | Quick tap any tree (in **Slide** mode) | Bottom pill |
| Restart | `R` | — | — | **Restart** button (HUD / Menu) |
| Menu & How to play | `Esc` | — | — | **Menu** button |

Moves are always camera-relative: **up** pushes trees away from the camera, snapped to the nearest grid axis.

On touch devices, **Slide** mode is active by default so single-finger swipes never fight the camera: `OrbitControls` ignores single-finger drags in Slide mode (`touches.ONE = null`) and uses two-finger drag/pinch (`touches.TWO = DOLLY_ROTATE`) for camera orbit & zoom. A live directional swipe reticle previews your direction past 12px and commits cleanly at 36px (or on crisp flick release >=26px), while multi-touch immediately cancels any pending swipe until all fingers lift. Switching the bottom-right dock to **Orbit** enables one-handed camera rotation without moving tiles; **Reset view** returns to default framing.

## Game feel, performance & accessibility

- Kinetic `easeOutQuart` slide with directional tree lean, squash-and-stretch merge pop, expanding plot bloom rings, two-tone leaf bursts (with golden sparkles on tier >= 64), elastic spawn drop-in, subtle blocked-move micro-bump, non-drifting render-time camera micro-impulse, and rising `+N` HUD score deltas.
- World Tree win triggers a golden sanctuary shockwave, rising gold & mint fireflies, a gentle camera lift toward the World Tree, and a warm viewport vignette glow before the win sheet appears.
- Optional subtle haptic feedback (`navigator.vibrate`) on merges/win/loss where supported.
- Mobile performance guards: `1024×1024` shadow map and `1.75` DPR cap on compact screens (vs `2048×2048` and `2` DPR on desktop), scaled particle budgets on small viewports, and automatic render-loop pause when the tab is hidden.
- Respects `prefers-reduced-motion`: animations are shortened and damped, island bobbing, canopy sway, camera impulses, particles, haptics, and score deltas are disabled.

## Project structure

- `index.html`, `styles.css` — warm botanical glass HUD, >=44px touch targets, responsive 390px one-handed sheets & 1440px desktop layout
- `src/tiers.js` — 11-tier progression metadata
- `src/engine.js` — pure-JS 2048 engine (no DOM, no Three.js)
- `src/touch.js` — pure touch-swipe recognizer and camera-relative direction mapping
- `src/scene.js` — Three.js renderer, portrait-aware camera, OrbitControls, sunlit sky dome & two-altitude clouds
- `src/trees.js` — procedural low-poly mesh generator for all 11 tiers
- `src/board.js` — floating sanctuary island, waterfall, 16 carved plot planters, tile animations, tree-first raycasting
- `src/particles.js` — leaf bursts, merge bloom rings, fireflies, pollen motes, waterfall mist
- `src/main.js` — input wiring, `localStorage` best score, haptics, reduced motion, visibility pause, `window.__game` hook
- `vendor/three/` — vendored Three.js ES module and `OrbitControls`
- `tests/engine.test.mjs`, `tests/touch.test.mjs` — Node unit test suites (18 tests)
- `scripts/e2e.mjs` — Playwright end-to-end verification (desktop 1440, `hasTouch` 390, reduced motion) and screenshot capture

## Tests & debug hook

Run the pure-JS unit test suite:

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
  state(),               // "ready" | "playing" | "won" | "continue" | "lost"
  start(seed?),          // reset; optional seed makes spawns deterministic
  move(dir),             // "up" | "down" | "left" | "right" (grid-relative)
  grid(),                // 4×4 array of face values, 0 = empty
  score(), best(),
  setGrid(grid, opts?),  // load a 4×4 grid for deterministic scenario checks
  keepPlaying(),         // transition from "won" to "continue"
  settleAnimations(),    // snap active tile animations immediately
  touchMode(),           // "slide" | "orbit"
  cameraPos(),           // { x, y, z } rounded camera world coordinates
}
```
