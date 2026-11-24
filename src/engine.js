// Pure-JS 2048 engine for Grove (no DOM, no Three.js).
// Coordinates: grid[r][c], r = 0..3 (top to bottom), c = 0..3 (left to right).
// Directions: "up" (-r), "down" (+r), "left" (-c), "right" (+c).

import { TIERS, WIN_VALUE, valueToTier, getTierInfo } from './tiers.js';

export const SIZE = 4;
export const DIRS = Object.freeze(['up', 'down', 'left', 'right']);
export { TIERS, WIN_VALUE, valueToTier, getTierInfo };

// Mulberry32 deterministic PRNG: returns float in [0, 1).
export function createRng(seed) {
  let state = normalizeSeed(seed);
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return (Math.floor(seed) >>> 0) || 0x9e3779b9;
  }
  if (typeof seed === 'string' && seed.length > 0) {
    // FNV-1a 32-bit hash for string seeds
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) || 0x9e3779b9;
  }
  return ((Math.random() * 0xffffffff) >>> 0) || 0x9e3779b9;
}

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function validateGridShape(raw) {
  if (!Array.isArray(raw) || raw.length !== SIZE) {
    throw new Error(`initialGrid must be a ${SIZE}x${SIZE} array`);
  }
  for (let r = 0; r < SIZE; r++) {
    if (!Array.isArray(raw[r]) || raw[r].length !== SIZE) {
      throw new Error(`initialGrid row ${r} must have length ${SIZE}`);
    }
    for (let c = 0; c < SIZE; c++) {
      const v = raw[r][c];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
        throw new Error(`initialGrid[${r}][${c}] must be a non-negative integer`);
      }
      if (v !== 0 && (v < 2 || (v & (v - 1)) !== 0)) {
        throw new Error(`initialGrid[${r}][${c}] must be 0 or a power of two >= 2`);
      }
    }
  }
}

