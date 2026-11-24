// Grove (3D 2048) entry point: wires pure-JS engine, 3D floating island scene,
// camera-relative controls (keyboard, conflict-free 1-finger touch swipe +
// 2-finger orbit/pinch + Slide/Orbit mode toggle + hold-to-repeat d-pad),
// HUD, persistence, prefers-reduced-motion, and window.__game debug hook.

import * as THREE from 'three';
import { createGame, TIERS, getTierInfo } from './engine.js';
import { createScene } from './scene.js';
import { createParticles } from './particles.js';
import { createBoard } from './board.js';
import { cameraBasisToGridDir, createSwipeRecognizer } from './touch.js';
import { getWorldPhase, getAtmosphereTarget } from './atmosphere.js';

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

// ------------------------------------------------------------ Touch capability

if ((navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || 'ontouchstart' in window) {
  document.body.classList.add('has-touch');
}

// ------------------------------------------------------------ Scene & Board

const view = createScene(document.body);
const particles = createParticles(view.scene);
const board = createBoard(view.scene, particles);

function syncCompactParticles() {
  particles.setCompactMode(window.innerWidth <= 680);
}
syncCompactParticles();
window.addEventListener('resize', syncCompactParticles);

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
    camKick.set(0, 0, 0);
    winGlowEl.classList.remove('active');
  }
});

// ------------------------------------------------------------ Haptics (optional)

function triggerHaptic(pattern) {
  if (reducedMotion) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore unsupported / blocked vibrate */
  }
}

// ------------------------------------------------------------ DOM refs

const $ = (id) => document.getElementById(id);
const winGlowEl = $('win-glow');
const hudScore = $('hud-score');
const hudDelta = $('hud-delta');
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
const phaseDot = $('phase-dot');
const phaseLabel = $('phase-label');
const swipeIndicator = $('swipe-indicator');

const btnModeSlide = $('btn-mode-slide');
const btnModeOrbit = $('btn-mode-orbit');
const btnResetView = $('btn-reset-view');
const gestureHint = $('gesture-hint');

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
let tapInspectTimer = 0;
let swipeHideTimer = 0;
let touchMode = 'slide'; // "slide" | "orbit"
const camKick = new THREE.Vector3(); // subtle damped camera micro-move impulse
let currentPhase = getWorldPhase(0);
let atmosphereTarget = getAtmosphereTarget(currentPhase);

function syncAtmosphereTarget(immediate = false) {
  const score = game ? game.score : 0;
  const state = game ? game.state : 'ready';
  currentPhase = getWorldPhase(score, { state });
  atmosphereTarget = getAtmosphereTarget(currentPhase);
  phaseDot.style.background = currentPhase.dotColor;
  phaseDot.style.color = currentPhase.dotColor;
  phaseLabel.textContent = currentPhase.label;
  particles.setAtmosphereWeather(atmosphereTarget.weather);
  if (immediate) {
    view.applyAtmosphere(atmosphereTarget.sky, 1);
    board.applyAtmosphere(atmosphereTarget.island, 1);
    particles.settleAtmosphere();
  }
}

function setTouchMode(mode) {
  touchMode = mode === 'orbit' ? 'orbit' : 'slide';
  view.setTouchMode(touchMode);
  swipeRecognizer.resetAll();
  hideSwipeIndicator();
  const isSlide = touchMode === 'slide';
  btnModeSlide.classList.toggle('active', isSlide);
  btnModeSlide.setAttribute('aria-pressed', String(isSlide));
  btnModeOrbit.classList.toggle('active', !isSlide);
  btnModeOrbit.setAttribute('aria-pressed', String(!isSlide));
  gestureHint.textContent = isSlide
    ? 'Swipe to slide · 2-finger orbit'
    : 'Drag to orbit · pinch zoom';
}

