// Procedural low-poly tree meshes for all 11 tiers of Grove (Seed 2 -> World Tree 2048).
// Every tier has a distinct silhouette, height, trunk character, and foliage palette
// so the board reads cleanly without numbers.

import * as THREE from 'three';
import { valueToTier } from './tiers.js';

const materialCache = new Map();

function mat(color, opts = {}) {
  const key = `${color}|${opts.roughness ?? 0.85}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 0}|${opts.metalness ?? 0}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.86,
      metalness: opts.metalness ?? 0.0,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
    materialCache.set(key, m);
  }
  return m;
}

function addMesh(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadows = true) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  if (shadows) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  parent.add(mesh);
  return mesh;
}

// Reusable base primitives (disposed only on full teardown if needed).
const GEO = {
  ico0: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  cone5: new THREE.ConeGeometry(1, 1, 5),
  cone6: new THREE.ConeGeometry(1, 1, 6),
  cone7: new THREE.ConeGeometry(1, 1, 7),
  cyl5: new THREE.CylinderGeometry(0.65, 1, 1, 5),
  cyl6: new THREE.CylinderGeometry(0.68, 1, 1, 6),
  cyl7: new THREE.CylinderGeometry(0.72, 1, 1, 7),
  cylStraight5: new THREE.CylinderGeometry(0.85, 1, 1, 5),
  box: new THREE.BoxGeometry(1, 1, 1),
};

// Tier 1 (2) — Seed: tiny sprouting seed mound.
function buildSeed(root, canopy) {
  const moundMat = mat(0x5c422c, { roughness: 0.95 });
  const seedMat = mat(0xcfa055, { roughness: 0.65 });
  const capMat = mat(0x7c5432, { roughness: 0.85 });
  const tipMat = mat(0xbce85c, { roughness: 0.72 });

  // Soft soil mound
  addMesh(root, GEO.dodeca, moundMat, [0, 0.05, 0], [0, 0.3, 0], [0.34, 0.14, 0.34]);
  // Plump seed nut nestled on mound
  addMesh(root, GEO.dodeca, seedMat, [0, 0.17, 0], [0.15, 0.4, 0.08], [0.15, 0.19, 0.14]);
  addMesh(root, GEO.cone5, capMat, [0, 0.11, 0], [Math.PI, 0.2, 0], [0.16, 0.09, 0.16]);
  // Tiny bright chartreuse shoot peeking out
  addMesh(canopy, GEO.cone5, tipMat, [0.03, 0.34, 0], [0.1, 0, -0.22], [0.075, 0.21, 0.06]);
}

// Tier 2 (4) — Sprout: short stem, first leaf pair.
function buildSprout(root, canopy) {
  const moundMat = mat(0x5a402b, { roughness: 0.95 });
  const stemMat = mat(0x72b640, { roughness: 0.78 });
  const leafMat = mat(0x9ee048, { roughness: 0.72 });
  const leafDark = mat(0x82c93c, { roughness: 0.76 });

  addMesh(root, GEO.dodeca, moundMat, [0, 0.04, 0], [0, 0, 0], [0.28, 0.1, 0.28]);
  // Short curved stem
  addMesh(root, GEO.cyl5, stemMat, [0, 0.22, 0], [0, 0, 0.06], [0.045, 0.38, 0.045]);
  // First pair of crisp angled leaves
  addMesh(canopy, GEO.octa, leafMat, [0.16, 0.42, 0.02], [0.15, 0.1, -0.65], [0.21, 0.06, 0.12]);
  addMesh(canopy, GEO.octa, leafDark, [-0.15, 0.40, -0.02], [-0.12, -0.2, 0.72], [0.19, 0.055, 0.11]);
  // Tiny central bud
  addMesh(canopy, GEO.ico0, leafMat, [0, 0.44, 0], [0, 0, 0], [0.05, 0.07, 0.05]);
}

// Tier 3 (8) — Sapling: slim trunk, one small canopy.
function buildSapling(root, canopy) {
  const bark = mat(0x9a714d, { roughness: 0.9 });
  const leaf = mat(0x6ac94a, { roughness: 0.78 });

  addMesh(root, GEO.cyl5, bark, [0, 0.27, 0], [0, 0.2, 0], [0.065, 0.56, 0.065]);
  // Neat small teardrop canopy
  addMesh(canopy, GEO.dodeca, leaf, [0, 0.64, 0], [0, 0.4, 0], [0.27, 0.31, 0.27]);
}

// Tier 4 (16) — Young Tree: taller, fuller single canopy.
function buildYoungTree(root, canopy) {
  const bark = mat(0x88603f, { roughness: 0.9 });
  const leafMain = mat(0x46b34a, { roughness: 0.78 });
  const leafTop = mat(0x5ac458, { roughness: 0.76 });

  // Trunk with slight root base
  addMesh(root, GEO.cyl6, bark, [0, 0.07, 0], [0, 0, 0], [0.13, 0.15, 0.13]);
  addMesh(root, GEO.cyl6, bark, [0, 0.38, 0], [0, 0.3, 0], [0.09, 0.68, 0.09]);
  // Fuller single rounded canopy
  addMesh(canopy, GEO.ico1, leafMain, [0, 0.84, 0], [0.1, 0.5, 0], [0.39, 0.38, 0.39]);
  addMesh(canopy, GEO.dodeca, leafTop, [0.07, 1.02, -0.04], [0, 0.2, 0], [0.22, 0.2, 0.22]);
}

// Tier 5 (32) — Mature Tree: two-blob canopy.
function buildMatureTree(root, canopy) {
  const bark = mat(0x785133, { roughness: 0.91 });
  const leafDeep = mat(0x2d9448, { roughness: 0.8 });
  const leafMid = mat(0x3ba954, { roughness: 0.78 });

  addMesh(root, GEO.cyl6, bark, [0, 0.42, 0], [0, 0, 0], [0.125, 0.84, 0.125]);
  addMesh(root, GEO.cyl5, bark, [-0.1, 0.76, 0.04], [0.1, 0, 0.48], [0.06, 0.34, 0.06]);
  // Distinct two-blob canopy
  addMesh(canopy, GEO.ico1, leafDeep, [-0.18, 0.92, 0.06], [0, 0.3, 0], [0.36, 0.31, 0.34]);
  addMesh(canopy, GEO.ico1, leafMid, [0.15, 1.13, -0.05], [0.2, 0.8, 0], [0.34, 0.32, 0.33]);
}

// Tier 6 (64) — Great Tree: broad trunk, three-blob canopy.
function buildGreatTree(root, canopy) {
  const bark = mat(0x69452a, { roughness: 0.92 });
  const leafA = mat(0x217e54, { roughness: 0.8 });
  const leafB = mat(0x2d9162, { roughness: 0.78 });
  const leafC = mat(0x38a36c, { roughness: 0.78 });

  // Broad buttressed trunk
  addMesh(root, GEO.cyl6, bark, [0, 0.12, 0], [0, 0.2, 0], [0.22, 0.25, 0.22]);
  addMesh(root, GEO.cyl6, bark, [0, 0.48, 0], [0, 0, 0], [0.155, 0.88, 0.155]);
  // Three-blob clover canopy
  addMesh(canopy, GEO.ico1, leafA, [-0.25, 1.02, 0.15], [0, 0.2, 0], [0.34, 0.29, 0.32]);
  addMesh(canopy, GEO.ico1, leafB, [0.24, 1.06, 0.1], [0.1, 1.1, 0], [0.33, 0.30, 0.32]);
  addMesh(canopy, GEO.ico1, leafC, [0.0, 1.28, -0.14], [0, 0.6, 0.1], [0.36, 0.33, 0.35]);
}

// Tier 7 (128) — Grand Tree: layered canopy, visible branches.
function buildGrandTree(root, canopy) {
  const bark = mat(0x5e3d26, { roughness: 0.92 });
  const leafLow = mat(0x267e61, { roughness: 0.8 });
  const leafMid = mat(0x379972, { roughness: 0.78 });
  const leafHigh = mat(0x63b574, { roughness: 0.76 });

  // Tall sculpted trunk
  addMesh(root, GEO.cyl7, bark, [0, 0.14, 0], [0, 0, 0], [0.24, 0.28, 0.24]);
  addMesh(root, GEO.cyl6, bark, [0, 0.62, 0], [0, 0.2, 0], [0.155, 1.15, 0.155]);
  // Visible angled branches
  addMesh(root, GEO.cyl5, bark, [-0.2, 0.82, 0.08], [0.15, 0, 0.68], [0.065, 0.48, 0.065]);
  addMesh(root, GEO.cyl5, bark, [0.21, 0.88, -0.06], [-0.15, 0, -0.64], [0.065, 0.48, 0.065]);
  addMesh(root, GEO.cyl5, bark, [0.02, 0.94, 0.18], [0.62, 0, -0.08], [0.055, 0.42, 0.055]);

  // Layered canopy tiers
  addMesh(canopy, GEO.dodeca, leafLow, [-0.28, 1.04, 0.12], [0, 0.4, 0], [0.34, 0.22, 0.32]);
  addMesh(canopy, GEO.dodeca, leafLow, [0.28, 1.10, -0.08], [0, 1.0, 0], [0.34, 0.22, 0.32]);
  addMesh(canopy, GEO.ico1, leafMid, [0.0, 1.32, 0.06], [0, 0.2, 0], [0.46, 0.28, 0.44]);
  addMesh(canopy, GEO.dodeca, leafHigh, [0.02, 1.60, -0.02], [0.1, 0.7, 0], [0.30, 0.22, 0.29]);
}

// Tier 8 (256) — Elder Tree: gnarled trunk, wide layered canopy (warm olive-gold shift).
function buildElderTree(root, canopy) {
  const bark = mat(0x523929, { roughness: 0.94 });
  const leafBase = mat(0x6e8c35, { roughness: 0.8 });
  const leafWarm = mat(0x9cb340, { roughness: 0.76 });
  const leafGold = mat(0xc2c74c, { roughness: 0.74 });

  // Gnarled roots + twisting multi-segment trunk
  addMesh(root, GEO.cyl5, bark, [-0.16, 0.11, 0.12], [0.3, 0, 0.45], [0.11, 0.32, 0.11]);
  addMesh(root, GEO.cyl5, bark, [0.17, 0.11, -0.1], [-0.25, 0, -0.45], [0.11, 0.32, 0.11]);
  addMesh(root, GEO.cyl6, bark, [-0.03, 0.36, 0.02], [0.06, 0, 0.14], [0.19, 0.68, 0.19]);
  addMesh(root, GEO.cyl6, bark, [0.04, 0.82, -0.02], [-0.08, 0.4, -0.14], [0.15, 0.64, 0.15]);
  // Crooked heavy boughs
  addMesh(root, GEO.cyl5, bark, [-0.26, 1.02, 0.1], [0.12, 0, 0.78], [0.075, 0.56, 0.075]);
  addMesh(root, GEO.cyl5, bark, [0.27, 1.08, -0.08], [-0.18, 0, -0.74], [0.075, 0.56, 0.075]);

  // Wide sweeping layered olive-gold canopy
  addMesh(canopy, GEO.ico1, leafBase, [-0.36, 1.24, 0.14], [0, 0.3, 0], [0.38, 0.24, 0.35]);
  addMesh(canopy, GEO.ico1, leafBase, [0.36, 1.28, -0.12], [0, 1.2, 0], [0.38, 0.24, 0.35]);
  addMesh(canopy, GEO.ico1, leafWarm, [0.0, 1.48, 0.02], [0, 0.5, 0], [0.54, 0.28, 0.50]);
  addMesh(canopy, GEO.dodeca, leafGold, [0.04, 1.76, -0.02], [0.1, 0.9, 0], [0.36, 0.22, 0.34]);
}

// Tier 9 (512) — Ancient Tree: massive, moss tones, multi-layer.
function buildAncientTree(root, canopy) {
  const bark = mat(0x4b3b30, { roughness: 0.95 });
  const rock = mat(0x6e736b, { roughness: 0.94 });
  const moss = mat(0x62a872, { roughness: 0.82 });
  const leafDark = mat(0x2f6c5e, { roughness: 0.82 });
  const leafMid = mat(0x498d78, { roughness: 0.78 });
  const leafSage = mat(0x7ec09c, { roughness: 0.74 });

  // Mossy base stones & massive trunk
  addMesh(root, GEO.dodeca, rock, [-0.28, 0.1, 0.2], [0.2, 0.4, 0], [0.19, 0.13, 0.16]);
  addMesh(root, GEO.dodeca, rock, [0.27, 0.09, -0.18], [0, 0.8, 0.2], [0.17, 0.12, 0.17]);
  addMesh(root, GEO.cyl7, bark, [0, 0.18, 0], [0, 0, 0], [0.33, 0.38, 0.33]);
  addMesh(root, GEO.cyl7, bark, [0, 0.74, 0], [0, 0.3, 0], [0.23, 1.15, 0.23]);
  // Spreading ancient boughs
  addMesh(root, GEO.cyl5, bark, [-0.3, 1.12, 0.12], [0.18, 0, 0.82], [0.09, 0.62, 0.09]);
  addMesh(root, GEO.cyl5, bark, [0.31, 1.16, -0.12], [-0.18, 0, -0.82], [0.09, 0.62, 0.09]);
  addMesh(root, GEO.cyl5, bark, [0.0, 1.18, 0.26], [0.76, 0, 0], [0.08, 0.52, 0.08]);

  // Hanging moss drapes
  addMesh(canopy, GEO.cone5, moss, [-0.46, 1.15, 0.16], [Math.PI, 0, 0], [0.06, 0.32, 0.06]);
  addMesh(canopy, GEO.cone5, moss, [0.44, 1.2, -0.14], [Math.PI, 0.5, 0], [0.06, 0.34, 0.06]);
  addMesh(canopy, GEO.cone5, moss, [0.12, 1.22, 0.38], [Math.PI, 0.2, 0], [0.055, 0.28, 0.055]);

  // Multi-layer majestic moss-teal canopy
  addMesh(canopy, GEO.ico1, leafDark, [-0.36, 1.40, 0.14], [0, 0.2, 0], [0.42, 0.25, 0.38]);
  addMesh(canopy, GEO.ico1, leafDark, [0.36, 1.44, -0.14], [0, 0.9, 0], [0.42, 0.25, 0.38]);
  addMesh(canopy, GEO.ico1, leafMid, [0.0, 1.68, 0.04], [0, 0.4, 0], [0.58, 0.30, 0.55]);
  addMesh(canopy, GEO.ico1, leafSage, [0.0, 2.02, -0.02], [0.1, 0.8, 0], [0.40, 0.26, 0.38]);
}

// Tier 10 (1024) — Giant Sequoia: red-toned towering trunk, dramatic vertical spire.
function buildGiantSequoia(root, canopy) {
  const redwood = mat(0x9e3f27, { roughness: 0.88 });
  const redwoodDeep = mat(0x7c2e1c, { roughness: 0.9 });
  const conifer = mat(0x285e3f, { roughness: 0.8 });
  const bronze = mat(0xc45a2d, { roughness: 0.76 });
  const amberLeaf = mat(0xdc7d3b, { roughness: 0.74 });

  // Fluted massive redwood base + towering trunk
  addMesh(root, GEO.cyl7, redwoodDeep, [0, 0.24, 0], [0, 0, 0], [0.36, 0.48, 0.36]);
  addMesh(root, GEO.cyl7, redwood, [0, 0.98, 0], [0, 0.25, 0], [0.26, 1.55, 0.26]);
  addMesh(root, GEO.cyl6, redwood, [0, 1.72, 0], [0, 0.5, 0], [0.16, 0.85, 0.16]);

  // Lofty stacked redwood / bronze conifer tiers
  addMesh(canopy, GEO.cone7, conifer, [0, 1.56, 0], [0, 0.1, 0], [0.62, 0.54, 0.62]);
  addMesh(canopy, GEO.cone7, bronze, [0, 1.94, 0], [0, 0.55, 0], [0.54, 0.52, 0.54]);
  addMesh(canopy, GEO.cone6, conifer, [0, 2.28, 0], [0, 1.0, 0], [0.43, 0.48, 0.43]);
  addMesh(canopy, GEO.cone6, amberLeaf, [0, 2.60, 0], [0, 1.4, 0], [0.30, 0.44, 0.30]);
}

// Tier 11 (2048) — World Tree: luminous ivory-gold trunk, glowing canopy + fireflies.
function buildWorldTree(root, canopy, isMythic = false) {
  const trunkMat = mat(0xd8bc8f, {
    roughness: 0.74,
    emissive: 0x3b2a10,
    emissiveIntensity: 0.22,
  });
  const veinMat = mat(0xffe082, {
    roughness: 0.45,
    emissive: 0xffb833,
    emissiveIntensity: 0.55,
  });
  const glowGold = mat(0xffe58a, {
    roughness: 0.55,
    emissive: 0xffb732,
    emissiveIntensity: 0.42,
  });
  const glowMint = mat(isMythic ? 0xd2b3ff : 0x8ef0c0, {
    roughness: 0.55,
    emissive: isMythic ? 0x9b6eff : 0x3bd694,
    emissiveIntensity: 0.36,
  });
  const glowCore = mat(0xfff5c4, {
    roughness: 0.4,
    emissive: 0xffd25a,
    emissiveIntensity: 0.65,
  });

  // Sculpted glowing roots & tall sacred trunk
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.35;
    addMesh(
      root,
      GEO.cyl5,
      trunkMat,
      [Math.cos(ang) * 0.22, 0.16, Math.sin(ang) * 0.22],
      [Math.sin(ang) * 0.45, 0, -Math.cos(ang) * 0.45],
      [0.12, 0.44, 0.12]
    );
  }
  addMesh(root, GEO.cyl7, trunkMat, [0, 0.78, 0], [0, 0.2, 0], [0.27, 1.56, 0.27]);
  // Golden luminous energy core rib inside the trunk
  addMesh(root, GEO.octa, veinMat, [0, 0.86, 0], [0, 0.4, 0], [0.16, 0.52, 0.16], false);

  // Sweeping luminous boughs
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.6;
    addMesh(
      root,
      GEO.cyl5,
      trunkMat,
      [Math.cos(ang) * 0.28, 1.38, Math.sin(ang) * 0.28],
      [Math.sin(ang) * 0.72, 0, -Math.cos(ang) * 0.72],
      [0.085, 0.68, 0.085]
    );
  }

  // Radiant layered World Tree crown
  addMesh(canopy, GEO.ico1, glowMint, [-0.42, 1.72, 0.22], [0, 0.2, 0], [0.42, 0.26, 0.40]);
  addMesh(canopy, GEO.ico1, glowMint, [0.42, 1.76, -0.22], [0, 1.1, 0], [0.42, 0.26, 0.40]);
  addMesh(canopy, GEO.ico1, glowGold, [-0.20, 1.88, -0.34], [0, 0.7, 0], [0.44, 0.28, 0.42]);
  addMesh(canopy, GEO.ico1, glowGold, [0.22, 1.86, 0.34], [0, 1.5, 0], [0.44, 0.28, 0.42]);
  addMesh(canopy, GEO.ico1, glowGold, [0, 2.12, 0], [0, 0.4, 0], [0.62, 0.36, 0.60]);
  addMesh(canopy, GEO.ico1, glowCore, [0, 2.52, 0], [0.1, 0.8, 0], [0.42, 0.30, 0.40]);
  // Floating luminous crystal star at apex
  addMesh(canopy, GEO.octa, glowCore, [0, 2.96, 0], [0, 0.4, 0], [0.13, 0.22, 0.13], false);

  // Warm soft point light illuminating surrounding grove plots
  const light = new THREE.PointLight(0xffd778, 1.8, 5.5, 1.8);
  light.position.set(0, 2.2, 0);
  canopy.add(light);
}

export function createTreeMesh(value) {
  const tier = valueToTier(value);
  const root = new THREE.Group();
  const canopy = new THREE.Group();
  root.add(canopy);
  root.userData.canopy = canopy;
  root.userData.tier = tier;
  root.userData.value = value;
  root.userData.swayPhase = ((tier * 1.37) % (Math.PI * 2));

  switch (tier) {
    case 1:
      buildSeed(root, canopy);
      break;
    case 2:
      buildSprout(root, canopy);
      break;
    case 3:
      buildSapling(root, canopy);
      break;
    case 4:
      buildYoungTree(root, canopy);
      break;
    case 5:
      buildMatureTree(root, canopy);
      break;
    case 6:
      buildGreatTree(root, canopy);
      break;
    case 7:
      buildGrandTree(root, canopy);
      break;
    case 8:
      buildElderTree(root, canopy);
      break;
    case 9:
      buildAncientTree(root, canopy);
      break;
    case 10:
      buildGiantSequoia(root, canopy);
      break;
    default:
      buildWorldTree(root, canopy, tier > 11);
      break;
  }

  return root;
}
