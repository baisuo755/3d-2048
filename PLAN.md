# PLAN — 3D 2048 (Grove)

Set up by Commander on 2026-11-24 (KL time). Routing per Baisuo's instruction the same day: build rounds go to Antigravity Pilot.

## Layout

- Main repo: `/Users/AIDev/Projects/3D 2048` — branch `main`, planning docs only, no remote yet.
- Worktree area: `/Users/AIDev/Projects/3D 2048-wt` — one worktree per round, branch named after the round (Notion Learning Graph pattern).

## Round 1 — full build (Antigravity Pilot)

- Branch: `antigravity-r1` (from `main`) · Worktree: `/Users/AIDev/Projects/3D 2048-wt/antigravity-r1`
- Goal: the whole game per README.md — pure-JS engine, 3D island scene, 11 procedural tree models, camera-relative controls, HUD, win/lose flow, tests, README rewritten to actual state.
- Definition of done:
  1. `node --test tests/` passes — engine: legal moves, slide + merge, once-per-move, no-change move ≠ turn, 90/10 spawn mix + seeded determinism, scoring, win at 2048, loss, continue-after-win.
  2. Playwright e2e through `window.__game`: a scripted game proving merge + score, a forced win reaching the World Tree, a forced loss, spawn determinism under `?seed=N`.
  3. Screenshots at 1440 and 390 widths; zero console errors on load and during the scripted game.
  4. README rewritten to describe what actually runs (controls, tiers, tests, hook); the "Status: planning" line removed.
- Not allowed: push, merge into `main` or any branch, deploy, destructive git (reset --hard, force push, clean -fd, branch -D), edits outside the worktree, automations, secrets.
- Report: STANDARD DONE BLOCK — Tests (command + real result) / Console errors / Screenshots (paths) / Unverified / Branch and commits.

## After round 1 (Commander)

- Verify the claim on the Mac: `git status`/`log`, run the test command myself, open the screenshots.
- Optional round 2 on Baisuo's word: review/polish pass (Grok or Codex) in its own worktree.

## Out of scope for round 1

3D cube grid, extra themes (animals/city), sound, any deploy/hosting.