function updateHud() {
  if (!game) return;
  if (game.score > bestScore) {
    bestScore = game.score;
    saveBest(bestScore);
  }
  hudScore.textContent = String(game.score);
  hudBest.textContent = String(bestScore);
  syncAtmosphereTarget(false);
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

function clearTapInspect() {
  if (tapInspectTimer) {
    clearTimeout(tapInspectTimer);
    tapInspectTimer = 0;
  }
}

function clearPendingEnd() {
  if (endTimer) {
    clearTimeout(endTimer);
    endTimer = 0;
  }
}

function showSwipeIndicator(x, y, dir, committed = false, progress = 1) {
  if (swipeHideTimer) {
    clearTimeout(swipeHideTimer);
    swipeHideTimer = 0;
  }
  swipeIndicator.hidden = false;
  swipeIndicator.dataset.dir = dir;
  swipeIndicator.classList.toggle('committed', committed);
  swipeIndicator.style.left = `${Math.round(x)}px`;
  swipeIndicator.style.top = `${Math.round(y)}px`;
  const scale = committed ? 1.12 : 0.86 + 0.2 * progress;
  swipeIndicator.style.transform = reducedMotion ? 'scale(1)' : `scale(${scale.toFixed(2)})`;
  if (committed) {
    swipeHideTimer = setTimeout(() => {
      swipeHideTimer = 0;
      swipeIndicator.hidden = true;
      swipeIndicator.classList.remove('committed');
    }, reducedMotion ? 90 : 180);
  }
}

function hideSwipeIndicator() {
  if (swipeHideTimer) {
    clearTimeout(swipeHideTimer);
    swipeHideTimer = 0;
  }
  swipeIndicator.hidden = true;
  swipeIndicator.classList.remove('committed');
}

function setMenuOpen(open) {
  menuOpen = Boolean(open);
  menuEl.hidden = !menuOpen;
  if (menuOpen) {
    clearTapInspect();
    hideSwipeIndicator();
    stopDpadRepeat();
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
  stopDpadRepeat();
  hideSwipeIndicator();
}

function showScoreDelta(delta) {
  if (reducedMotion || delta <= 0) return;
  hudDelta.textContent = `+${delta}`;
  hudDelta.classList.remove('pop');
  hudScore.classList.remove('bump');
  void hudDelta.offsetWidth;
  hudDelta.classList.add('pop');
  hudScore.classList.add('bump');
}

function startNewGame(seed) {
  clearPendingEnd();
  clearTapInspect();
  hideSwipeIndicator();
  stopDpadRepeat();
  winLift = 0;
  camKick.set(0, 0, 0);
  winGlowEl.classList.remove('active');
  particles.clear();
  endgameEl.hidden = true;
  setMenuOpen(false);
  game = createGame({ seed: resolveSeed(seed) });
  board.syncImmediate(game.tiles());
  updateHud();
  syncAtmosphereTarget(true);
  return game.grid();
}

function loadCustomGrid(grid4x4, opts = {}) {
  clearPendingEnd();
  clearTapInspect();
  hideSwipeIndicator();
  stopDpadRepeat();
  winLift = 0;
  camKick.set(0, 0, 0);
  winGlowEl.classList.remove('active');
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
  syncAtmosphereTarget(true);
  if (game.state === 'won') showEndPanel('won');
  else if (game.state === 'lost') showEndPanel('lost');
  return game.grid();
}

function continueAfterWin() {
  if (!game || game.state !== 'won') return game ? game.state : 'ready';
  clearPendingEnd();
  winLift = 0;
  winGlowEl.classList.remove('active');
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
  if (!result.moved) {
    if (game.state === 'ready' || game.state === 'playing' || game.state === 'continue') {
      board.triggerBlockedBump(dir);
    }
    return result;
  }

  clearTapInspect();
  board.applyMove(result, game.tiles());
  updateHud();
  if (result.scoreDelta > 0) {
    showScoreDelta(result.scoreDelta);
  }

  // Subtle camera micro-move impulse in the slide direction + soft impact dip on larger merges.
  if (!reducedMotion) {
    const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
    const dz = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
    const maxMerged = result.merges.reduce((m, x) => Math.max(m, x.value), 0);
    const kickScale = maxMerged >= 256 ? 0.19 : maxMerged >= 32 ? 0.14 : 0.09;
    camKick.set(dx * kickScale, maxMerged >= 64 ? -0.11 : -0.03, dz * kickScale);
  }

  if (result.wonNow) {
    triggerHaptic([20, 30, 30, 30, 45]);
    clearPendingEnd();
    winLift = reducedMotion ? 0 : 1.45;
    if (!reducedMotion) winGlowEl.classList.add('active');
    const delay = reducedMotion ? 260 : 1280;
    endTimer = setTimeout(() => {
      endTimer = 0;
      if (game && game.state === 'won') showEndPanel('won');
    }, delay);
  } else if (result.lostNow) {
    triggerHaptic([35, 40, 35]);
    clearPendingEnd();
    const delay = reducedMotion ? 220 : 620;
    endTimer = setTimeout(() => {
      endTimer = 0;
      if (game && game.state === 'lost') showEndPanel('lost');
    }, delay);
  } else if (result.merges && result.merges.length > 0) {
    triggerHaptic(14);
  }

  return result;
}

// ------------------------------------------------ Camera-relative mapping

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
  const rx = m[0];
  const rz = m[2];
  return cameraBasisToGridDir(fx, fz, rx, rz, inputDir);
}

function handleUserMove(screenDir) {
  if (menuOpen || !endgameEl.hidden) return false;
  if (!game || game.state === 'won' || game.state === 'lost') return false;
  const gridDir = cameraDirToGridDir(screenDir);
  const res = performGridMove(gridDir);
  return Boolean(res.moved);
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

// On-screen D-pad: immediate fire on press + hold-to-repeat (thumb-friendly fallback).
let dpadDelayTimer = 0;
let dpadRepeatTimer = 0;
let dpadActiveBtn = null;

function stopDpadRepeat() {
  if (dpadDelayTimer) {
    clearTimeout(dpadDelayTimer);
    dpadDelayTimer = 0;
  }
  if (dpadRepeatTimer) {
    clearInterval(dpadRepeatTimer);
    dpadRepeatTimer = 0;
  }
  if (dpadActiveBtn) {
    dpadActiveBtn.classList.remove('pressed');
    dpadActiveBtn = null;
  }
}

for (const btn of dpadEl.querySelectorAll('[data-dir]')) {
  const dir = btn.dataset.dir;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stopDpadRepeat();
    dpadActiveBtn = btn;
    btn.classList.add('pressed');
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* ignore synthetic events without active pointer */
    }
    handleUserMove(dir);
    dpadDelayTimer = setTimeout(() => {
      dpadDelayTimer = 0;
      dpadRepeatTimer = setInterval(() => {
        if (menuOpen || !endgameEl.hidden || !game || game.state === 'won' || game.state === 'lost') {
          stopDpadRepeat();
          return;
        }
        handleUserMove(dir);
      }, 170);
    }, 310);
  });

  const endPress = () => {
    if (dpadActiveBtn === btn) stopDpadRepeat();
  };
  btn.addEventListener('pointerup', endPress);
  btn.addEventListener('pointercancel', endPress);
  btn.addEventListener('lostpointercapture', endPress);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());

  // Accessible keyboard activation (Enter/Space on focused button).
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUserMove(dir);
    }
  });
}

