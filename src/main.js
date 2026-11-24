// Grove (3D 2048) entry point: wires pure-JS engine, 3D floating island scene,
// camera-relative controls (keyboard, touch swipe, d-pad), HUD, persistence,
// prefers-reduced-motion, and window.__game debug hook.

import * as THREE from 'three';
import { createGame, TIERS, getTierInfo } from './engine.js';
import { createScene } from './scene.js';
import { createParticles } from './particles.js';
import { createBoard } from './board.js';

// ------------------------------------------------------------ Persistence

const BEST_KEY = 'grove2048.best.v1';

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function saveBest(val) {
  try {
    localStorage.setItem(BEST_KEY, String(val));
  } catch {
    /* private/full storage: keep session best */
  }
}

// ------------------------------------------------------------ Seed param

const seedParam = new URLSearchParams(location.search).get('seed');
const urlSeed =
  seedParam !== null && seedParam.trim() !== '' && Number.isFinite(Number(seedParam))
    ? Math.floor(Number(seedParam))
    : seedParam !== null && seedParam.trim() !== ''
      ? seedParam.trim()
      : null;

function resolveSeed(explicitSeed) {
  if (explicitSeed !== undefined && explicitSeed !== null) return explicitSeed;
  if (urlSeed !== null) return urlSeed;
  return (Math.random() * 0x7fffffff) | 0;
}

// ------------------------------------------------------------ Scene & Board

const view = createScene(document.body);
const particles = createParticles(view.scene);
const board = createBoard(view.scene, particles);

// ------------------------------------------------------------ Reduced motion

const motionMq = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionMq.matches;
board.setReducedMotion(reducedMotion);
particles.setReducedMotion(reducedMotion);

motionMq.addEventListener('change', (e) => {
  reducedMotion = e.matches;
  board.setReducedMotion(reducedMotion);
  particles.setReducedMotion(reducedMotion);
  if (reducedMotion) {
    winLift = 0;
  }
});

// ------------------------------------------------------------ DOM refs

const $ = (id) => document.getElementById(id);
const hudScore = $('hud-score');
const hudBest = $('hud-best');
const btnRestart = $('btn-restart');
const btnMenu = $('btn-menu');
const menuEl = $('menu');
const menuTitle = $('menu-title');
const btnResume = $('btn-resume');
const btnMenuRestart = $('btn-menu-restart');
const tierLegend = $('tier-legend');

const hoverPill = $('hover-pill');
const hoverSwatch = $('hover-swatch');
const hoverName = $('hover-name');

const endgameEl = $('endgame');
const endPanel = $('end-panel');
const endTitle = $('end-title');
const endSub = $('end-sub');
const endScore = $('end-score');
const endBest = $('end-best');
const endHighest = $('end-highest');
const btnKeepPlaying = $('btn-keep-playing');
const btnPlayAgain = $('btn-play-again');
const btnEndMenu = $('btn-end-menu');
const dpadEl = document.querySelector('.dpad');

