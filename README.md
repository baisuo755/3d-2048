# 3D 2048 — Grove

A 3D remake of 2048: plain HTML/CSS/JS with Three.js (vendored, no build step, no npm). The numbers are gone — tiles are low-poly trees that **grow** when two identical ones merge. Grow the World Tree (tier 2048) to win.

Status: **planning**. Round 1 (the full build) is assigned to Antigravity Pilot on branch `antigravity-r1` — see PLAN.md. Until that lands, this README is the spec the build must satisfy, not a description of working software.

## Concept

Classic 4×4 2048 rules, played on a floating island seen in 3D. Every tile is a tree model; merging two identical trees grows one tree of the next tier at the destination cell. Reaching the World Tree (2048) wins.

Why trees: merge-to-grow *is* the mechanic — two of a kind combine into a bigger kind, so the theme explains the rules without numbers. Tiers read instantly by size, silhouette and leaf hue, which keeps a numberless board fair.

Theme alternates (one-line swap if Baisuo prefers): animals — egg → hatchling → … evolution chain; city — tent → hut → … megacity skyline. Grove is the round-1 pick.

## Rules (exact 2048)

- 4×4 grid. A move slides every tile in one direction as far as it can go.
- Two tiles of the same tier merge into the next tier at the far cell; each tile merges at most once per move.
- A move that changes nothing is not a move: no spawn, no turn.
- After each effective move one new tile spawns in a random empty cell: 90% Seed (2), 10% Sprout (4).
- Score: each merge adds the new tile's face value. Best score persists in localStorage (`grove2048.best.v1`).
- Win: create the World Tree (2048) — the panel offers Keep playing (state `continue`).
- Lose: no empty cell and no adjacent equal pair (state `lost`).

## Tiers

| Tier | Face value | Model | Readout |
| --- | --- | --- | --- |
| 1 | 2 | Seed | tiny sprouting seed mound |
| 2 | 4 | Sprout | short stem, first leaf pair |
| 3 | 8 | Sapling | slim trunk, one small canopy |
| 4 | 16 | Young Tree | taller, fuller single canopy |
| 5 | 32 | Mature Tree | two-blob canopy |
| 6 | 64 | Great Tree | broad trunk, three-blob canopy |
| 7 | 128 | Grand Tree | layered canopy, visible branches |
| 8 | 256 | Elder Tree | gnarled trunk, wide layered canopy |
| 9 | 512 | Ancient Tree | massive, moss tones, multi-layer |
| 10 | 1024 | Giant Sequoia | red-toned towering trunk |
| 11 | 2048 | World Tree | glowing canopy + firefly particles, win |

Face values stay the internal currency (scoring, HUD) but never appear on the board: models are the readout, distinguished by size, silhouette and hue. A hover label showing the tier name is allowed; numbers on tiles are not.

## Board, camera, controls

- A floating grass island; the 4×4 plot grid sits on it as low-poly pedestal cells.
- Camera: drag to orbit, wheel/pinch to zoom (same feel as 3D Minesweeper).
- Move: arrow keys / WASD, touch swipe, or the on-screen d-pad (390-friendly). Direction is camera-relative — "up" pushes tiles away from the camera.
- HUD: score + best, and a Menu (`Esc`) with Restart and How to play. Win and loss panels sit over the scene.

## Game feel

- Slide easing on every move; merge plays a grow pop with a small leaf burst; spawns drop in with a bounce.
- World Tree win: gentle camera lift, fireflies, then the panel. Loss: a beat, then the panel.
- All motion respects `prefers-reduced-motion`: animations shortened/damped, particles dropped.

## Tech (house pattern — same as 3D Minesweeper)

- Plain HTML/CSS/JS ES modules; Three.js vendored in `vendor/three/` (no npm, no build step).
- Run: `python3 -m http.server 8080` → http://localhost:8080
- Engine is pure JS (no DOM, no Three.js) in `src/engine.js`, so `node --test tests/` covers the rules.
- Browser checks run through the debug hook; `?seed=N` makes the spawn sequence deterministic.

## Tests

```
node --test tests/
```

Engine coverage: legal moves, slide + merge, once-per-move rule, no-change move ≠ turn, 90/10 spawn mix, seeded determinism, scoring, win at 2048, loss detection, continue-after-win. The browser game is checked with Playwright through the read-mostly debug hook:

```js
window.__game = {
  state(),        // "ready" | "playing" | "won" | "continue" | "lost"
  start(seed?),   // reset; a seed makes spawns deterministic
  move(dir),      // "up" | "down" | "left" | "right" — grid-relative (the UI maps camera→grid)
  grid(),         // 4×4 array of face values, 0 = empty
  score(), best(),
}
```

## Project layout

- Main repo: this folder, branch `main` — planning docs only, no remote yet.
- Worktrees: `/Users/AIDev/Projects/3D 2048-wt/<round>` — one per round, branch named after the round (Notion Learning Graph pattern). Round 1: `antigravity-r1`.
