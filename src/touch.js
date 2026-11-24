// Pure touch-gesture & camera-relative direction helpers (no DOM, no Three.js).
// Safe to unit-test directly under `node --test tests/`.

export const SWIPE_PREVIEW_PX = 12;
export const SWIPE_COMMIT_PX = 36;
export const SWIPE_FLICK_PX = 26;
export const SWIPE_TAP_MAX_PX = 14;
export const SWIPE_TAP_MAX_MS = 280;

/**
 * Classifies a 2D screen delta (dx, dy) into a cardinal screen direction
 * ("up" | "down" | "left" | "right") once distance meets `threshold`.
 */
export function classifySwipe(dx, dy, threshold = SWIPE_COMMIT_PX) {
  const dist = Math.hypot(dx, dy);
  if (dist < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/**
 * Maps a screen-relative direction ("up" = away from camera, "right" = camera right)
 * onto the nearest grid-relative direction ("up" = -Z, "down" = +Z, "left" = -X, "right" = +X)
 * given the camera's forward (fx, fz) and right (rx, rz) XZ basis vectors.
 */
export function cameraBasisToGridDir(fx, fz, rx, rz, inputDir) {
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

/**
 * Stateful, pure single-finger swipe recognizer that:
 * - Only emits moves in "slide" mode (never in "orbit" mode).
 * - Immediately cancels on any multi-touch (2+ fingers) and stays suppressed
 *   until every finger lifts, so two-finger orbit/pinch never misfires a slide.
 * - Commits on move once distance >= SWIPE_COMMIT_PX (fluid native 2048 feel)
 *   or on release for short crisp flicks >= SWIPE_FLICK_PX.
 * - Emits live preview telemetry during drag for on-screen swipe feedback.
 */
export function createSwipeRecognizer(options = {}) {
  const previewPx = options.previewPx ?? SWIPE_PREVIEW_PX;
  const commitPx = options.commitPx ?? SWIPE_COMMIT_PX;
  const flickPx = options.flickPx ?? SWIPE_FLICK_PX;
  const tapMaxPx = options.tapMaxPx ?? SWIPE_TAP_MAX_PX;
  const tapMaxMs = options.tapMaxMs ?? SWIPE_TAP_MAX_MS;

  const active = new Map(); // pointerId -> { x, y }
  let primaryId = null;
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let committed = false;
  let canceled = false;

  function resetGesture() {
    primaryId = null;
    committed = false;
    canceled = false;
  }

  function down(id, x, y, t, mode = 'slide') {
    active.set(id, { x, y });
    if (mode !== 'slide') {
      canceled = true;
      primaryId = null;
      return { type: 'none' };
    }
    if (active.size === 1 && !canceled) {
      primaryId = id;
      startX = x;
      startY = y;
      startT = t;
      committed = false;
      return { type: 'start', x, y };
    }
    // Second (or later) finger down: suppress swipe for the entire multi-touch sequence.
    canceled = true;
    primaryId = null;
    return { type: 'cancel' };
  }

  function move(id, x, y, mode = 'slide') {
    if (!active.has(id)) return { type: 'none' };
    active.set(id, { x, y });
    if (mode !== 'slide' || canceled || committed || id !== primaryId || active.size !== 1) {
      return { type: 'none' };
    }
    const dx = x - startX;
    const dy = y - startY;
    const dist = Math.hypot(dx, dy);

    const commitDir = classifySwipe(dx, dy, commitPx);
    if (commitDir) {
      committed = true;
      return {
        type: 'commit',
        dir: commitDir,
        startX,
        startY,
        dx,
        dy,
        dist,
      };
    }

    const previewDir = classifySwipe(dx, dy, previewPx);
    if (previewDir) {
      return {
        type: 'preview',
        dir: previewDir,
        startX,
        startY,
        dx,
        dy,
        dist,
        progress: Math.min(1, dist / commitPx),
      };
    }

    return { type: 'none' };
  }

  function up(id, x, y, t, mode = 'slide') {
    const wasTracked = active.delete(id);
    if (!wasTracked) return { type: 'none' };

    let outcome = { type: 'end' };

    if (mode === 'slide' && !canceled && !committed && id === primaryId && active.size === 0) {
      const dx = x - startX;
      const dy = y - startY;
      const dist = Math.hypot(dx, dy);
      const dt = t - startT;
      const flickDir = classifySwipe(dx, dy, flickPx);
      if (flickDir) {
        committed = true;
        outcome = {
          type: 'commit',
          dir: flickDir,
          startX,
          startY,
          dx,
          dy,
          dist,
        };
      } else if (dist <= tapMaxPx && dt <= tapMaxMs) {
        outcome = { type: 'tap', x, y };
      }
    }

    if (active.size === 0) {
      resetGesture();
    }
    return outcome;
  }

  function cancel(id) {
    active.delete(id);
    canceled = true;
    primaryId = null;
    if (active.size === 0) {
      resetGesture();
    }
    return { type: 'cancel' };
  }

  function resetAll() {
    active.clear();
    resetGesture();
  }

  return {
    down,
    move,
    up,
    cancel,
    resetAll,
    get activeCount() {
      return active.size;
    },
  };
}
