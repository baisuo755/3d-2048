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

  // 2. Scripted game proving merge + score + best persistence across reload + HUD sync
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
  // Restore mid-game board for gameplay screenshot.
  await page.evaluate(() => {
    window.__game.start(42);
    const dirs = ['left', 'down', 'right', 'up'];
    for (let i = 0; i < 14; i++) window.__game.move(dirs[i % dirs.length]);
    window.__game.settleAnimations();
  });
  console.log(`PASS: scripted merge + score (${mergeCheck.score}) + localStorage best persistence (${mergeCheck.best})`);

  // Wait a couple of frames for clean WebGL render and take gameplay 1440 screenshot.
  await page.waitForTimeout(250);
  const shotGameplay1440 = path.join(SHOT_DIR, 'gameplay-1440.png');
  await page.screenshot({ path: shotGameplay1440 });

  // Showcase all 11 tree tiers on the island at 1440 (tallest in back, shortest in front)
  // so every single tier's silhouette and hue is clearly unobstructed.
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

  // 3. Forced win reaching the World Tree (2048) + Keep playing (continue)
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

  // Click "Keep playing" -> state becomes "continue" and moves resume.
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

  // 4. Forced loss
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

  // Test Menu (Esc) toggle
  await page.click('#btn-play-again');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#menu:not([hidden])', { timeout: 1500 });
  const shotMenu1440 = path.join(SHOT_DIR, 'menu-1440.png');
  await page.screenshot({ path: shotMenu1440 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('#menu[hidden]', { state: 'attached', timeout: 1500 });
  console.log('PASS: menu (Esc) open/close');

  await desktopCtx.close();

  // --------------------------------------------------- Mobile 390x844
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mobileCtx.newPage();
  attachErrorListeners(mPage);

  await mPage.goto(`${BASE_URL}/?seed=42`, { waitUntil: 'networkidle' });
  await mPage.waitForFunction(() => typeof window.__game?.grid === 'function');

  // Exercise on-screen D-pad on mobile width.
  await mPage.click('.dpad [data-dir="left"]');
  await mPage.waitForTimeout(180);
  await mPage.click('.dpad [data-dir="down"]');
  await mPage.waitForTimeout(180);

  // Set a rich mid-game board (tallest in back, shortest in front) so the 390 screenshot
  // shows clear tree variety & unobstructed island framing.
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
  await mPage.waitForTimeout(350);

  const mobileLayout = await mPage.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    hudRect: document.getElementById('hud').getBoundingClientRect().toJSON(),
    dpadRect: document.querySelector('.dpad').getBoundingClientRect().toJSON(),
  }));
  assert.ok(
    mobileLayout.scrollW <= mobileLayout.innerW,
    `Horizontal overflow on 390px: scrollWidth=${mobileLayout.scrollW} > innerWidth=${mobileLayout.innerW}`
  );

  const shotMobile390 = path.join(SHOT_DIR, 'mobile-390.png');
  await mPage.screenshot({ path: shotMobile390 });
  console.log('PASS: 390x844 layout & D-pad controls');

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
    shotWin1440,
    shotLoss1440,
    shotMenu1440,
    shotMobile390,
  ]));
} finally {
  if (browser) await browser.close();
  server.kill();
}
