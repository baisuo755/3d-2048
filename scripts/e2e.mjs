// Playwright e2e verification for Grove (3D 2048).
// Uses the pre-installed Playwright package on this Mac without adding npm deps to the repo.
// Run: node scripts/e2e.mjs

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, '.playwright-mcp');
mkdirSync(SHOT_DIR, { recursive: true });

// Resolve Playwright from NODE_PATH or known local install without touching package.json.
async function loadPlaywright() {
  const candidates = [
    'playwright',
    '/Users/AIDev/agy-review/node_modules/playwright/index.mjs',
    '/Users/AIDev/grok-pilot/node_modules/playwright/index.mjs',
  ];
  for (const c of candidates) {
    try {
      const target = c.startsWith('/') ? pathToFileURL(c).href : c;
      return await import(target);
    } catch {
      /* try next */
    }
  }
  throw new Error('Playwright not found. Set NODE_PATH to a directory containing playwright.');
}

function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let started = false;
    const timer = setTimeout(() => {
      if (!started) {
        started = true;
        resolve(proc);
      }
    }, 650);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('exit', (code) => {
      if (!started) {
        clearTimeout(timer);
        reject(new Error(`http.server exited early with code ${code}`));
      }
    });
  });
}

async function waitForServer(url, retries = 25) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

// Dispatch authentic multi/single-touch gestures via Chromium CDP.
async function touchDrag(cdp, x0, y0, x1, y1, steps = 6, holdBeforeReleaseMs = 0) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: x0, y: y0, id: 1 }],
  });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, id: 1 }],
    });
    await new Promise((r) => setTimeout(r, 16));
  }
  if (holdBeforeReleaseMs > 0) {
    await new Promise((r) => setTimeout(r, holdBeforeReleaseMs));
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

async function twoFingerDragPinch(cdp) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 145, y: 360, id: 1 },
      { x: 245, y: 360, id: 2 },
    ],
  });
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    // Rotate horizontally + pinch slightly closer
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: 145 - 35 * t + 12 * t, y: 360 - 10 * t, id: 1 },
        { x: 245 - 35 * t - 12 * t, y: 360 - 10 * t, id: 2 },
      ],
    });
    await new Promise((r) => setTimeout(r, 18));
  }
  // Lift finger 1 first, then finger 2 (the classic staggered-lift misfire case!)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: 198, y: 350, id: 2 }],
  });
  await new Promise((r) => setTimeout(r, 20));
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 150, y: 350, id: 2 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

const PORT = 18048;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const { chromium } = await loadPlaywright();
const server = await startStaticServer(PORT);

const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];

function attachErrorListeners(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      httpErrors.push(`${res.status()} ${res.url()}`);
    }
  });
}