export function createGame(options = {}) {
  const { seed, initialGrid } = options;
  const rng = createRng(seed);
  let nextId = 1;
  let cells = emptyGrid(); // null or { id, value }
  let score = 0;
  let turns = 0;
  let hasWon = false;
  let state = 'ready'; // "ready" | "playing" | "won" | "continue" | "lost"

  function listEmpty() {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (cells[r][c] === null) out.push({ r, c });
      }
    }
    return out;
  }

  function spawnOne() {
    const empty = listEmpty();
    if (empty.length === 0) return null;
    const pick = empty[Math.floor(rng() * empty.length)];
    const value = rng() < 0.9 ? 2 : 4;
    const tile = { id: nextId++, value };
    cells[pick.r][pick.c] = tile;
    return { id: tile.id, value: tile.value, r: pick.r, c: pick.c };
  }

  function hasLegalMoves() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cur = cells[r][c];
        if (cur === null) return true;
        if (c + 1 < SIZE && cells[r][c + 1] && cells[r][c + 1].value === cur.value) return true;
        if (r + 1 < SIZE && cells[r + 1][c] && cells[r + 1][c].value === cur.value) return true;
      }
    }
    return false;
  }

  function legalMoves() {
    if (state === 'won' || state === 'lost') return [];
    const out = [];
    for (const dir of DIRS) {
      if (canMoveDir(dir)) out.push(dir);
    }
    return out;
  }

  function lineCoords(dir, index) {
    const coords = [];
    for (let i = 0; i < SIZE; i++) {
      if (dir === 'left') coords.push({ r: index, c: i });
      else if (dir === 'right') coords.push({ r: index, c: SIZE - 1 - i });
      else if (dir === 'up') coords.push({ r: i, c: index });
      else if (dir === 'down') coords.push({ r: SIZE - 1 - i, c: index });
    }
    return coords;
  }

  function canMoveDir(dir) {
    for (let line = 0; line < SIZE; line++) {
      const coords = lineCoords(dir, line);
      let sawEmpty = false;
      let prevValue = 0;
      for (const { r, c } of coords) {
        const tile = cells[r][c];
        if (tile === null) {
          sawEmpty = true;
        } else {
          if (sawEmpty) return true;
          if (tile.value === prevValue) return true;
          prevValue = tile.value;
        }
      }
    }
    return false;
  }

  function maxTile() {
    let best = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = cells[r][c];
        if (t && t.value > best) best = t.value;
      }
    }
    return best;
  }

  function grid() {
    return cells.map((row) => row.map((t) => (t ? t.value : 0)));
  }

  function tiles() {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = cells[r][c];
        if (t) out.push({ id: t.id, value: t.value, r, c });
      }
    }
    return out;
  }

  function loadGrid(raw, opts = {}) {
    validateGridShape(raw);
    cells = emptyGrid();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = raw[r][c];
        if (v > 0) {
          cells[r][c] = { id: nextId++, value: v };
        }
      }
    }
    score = typeof opts.score === 'number' && opts.score >= 0 ? opts.score : 0;
    turns = typeof opts.turns === 'number' && opts.turns >= 0 ? opts.turns : 0;
    hasWon = typeof opts.hasWon === 'boolean' ? opts.hasWon : maxTile() >= WIN_VALUE;
    if (opts.state) {
      state = opts.state;
    } else if (!hasLegalMoves()) {
      state = 'lost';
    } else if (hasWon) {
      state = 'continue';
    } else {
      state = turns > 0 ? 'playing' : 'ready';
    }
  }

  function move(dir) {
    if (!DIRS.includes(dir)) {
      throw new Error(`Invalid direction: ${dir}`);
    }
    if (state === 'won' || state === 'lost') {
      return {
        moved: false,
        dir,
        scoreDelta: 0,
        score,
        turns,
        state,
        wonNow: false,
        lostNow: false,
        moves: [],
        merges: [],
        spawned: null,
      };
    }

    const nextCells = emptyGrid();
    const moves = [];
    const merges = [];
    let moved = false;
    let scoreDelta = 0;

    for (let line = 0; line < SIZE; line++) {
      const coords = lineCoords(dir, line);
      const present = [];
      for (const pos of coords) {
        const tile = cells[pos.r][pos.c];
        if (tile !== null) {
          present.push({ tile, from: pos });
        }
      }

      let destIdx = 0;
      let i = 0;
      while (i < present.length) {
        const dest = coords[destIdx];
        const cur = present[i];
        if (i + 1 < present.length && cur.tile.value === present[i + 1].tile.value) {
          const other = present[i + 1];
          const mergedValue = cur.tile.value * 2;
          const mergedTile = { id: nextId++, value: mergedValue };
          nextCells[dest.r][dest.c] = mergedTile;
          scoreDelta += mergedValue;
          moved = true;

          moves.push({
            id: cur.tile.id,
            value: cur.tile.value,
            from: { r: cur.from.r, c: cur.from.c },
            to: { r: dest.r, c: dest.c },
            mergedInto: mergedTile.id,
          });
          moves.push({
            id: other.tile.id,
            value: other.tile.value,
            from: { r: other.from.r, c: other.from.c },
            to: { r: dest.r, c: dest.c },
            mergedInto: mergedTile.id,
          });
          merges.push({
            id: mergedTile.id,
            value: mergedValue,
            r: dest.r,
            c: dest.c,
            fromIds: [cur.tile.id, other.tile.id],
          });

          i += 2;
        } else {
          nextCells[dest.r][dest.c] = cur.tile;
          if (cur.from.r !== dest.r || cur.from.c !== dest.c) {
            moved = true;
          }
          moves.push({
            id: cur.tile.id,
            value: cur.tile.value,
            from: { r: cur.from.r, c: cur.from.c },
            to: { r: dest.r, c: dest.c },
            mergedInto: null,
          });
          i += 1;
        }
        destIdx += 1;
      }
    }

    if (!moved) {
      return {
        moved: false,
        dir,
        scoreDelta: 0,
        score,
        turns,
        state,
        wonNow: false,
        lostNow: false,
        moves: [],
        merges: [],
        spawned: null,
      };
    }

    cells = nextCells;
    score += scoreDelta;
    turns += 1;

    const spawned = spawnOne();
    let wonNow = false;
    let lostNow = false;

    if (!hasWon && maxTile() >= WIN_VALUE) {
      hasWon = true;
      state = 'won';
      wonNow = true;
    } else if (!hasLegalMoves()) {
      state = 'lost';
      lostNow = true;
    } else if (state === 'ready') {
      state = 'playing';
    }

    return {
      moved: true,
      dir,
      scoreDelta,
      score,
      turns,
      state,
      wonNow,
      lostNow,
      moves,
      merges,
      spawned,
    };
  }

  function keepPlaying() {
    if (state !== 'won') return state;
    state = hasLegalMoves() ? 'continue' : 'lost';
    return state;
  }

  // Initialize board: either custom initialGrid or two starting tiles.
  let initialSpawns = [];
  if (initialGrid) {
    loadGrid(initialGrid);
  } else {
    const s1 = spawnOne();
    const s2 = spawnOne();
    initialSpawns = [s1, s2].filter(Boolean);
  }

  return {
    get state() {
      return state;
    },
    get score() {
      return score;
    },
    get turns() {
      return turns;
    },
    get hasWon() {
      return hasWon;
    },
    get initialSpawns() {
      return initialSpawns.map((s) => ({ ...s }));
    },
    grid,
    tiles,
    maxTile,
    hasLegalMoves,
    legalMoves,
    canMoveDir,
    move,
    keepPlaying,
    loadGrid,
  };
}
