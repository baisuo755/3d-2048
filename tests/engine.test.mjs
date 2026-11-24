import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, createRng, SIZE, TIERS, WIN_VALUE, valueToTier, getTierInfo } from '../src/engine.js';

function countNonZero(grid) {
  let n = 0;
  for (const row of grid) for (const v of row) if (v !== 0) n++;
  return n;
}

function diffSpawn(beforeAfterMerge, afterWithSpawn) {
  const diffs = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (beforeAfterMerge[r][c] !== afterWithSpawn[r][c]) {
        diffs.push({ r, c, value: afterWithSpawn[r][c] });
      }
    }
  }
  return diffs;
}

test('initial game spawns two tiles (2 or 4) and starts in ready state', () => {
  const g = createGame({ seed: 42 });
  assert.equal(g.state, 'ready');
  assert.equal(g.score, 0);
  assert.equal(g.turns, 0);
  assert.equal(countNonZero(g.grid()), 2);
  for (const t of g.tiles()) {
    assert.ok(t.value === 2 || t.value === 4, `unexpected spawn value ${t.value}`);
  }
});

test('seeded determinism: identical seeds produce identical boards and move sequences', () => {
  const g1 = createGame({ seed: 123456 });
  const g2 = createGame({ seed: 123456 });
  assert.deepEqual(g1.grid(), g2.grid());

  const seq = ['left', 'up', 'right', 'down', 'left', 'down', 'up', 'right'];
  for (const dir of seq) {
    const r1 = g1.move(dir);
    const r2 = g2.move(dir);
    assert.equal(r1.moved, r2.moved);
    assert.equal(r1.score, r2.score);
    assert.equal(r1.state, r2.state);
    assert.deepEqual(g1.grid(), g2.grid());
  }

  // Different seed should diverge.
  const g3 = createGame({ seed: 654321 });
  assert.notDeepEqual(g1.grid(), g3.grid());
});