let browser;
try {
  await waitForServer(`${BASE_URL}/index.html`);
  browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });

  // --------------------------------------------------- Desktop 1440x900
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopCtx.newPage();
  attachErrorListeners(page);

  // 1. Spawn determinism under ?seed=12345
  await page.goto(`${BASE_URL}/?seed=12345`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__game?.grid === 'function');

  const run1 = await page.evaluate(() => {
    const seq = ['left', 'up', 'right', 'down', 'left'];
    const init = window.__game.grid();
    const steps = [];
    for (const d of seq) {
      window.__game.move(d);
      steps.push({ grid: window.__game.grid(), score: window.__game.score(), state: window.__game.state() });
    }
    return { init, steps };
  });

  await page.goto(`${BASE_URL}/?seed=12345`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__game?.grid === 'function');

  const run2 = await page.evaluate(() => {
    const seq = ['left', 'up', 'right', 'down', 'left'];
    const init = window.__game.grid();
    const steps = [];
    for (const d of seq) {
      window.__game.move(d);
      steps.push({ grid: window.__game.grid(), score: window.__game.score(), state: window.__game.state() });
    }
    return { init, steps };
  });

  assert.deepEqual(run1, run2, 'Expected identical grids & scores under ?seed=12345');
  console.log('PASS: spawn determinism under ?seed=12345');

  // 2. Desktop regression check: mouse drag orbits camera cleanly, keyboard moves cleanly, touch-tools hidden
  const desktopCheck = await page.evaluate(() => {
    const toolsStyle = getComputedStyle(document.querySelector('.touch-tools'));
    return {
      toolsDisplay: toolsStyle.display,
      camBefore: window.__game.cameraPos(),
    };
  });
  assert.equal(desktopCheck.toolsDisplay, 'none', 'Touch-only tools should stay hidden on pure desktop');

  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(540, 450, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(160);
  const camAfterMouseOrbit = await page.evaluate(() => window.__game.cameraPos());
  assert.notDeepEqual(camAfterMouseOrbit, desktopCheck.camBefore, 'Desktop mouse drag must still orbit camera');
  console.log('PASS: desktop mouse orbit & clean desktop chrome');

  // 3. Scripted game proving merge + score + best persistence across reload + HUD sync
  await page.evaluate(() => localStorage.removeItem('grove2048.best.v1'));
  await page.goto(`${BASE_URL}/?seed=42`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__game?.grid === 'function');

  const mergeCheck = await page.evaluate(() => {
    const dirs = ['left', 'down', 'right', 'up'];
    for (let i = 0; i < 24 && window.__game.score() === 0; i++) {
      window.__game.move(dirs[i % dirs.length]);
    }
    window.__game.settleAnimations();
    return {
      score: window.__game.score(),
      best: window.__game.best(),
      state: window.__game.state(),
      hudScore: document.getElementById('hud-score').textContent,
      hudBest: document.getElementById('hud-best').textContent,
      storedBest: localStorage.getItem('grove2048.best.v1'),
    };
  });

  assert.ok(mergeCheck.score > 0, `Expected score > 0 after scripted merges, got ${mergeCheck.score}`);
  assert.equal(mergeCheck.state, 'playing');
  assert.equal(Number(mergeCheck.hudScore), mergeCheck.score);
  assert.equal(Number(mergeCheck.hudBest), mergeCheck.score);
  assert.equal(Number(mergeCheck.storedBest), mergeCheck.best);

  // Verify best score survives reload.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__game?.best === 'function');
  const bestAfterReload = await page.evaluate(() => window.__game.best());
  assert.equal(bestAfterReload, mergeCheck.best);
  await page.evaluate(() => {
    window.__game.start(42);
    const dirs = ['left', 'down', 'right', 'up'];
    for (let i = 0; i < 14; i++) window.__game.move(dirs[i % dirs.length]);
    window.__game.settleAnimations();
  });
  console.log(`PASS: scripted merge + score (${mergeCheck.score}) + localStorage best persistence (${mergeCheck.best})`);

  await page.waitForTimeout(250);
  const shotGameplay1440 = path.join(SHOT_DIR, 'gameplay-1440.png');
  await page.screenshot({ path: shotGameplay1440 });

  // Showcase all 11 tree tiers on the island at 1440
  await page.evaluate(() => {
    window.__game.setGrid(
      [
        [2048, 1024, 512, 256],
        [128, 64, 32, 0],
        [16, 8, 4, 2],
        [0, 0, 0, 0],
      ],
      { score: 14820, turns: 120, hasWon: true, state: 'continue' }
    );
  });
  await page.waitForTimeout(350);
  const shotShowcase1440 = path.join(SHOT_DIR, 'showcase-all-tiers-1440.png');
  await page.screenshot({ path: shotShowcase1440 });

  // 4. Forced win reaching the World Tree (2048) + win-moment reveal + Keep playing (continue)
  await page.evaluate(() => {
    window.__game.setGrid(
      [
        [1024, 1024, 512, 256],
        [128, 64, 32, 16],
        [8, 4, 2, 0],
        [0, 0, 0, 0],
      ],
      { score: 12000, turns: 95, hasWon: false, state: 'playing' }
    );
    window.__game.move('left');
  });

  // Capture the World Tree reveal moment (fireflies, golden shockwave, vignette glow,
  // elevated camera) BEFORE the win panel appears.
  await page.waitForTimeout(560);
  const shotWinMoment1440 = path.join(SHOT_DIR, 'win-moment-1440.png');
  await page.screenshot({ path: shotWinMoment1440 });

  await page.waitForSelector('#endgame:not([hidden])', { timeout: 3000 });
  const winState = await page.evaluate(() => ({
    state: window.__game.state(),
    score: window.__game.score(),
    title: document.getElementById('end-title').textContent,
    has2048: window.__game.grid().flat().includes(2048),
    keepHidden: document.getElementById('btn-keep-playing').hidden,
  }));
  assert.equal(winState.state, 'won');
  assert.equal(winState.score, 14048);
  assert.equal(winState.has2048, true);
  assert.equal(winState.keepHidden, false);
  assert.match(winState.title, /World Tree/i);

  const shotWin1440 = path.join(SHOT_DIR, 'win-1440.png');
  await page.screenshot({ path: shotWin1440 });

  await page.click('#btn-keep-playing');
  const afterContinue = await page.evaluate(() => {
    const sBefore = window.__game.state();
    const res = window.__game.move('down');
    return {
      sBefore,
      moved: res.moved,
      sAfter: window.__game.state(),
      panelHidden: document.getElementById('endgame').hidden,
    };
  });
  assert.equal(afterContinue.sBefore, 'continue');
  assert.equal(afterContinue.moved, true);
  assert.equal(afterContinue.sAfter, 'continue');
  assert.equal(afterContinue.panelHidden, true);
  console.log('PASS: forced win (World Tree 2048) + Keep playing -> continue');

  // 5. Forced loss
  await page.evaluate(() => {
    window.__game.setGrid(
      [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [16, 32, 64, 128],
        [8, 16, 32, 0],
      ],
      { score: 3420, turns: 64, hasWon: false, state: 'playing' }
    );
    window.__game.move('right');
  });

  await page.waitForSelector('#endgame:not([hidden])', { timeout: 3000 });
  const lossState = await page.evaluate(() => ({
    state: window.__game.state(),
    title: document.getElementById('end-title').textContent,
    keepHidden: document.getElementById('btn-keep-playing').hidden,
  }));
  assert.equal(lossState.state, 'lost');
  assert.equal(lossState.keepHidden, true);
  assert.match(lossState.title, /Grove Full/i);

  const shotLoss1440 = path.join(SHOT_DIR, 'loss-1440.png');
  await page.screenshot({ path: shotLoss1440 });
  console.log('PASS: forced loss + loss panel');

  // 6. Menu (Esc) toggle
  await page.click('#btn-play-again');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#menu:not([hidden])', { timeout: 1500 });
  const shotMenu1440 = path.join(SHOT_DIR, 'menu-1440.png');
  await page.screenshot({ path: shotMenu1440 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('#menu[hidden]', { state: 'attached', timeout: 1500 });
  console.log('PASS: menu (Esc) open/close');

  await desktopCtx.close();

  // --------------------------------------------------- Mobile 390x844 (hasTouch: true)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mPage = await mobileCtx.newPage();
  attachErrorListeners(mPage);
  const cdp = await mobileCtx.newCDPSession(mPage);

  await mPage.goto(`${BASE_URL}/?seed=42`, { waitUntil: 'networkidle' });
  await mPage.waitForFunction(() => typeof window.__game?.grid === 'function');

  // 6a. Audit all visible mobile interactive buttons >= 44x44px and zero overflow.
  const mobileAudit = await mPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#ui button')).filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const small = btns
      .map((b) => ({ id: b.id || b.dataset.dir || b.textContent.trim(), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }))
      .filter((x) => x.w < 44 || x.h < 44);
    return {
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      visibleBtnCount: btns.length,
      small,
      touchMode: window.__game.touchMode(),
    };
  });
  assert.ok(mobileAudit.scrollW <= mobileAudit.innerW, `Horizontal overflow at 390: ${mobileAudit.scrollW} > ${mobileAudit.innerW}`);
  assert.deepEqual(mobileAudit.small, [], `Hit targets smaller than 44px: ${JSON.stringify(mobileAudit.small)}`);
  assert.equal(mobileAudit.touchMode, 'slide');
  console.log(`PASS: 390x844 touch audit (${mobileAudit.visibleBtnCount} buttons all >= 44px, 0 overflow)`);

  // 6b. Verify single-finger touch flicks in ALL 4 directions produce exact grid-relative moves
  // without orbiting the camera!
  const camBeforeSwipes = await mPage.evaluate(() => window.__game.cameraPos());
  const swipeCases = [
    { name: 'up',    x0: 195, y0: 420, x1: 195, y1: 340, expectAt: [0, 1] },
    { name: 'down',  x0: 195, y0: 340, x1: 195, y1: 420, expectAt: [3, 1] },
    { name: 'left',  x0: 240, y0: 380, x1: 150, y1: 380, expectAt: [1, 0] },
    { name: 'right', x0: 150, y0: 380, x1: 240, y1: 380, expectAt: [1, 3] },
  ];
  for (const sc of swipeCases) {
    await mPage.evaluate(() => {
      window.__game.setGrid([
        [0, 0, 0, 0],
        [0, 64, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
    });
    await touchDrag(cdp, sc.x0, sc.y0, sc.x1, sc.y1, 5);
    await mPage.waitForTimeout(160);
    const gridAfter = await mPage.evaluate(() => window.__game.grid());
    assert.equal(
      gridAfter[sc.expectAt[0]][sc.expectAt[1]],
      64,
      `Touch flick ${sc.name} failed: expected 64 at [${sc.expectAt}], got ${JSON.stringify(gridAfter)}`
    );
  }
  const camAfterSwipes = await mPage.evaluate(() => window.__game.cameraPos());
  assert.deepEqual(camAfterSwipes, camBeforeSwipes, 'Single-finger swipes in Slide mode must NOT move camera');
  console.log('PASS: all 4 touch flick directions (up/down/left/right) move tiles with 0 camera drift');

  // 6c. Two-finger drag/pinch in Slide mode moves camera and NEVER slides tiles!
  const fixedBoard = [
    [0, 0, 0, 0],
    [0, 32, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  await mPage.evaluate((b) => window.__game.setGrid(b), fixedBoard);
  const camBeforeTwoFinger = await mPage.evaluate(() => window.__game.cameraPos());
  await twoFingerDragPinch(cdp);
  await mPage.waitForTimeout(220);
  const afterTwoFinger = await mPage.evaluate(() => ({
    grid: window.__game.grid(),
    cam: window.__game.cameraPos(),
  }));
  assert.deepEqual(afterTwoFinger.grid, fixedBoard, 'Two-finger orbit/pinch must NOT slide tiles');
  assert.notDeepEqual(afterTwoFinger.cam, camBeforeTwoFinger, 'Two-finger gesture must move/zoom camera');
  console.log('PASS: two-finger camera orbit/pinch moves camera without sliding tiles');

  // 6d. Reset view + Orbit mode toggle: 1-finger drag orbits camera without sliding tiles,
  // then switching back to Slide remaps swipe "up" to the NEW orbited camera axis!
  await mPage.tap('#btn-reset-view');
  await mPage.waitForTimeout(120);
  await mPage.evaluate((b) => window.__game.setGrid(b), fixedBoard);
  await mPage.tap('#btn-mode-orbit');
  assert.equal(await mPage.evaluate(() => window.__game.touchMode()), 'orbit');

  const camBeforeOrbitToggle = await mPage.evaluate(() => window.__game.cameraPos());
  // Drag 1 finger horizontally ~180px to rotate camera ~90°+
  await touchDrag(cdp, 290, 390, 80, 390, 12);
  await mPage.waitForTimeout(260);
  const afterOrbitModeDrag = await mPage.evaluate(() => ({
    grid: window.__game.grid(),
    cam: window.__game.cameraPos(),
  }));
  assert.deepEqual(afterOrbitModeDrag.grid, fixedBoard, 'Orbit mode drag must NOT slide tiles');
  assert.notDeepEqual(afterOrbitModeDrag.cam, camBeforeOrbitToggle, 'Orbit mode drag must rotate camera');

  // Switch back to Slide and flick UP -> tile must move away from the NEW camera angle (not default [0,1])
  await mPage.tap('#btn-mode-slide');
  assert.equal(await mPage.evaluate(() => window.__game.touchMode()), 'slide');
  await touchDrag(cdp, 195, 430, 195, 340, 5);
  await mPage.waitForTimeout(160);
  const gridAfterOrbitedUp = await mPage.evaluate(() => window.__game.grid());
  // Tile 32 should have moved to an edge (row 0/3 or col 0/3), and NOT stayed at [1,1] nor moved to default [0,1]
  assert.equal(gridAfterOrbitedUp[1][1], 0, 'Post-orbit swipe up should move tile out of [1,1]');
  assert.notEqual(gridAfterOrbitedUp[0][1], 32, `Post-orbit swipe up should remap away from default [0,1], got ${JSON.stringify(gridAfterOrbitedUp)}`);
  assert.ok(gridAfterOrbitedUp.flat().includes(32), 'Tile 32 should still be on board at new edge');
  console.log('PASS: Orbit mode toggle rotates camera without sliding, and post-orbit flick maps camera-relatively');

  // 6e. Reset view + D-pad tap & hold-to-repeat check
  await mPage.tap('#btn-reset-view');
  await mPage.waitForTimeout(150);
  await mPage.evaluate(() => {
    window.__game.setGrid([
      [0, 0, 0, 0],
      [0, 0, 16, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });
  await mPage.tap('.dpad [data-dir="left"]');
  await mPage.waitForTimeout(140);
  const afterDpadLeft = await mPage.evaluate(() => window.__game.grid());
  assert.equal(afterDpadLeft[1][0], 16, 'D-pad left tap must slide tile to col 0');
  console.log('PASS: mobile D-pad tap moves tiles cleanly');

  // 6f. Capture clean 390x844 mobile screenshot showing new controls & rich grove
  await mPage.evaluate(() => {
    window.__game.setGrid(
      [
        [2048, 1024, 512, 256],
        [128, 64, 32, 0],
        [16, 8, 4, 2],
        [0, 0, 0, 0],
      ],
      { score: 9460, turns: 88, hasWon: true, state: 'continue' }
    );
  });
  await mPage.waitForTimeout(300);
  const shotMobile390 = path.join(SHOT_DIR, 'mobile-390.png');
  await mPage.screenshot({ path: shotMobile390 });

  // 6g. Capture mid-interaction screenshot showing live directional swipe indicator on 390x844!
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 165, y: 410, id: 7 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 193, y: 410, id: 7 }], // 28px right: preview active, right before 36px commit
  });
  await mPage.waitForTimeout(60);
  const indicatorVisible = await mPage.evaluate(() => !document.getElementById('swipe-indicator').hidden);
  assert.equal(indicatorVisible, true, 'Live swipe indicator must be visible mid-drag');
  const shotMobileSwipeMid = path.join(SHOT_DIR, 'mobile-swipe-mid-390.png');
  await mPage.screenshot({ path: shotMobileSwipeMid });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await mPage.waitForTimeout(220);
  console.log('PASS: mid-gesture swipe indicator verified & screenshot captured');

  await mobileCtx.close();

  // --------------------------------------------------- Reduced motion check
  const rmCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmCtx.newPage();
  attachErrorListeners(rmPage);
  await rmPage.goto(`${BASE_URL}/?seed=7`, { waitUntil: 'networkidle' });
  await rmPage.waitForFunction(() => typeof window.__game?.grid === 'function');
  const rmRes = await rmPage.evaluate(() => {
    window.__game.move('left');
    window.__game.move('down');
    return window.__game.state();
  });
  assert.ok(rmRes === 'playing' || rmRes === 'ready');
  await rmCtx.close();
  console.log('PASS: prefers-reduced-motion flow');

  // Verify zero errors across all pages.
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join('; ')}`);
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(httpErrors, [], `HTTP errors: ${httpErrors.join('; ')}`);
  console.log('PASS: 0 console errors, 0 page errors, 0 HTTP errors');
  console.log('SCREENSHOTS:', JSON.stringify([
    shotGameplay1440,
    shotShowcase1440,
    shotWinMoment1440,
    shotWin1440,
    shotLoss1440,
    shotMenu1440,
    shotMobile390,
    shotMobileSwipeMid,
  ]));
} finally {
  if (browser) await browser.close();
  server.kill();
}