window.addEventListener('blur', stopDpadRepeat);

// ------------------------------------------------ First-class Touch Swipe

const canvas = view.renderer.domElement;
const swipeRecognizer = createSwipeRecognizer();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function inspectAtClientPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, view.camera);
  return board.pickCell(raycaster);
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  document.body.classList.add('has-touch');
  if (menuOpen || !endgameEl.hidden) return;
  const ev = swipeRecognizer.down(e.pointerId, e.clientX, e.clientY, performance.now(), touchMode);
  if (ev.type === 'cancel') {
    hideSwipeIndicator();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch') return;
  if (menuOpen || !endgameEl.hidden) return;
  const ev = swipeRecognizer.move(e.pointerId, e.clientX, e.clientY, touchMode);
  if (ev.type === 'preview') {
    showSwipeIndicator(ev.startX + ev.dx * 0.55, ev.startY + ev.dy * 0.55, ev.dir, false, ev.progress);
  } else if (ev.type === 'commit') {
    showSwipeIndicator(ev.startX + ev.dx * 0.65, ev.startY + ev.dy * 0.65, ev.dir, true, 1);
    handleUserMove(ev.dir);
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch') return;
  const ev = swipeRecognizer.up(e.pointerId, e.clientX, e.clientY, performance.now(), touchMode);
  if (ev.type === 'commit') {
    showSwipeIndicator(ev.startX + ev.dx * 0.65, ev.startY + ev.dy * 0.65, ev.dir, true, 1);
    handleUserMove(ev.dir);
  } else if (ev.type === 'tap' && !menuOpen && endgameEl.hidden) {
    hideSwipeIndicator();
    // Quick tap on a tree inspects its tier name briefly on touch screens.
    const cell = inspectAtClientPoint(ev.x, ev.y);
    clearTapInspect();
    hoveredCell = cell;
    board.setHover(cell);
    updateHoverLabel();
    if (cell) {
      tapInspectTimer = setTimeout(() => {
        tapInspectTimer = 0;
        hoveredCell = null;
        board.setHover(null);
        updateHoverLabel();
      }, 2200);
    }
  } else {
    if (!swipeHideTimer) hideSwipeIndicator();
  }
});

