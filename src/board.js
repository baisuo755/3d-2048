// 3D "Sunlit Sky-Sanctuary" floating island diorama, 4x4 carved stone-rimmed plot
// planters, waterfall & decorative sanctuary details, and kinetic game-feel animations
// (directional slide lean, squash-and-stretch merge pop, elastic spawn drop, blocked-move bump).

import * as THREE from 'three';
import { SIZE, getTierInfo, WIN_VALUE } from './engine.js';
import { createTreeMesh } from './trees.js';

export const SPACING = 1.56;
export const PLOT_SIZE = 1.32;
export const PLOT_TOP_Y = 0.15;

export function cellToWorld(r, c) {
  const half = (SIZE - 1) / 2;
  return {
    x: (c - half) * SPACING,
    z: (r - half) * SPACING,
  };
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Juicy elastic overshoot for merge grow-pop.
function easeOutBack(t) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Crisp bounce for new tile drop-in.
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

  // ------------------------------------------------ Floating Sanctuary Island
  const grassTopMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6fb053, roughness: 0.88, flatShading: true })
  );
  const grassHighlightMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x82be5a, roughness: 0.86, flatShading: true })
  );
  const grassRimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4f893b, roughness: 0.91, flatShading: true })
  );
  const earthUpperMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa4815e, roughness: 0.91, flatShading: true })
  );
  const earthLowerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x856d59, roughness: 0.93, flatShading: true })
  );
  const rockDeepMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b5c53, roughness: 0.94, flatShading: true })
  );
  const vineMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x46883c, roughness: 0.85, flatShading: true })
  );

  // Main grassy island deck (octagonal faceted cylinder rotated 22.5deg to align with 4x4 grid).
  const deckGeo = trackGeo(new THREE.CylinderGeometry(5.32, 5.02, 0.44, 8));
  const deck = new THREE.Mesh(deckGeo, grassTopMat);
  deck.rotation.y = Math.PI / 8;
  deck.position.y = -0.22;
  deck.receiveShadow = true;
  deck.castShadow = true;
  islandGroup.add(deck);

  // Sculpted grass overhang lip.
  const lipGeo = trackGeo(new THREE.CylinderGeometry(5.06, 4.62, 0.36, 8));
  const lip = new THREE.Mesh(lipGeo, grassRimMat);
  lip.rotation.y = Math.PI / 8;
  lip.position.y = -0.54;
  lip.castShadow = true;
  lip.receiveShadow = true;
  islandGroup.add(lip);

  // Subtle stepped meadow patches tucked cleanly inside the outer meadow rim.
  const patchGeo = trackGeo(new THREE.CylinderGeometry(0.75, 0.85, 0.04, 6));
  const patchCoords = [
    [-3.15, 2.10, 0.85],
    [3.25, -1.85, 0.82],
    [-3.05, -2.05, 0.78],
    [2.25, 3.10, 0.76],
  ];
  for (const [px, pz, ps] of patchCoords) {
    const patch = new THREE.Mesh(patchGeo, grassHighlightMat);
    patch.position.set(px, 0.014, pz);
    patch.scale.set(ps, 1, ps * 0.82);
    patch.rotation.y = px * 0.6;
    patch.receiveShadow = true;
    islandGroup.add(patch);
  }

  // Tapered rocky floating underside + asymmetric sculpted cliff crags.
  const strata1Geo = trackGeo(new THREE.CylinderGeometry(4.56, 3.25, 1.35, 8));
  const strata1 = new THREE.Mesh(strata1Geo, earthUpperMat);
  strata1.rotation.y = Math.PI / 8 + 0.08;
  strata1.position.y = -1.36;
  strata1.castShadow = true;
  islandGroup.add(strata1);

  const strata2Geo = trackGeo(new THREE.CylinderGeometry(3.22, 1.48, 1.55, 7));
  const strata2 = new THREE.Mesh(strata2Geo, earthLowerMat);
  strata2.rotation.y = 0.4;
  strata2.position.y = -2.72;
  islandGroup.add(strata2);

  const spireGeo = trackGeo(new THREE.ConeGeometry(1.48, 1.9, 6));
  const spire = new THREE.Mesh(spireGeo, rockDeepMat);
  spire.rotation.x = Math.PI;
  spire.position.y = -4.38;
  islandGroup.add(spire);

  // Asymmetric rocky crag ribs jutting beneath the cliff rim for handcrafted silhouette.
  const cragGeo = trackGeo(new THREE.ConeGeometry(0.95, 2.0, 5));
  const cragSpecs = [
    { x: -2.4, y: -1.9, z: 2.0, sx: 0.9, sy: 0.95, sz: 0.85, rot: 0.4 },
    { x: 2.6, y: -1.8, z: -1.9, sx: 0.85, sy: 0.9, sz: 0.8, rot: 1.5 },
    { x: 2.2, y: -2.1, z: 2.1, sx: 0.78, sy: 0.85, sz: 0.78, rot: 2.6 },
    { x: -2.1, y: -2.2, z: -2.3, sx: 0.82, sy: 0.92, sz: 0.8, rot: 3.8 },
  ];
  for (const cr of cragSpecs) {
    const crag = new THREE.Mesh(cragGeo, cr.sx > 0.83 ? earthUpperMat : earthLowerMat);
    crag.rotation.x = Math.PI;
    crag.rotation.y = cr.rot;
    crag.position.set(cr.x, cr.y, cr.z);
    crag.scale.set(cr.sx, cr.sy, cr.sz);
    islandGroup.add(crag);
  }

  // Hanging low-poly cliff vines draping down from the meadow lip.
  const vineGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.75, 4));
  const vineSpecs = [
    [-4.35, -0.78, 1.55, 0.95],
    [-4.12, -0.74, 1.95, 0.72],
    [1.65, -0.78, 4.32, 0.9],
    [2.05, -0.72, 4.12, 0.65],
    [4.28, -0.76, -1.65, 0.85],
    [-1.95, -0.74, -4.18, 0.8],
  ];
  for (const [vx, vy, vz, vs] of vineSpecs) {
    const v = new THREE.Mesh(vineGeo, vineMat);
    v.rotation.x = Math.PI;
    v.position.set(vx, vy, vz);
    v.scale.set(vs, vs, vs);
    islandGroup.add(v);
  }

  // Miniature sunlit spring pond & waterfall cascading off the front-right island corner.
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5cc7e8,
      emissive: 0x1a6c8e,
      emissiveIntensity: 0.25,
      roughness: 0.22,
      metalness: 0.08,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    })
  );
  const foamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeaf9ff,
      emissive: 0xaee6ff,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    })
  );
  const pondGeo = trackGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 7));
  const pond = new THREE.Mesh(pondGeo, waterMat);
  pond.position.set(3.55, 0.015, 2.35);
  pond.scale.set(1.25, 1, 0.9);
  pond.rotation.y = 0.6;
  islandGroup.add(pond);

  // Tapered organic waterfall spilling over the front-right rim and dissolving into mist
  const fallGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.07, 1.65, 5));
  const waterfall = new THREE.Mesh(fallGeo, waterMat);
  waterfall.position.set(4.14, -0.82, 2.54);
  waterfall.scale.set(1.15, 1, 0.42);
  waterfall.rotation.y = Math.PI / 5;
  islandGroup.add(waterfall);

  const crestGeo = trackGeo(new THREE.DodecahedronGeometry(0.18, 0));
  const fallCrest = new THREE.Mesh(crestGeo, foamMat);
  fallCrest.position.set(4.02, -0.01, 2.48);
  fallCrest.scale.set(1.45, 0.55, 0.85);
  fallCrest.rotation.y = Math.PI / 5;
  islandGroup.add(fallCrest);

  // Soft low-poly mist cloud right where the waterfall dissolves into the sky
  const mistCap1 = new THREE.Mesh(crestGeo, foamMat);
  mistCap1.position.set(4.18, -1.55, 2.58);
  mistCap1.scale.set(1.05, 0.72, 0.9);
  islandGroup.add(mistCap1);
  const mistCap2 = new THREE.Mesh(crestGeo, foamMat);
  mistCap2.position.set(4.30, -1.68, 2.66);
  mistCap2.scale.set(0.75, 0.55, 0.75);
  islandGroup.add(mistCap2);

  particles.setWaterfallOrigin({ x: 4.20, y: -1.52, z: 2.60 });

  // Small floating rock shards bobbing around the underside.
  const shardGeo = trackGeo(new THREE.DodecahedronGeometry(0.40, 0));
  const shards = [];
  const shardSpecs = [
    { x: -3.6, y: -1.9, z: 2.2, s: 0.82, phase: 0.2 },
    { x: 3.9, y: -1.65, z: -2.0, s: 0.74, phase: 1.8 },
    { x: -2.5, y: -2.45, z: -2.7, s: 0.60, phase: 3.1 },
    { x: 2.8, y: -2.25, z: 2.35, s: 0.66, phase: 4.7 },
  ];
  for (const sp of shardSpecs) {
    const m = new THREE.Mesh(shardGeo, sp.s > 0.72 ? earthLowerMat : rockDeepMat);
    m.position.set(sp.x, sp.y, sp.z);
    m.scale.set(sp.s, sp.s * 1.15, sp.s * 0.9);
    m.rotation.set(sp.phase, sp.phase * 0.7, 0.3);
    islandGroup.add(m);
    shards.push({ mesh: m, baseY: sp.y, phase: sp.phase });
  }

  // Decorative perimeter stones, wildflowers (cream & coral), grass tufts, and 4 sanctuary corner lanterns.
  const pebbleGeo = trackGeo(new THREE.DodecahedronGeometry(0.18, 0));
  const pebbleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x999b93, roughness: 0.9, flatShading: true })
  );
  const tuftGeo = trackGeo(new THREE.ConeGeometry(0.085, 0.26, 4));
  const tuftMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b8a36, roughness: 0.84, flatShading: true })
  );
  const flowerCreamMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfff0b2, roughness: 0.65, flatShading: true })
  );
  const flowerCoralMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf49272, roughness: 0.68, flatShading: true })
  );
  const flowerGeo = trackGeo(new THREE.OctahedronGeometry(0.058, 0));

  const decoCoords = [
    [-3.75, 2.85], [3.15, 3.15], [-3.85, -2.65], [3.75, -2.75],
    [-4.15, 0.35], [4.15, -0.65], [0.65, -4.05], [-0.85, 4.05],
    [2.25, 3.85], [-2.75, -3.55], [3.95, 1.05], [-3.75, -1.25],
    [-2.25, 3.85], [2.45, -3.75],
  ];
  decoCoords.forEach(([x, z], idx) => {
    if (idx % 3 === 0) {
      const rock = new THREE.Mesh(pebbleGeo, pebbleMat);
      rock.position.set(x, 0.06, z);
      rock.scale.set(1.15, 0.65, 0.92);
      rock.rotation.y = idx * 0.9;
      rock.castShadow = true;
      rock.receiveShadow = true;
      islandGroup.add(rock);
    } else {
      const t1 = new THREE.Mesh(tuftGeo, tuftMat);
      t1.position.set(x, 0.11, z);
      t1.rotation.z = 0.16;
      t1.castShadow = true;
      islandGroup.add(t1);
      const t2 = new THREE.Mesh(tuftGeo, tuftMat);
      t2.position.set(x + 0.11, 0.085, z + 0.06);
      t2.scale.setScalar(0.8);
      t2.rotation.z = -0.2;
      islandGroup.add(t2);
      if (idx % 2 === 1) {
        const fl = new THREE.Mesh(flowerGeo, idx % 4 === 1 ? flowerCreamMat : flowerCoralMat);
        fl.position.set(x + 0.05, 0.21, z - 0.04);
        islandGroup.add(fl);
      }
    }
  });

  // ------------------------------------------------ 4x4 Carved Stone Plot Grid
  // Raised warm sandstone-and-timber sanctuary terrace beneath the 16 plots.
  const terraceSize = SIZE * SPACING + 0.62;
  const terraceGeo = trackGeo(new THREE.BoxGeometry(terraceSize, 0.10, terraceSize));
  const terraceMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb7a78d, roughness: 0.88, flatShading: true })
  );
  const terraceMesh = new THREE.Mesh(terraceGeo, terraceMat);
  terraceMesh.position.y = 0.03;
  terraceMesh.receiveShadow = true;
  terraceMesh.castShadow = true;
  islandGroup.add(terraceMesh);

  // Four subtle carved corner bollard stones framing the garden terrace.
  const bollardGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 0.24, 6));
  const lanternCapGeo = trackGeo(new THREE.OctahedronGeometry(0.08, 0));
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe69c,
      emissive: 0xffb83c,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      flatShading: true,
    })
  );
  const halfTerrace = terraceSize / 2 - 0.12;
  for (const [bx, bz] of [
    [-halfTerrace, -halfTerrace],
    [halfTerrace, -halfTerrace],
    [-halfTerrace, halfTerrace],
    [halfTerrace, halfTerrace],
  ]) {
    const post = new THREE.Mesh(bollardGeo, terraceMat);
    post.position.set(bx, 0.14, bz);
    post.castShadow = true;
    post.receiveShadow = true;
    islandGroup.add(post);

    const gem = new THREE.Mesh(lanternCapGeo, lanternGlowMat);
    gem.position.set(bx, 0.29, bz);
    islandGroup.add(gem);
  }

  const frameSize = SIZE * SPACING + 0.30;
  const frameGeo = trackGeo(new THREE.BoxGeometry(frameSize, 0.11, frameSize));
  const frameMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.91, flatShading: true })
  );
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = 0.06;
  frameMesh.receiveShadow = true;
  frameMesh.castShadow = true;
  islandGroup.add(frameMesh);

  const plotPickables = [];
  const rimGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE + 0.08, 0.08, PLOT_SIZE + 0.08));
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc2b094, roughness: 0.86, flatShading: true })
  );
  const soilGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE - 0.06, 0.06, PLOT_SIZE - 0.06));
  const soilMatA = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6f533c, roughness: 0.95, flatShading: true })
  );
  const soilMatB = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7b5e45, roughness: 0.95, flatShading: true })
  );

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const { x, z } = cellToWorld(r, c);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(x, 0.11, z);
      rim.receiveShadow = true;
      rim.castShadow = true;
      islandGroup.add(rim);

      const soil = new THREE.Mesh(soilGeo, (r + c) % 2 === 0 ? soilMatA : soilMatB);
      soil.position.set(x, 0.13, z);
      soil.receiveShadow = true;
      soil.userData.cell = { r, c };
      islandGroup.add(soil);
      plotPickables.push(soil);
    }
  }

  // Subtle golden hover rim over whichever cell is hovered/inspected.
  const hoverRingGeo = trackGeo(new THREE.BoxGeometry(PLOT_SIZE + 0.15, 0.05, PLOT_SIZE + 0.15));
  const hoverRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffdc7a,
      transparent: true,
      opacity: 0.46,
    })
  );
  const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
  hoverRing.visible = false;
  islandGroup.add(hoverRing);

  // ------------------------------------------------ Tile & Kinetic Game Feel
  const activeTiles = new Map(); // tile id -> { id, value, r, c, mesh }
  let anim = null;
  let bump = null; // subtle invalid-move bump feedback
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

  function resetTreePose(mesh) {
    mesh.rotation.x = 0;
    mesh.rotation.z = 0;
    mesh.scale.set(1, 1, 1);
  }

  function finishAnimationNow() {
    if (!anim) return;
    for (const g of anim.ghosts) {
      treesGroup.remove(g.mesh);
    }
    for (const s of anim.slides) {
      const w = cellToWorld(s.to.r, s.to.c);
      s.entry.mesh.position.set(w.x, PLOT_TOP_Y, w.z);
      resetTreePose(s.entry.mesh);
      s.entry.r = s.to.r;
      s.entry.c = s.to.c;
    }
    for (const m of anim.merges) {
      if (!m.created) {
        m.entry = placeTileMesh(m.id, m.value, m.r, m.c);
        m.created = true;
      }
      resetTreePose(m.entry.mesh);
    }
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
      resetTreePose(anim.spawn.entry.mesh);
    }
    anim = null;
    updateWorldTreeFireflies();
  }

  function syncImmediate(tilesList) {
    finishAnimationNow();
    bump = null;
    islandGroup.position.x = 0;
    islandGroup.position.z = 0;
    clearTrees();
    for (const t of tilesList) {
      placeTileMesh(t.id, t.value, t.r, t.c);
    }
    updateWorldTreeFireflies();
  }

  function triggerBlockedBump(gridDir) {
    if (reducedMotion) return;
    const dx = gridDir === 'right' ? 1 : gridDir === 'left' ? -1 : 0;
    const dz = gridDir === 'down' ? 1 : gridDir === 'up' ? -1 : 0;
    bump = { dx, dz, elapsed: 0, dur: 0.13 };
  }

  function applyMove(result, currentTiles) {
    finishAnimationNow();
    if (!result.moved) return;

    const slideDur = reducedMotion ? 0.05 : 0.115;
    const popDur = reducedMotion ? 0.08 : 0.24;
    const spawnDur = reducedMotion ? 0.07 : 0.21;

    const slides = [];
    const ghosts = [];

    for (const mv of result.moves) {
      const entry = activeTiles.get(mv.id);
      if (!entry) continue;
      const fromW = cellToWorld(mv.from.r, mv.from.c);
      const toW = cellToWorld(mv.to.r, mv.to.c);
      const dist = Math.hypot(toW.x - fromW.x, toW.z - fromW.z);
      if (mv.mergedInto !== null) {
        activeTiles.delete(mv.id);
        ghosts.push({ mesh: entry.mesh, fromW, toW, dist });
      } else {
        entry.r = mv.to.r;
        entry.c = mv.to.c;
        slides.push({ entry, fromW, toW, to: mv.to, dist });
      }
    }

    const merges = result.merges.map((m) => ({
      ...m,
      created: false,
      entry: null,
    }));

    const spawn = result.spawned
      ? {
          ...result.spawned,
          created: false,
          entry: null,
        }
      : null;

    if (slides.length === 0 && ghosts.length === 0 && currentTiles) {
      syncImmediate(currentTiles);
      return;
    }

    anim = {
      dir: result.dir,
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
    hoverRing.position.set(x, 0.135, z);
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
      bump = null;
      islandGroup.position.set(0, 0, 0);
      for (const s of shards) s.mesh.position.y = s.baseY;
      for (const entry of activeTiles.values()) {
        resetTreePose(entry.mesh);
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
        return { x: w.x, y: PLOT_TOP_Y + 1.5, z: w.z };
      }
    }
    return { x: 0, y: PLOT_TOP_Y + 1.2, z: 0 };
  }

  function tick(dt, elapsed) {
    if (!reducedMotion) {
      // Gentle floating island bob and rock shard drift.
      islandGroup.position.y = Math.sin(elapsed * 0.92) * 0.075;
      for (const s of shards) {
        s.mesh.position.y = s.baseY + Math.sin(elapsed * 1.28 + s.phase) * 0.11;
        s.mesh.rotation.y += 0.14 * dt;
      }

      // Subtle waterfall shimmer scale pulse.
      waterfall.scale.x = 0.96 + 0.07 * Math.sin(elapsed * 7.5);
      fallCrest.scale.y = 0.5 + 0.12 * Math.sin(elapsed * 6.0);

      // Blocked-move micro-bump spring-back.
      if (bump) {
        bump.elapsed += dt;
        const bt = Math.min(1, bump.elapsed / bump.dur);
        const amt = Math.sin(bt * Math.PI) * 0.095;
        islandGroup.position.x = bump.dx * amt;
        islandGroup.position.z = bump.dz * amt;
        if (bt >= 1) {
          islandGroup.position.x = 0;
          islandGroup.position.z = 0;
          bump = null;
        }
      }

      // Subtle canopy wind sway + World Tree rotating halo.
      for (const entry of activeTiles.values()) {
        const canopy = entry.mesh.userData.canopy;
        if (canopy) {
          const ph = entry.mesh.userData.swayPhase || 0;
          canopy.rotation.z = Math.sin(elapsed * 1.65 + ph) * 0.028;
          canopy.rotation.x = Math.cos(elapsed * 1.25 + ph * 1.3) * 0.018;
        }
        const halo = entry.mesh.userData.halo;
        if (halo) {
          halo.rotation.y += dt * 1.15;
          halo.position.y = 3.00 + Math.sin(elapsed * 2.4) * 0.055;
        }
      }
    }

    if (!anim) return;

    anim.elapsed += dt;
    const slideT = Math.min(1, anim.elapsed / anim.slideDur);
    const easedSlide = easeOutQuart(slideT);
    // Kinetic directional lean peaks mid-slide and settles cleanly to 0 on arrival.
    const leanMag = reducedMotion ? 0 : Math.sin(slideT * Math.PI) * 0.12;
    const leanZ = anim.dir === 'right' ? -leanMag : anim.dir === 'left' ? leanMag : 0;
    const leanX = anim.dir === 'down' ? leanMag : anim.dir === 'up' ? -leanMag : 0;

    for (const s of anim.slides) {
      s.entry.mesh.position.x = s.fromW.x + (s.toW.x - s.fromW.x) * easedSlide;
      s.entry.mesh.position.z = s.fromW.z + (s.toW.z - s.fromW.z) * easedSlide;
      if (s.dist > 0.01) {
        s.entry.mesh.rotation.x = leanX;
        s.entry.mesh.rotation.z = leanZ;
      }
    }
    for (const g of anim.ghosts) {
      g.mesh.position.x = g.fromW.x + (g.toW.x - g.fromW.x) * easedSlide;
      g.mesh.position.z = g.fromW.z + (g.toW.z - g.fromW.z) * easedSlide;
      if (g.dist > 0.01) {
        g.mesh.rotation.x = leanX;
        g.mesh.rotation.z = leanZ;
      }
    }

    if (slideT >= 1 && !anim.slidesDone) {
      anim.slidesDone = true;
      for (const s of anim.slides) {
        s.entry.mesh.rotation.x = 0;
        s.entry.mesh.rotation.z = 0;
      }
      for (const g of anim.ghosts) {
        treesGroup.remove(g.mesh);
      }
      anim.ghosts.length = 0;

      // Spawn newly grown merged trees + ground bloom rings + leaf bursts!
      for (const m of anim.merges) {
        m.entry = placeTileMesh(m.id, m.value, m.r, m.c);
        m.entry.mesh.scale.setScalar(reducedMotion ? 0.85 : 0.35);
        m.created = true;
        const w = cellToWorld(m.r, m.c);
        const info = getTierInfo(m.value);
        const color = info ? info.leafColor : 0x6ac94a;
        const burstY = PLOT_TOP_Y + 0.55 + Math.min(m.value >= 256 ? 0.95 : 0.42, 0.95);
        particles.spawnMergeRing(w.x, PLOT_TOP_Y, w.z, color, m.value >= 256 ? 2.45 : 1.95);
        particles.spawnLeafBurst(
          w.x,
          burstY,
          w.z,
          color,
          m.value >= WIN_VALUE ? 30 : m.value >= 128 ? 20 : 15,
          m.value >= 64
        );
        if (m.value >= WIN_VALUE) {
          particles.triggerWinFireflies(w.x, PLOT_TOP_Y + 1.0, w.z);
        }
      }

      // Spawn new incoming tile (drop-in).
      if (anim.spawn) {
        anim.spawn.entry = placeTileMesh(
          anim.spawn.id,
          anim.spawn.value,
          anim.spawn.r,
          anim.spawn.c
        );
        const w = cellToWorld(anim.spawn.r, anim.spawn.c);
        anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y + (reducedMotion ? 0.08 : 0.78), w.z);
        anim.spawn.entry.mesh.scale.setScalar(reducedMotion ? 0.85 : 0.22);
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
        if (reducedMotion) {
          const sc = 0.85 + 0.15 * pt;
          m.entry.mesh.scale.set(sc, sc, sc);
        } else {
          // Juicy squash-and-stretch growth pop: tall vertical overshoot settling into balanced crown.
          const base = Math.max(0.01, easeOutBack(pt));
          const stretch = Math.sin(pt * Math.PI) * 0.11;
          m.entry.mesh.scale.set(
            Math.max(0.01, base - stretch * 0.5),
            Math.max(0.01, base + stretch),
            Math.max(0.01, base - stretch * 0.5)
          );
        }
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
          const sc = 0.22 + 0.78 * easeOutCubic(st);
          // Subtle soft landing squash right around touchdown (st ~ 0.4-0.75)
          const squash = st > 0.35 && st < 0.85 ? Math.sin(((st - 0.35) / 0.5) * Math.PI) * 0.1 : 0;
          anim.spawn.entry.mesh.position.set(w.x, PLOT_TOP_Y + 0.78 * (1 - b), w.z);
          anim.spawn.entry.mesh.scale.set(sc + squash, Math.max(0.1, sc - squash), sc + squash);
        }
      }

      if (!stillRunning) {
        for (const m of anim.merges) if (m.entry) resetTreePose(m.entry.mesh);
        if (anim.spawn && anim.spawn.entry) resetTreePose(anim.spawn.entry.mesh);
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
    triggerBlockedBump,
    finishAnimationNow,
    setHover,
    pickCell,
    setReducedMotion,
    getWorldTreeWorldPos,
    tick,
    dispose,
  };
}