// Populate the 11-tier progression legend in the menu.
for (const t of TIERS) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="tier-swatch" style="background:${t.swatch}"></span><span class="tier-step mono">${t.tier}.</span><span>${t.name}</span>`;
  tierLegend.appendChild(li);
}

// ------------------------------------------------------------ Game Session

let game = null;
let bestScore = loadBest();
let menuOpen = false;
let endTimer = 0;
let winLift = 0; // gentle camera target lift seconds on World Tree win
let hoveredCell = null;

function updateHud() {
  if (!game) return;
  if (game.score > bestScore) {
    bestScore = game.score;
    saveBest(bestScore);
  }
  hudScore.textContent = String(game.score);
  hudBest.textContent = String(bestScore);
  updateHoverLabel();
}

function updateHoverLabel() {
  if (!game || !hoveredCell || menuOpen || !endgameEl.hidden) {
    hoverPill.hidden = true;
    return;
  }
  const val = game.grid()[hoveredCell.r][hoveredCell.c];
  const info = getTierInfo(val);
  if (!info) {
    hoverPill.hidden = true;
    return;
  }
  hoverSwatch.style.background = info.swatch;
  hoverName.textContent = info.name;
  hoverPill.hidden = false;
}

function clearPendingEnd() {
  if (endTimer) {
    clearTimeout(endTimer);
    endTimer = 0;
  }
}

function setMenuOpen(open) {
  menuOpen = Boolean(open);
  menuEl.hidden = !menuOpen;
  if (menuOpen) {
    hoverPill.hidden = true;
    board.setHover(null);
    menuTitle.focus({ preventScroll: true });
  }
}

function showEndPanel(kind) {
  const won = kind === 'won';
  endPanel.classList.toggle('won', won);
  endPanel.classList.toggle('lost', !won);
  endTitle.textContent = won ? 'World Tree Grown' : 'Grove Full';
  endSub.textContent = won
    ? 'Your grove reached the World Tree. Keep growing or start a fresh island.'
    : 'No empty plots and no matching trees left to merge.';
  endScore.textContent = String(game.score);
  endBest.textContent = String(bestScore);
  const topInfo = getTierInfo(game.maxTile());
  endHighest.textContent = topInfo ? topInfo.name : 'Seed';
  btnKeepPlaying.hidden = !won;
  btnPlayAgain.classList.toggle('primary', !won);
  endgameEl.hidden = false;
  hoverPill.hidden = true;
  board.setHover(null);
}

function startNewGame(seed) {
  clearPendingEnd();
  winLift = 0;
  particles.clear();
  endgameEl.hidden = true;
  setMenuOpen(false);
  game = createGame({ seed: resolveSeed(seed) });
  board.syncImmediate(game.tiles());
  updateHud();
  return game.grid();
}

function loadCustomGrid(grid4x4, opts = {}) {
  clearPendingEnd();
  winLift = 0;
  particles.clear();
  endgameEl.hidden = true;
  setMenuOpen(false);
  if (!game) {
    game = createGame({ seed: resolveSeed(opts.seed), initialGrid: grid4x4 });
  } else {
    game.loadGrid(grid4x4, opts);
  }
  board.syncImmediate(game.tiles());
  updateHud();
  if (game.state === 'won') showEndPanel('won');
  else if (game.state === 'lost') showEndPanel('lost');
  return game.grid();
}

function continueAfterWin() {
  if (!game || game.state !== 'won') return game ? game.state : 'ready';
  clearPendingEnd();
  winLift = 0;
  endgameEl.hidden = true;
  const nextState = game.keepPlaying();
  updateHud();
  if (nextState === 'lost') {
    showEndPanel('lost');
  }
  return nextState;
}

function performGridMove(dir) {
  if (!game) return { moved: false };
  const result = game.move(dir);
  if (!result.moved) return result;

  board.applyMove(result, game.tiles());
  updateHud();

  if (result.wonNow) {
    clearPendingEnd();
    winLift = reducedMotion ? 0 : 1.15;
    const delay = reducedMotion ? 260 : 1050;
    endTimer = setTimeout(() => {
      endTimer = 0;
      if (game && game.state === 'won') showEndPanel('won');
    }, delay);
  } else if (result.lostNow) {
    clearPendingEnd();
    const delay = reducedMotion ? 220 : 620;
    endTimer = setTimeout(() => {
      endTimer = 0;
      if (game && game.state === 'lost') showEndPanel('lost');
    }, delay);
  }

  return result;
}

// ------------------------------------------------ Camera-relative mapping

// Maps a screen-relative move ("up" = away from camera, "right" = camera right)
// onto the nearest grid-relative direction ("up" = -Z, "down" = +Z, "left" = -X, "right" = +X).
function cameraDirToGridDir(inputDir) {
  view.camera.updateMatrixWorld();
  const m = view.camera.matrixWorld.elements;
  // Camera forward projected onto XZ plane: -Z axis of camera world matrix.
  let fx = -m[8];
  let fz = -m[10];
  const flen = Math.hypot(fx, fz);
  if (flen < 1e-5) {
    // Camera nearly straight overhead: fall back to camera +Y projected to XZ.
    fx = m[4];
    fz = m[6];
  }
  // Camera right projected onto XZ plane: +X axis of camera world matrix.
  const rx = m[0];
  const rz = m[2];

  let vx = fx;
  let vz = fz;
  if (inputDir === 'down') {
    vx = -fx;
    vz = -fz;
  } else if (inputDir === 'right') {
    vx = rx;
    vz = rz;
  } else if (inputDir === 'left') {
    vx = -rx;
    vz = -rz;
  }

  if (Math.abs(vx) >= Math.abs(vz)) {
    return vx >= 0 ? 'right' : 'left';
  }
  return vz >= 0 ? 'down' : 'up';
}

function handleUserMove(screenDir) {
  if (menuOpen || !endgameEl.hidden) return;
  if (!game || game.state === 'won' || game.state === 'lost') return;
  const gridDir = cameraDirToGridDir(screenDir);
  performGridMove(gridDir);
}

// ------------------------------------------------------------ Input wiring

const KEY_DIRS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (!endgameEl.hidden) return;
    setMenuOpen(!menuOpen);
    return;
  }
  if (e.code === 'KeyR' && !menuOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    startNewGame();
    return;
  }
  const dir = KEY_DIRS[e.code];
  if (dir) {
    e.preventDefault();
    if (e.repeat) return;
    handleUserMove(dir);
  }
});

// On-screen D-pad (390-friendly, works for mouse and touch).
for (const btn of dpadEl.querySelectorAll('[data-dir]')) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    btn.blur();
    handleUserMove(btn.dataset.dir);
  });
}

// Touch swipe on the canvas: crisp single-finger flick moves trees;
// slow drag orbits and two-finger pinch zooms via OrbitControls.
const activeTouches = new Set();
let swipeStart = null;
const canvas = view.renderer.domElement;

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  activeTouches.add(e.pointerId);
  if (activeTouches.size === 1) {
    swipeStart = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
    };
  } else {
    swipeStart = null;
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch') return;
  activeTouches.delete(e.pointerId);
  if (swipeStart && swipeStart.id === e.pointerId && activeTouches.size === 0) {
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    const dt = performance.now() - swipeStart.t;
    const dist = Math.hypot(dx, dy);
    if (dt <= 340 && dist >= 40) {
      const dir =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? 'right'
            : 'left'
          : dy > 0
            ? 'down'
            : 'up';
      handleUserMove(dir);
    }
  }
  swipeStart = null;
});

canvas.addEventListener('pointercancel', (e) => {
  activeTouches.delete(e.pointerId);
  if (swipeStart && swipeStart.id === e.pointerId) swipeStart = null;
});

// Pointer hover raycasting for tier-name pill (desktop mouse).
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let isDraggingOrbit = false;

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') isDraggingOrbit = true;
});
window.addEventListener('pointerup', () => {
  isDraggingOrbit = false;
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || isDraggingOrbit || menuOpen || !endgameEl.hidden) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, view.camera);
  hoveredCell = board.pickCell(raycaster);
  board.setHover(hoveredCell);
  updateHoverLabel();
});

canvas.addEventListener('pointerleave', () => {
  hoveredCell = null;
  board.setHover(null);
  updateHoverLabel();
});

// Buttons wiring
btnRestart.addEventListener('click', (e) => {
  e.currentTarget.blur();
  startNewGame();
});
btnMenu.addEventListener('click', (e) => {
  e.currentTarget.blur();
  setMenuOpen(true);
});
btnResume.addEventListener('click', () => setMenuOpen(false));
btnMenuRestart.addEventListener('click', () => startNewGame());
btnKeepPlaying.addEventListener('click', () => continueAfterWin());
btnPlayAgain.addEventListener('click', () => startNewGame());
btnEndMenu.addEventListener('click', () => {
  endgameEl.hidden = true;
  setMenuOpen(true);
});

// Click outside modal panels closes menu when open.
menuEl.addEventListener('click', (e) => {
  if (e.target === menuEl) setMenuOpen(false);
});

// ------------------------------------------------------------ Render Loop

const clock = new THREE.Clock();
const targetGoal = new THREE.Vector3();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (winLift > 0) {
    winLift = Math.max(0, winLift - dt);
    const wtPos = board.getWorldTreeWorldPos();
    targetGoal.set(wtPos.x * 0.25, view.defaultTarget.y + 0.85, wtPos.z * 0.25);
  } else {
    targetGoal.copy(view.defaultTarget);
  }
  view.controls.target.lerp(targetGoal, 1 - Math.exp(-4.5 * dt));
  view.controls.update();

  view.tick(dt, reducedMotion);
  board.tick(dt, elapsed);
  particles.tick(dt, elapsed);

  view.renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Boot & Hook

startNewGame();
requestAnimationFrame(frame);

// Read-mostly debug hook matching README spec, plus additive helpers for
// deterministic win/loss/continue verification in Playwright.
window.__game = {
  state: () => (game ? game.state : 'ready'),
  start: (seed) => startNewGame(seed),
  move: (dir) => performGridMove(dir),
  grid: () => (game ? game.grid() : []),
  score: () => (game ? game.score : 0),
  best: () => bestScore,
  setGrid: (grid4x4, opts) => loadCustomGrid(grid4x4, opts),
  keepPlaying: () => continueAfterWin(),
  settleAnimations: () => board.finishAnimationNow(),
};