canvas.addEventListener('pointercancel', (e) => {
  if (e.pointerType !== 'touch') return;
  swipeRecognizer.cancel(e.pointerId);
  hideSwipeIndicator();
});

// Pointer hover raycasting for tier-name pill (desktop mouse unchanged).
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
  hoveredCell = inspectAtClientPoint(e.clientX, e.clientY);
  board.setHover(hoveredCell);
  updateHoverLabel();
});

canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType !== 'mouse') return;
  hoveredCell = null;
  board.setHover(null);
  updateHoverLabel();
});

// Buttons wiring
btnModeSlide.addEventListener('click', (e) => {
  e.currentTarget.blur();
  setTouchMode('slide');
});
btnModeOrbit.addEventListener('click', (e) => {
  e.currentTarget.blur();
  setTouchMode('orbit');
});
btnResetView.addEventListener('click', (e) => {
  e.currentTarget.blur();
  view.frameDefault(true);
});

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
let rafId = 0;

function frame() {
  if (document.hidden) {
    rafId = 0;
    return;
  }
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (winLift > 0) {
    winLift = Math.max(0, winLift - dt);
    const wtPos = board.getWorldTreeWorldPos();
    targetGoal.set(wtPos.x * 0.34, view.defaultTarget.y + 0.95, wtPos.z * 0.34);
  } else {
    targetGoal.copy(view.defaultTarget);
  }

  view.controls.target.lerp(targetGoal, 1 - Math.exp(-5.2 * dt));
  view.controls.update();

  // Smooth multi-second atmospheric cross-fade (damped/shortened under prefers-reduced-motion).
  const atmoRate = reducedMotion ? 8.5 : 1.35;
  const atmoAlpha = 1 - Math.exp(-atmoRate * dt);
  view.applyAtmosphere(atmosphereTarget.sky, atmoAlpha);
  board.applyAtmosphere(atmosphereTarget.island, atmoAlpha);

  view.tick(dt, reducedMotion, elapsed);
  board.tick(dt, elapsed);
  particles.tick(dt, elapsed);

  // Apply damped camera micro-move around render only so it never fights OrbitControls.
  if (!reducedMotion && camKick.lengthSq() > 1e-6) {
    camKick.multiplyScalar(Math.exp(-13 * dt));
    view.camera.position.add(camKick);
    view.renderer.render(view.scene, view.camera);
    view.camera.position.sub(camKick);
  } else {
    camKick.set(0, 0, 0);
    view.renderer.render(view.scene, view.camera);
  }
  rafId = requestAnimationFrame(frame);
}

// Pause rendering while tab is backgrounded so mobile battery is never burned idle.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !rafId) {
    clock.getDelta();
    rafId = requestAnimationFrame(frame);
  }
});

// ------------------------------------------------------------ Boot & Hook

setTouchMode('slide');
startNewGame();
rafId = requestAnimationFrame(frame);

// Read-mostly debug hook matching README spec, plus additive helpers for
// deterministic win/loss/continue/camera verification in Playwright.
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
  atmosphere: () => ({
    season: currentPhase.season,
    timeOfDay: currentPhase.timeOfDay,
    label: currentPhase.label,
    progress: Number(currentPhase.progress.toFixed(3)),
    isWinBloom: currentPhase.isWinBloom,
    nightWeight: Number(currentPhase.nightWeight.toFixed(3)),
  }),
  settleAtmosphere: () => syncAtmosphereTarget(true),
  touchMode: () => touchMode,
  cameraPos: () => ({
    x: Number(view.camera.position.x.toFixed(3)),
    y: Number(view.camera.position.y.toFixed(3)),
    z: Number(view.camera.position.z.toFixed(3)),
  }),
};
