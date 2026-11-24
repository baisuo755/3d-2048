# PLAN — 3D 2048 (Grove)

Project history and build record for **Grove** (3D 2048), live at https://baisuo755.github.io/3d-2048/.

## History

- **Round 1 (`antigravity-r1` @ `41c2aa4`)**: Full initial build — pure-JS 2048 engine (`src/engine.js`) with 11 unit tests, vendored Three.js scene, floating grass island, 11 procedural low-poly trees (Seed 2 → World Tree 2048), camera-relative controls, HUD/Menu/Win/Loss panels, `?seed=N` determinism, `window.__game` hook, and Playwright e2e + 1440/390 screenshots.
- **Round 1.5 (`antigravity-r1` @ `d4917cc`)**: Visual review & polish pass — shifted sky to sunlit cerulean so the golden World Tree and fireflies pop cleanly, improved mid-tier separation across Mature (32) / Great (64) / Grand (128), fixed cloud placement & island underside fill lighting, and tightened 390px island framing.
- **Round 2 (`antigravity-r2` @ `c989735`)**: Mobile UX & manipulation redesign — eliminated 1-finger swipe vs orbit conflict (`OrbitControls.touches.ONE = null`, `TWO = DOLLY_ROTATE` in Slide mode), added pure swipe recognizer (`src/touch.js`, +7 unit tests) with live swipe reticle, bottom thumb dock (`Slide`/`Orbit` toggle, `Reset view`, 48×48 hold-to-repeat d-pad), >=44px hit targets, one-handed lower-screen sheets, optional merge haptics, and `hasTouch` Playwright e2e coverage.
- **Round 3 (`antigravity-r3` @ `a091bde`)**: Visuals + game feel pass ("Sunlit Sky-Sanctuary Diorama") — carved sandstone terrace with glowing corner lanterns, tapered misty waterfall, hanging cliff vines, two-altitude clouds & meadow pollen, rotating World Tree halo & ground rune-aura, kinetic slide lean, squash-and-stretch merge pop, bloom rings, blocked-move micro-bump, non-drifting camera impulse, HUD `+N` score deltas, and World Tree win reveal beat.
- **Round 4 (`antigravity-r4` @ `6c546d7`)**: Final holistic polish & docs — fixed tree-first raycasting so tapping/hovering tall tree canopies always inspects the right tree, added cheap mobile performance guards (1024px shadows, 1.75 DPR cap, compact particle budget, background-tab pause), and refreshed `README.md` and `PLAN.md` to match the shipped game.
- **Round 5 (`antigravity-r5`)**: Score-driven world clock — monotonic four seasons (`Spring → Summer → Autumn → Winter`) with `Day → Dusk → Night` cross-fades (`src/atmosphere.js`), starfield, moon, warm corner lantern lights, dusk/night fireflies, falling autumn leaves, winter snow, and Golden Dawn World Tree win bloom, keeping all 11 tree tiers distinct in every phase.

## Invariants preserved across all rounds

- Plain HTML/CSS/JS ES modules with vendored Three.js (zero npm dependencies, zero build step).
- `src/engine.js` exact 2048 rules remained untouched from Round 1 onward; all 18 Node unit tests and Playwright desktop + `hasTouch` e2e checks stay green with 0 console errors.
- `prefers-reduced-motion` and `window.__game` remain intact.