test('slide and merge in all four directions', () => {
  // Left
  {
    const g = createGame({
      seed: 1,
      initialGrid: [
        [0, 2, 0, 2],
        [4, 0, 0, 0],
        [0, 0, 8, 8],
        [0, 0, 0, 0],
      ],
    });
    const res = g.move('left');
    assert.equal(res.moved, true);
    assert.equal(res.scoreDelta, 20);
    assert.equal(g.score, 20);
    assert.equal(g.turns, 1);
    assert.equal(g.state, 'playing');
    assert.ok(res.spawned);
    const expectedBase = [
      [4, 0, 0, 0],
      [4, 0, 0, 0],
      [16, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const diffs = diffSpawn(expectedBase, g.grid());
    assert.equal(diffs.length, 1);
    assert.deepEqual(diffs[0], { r: res.spawned.r, c: res.spawned.c, value: res.spawned.value });
  }

  // Right
  {
    const g = createGame({
      seed: 2,
      initialGrid: [
        [2, 2, 0, 0],
        [0, 4, 0, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const res = g.move('right');
    assert.equal(res.moved, true);
    assert.equal(res.scoreDelta, 12);
    const expectedBase = [
      [0, 0, 0, 4],
      [0, 0, 0, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    assert.equal(diffSpawn(expectedBase, g.grid()).length, 1);
  }

  // Up
  {
    const g = createGame({
      seed: 3,
      initialGrid: [
        [0, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [2, 8, 0, 0],
      ],
    });
    const res = g.move('up');
    assert.equal(res.moved, true);
    assert.equal(res.scoreDelta, 4);
    const expectedBase = [
      [4, 8, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    assert.equal(diffSpawn(expectedBase, g.grid()).length, 1);
  }

  // Down
  {
    const g = createGame({
      seed: 4,
      initialGrid: [
        [16, 0, 0, 0],
        [0, 0, 0, 0],
        [16, 0, 0, 0],
        [0, 2, 0, 0],
      ],
    });
    const res = g.move('down');
    assert.equal(res.moved, true);
    assert.equal(res.scoreDelta, 32);
    const expectedBase = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [32, 2, 0, 0],
    ];
    assert.equal(diffSpawn(expectedBase, g.grid()).length, 1);
  }
});

test('once-per-move merge rule: no chain merging within a single move', () => {
  // [2, 2, 2, 2] left -> [4, 4, 0, 0] (+8), NOT [8, 0, 0, 0]
  {
    const g = createGame({
      seed: 10,
      initialGrid: [
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const res = g.move('left');
    assert.equal(res.scoreDelta, 8);
    assert.equal(res.merges.length, 2);
    const row0 = g.grid()[0];
    assert.equal(row0[0], 4);
    assert.equal(row0[1], 4);
  }

  // [2, 2, 4, 0] left -> [4, 4, 0, 0] (+4), NOT [8, 0, 0, 0]
  {
    const g = createGame({
      seed: 11,
      initialGrid: [
        [2, 2, 4, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const res = g.move('left');
    assert.equal(res.scoreDelta, 4);
    assert.equal(res.merges.length, 1);
    const row0 = g.grid()[0];
    assert.equal(row0[0], 4);
    assert.equal(row0[1], 4);
  }

  // [4, 2, 2, 0] right -> [0, 0, 4, 4] (+4), NOT [0, 0, 0, 8]
  {
    const g = createGame({
      seed: 12,
      initialGrid: [
        [4, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const res = g.move('right');
    assert.equal(res.scoreDelta, 4);
    assert.equal(res.merges.length, 1);
    const row0 = g.grid()[0];
    assert.equal(row0[2], 4);
    assert.equal(row0[3], 4);
  }
});

test('no-change move is not a turn and spawns nothing', () => {
  const g = createGame({
    seed: 20,
    initialGrid: [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  });
  const before = g.grid();

  // Up and left and right change nothing on row 0? Wait: left/right/up change nothing!
  for (const dir of ['up', 'left', 'right']) {
    assert.equal(g.canMoveDir(dir), false);
    const res = g.move(dir);
    assert.equal(res.moved, false);
    assert.equal(res.spawned, null);
    assert.equal(res.scoreDelta, 0);
    assert.equal(g.turns, 0);
    assert.equal(g.state, 'ready');
    assert.deepEqual(g.grid(), before);
  }

  assert.deepEqual(g.legalMoves(), ['down']);
  const down = g.move('down');
  assert.equal(down.moved, true);
  assert.equal(g.turns, 1);
  assert.equal(g.state, 'playing');
  assert.ok(down.spawned);
});

test('90/10 spawn mix over large deterministic sample', () => {
  const N = 4000;
  let twos = 0;
  let fours = 0;
  // Each fresh game spawns 2 tiles; 2000 games = 4000 spawns.
  for (let s = 1; s <= N / 2; s++) {
    const g = createGame({ seed: s });
    for (const t of g.tiles()) {
      if (t.value === 2) twos++;
      else if (t.value === 4) fours++;
      else assert.fail(`unexpected spawn value ${t.value}`);
    }
  }
  const ratio2 = twos / N;
  const ratio4 = fours / N;
  assert.ok(ratio2 > 0.88 && ratio2 < 0.92, `expected ~0.90 twos, got ${ratio2.toFixed(4)}`);
  assert.ok(ratio4 > 0.08 && ratio4 < 0.12, `expected ~0.10 fours, got ${ratio4.toFixed(4)}`);
});

test('win at 2048 and continue-after-win flow', () => {
  const g = createGame({
    seed: 77,
    initialGrid: [
      [1024, 1024, 0, 0],
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  });

  const winRes = g.move('left');
  assert.equal(winRes.moved, true);
  assert.equal(winRes.wonNow, true);
  assert.equal(winRes.scoreDelta, 2048);
  assert.equal(g.score, 2048);
  assert.equal(g.state, 'won');
  assert.equal(g.maxTile(), WIN_VALUE);

  // Moves are blocked while in 'won' state until keepPlaying() is called.
  assert.deepEqual(g.legalMoves(), []);
  const blocked = g.move('down');
  assert.equal(blocked.moved, false);
  assert.equal(g.state, 'won');

  // Keep playing transitions to 'continue'.
  assert.equal(g.keepPlaying(), 'continue');
  assert.equal(g.state, 'continue');
  assert.ok(g.legalMoves().length > 0);

  // Subsequent moves work in 'continue' and do NOT re-trigger 'won'.
  const contRes = g.move('right');
  assert.equal(contRes.moved, true);
  assert.equal(contRes.wonNow, false);
  assert.equal(g.state, 'continue');

  // Merging two 2048s into 4096 in 'continue' stays in 'continue'.
  g.loadGrid(
    [
      [2048, 2048, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    { score: 5000, turns: 10, hasWon: true, state: 'continue' }
  );
  const superRes = g.move('left');
  assert.equal(superRes.moved, true);
  assert.equal(superRes.wonNow, false);
  assert.equal(g.state, 'continue');
  assert.equal(g.score, 9096);
  assert.equal(g.maxTile(), 4096);
});

test('loss detection when board fills with no adjacent equal pairs', () => {
  // Single empty slot at (3,3); moving right merges (3,2)+(3,3)? No, let's set up
  // a move that slides the last tile into place and spawns a tile creating a deadlock.
  // Specifically: row 3 has [4, 8, 16, 0] and we slide right -> [0, 4, 8, 16] and spawn at (3,0).
  // Whatever spawns (2 or 4), neighbor right is 4 and neighbor up is 32 —
  // wait: if 4 spawns next to 4, that would be mergeable! So make neighbors 8 and 16:
  // row 2 col 0 = 16, row 3 = [8, 16, 32, 0] -> slide right -> [0, 8, 16, 32],
  // spawn at (3,0) can ONLY be 2 or 4, neither equals 16 (above) or 8 (right)!
  const g = createGame({
    seed: 99,
    initialGrid: [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [16, 32, 64, 128],
      [8, 16, 32, 0],
    ],
  });
  assert.equal(g.hasLegalMoves(), true);
  const res = g.move('right');
  assert.equal(res.moved, true);
  assert.equal(res.lostNow, true);
  assert.equal(g.state, 'lost');
  assert.equal(g.hasLegalMoves(), false);
  assert.deepEqual(g.legalMoves(), []);

  // Moves after loss are ignored.
  const after = g.move('left');
  assert.equal(after.moved, false);
  assert.equal(g.state, 'lost');
});

test('full board WITH an adjacent equal pair is NOT lost', () => {
  const g = createGame({
    seed: 55,
    initialGrid: [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [4, 8, 16, 64],
      [8, 16, 32, 32], // mergeable pair on row 3 only
    ],
  });
  assert.equal(g.state, 'ready');
  assert.equal(g.hasLegalMoves(), true);
  assert.deepEqual(g.legalMoves().sort(), ['left', 'right']);

  const res = g.move('left');
  assert.equal(res.moved, true);
  assert.equal(res.scoreDelta, 64);
});

test('tier metadata covers all 11 tiers from 2 (Seed) to 2048 (World Tree)', () => {
  assert.equal(TIERS.length, 11);
  assert.equal(TIERS[0].value, 2);
  assert.equal(TIERS[0].name, 'Seed');
  assert.equal(TIERS[10].value, 2048);
  assert.equal(TIERS[10].name, 'World Tree');
  assert.equal(valueToTier(2), 1);
  assert.equal(valueToTier(2048), 11);
  assert.equal(getTierInfo(1024).name, 'Giant Sequoia');
  assert.equal(getTierInfo(4096).name, 'World Tree');
});

test('createRng handles numeric, zero, negative, and string seeds deterministically', () => {
  for (const seed of [0, -42, 3.14, 'grove-seed']) {
    const a = createRng(seed);
    const b = createRng(seed);
    for (let i = 0; i < 10; i++) {
      const va = a();
      const vb = b();
      assert.equal(va, vb);
      assert.ok(va >= 0 && va < 1);
    }
  }
});
