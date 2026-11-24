import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySwipe,
  cameraBasisToGridDir,
  createSwipeRecognizer,
  SWIPE_COMMIT_PX,
} from '../src/touch.js';

test('classifySwipe resolves all 4 cardinal directions and ignores jitter below threshold', () => {
  assert.equal(classifySwipe(0, 0), null);
  assert.equal(classifySwipe(15, -10), null);
  assert.equal(classifySwipe(40, 8), 'right');
  assert.equal(classifySwipe(-40, -12), 'left');
  assert.equal(classifySwipe(6, -42), 'up');
  assert.equal(classifySwipe(-5, 42), 'down');
});

test('createSwipeRecognizer emits preview then single commit per drag in slide mode', () => {
  const rec = createSwipeRecognizer();
  assert.equal(rec.down(1, 200, 400, 100, 'slide').type, 'start');

  // Below preview threshold
  assert.equal(rec.move(1, 206, 402, 'slide').type, 'none');

  // Preview threshold reached
  const prev = rec.move(1, 220, 403, 'slide');
  assert.equal(prev.type, 'preview');
  assert.equal(prev.dir, 'right');
  assert.ok(prev.progress > 0 && prev.progress < 1);

  // Commit threshold reached
  const commit = rec.move(1, 200 + SWIPE_COMMIT_PX + 4, 404, 'slide');
  assert.equal(commit.type, 'commit');
  assert.equal(commit.dir, 'right');

  // Continuing the same drag or lifting does NOT double-commit
  assert.equal(rec.move(1, 320, 404, 'slide').type, 'none');
  assert.equal(rec.up(1, 320, 404, 220, 'slide').type, 'end');
});

test('createSwipeRecognizer commits crisp short flicks on pointerup', () => {
  const rec = createSwipeRecognizer();
  rec.down(1, 200, 400, 100, 'slide');
  const up = rec.up(1, 200, 370, 180, 'slide');
  assert.equal(up.type, 'commit');
  assert.equal(up.dir, 'up');
});

test('createSwipeRecognizer suppresses all slides on multi-touch until all fingers lift', () => {
  const rec = createSwipeRecognizer();
  assert.equal(rec.down(1, 150, 400, 100, 'slide').type, 'start');
  assert.equal(rec.down(2, 230, 400, 110, 'slide').type, 'cancel');

  // Moving both fingers should never preview or commit
  assert.equal(rec.move(1, 250, 400, 'slide').type, 'none');
  assert.equal(rec.move(2, 310, 400, 'slide').type, 'none');

  // Lifting finger 1 then dragging finger 2 then lifting finger 2 still never commits
  assert.equal(rec.up(1, 250, 400, 200, 'slide').type, 'end');
  assert.equal(rec.move(2, 380, 400, 'slide').type, 'none');
  assert.equal(rec.up(2, 380, 400, 250, 'slide').type, 'end');
  assert.equal(rec.activeCount, 0);

  // Next single-finger gesture works cleanly again
  rec.down(3, 200, 400, 300, 'slide');
  const next = rec.move(3, 200, 450, 'slide');
  assert.equal(next.type, 'commit');
  assert.equal(next.dir, 'down');
});

test('createSwipeRecognizer never slides in orbit mode', () => {
  const rec = createSwipeRecognizer();
  assert.equal(rec.down(1, 200, 400, 100, 'orbit').type, 'none');
  assert.equal(rec.move(1, 290, 400, 'orbit').type, 'none');
  assert.equal(rec.up(1, 290, 400, 200, 'orbit').type, 'end');
});

test('createSwipeRecognizer distinguishes quick tap for tree inspection', () => {
  const rec = createSwipeRecognizer();
  rec.down(1, 180, 360, 100, 'slide');
  const res = rec.up(1, 184, 362, 190, 'slide');
  assert.equal(res.type, 'tap');
});

test('cameraBasisToGridDir maps screen directions accurately across 90-degree orbits', () => {
  // Default view: camera looking toward -Z (forward = (0, -1), right = (1, 0))
  assert.equal(cameraBasisToGridDir(0, -1, 1, 0, 'up'), 'up');
  assert.equal(cameraBasisToGridDir(0, -1, 1, 0, 'down'), 'down');
  assert.equal(cameraBasisToGridDir(0, -1, 1, 0, 'left'), 'left');
  assert.equal(cameraBasisToGridDir(0, -1, 1, 0, 'right'), 'right');

  // Orbited 90° clockwise: looking toward +X (forward = (1, 0), right = (0, 1))
  assert.equal(cameraBasisToGridDir(1, 0, 0, 1, 'up'), 'right');
  assert.equal(cameraBasisToGridDir(1, 0, 0, 1, 'down'), 'left');
  assert.equal(cameraBasisToGridDir(1, 0, 0, 1, 'right'), 'down');
  assert.equal(cameraBasisToGridDir(1, 0, 0, 1, 'left'), 'up');

  // Orbited 180°: looking toward +Z (forward = (0, 1), right = (-1, 0))
  assert.equal(cameraBasisToGridDir(0, 1, -1, 0, 'up'), 'down');
  assert.equal(cameraBasisToGridDir(0, 1, -1, 0, 'down'), 'up');
  assert.equal(cameraBasisToGridDir(0, 1, -1, 0, 'right'), 'left');
  assert.equal(cameraBasisToGridDir(0, 1, -1, 0, 'left'), 'right');
});
