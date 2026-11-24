// 3D floating island, 4x4 plot pedestals, tree animation lifecycle
// (slide easing, merge grow-pop, spawn drop-in), hover highlight & raycast.

import * as THREE from 'three';
import { SIZE, getTierInfo, WIN_VALUE } from './engine.js';
import { createTreeMesh } from './trees.js';

export const SPACING = 1.56;
export const PLOT_SIZE = 1.32;
export const PLOT_TOP_Y = 0.14;

export function cellToWorld(r, c) {
  const half = (SIZE - 1) / 2;
  return {
    x: (c - half) * SPACING,
    z: (r - half) * SPACING,
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Gentle overshoot spring for merge growth pop.
function easeOutBack(t) {
  const c1 = 1.75;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Bounce ease for new tile drop-in.
function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export function createBoard(scene, particles) {
  const islandGroup = new THREE.Group();
  const treesGroup = new THREE.Group();
  islandGroup.add(treesGroup);
  scene.add(islandGroup);

  const disposableGeos = [];
  const disposableMats = [];
  const trackGeo = (g) => (disposableGeos.push(g), g);
  const trackMat = (m) => (disposableMats.push(m), m);

  // ------------------------------------------------------- Floating Island
  const grassTopMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6ca852, roughness: 0.9, flatShading: true })
  );
  const grassRimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x52893d, roughness: 0.92, flatShading: true })
  );
  const earthUpperMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x87674c, roughness: 0.94, flatShading: true })
  );
  const earthLowerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x675346, roughness: 0.95, flatShading: true })
  );
  const rockDeepMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x50453f, roughness: 0.96, flatShading: true })
  );

  // Main grassy island deck (octagonal faceted cylinder rotated 22.5deg so flat edges align with 4x4 grid).
  const deckGeo = trackGeo(new THREE.CylinderGeometry(5.25, 4.95, 0.44, 8));
  const deck = new THREE.Mesh(deckGeo, grassTopMat);
  deck.rotation.y = Math.PI / 8;
  deck.position.y = -0.22;
  deck.receiveShadow = true;
  deck.castShadow = true;
  islandGroup.add(deck);

  // Subtle darker grass overhang lip.
  const lipGeo = trackGeo(new THREE.CylinderGeometry(5.0, 4.6, 0.36, 8));
  const lip = new THREE.Mesh(lipGeo, grassRimMat);
  lip.rotation.y = Math.PI / 8;
  lip.position.y = -0.54;
  lip.castShadow = true;
  lip.receiveShadow = true;
  islandGroup.add(lip);

  // Tapered rocky floating underside in 3 faceted geological strata.
  const strata1Geo = trackGeo(new THREE.CylinderGeometry(4.55, 3.25, 1.35, 8));
  const strata1 = new THREE.Mesh(strata1Geo, earthUpperMat);
  strata1.rotation.y = Math.PI / 8 + 0.08;
  strata1.position.y = -1.36;
  strata1.castShadow = true;
  islandGroup.add(strata1);

  const strata2Geo = trackGeo(new THREE.CylinderGeometry(3.2, 1.45, 1.55, 7));
  const strata2 = new THREE.Mesh(strata2Geo, earthLowerMat);
  strata2.rotation.y = 0.4;
  strata2.position.y = -2.72;
  islandGroup.add(strata2);

  const spireGeo = trackGeo(new THREE.ConeGeometry(1.45, 1.85, 6));
  const spire = new THREE.Mesh(spireGeo, rockDeepMat);
  spire.rotation.x = Math.PI;
  spire.position.y = -4.35;
  islandGroup.add(spire);

  // Small floating rock shards bobbing around the underside.
  const shardGeo = trackGeo(new THREE.DodecahedronGeometry(0.42, 0));
  const shards = [];
  const shardSpecs = [
    { x: -3.5, y: -2.2, z: 2.3, s: 0.9, phase: 0.2 },
    { x: 3.7, y: -1.9, z: -2.0, s: 0.78, phase: 1.8 },
    { x: -2.2, y: -3.4, z: -2.8, s: 0.62, phase: 3.1 },
    { x: 2.1, y: -3.1, z: 2.9, s: 0.7, phase: 4.7 },
  ];
  for (const sp of shardSpecs) {
    const m = new THREE.Mesh(shardGeo, sp.s > 0.75 ? earthLowerMat : rockDeepMat);
    m.position.set(sp.x, sp.y, sp.z);
    m.scale.set(sp.s, sp.s * 1.15, sp.s * 0.9);
    m.rotation.set(sp.phase, sp.phase * 0.7, 0.3);
    islandGroup.add(m);
    shards.push({ mesh: m, baseY: sp.y, phase: sp.phase });
  }

  // Decorative perimeter stones & grass tufts well outside the 4x4 grid.
  const pebbleGeo = trackGeo(new THREE.DodecahedronGeometry(0.18, 0));
  const pebbleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8f928b, roughness: 0.92, flatShading: true })
  );
  const tuftGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.24, 4));
  const tuftMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b8736, roughness: 0.85, flatShading: true })
  );
  const flowerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7e19c, roughness: 0.7, flatShading: true })
  );
  const flowerGeo = trackGeo(new THREE.OctahedronGeometry(0.055, 0));

  const decoCoords = [
    [-3.7, 2.9], [3.6, 3.0], [-3.8, -2.7], [3.7, -2.8],
    [-4.1, 0.4], [4.1, -0.5], [0.6, -4.0], [-0.8, 4.0],
    [2.6, 3.6], [-2.7, -3.5], [3.8, 1.3], [-3.7, -1.2],
  ];
  decoCoords.forEach(([x, z], idx) => {
    if (idx % 3 === 0) {
      const rock = new THREE.Mesh(pebbleGeo, pebbleMat);
      rock.position.set(x, 0.06, z);
      rock.scale.set(1.1, 0.65, 0.9);
      rock.rotation.y = idx * 0.9;
      rock.castShadow = true;
      rock.receiveShadow = true;
      islandGroup.add(rock);
    } else {
      const t1 = new THREE.Mesh(tuftGeo, tuftMat);
      t1.position.set(x, 0.1, z);
      t1.rotation.z = 0.15;
      t1.castShadow = true;
      islandGroup.add(t1);
      const t2 = new THREE.Mesh(tuftGeo, tuftMat);
      t2.position.set(x + 0.11, 0.08, z + 0.06);
      t2.scale.setScalar(0.8);
      t2.rotation.z = -0.2;
      islandGroup.add(t2);
      if (idx % 2 === 1) {
        const fl = new THREE.Mesh(flowerGeo, flowerMat);
        fl.position.set(x + 0.05, 0.19, z - 0.04);
        islandGroup.add(fl);
      }
    }
  });

  // ------------------------------------------------------- 4x4 Plot Grid
  // Warm carved timber/stone base frame under the 16 plots.
  const frameSize = SIZE * SPACING + 0.34;
  const frameGeo = trackGeo(new THREE.BoxGeometry(frameSize, 0.12, frameSize));
  const frameMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.9, flatShading: true })
  );
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = 0.04;
  frameMesh.receiveShadow = true;
  frameMesh.castShadow = true;
  islandGroup.add(frameMesh);

  const plotPickables = [];
  const rimGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE + 0.08, 0.08, PLOT_SIZE + 0.08));
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9b866d, roughness: 0.88, flatShading: true })
  );
  const soilGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE - 0.04, 0.06, PLOT_SIZE - 0.04));
  const soilMatA = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6f543d, roughness: 0.95, flatShading: true })
  );
  const soilMatB = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7a5d44, roughness: 0.95, flatShading: true })
  );

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const { x, z } = cellToWorld(r, c);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(x, 0.10, z);
      rim.receiveShadow = true;
      rim.castShadow = true;
      islandGroup.add(rim);

      const soil = new THREE.Mesh(soilGeo, (r + c) % 2 === 0 ? soilMatA : soilMatB);
      soil.position.set(x, 0.12, z);
      soil.receiveShadow = true;
      soil.userData.cell = { r, c };
      islandGroup.add(soil);
      plotPickables.push(soil);
    }
  }

  // Subtle golden hover rim over whichever cell is hovered.
  const hoverRingGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE + 0.14, 0.05, PLOT_SIZE + 0.14));
  const hoverRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffd978,
      transparent: true,
      opacity: 0.42,
    })
  );
  const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
  hoverRing.visible = false;
  islandGroup.add(hoverRing);

  // ------------------------------------------------------- Tile & Anim State
  // Active tiles keyed by engine tile id -> { id, value, r, c, mesh }
  const activeTiles = new Map();
  let anim = null;
  let reducedMotion = false;

  function updateWorldTreeFireflies() {
    const anchors = [];
    for (const entry of activeTiles.values()) {
      if (entry.value >= WIN_VALUE) {
        const w = cellToWorld(entry.r, entry.c);
        anchors.push({ x: w.x, y: PLOT_TOP_Y, z: w.z });
      }
    }
    particles.setWorldTreePositions(anchors);
  }

  function clearTrees() {
    for (const entry of activeTiles.values()) {
      treesGroup.remove(entry.mesh);
    }
    activeTiles.clear();
    if (anim) {
      for (const ghost of anim.ghosts) {
        treesGroup.remove(ghost.mesh);
      }
      anim = null;
    }
  }

  function placeTileMesh(id, value, r, c) {
    const mesh = createTreeMesh(value);
    const { x, z } = cellToWorld(r, c);
    mesh.position.set(x, PLOT_TOP_Y, z);
    treesGroup.add(mesh);
    const entry = { id, value, r, c, mesh };
    activeTiles.set(id, entry);
    return entry;
  }

  function finishAnimationNow() {
    if (!anim) return;
    // Remove sliding ghosts that merged away.
    for (const g of anim.ghosts) {
      treesGroup.remove(g.mesh);
    }
    // Snap surviving sliding tiles to final positions.
    for (const s of anim.slides) {
      const w = cellToWorld(s.to.r, s.to.c);
      s.entry.mesh.position.set(w.x, PLOT_TOP_Y, w.z);
      s.entry.r = s.to.r;
      s.entry.c = s.to.c;
    }
    // Ensure merged trees exist at full scale.
    for (const m of anim.merges) {
      if (!m.created) {
        m.entry = placeTileMesh(m.id, m.value, m.r, m.c);
        m.created = true;
      }
      m.entry.mesh.scale.setScalar(1);
    }
    // Ensure spawned tree exists at full scale and resting height.
    if (anim.spawn) {
      if (!anim.spawn.created) {
        anim.spawn.entry = placeTileMesh(
          anim.spawn.id,
          anim.spawn.value,
          anim.spawn.r,
          anim.spawn.c
        );
        anim.spawn.created = true;
      }
      const w = cellToWorld(anim.spawn.r, anim.spawn.c);
      anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y, w.z);
      anim.spawn.entry.mesh.scale.setScalar(1);
    }
    anim = null;
    updateWorldTreeFireflies();
  }

  function syncImmediate(tilesList) {
    finishAnimationNow();
    clearTrees();
    for (const t of tilesList) {
      placeTileMesh(t.id, t.value, t.r, t.c);
    }
    updateWorldTreeFireflies();
  }

  function applyMove(result, currentTiles) {
    // Finish any prior move animation immediately so fast input never lags.
    finishAnimationNow();
    if (!result.moved) return;

    const slideDur = reducedMotion ? 0.055 : 0.135;
    const popDur = reducedMotion ? 0.08 : 0.22;
    const spawnDur = reducedMotion ? 0.07 : 0.19;

    const slides = [];
    const ghosts = [];

    for (const mv of result.moves) {
      const entry = activeTiles.get(mv.id);
      if (!entry) continue;
      const fromW = cellToWorld(mv.from.r, mv.from.c);
      const toW = cellToWorld(mv.to.r, mv.to.c);
      if (mv.mergedInto !== null) {
        // This tile slides to the destination and is consumed by the merge.
        activeTiles.delete(mv.id);
        ghosts.push({ mesh: entry.mesh, fromW, toW });
      } else {
        entry.r = mv.to.r;
        entry.c = mv.to.c;
        slides.push({ entry, fromW, toW, to: mv.to });
      }
    }

    const merges = result.merges.map((m) => ({
      ...m,
      created: false,
      entry: null,
      popTime: 0,
    }));

    const spawn = result.spawned
      ? {
          ...result.spawned,
          created: false,
          entry: null,
          dropTime: 0,
        }
      : null;

    // Fallback safety: if activeTiles ever desyncs (shouldn't happen), snap.
    if (slides.length === 0 && ghosts.length === 0 && currentTiles) {
      syncImmediate(currentTiles);
      return;
    }

    anim = {
      elapsed: 0,
      slideDur,
      popDur,
      spawnDur,
      slidesDone: false,
      slides,
      ghosts,
      merges,
      spawn,
    };
  }

  function setHover(cell) {
    if (!cell) {
      hoverRing.visible = false;
      return;
    }
    const { x, z } = cellToWorld(cell.r, cell.c);
    hoverRing.position.set(x, 0.125, z);
    hoverRing.visible = true;
  }

  function pickCell(raycaster) {
    const hits = raycaster.intersectObjects(plotPickables, false);
    if (hits.length === 0) return null;
    return hits[0].object.userData.cell || null;
  }

  function setReducedMotion(flag) {
    reducedMotion = Boolean(flag);
    if (reducedMotion) {
      islandGroup.position.y = 0;
      for (const s of shards) s.mesh.position.y = s.baseY;
      for (const entry of activeTiles.values()) {
        const canopy = entry.mesh.userData.canopy;
        if (canopy) {
          canopy.rotation.x = 0;
          canopy.rotation.z = 0;
        }
      }
    }
  }

  function getWorldTreeWorldPos() {
    for (const entry of activeTiles.values()) {
      if (entry.value >= WIN_VALUE) {
        const w = cellToWorld(entry.r, entry.c);
        return { x: w.x, y: PLOT_TOP_Y + 1.4, z: w.z };
      }
    }
    return { x: 0, y: PLOT_TOP_Y + 1.2, z: 0 };
  }

  function tick(dt, elapsed) {
    // Gentle floating island bob and shard drift (skipped under reduced motion).
    if (!reducedMotion) {
      islandGroup.position.y = Math.sin(elapsed * 0.95) * 0.08;
      for (const s of shards) {
        s.mesh.position.y = s.baseY + Math.sin(elapsed * 1.3 + s.phase) * 0.12;
        s.mesh.rotation.y += 0.15 * dt;
      }
      // Subtle canopy wind sway on all active trees.
      for (const entry of activeTiles.values()) {
        const canopy = entry.mesh.userData.canopy;
        if (canopy) {
          const ph = entry.mesh.userData.swayPhase || 0;
          canopy.rotation.z = Math.sin(elapsed * 1.65 + ph) * 0.028;
          canopy.rotation.x = Math.cos(elapsed * 1.25 + ph * 1.3) * 0.018;
        }
      }
    }

    if (!anim) return;

    anim.elapsed += dt;
    const slideT = Math.min(1, anim.elapsed / anim.slideDur);
    const easedSlide = easeOutCubic(slideT);

    for (const s of anim.slides) {
      s.entry.mesh.position.x = s.fromW.x + (s.toW.x - s.fromW.x) * easedSlide;
      s.entry.mesh.position.z = s.fromW.z + (s.toW.z - s.fromW.z) * easedSlide;
    }
    for (const g of anim.ghosts) {
      g.mesh.position.x = g.fromW.x + (g.toW.x - g.fromW.x) * easedSlide;
      g.mesh.position.z = g.fromW.z + (g.toW.z - g.fromW.z) * easedSlide;
    }

    if (slideT >= 1 && !anim.slidesDone) {
      anim.slidesDone = true;
      for (const g of anim.ghosts) {
        treesGroup.remove(g.mesh);
      }
      anim.ghosts.length = 0;

      // Spawn newly grown merged trees + leaf bursts!
      for (const m of anim.merges) {
        m.entry = placeTileMesh(m.id, m.value, m.r, m.c);
        m.entry.mesh.scale.setScalar(reducedMotion ? 0.85 : 0.35);
        m.created = true;
        const w = cellToWorld(m.r, m.c);
        const info = getTierInfo(m.value);
        const burstY = PLOT_TOP_Y + 0.55 + Math.min(m.value >= 256 ? 0.9 : 0.4, 0.9);
        particles.spawnLeafBurst(w.x, burstY, w.z, info ? info.leafColor : 0x6ac94a, m.value >= WIN_VALUE ? 28 : 15);
        if (m.value >= WIN_VALUE) {
          particles.triggerWinFireflies(w.x, PLOT_TOP_Y + 1.0, w.z);
        }
      }

      // Spawn the new incoming tile (drop-in).
      if (anim.spawn) {
        anim.spawn.entry = placeTileMesh(
          anim.spawn.id,
          anim.spawn.value,
          anim.spawn.r,
          anim.spawn.c
        );
        const w = cellToWorld(anim.spawn.r, anim.spawn.c);
        anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y + (reducedMotion ? 0.08 : 0.72), w.z);
        anim.spawn.entry.mesh.scale.setScalar(reducedMotion ? 0.85 : 0.2);
        anim.spawn.created = true;
      }

      updateWorldTreeFireflies();
    }

    if (anim.slidesDone) {
      const postElapsed = anim.elapsed - anim.slideDur;
      let stillRunning = false;

      for (const m of anim.merges) {
        const pt = Math.min(1, postElapsed / anim.popDur);
        if (pt < 1) stillRunning = true;
        const sc = reducedMotion ? 0.85 + 0.15 * pt : Math.max(0.01, easeOutBack(pt));
        m.entry.mesh.scale.setScalar(sc);
      }

      if (anim.spawn && anim.spawn.entry) {
        const st = Math.min(1, postElapsed / anim.spawnDur);
        if (st < 1) stillRunning = true;
        const w = cellToWorld(anim.spawn.r, anim.spawn.c);
        if (reducedMotion) {
          anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y + 0.08 * (1 - st), w.z);
          anim.spawn.entry.mesh.scale.setScalar(0.85 + 0.15 * st);
        } else {
          const b = easeOutBounce(st);
          anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y + 0.72 * (1 - b), w.z);
          anim.spawn.entry.mesh.scale.setScalar(0.2 + 0.8 * easeOutCubic(st));
        }
      }

      if (!stillRunning) {
        anim = null;
      }
    }
  }

  function dispose() {
    clearTrees();
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
    scene.remove(islandGroup);
  }

  return {
    syncImmediate,
    applyMove,
    finishAnimationNow,
    setHover,
    pickCell,
    setReducedMotion,
    getWorldTreeWorldPos,
    tick,
    dispose,
  };
}
