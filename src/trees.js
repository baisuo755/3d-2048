// Procedural low-poly botanical tree meshes for all 11 tiers of Grove (Seed 2 -> World Tree 2048).
// Sculpted diorama silhouettes with multi-tone foliage, root flares, blossoms, moss, and
// a radiant rotating sacred halo + glowing heart crystal on the World Tree.

import * as THREE from 'three';
import { valueToTier } from './tiers.js';

const materialCache = new Map();

function mat(color, opts = {}) {
  const key = `${color}|${opts.roughness ?? 0.84}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 0}|${opts.metalness ?? 0}|${opts.transparent ?? false}|${opts.opacity ?? 1}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.84,
      metalness: opts.metalness ?? 0.0,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
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

// Reusable low-poly geometry primitives.
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
  torus6: new THREE.TorusGeometry(1, 0.075, 5, 16),
  ring: new THREE.RingGeometry(0.42, 0.62, 16),
};

// Tier 1 (2) — Seed: rich soil mound, glossy chestnut acorn nut, unfurling chartreuse shoot.
function buildSeed(root, canopy) {
  const moundMat = mat(0x5c422c, { roughness: 0.95 });
  const pebbleMat = mat(0x8c877c, { roughness: 0.9 });
  const seedMat = mat(0xd8a656, { roughness: 0.52, metalness: 0.04 });
  const capMat = mat(0x7c5330, { roughness: 0.85 });
  const tipMat = mat(0xc2ee5e, { roughness: 0.68 });
  const tipInner = mat(0x9dd843, { roughness: 0.72 });

  addMesh(root, GEO.dodeca, moundMat, [0, 0.05, 0], [0, 0.3, 0], [0.36, 0.14, 0.36]);
  addMesh(root, GEO.dodeca, pebbleMat, [0.22, 0.05, 0.14], [0.2, 0.5, 0], [0.06, 0.04, 0.05]);
  addMesh(root, GEO.dodeca, seedMat, [0, 0.18, 0], [0.14, 0.4, 0.08], [0.16, 0.20, 0.15]);
  addMesh(root, GEO.cone5, capMat, [0, 0.11, 0], [Math.PI, 0.2, 0], [0.17, 0.09, 0.17]);
  // Tiny twin-tip chartreuse shoot peeking out
  addMesh(canopy, GEO.cone5, tipMat, [0.03, 0.35, 0], [0.1, 0, -0.24], [0.075, 0.22, 0.06]);
  addMesh(canopy, GEO.cone5, tipInner, [-0.03, 0.32, 0.02], [-0.08, 0.4, 0.34], [0.05, 0.14, 0.045]);
}

// Tier 2 (4) — Sprout: tender curved stem, crisp twin spring-green leaves, sunlit dew bud.
function buildSprout(root, canopy) {
  const moundMat = mat(0x5a402b, { roughness: 0.95 });
  const stemMat = mat(0x74b941, { roughness: 0.76 });
  const leafMat = mat(0xa4e64a, { roughness: 0.68 });
  const leafDark = mat(0x7fc93b, { roughness: 0.74 });
  const budMat = mat(0xdbf786, { roughness: 0.58 });

  addMesh(root, GEO.dodeca, moundMat, [0, 0.04, 0], [0, 0, 0], [0.29, 0.10, 0.29]);
  addMesh(root, GEO.cyl5, stemMat, [-0.01, 0.16, 0], [0, 0, -0.06], [0.048, 0.24, 0.048]);
  addMesh(root, GEO.cyl5, stemMat, [0.01, 0.32, 0], [0, 0, 0.12], [0.04, 0.22, 0.04]);
  // Crisp angled cotyledon leaf pair
  addMesh(canopy, GEO.octa, leafMat, [0.17, 0.44, 0.02], [0.15, 0.1, -0.62], [0.23, 0.065, 0.13]);
  addMesh(canopy, GEO.octa, leafDark, [-0.16, 0.41, -0.02], [-0.12, -0.2, 0.70], [0.21, 0.06, 0.12]);
  addMesh(canopy, GEO.ico0, budMat, [0.01, 0.47, 0], [0, 0, 0], [0.055, 0.075, 0.055]);
}

// Tier 3 (8) — Sapling: slim warm-bark trunk with subtle root nub + vibrant dual-tone teardrop bud.
function buildSapling(root, canopy) {
  const bark = mat(0x9e734e, { roughness: 0.89 });
  const leafMain = mat(0x69ca49, { roughness: 0.76 });
  const leafTip = mat(0x88de5b, { roughness: 0.72 });

  addMesh(root, GEO.cyl5, bark, [0, 0.05, 0], [0, 0.1, 0], [0.095, 0.10, 0.095]);
  addMesh(root, GEO.cyl5, bark, [0, 0.29, 0], [0, 0.2, 0], [0.064, 0.56, 0.064]);
  addMesh(canopy, GEO.dodeca, leafMain, [0, 0.65, 0], [0, 0.4, 0], [0.28, 0.31, 0.28]);
  addMesh(canopy, GEO.dodeca, leafTip, [0.05, 0.82, 0.03], [0.2, 0.7, 0], [0.16, 0.16, 0.16]);
}

// Tier 4 (16) — Young Tree: sturdy flared trunk, fuller emerald crown, tiny sunlit blossom dots.
function buildYoungTree(root, canopy) {
  const bark = mat(0x8a613f, { roughness: 0.9 });
  const leafMain = mat(0x45b449, { roughness: 0.76 });
  const leafTop = mat(0x63cc5d, { roughness: 0.72 });
  const blossom = mat(0xfbf2a6, { roughness: 0.62 });

  addMesh(root, GEO.cyl6, bark, [0, 0.08, 0], [0, 0, 0], [0.14, 0.16, 0.14]);
  addMesh(root, GEO.cyl6, bark, [0, 0.39, 0], [0, 0.3, 0], [0.092, 0.68, 0.092]);
  addMesh(canopy, GEO.ico1, leafMain, [0, 0.85, 0], [0.1, 0.5, 0], [0.40, 0.38, 0.40]);
  addMesh(canopy, GEO.dodeca, leafTop, [0.08, 1.04, -0.04], [0, 0.2, 0], [0.24, 0.22, 0.24]);
  // Subtle sunlit meadow blossom buds on the crown
  addMesh(canopy, GEO.octa, blossom, [0.28, 0.92, 0.18], [0.3, 0.4, 0], [0.055, 0.055, 0.055], false);
  addMesh(canopy, GEO.octa, blossom, [-0.22, 0.98, 0.22], [0.2, 0.9, 0], [0.05, 0.05, 0.05], false);
}

// Tier 5 (32) — Mature Tree: distinct forked trunk + wide twin-blob forest canopy.
function buildMatureTree(root, canopy) {
  const bark = mat(0x7c5334, { roughness: 0.91 });
  const leafDeep = mat(0x2f9b42, { roughness: 0.78 });
  const leafMid = mat(0x48be51, { roughness: 0.74 });
  const leafSun = mat(0x6dd165, { roughness: 0.72 });

  addMesh(root, GEO.cyl6, bark, [0, 0.09, 0], [0, 0.2, 0], [0.17, 0.18, 0.17]);
  addMesh(root, GEO.cyl6, bark, [0, 0.41, 0], [0, 0, 0], [0.12, 0.80, 0.12]);
  addMesh(root, GEO.cyl5, bark, [-0.15, 0.72, 0.05], [0.1, 0, 0.58], [0.056, 0.38, 0.056]);
  // Unmistakable twin-crown silhouette
  addMesh(canopy, GEO.ico1, leafDeep, [-0.26, 0.88, 0.09], [0, 0.3, 0], [0.35, 0.30, 0.33]);
  addMesh(canopy, GEO.ico1, leafMid, [0.19, 1.13, -0.06], [0.2, 0.8, 0], [0.34, 0.32, 0.33]);
  addMesh(canopy, GEO.dodeca, leafSun, [0.24, 1.29, -0.04], [0.1, 0.4, 0], [0.17, 0.14, 0.17]);
}

// Tier 6 (64) — Great Tree: broad buttressed trunk, rich three-blob deep-pine clover canopy.
function buildGreatTree(root, canopy) {
  const bark = mat(0x69452a, { roughness: 0.92 });
  const leafA = mat(0x187648, { roughness: 0.8 });
  const leafB = mat(0x238d58, { roughness: 0.76 });
  const leafC = mat(0x33a86a, { roughness: 0.74 });

  addMesh(root, GEO.cyl6, bark, [0, 0.13, 0], [0, 0.2, 0], [0.24, 0.28, 0.24]);
  addMesh(root, GEO.cyl6, bark, [0, 0.49, 0], [0, 0, 0], [0.16, 0.88, 0.16]);
  addMesh(canopy, GEO.ico1, leafA, [-0.29, 1.00, 0.17], [0, 0.2, 0], [0.36, 0.29, 0.34]);
  addMesh(canopy, GEO.ico1, leafB, [0.28, 1.05, 0.12], [0.1, 1.1, 0], [0.35, 0.30, 0.34]);
  addMesh(canopy, GEO.ico1, leafC, [0.0, 1.34, -0.16], [0, 0.6, 0.1], [0.39, 0.34, 0.37]);
}

// Tier 7 (128) — Grand Tree: tall sculpted trunk with open visible branches + flat aqua-jade pagoda pads.
function buildGrandTree(root, canopy) {
  const bark = mat(0x5c3c26, { roughness: 0.92 });
  const leafLow = mat(0x1d7880, { roughness: 0.78 });
  const leafMid = mat(0x359ea1, { roughness: 0.75 });
  const leafHigh = mat(0x73d1c7, { roughness: 0.72 });

  addMesh(root, GEO.cyl7, bark, [0, 0.15, 0], [0, 0, 0], [0.25, 0.30, 0.25]);
  addMesh(root, GEO.cyl6, bark, [0, 0.69, 0], [0, 0.2, 0], [0.155, 1.24, 0.155]);
  // Prominent open angled branches
  addMesh(root, GEO.cyl5, bark, [-0.25, 0.98, 0.10], [0.16, 0, 0.78], [0.068, 0.56, 0.068]);
  addMesh(root, GEO.cyl5, bark, [0.26, 1.04, -0.08], [-0.16, 0, -0.74], [0.068, 0.56, 0.068]);
  addMesh(root, GEO.cyl5, bark, [0.02, 1.06, 0.23], [0.72, 0, -0.08], [0.06, 0.48, 0.06]);

  // Sculpted flat-layered umbrella canopy pads in cool aqua-jade
  addMesh(canopy, GEO.dodeca, leafLow, [-0.37, 1.24, 0.16], [0, 0.4, 0], [0.37, 0.17, 0.35]);
  addMesh(canopy, GEO.dodeca, leafLow, [0.37, 1.30, -0.12], [0, 1.0, 0], [0.37, 0.17, 0.35]);
  addMesh(canopy, GEO.ico1, leafMid, [0.0, 1.53, 0.06], [0, 0.2, 0], [0.53, 0.20, 0.49]);
  addMesh(canopy, GEO.dodeca, leafHigh, [0.02, 1.81, -0.02], [0.1, 0.7, 0], [0.35, 0.17, 0.33]);
}

// Tier 8 (256) — Elder Tree: gnarled twisting roots & trunk, wide golden-olive crown with warm lantern blossoms.
function buildElderTree(root, canopy) {
  const bark = mat(0x523929, { roughness: 0.94 });
  const leafBase = mat(0x6e8c35, { roughness: 0.8 });
  const leafWarm = mat(0x9fb842, { roughness: 0.75 });
  const leafGold = mat(0xcad152, { roughness: 0.72 });
  const berry = mat(0xffc759, { roughness: 0.5, emissive: 0xd98a18, emissiveIntensity: 0.3 });

  addMesh(root, GEO.cyl5, bark, [-0.17, 0.11, 0.12], [0.3, 0, 0.46], [0.11, 0.33, 0.11]);
  addMesh(root, GEO.cyl5, bark, [0.18, 0.11, -0.10], [-0.25, 0, -0.46], [0.11, 0.33, 0.11]);
  addMesh(root, GEO.cyl6, bark, [-0.03, 0.36, 0.02], [0.06, 0, 0.14], [0.19, 0.68, 0.19]);
  addMesh(root, GEO.cyl6, bark, [0.04, 0.82, -0.02], [-0.08, 0.4, -0.14], [0.15, 0.64, 0.15]);
  addMesh(root, GEO.cyl5, bark, [-0.27, 1.02, 0.10], [0.12, 0, 0.78], [0.075, 0.56, 0.075]);
  addMesh(root, GEO.cyl5, bark, [0.28, 1.08, -0.08], [-0.18, 0, -0.74], [0.075, 0.56, 0.075]);

  addMesh(canopy, GEO.ico1, leafBase, [-0.37, 1.24, 0.14], [0, 0.3, 0], [0.39, 0.24, 0.36]);
  addMesh(canopy, GEO.ico1, leafBase, [0.37, 1.28, -0.12], [0, 1.2, 0], [0.39, 0.24, 0.36]);
  addMesh(canopy, GEO.ico1, leafWarm, [0.0, 1.49, 0.02], [0, 0.5, 0], [0.55, 0.28, 0.51]);
  addMesh(canopy, GEO.dodeca, leafGold, [0.04, 1.77, -0.02], [0.1, 0.9, 0], [0.37, 0.22, 0.35]);
  // Tiny warm golden elder-blossom orbs tucked under the boughs
  addMesh(canopy, GEO.octa, berry, [-0.38, 1.05, 0.20], [0, 0.4, 0], [0.055, 0.07, 0.055], false);
  addMesh(canopy, GEO.octa, berry, [0.36, 1.09, -0.16], [0, 0.9, 0], [0.055, 0.07, 0.055], false);
}

// Tier 9 (512) — Ancient Tree: massive moss-draped trunk, mossy stones, sage-teal multi-layer crown.
function buildAncientTree(root, canopy) {
  const bark = mat(0x4a392e, { roughness: 0.95 });
  const rock = mat(0x767c72, { roughness: 0.92 });
  const moss = mat(0x63ad73, { roughness: 0.8 });
  const leafDark = mat(0x2c695c, { roughness: 0.8 });
  const leafMid = mat(0x478e79, { roughness: 0.76 });
  const leafSage = mat(0x88caa6, { roughness: 0.72 });

  addMesh(root, GEO.dodeca, rock, [-0.29, 0.10, 0.20], [0.2, 0.4, 0], [0.20, 0.14, 0.17]);
  addMesh(root, GEO.dodeca, moss, [-0.29, 0.18, 0.20], [0.1, 0.6, 0], [0.14, 0.06, 0.12]);
  addMesh(root, GEO.dodeca, rock, [0.28, 0.09, -0.18], [0, 0.8, 0.2], [0.18, 0.12, 0.17]);
  addMesh(root, GEO.cyl7, bark, [0, 0.18, 0], [0, 0, 0], [0.34, 0.38, 0.34]);
  addMesh(root, GEO.cyl7, bark, [0, 0.74, 0], [0, 0.3, 0], [0.23, 1.15, 0.23]);
  addMesh(root, GEO.cyl5, bark, [-0.31, 1.12, 0.12], [0.18, 0, 0.82], [0.09, 0.62, 0.09]);
  addMesh(root, GEO.cyl5, bark, [0.32, 1.16, -0.12], [-0.18, 0, -0.82], [0.09, 0.62, 0.09]);
  addMesh(root, GEO.cyl5, bark, [0.0, 1.18, 0.27], [0.76, 0, 0], [0.08, 0.52, 0.08]);

  // Hanging moss drapes
  addMesh(canopy, GEO.cone5, moss, [-0.47, 1.15, 0.16], [Math.PI, 0, 0], [0.062, 0.34, 0.062]);
  addMesh(canopy, GEO.cone5, moss, [0.45, 1.20, -0.14], [Math.PI, 0.5, 0], [0.062, 0.36, 0.062]);
  addMesh(canopy, GEO.cone5, moss, [0.12, 1.22, 0.39], [Math.PI, 0.2, 0], [0.055, 0.30, 0.055]);

  addMesh(canopy, GEO.ico1, leafDark, [-0.37, 1.40, 0.14], [0, 0.2, 0], [0.43, 0.25, 0.39]);
  addMesh(canopy, GEO.ico1, leafDark, [0.37, 1.44, -0.14], [0, 0.9, 0], [0.43, 0.25, 0.39]);
  addMesh(canopy, GEO.ico1, leafMid, [0.0, 1.69, 0.04], [0, 0.4, 0], [0.59, 0.30, 0.56]);
  addMesh(canopy, GEO.ico1, leafSage, [0.0, 2.04, -0.02], [0.1, 0.8, 0], [0.41, 0.26, 0.39]);
}

// Tier 10 (1024) — Giant Sequoia: towering fluted crimson redwood trunk + dramatic 5-tier conifer spire.
function buildGiantSequoia(root, canopy) {
  const redwood = mat(0xa63f26, { roughness: 0.86 });
  const redwoodDeep = mat(0x7e2d1a, { roughness: 0.9 });
  const conifer = mat(0x255e3e, { roughness: 0.78 });
  const bronze = mat(0xc95b2b, { roughness: 0.74 });
  const amberLeaf = mat(0xe3843c, { roughness: 0.72 });

  // Buttress ribs around massive redwood base
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    addMesh(
      root,
      GEO.cyl5,
      redwoodDeep,
      [Math.cos(a) * 0.21, 0.22, Math.sin(a) * 0.21],
      [Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22],
      [0.14, 0.48, 0.14]
    );
  }
  addMesh(root, GEO.cyl7, redwoodDeep, [0, 0.26, 0], [0, 0, 0], [0.35, 0.52, 0.35]);
  addMesh(root, GEO.cyl7, redwood, [0, 1.02, 0], [0, 0.25, 0], [0.25, 1.60, 0.25]);
  addMesh(root, GEO.cyl6, redwood, [0, 1.78, 0], [0, 0.5, 0], [0.15, 0.88, 0.15]);

  // Lofty 5-tier stacked redwood / conifer spire
  addMesh(canopy, GEO.cone7, conifer, [0, 1.54, 0], [0, 0.1, 0], [0.64, 0.52, 0.64]);
  addMesh(canopy, GEO.cone7, bronze, [0, 1.90, 0], [0, 0.55, 0], [0.56, 0.50, 0.56]);
  addMesh(canopy, GEO.cone6, conifer, [0, 2.24, 0], [0, 1.0, 0], [0.46, 0.46, 0.46]);
  addMesh(canopy, GEO.cone6, amberLeaf, [0, 2.55, 0], [0, 1.4, 0], [0.35, 0.44, 0.35]);
  addMesh(canopy, GEO.cone5, amberLeaf, [0, 2.84, 0], [0, 0.2, 0], [0.21, 0.36, 0.21]);
}

// Tier 11 (2048) — World Tree: radiant golden-ivory trunk, glowing canopy, spinning sacred halo & ground aura.
function buildWorldTree(root, canopy, isMythic = false) {
  const trunkMat = mat(0xd8b882, {
    roughness: 0.7,
    emissive: 0x422b08,
    emissiveIntensity: 0.26,
  });
  const veinMat = mat(0xffcf4f, {
    roughness: 0.38,
    emissive: 0xffa61f,
    emissiveIntensity: 0.72,
  });
  const glowGold = mat(0xffce47, {
    roughness: 0.52,
    emissive: 0xea9616,
    emissiveIntensity: 0.42,
  });
  const glowMint = mat(isMythic ? 0xc29eff : 0x5be5aa, {
    roughness: 0.52,
    emissive: isMythic ? 0x8d5eff : 0x24bf7c,
    emissiveIntensity: 0.38,
  });
  const glowCore = mat(0xffe47a, {
    roughness: 0.38,
    emissive: 0xffb829,
    emissiveIntensity: 0.62,
  });
  const haloMat = mat(0xffe680, {
    roughness: 0.3,
    emissive: 0xffba2e,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.88,
  });
  const groundAuraMat = mat(0xffd966, {
    roughness: 0.4,
    emissive: 0xffb830,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.48,
  });

  // Subtle glowing sacred rune-ring on the plot surface around the roots
  const groundAura = addMesh(
    root,
    GEO.ring,
    groundAuraMat,
    [0, 0.015, 0],
    [-Math.PI / 2, 0, 0],
    [1, 1, 1],
    false
  );
  groundAura.material.side = THREE.DoubleSide;

  // Sculpted glowing roots & tall sacred trunk
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.35;
    addMesh(
      root,
      GEO.cyl5,
      trunkMat,
      [Math.cos(ang) * 0.23, 0.16, Math.sin(ang) * 0.23],
      [Math.sin(ang) * 0.46, 0, -Math.cos(ang) * 0.46],
      [0.125, 0.46, 0.125]
    );
  }
  addMesh(root, GEO.cyl7, trunkMat, [0, 0.80, 0], [0, 0.2, 0], [0.27, 1.58, 0.27]);
  addMesh(root, GEO.octa, veinMat, [0, 0.88, 0], [0, 0.4, 0], [0.17, 0.56, 0.17], false);

  // Sweeping luminous boughs
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.6;
    addMesh(
      root,
      GEO.cyl5,
      trunkMat,
      [Math.cos(ang) * 0.29, 1.40, Math.sin(ang) * 0.29],
      [Math.sin(ang) * 0.72, 0, -Math.cos(ang) * 0.72],
      [0.085, 0.70, 0.085]
    );
  }

  // Radiant layered World Tree crown
  addMesh(canopy, GEO.ico1, glowMint, [-0.43, 1.74, 0.22], [0, 0.2, 0], [0.43, 0.26, 0.41]);
  addMesh(canopy, GEO.ico1, glowMint, [0.43, 1.78, -0.22], [0, 1.1, 0], [0.43, 0.26, 0.41]);
  addMesh(canopy, GEO.ico1, glowGold, [-0.20, 1.90, -0.35], [0, 0.7, 0], [0.45, 0.28, 0.43]);
  addMesh(canopy, GEO.ico1, glowGold, [0.22, 1.88, 0.35], [0, 1.5, 0], [0.45, 0.28, 0.43]);
  addMesh(canopy, GEO.ico1, glowGold, [0, 2.15, 0], [0, 0.4, 0], [0.64, 0.37, 0.62]);
  addMesh(canopy, GEO.ico1, glowCore, [0, 2.56, 0], [0.1, 0.8, 0], [0.43, 0.30, 0.41]);

  // Rotating sacred crown halo + floating crystal star at apex (animated in board.js)
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 3.00, 0);
  addMesh(haloGroup, GEO.octa, glowCore, [0, 0.04, 0], [0, 0.4, 0], [0.14, 0.24, 0.14], false);
  addMesh(haloGroup, GEO.torus6, haloMat, [0, -0.02, 0], [Math.PI / 2 - 0.18, 0, 0], [0.42, 0.42, 0.42], false);
  canopy.add(haloGroup);
  root.userData.halo = haloGroup;

  // Warm soft point light illuminating surrounding grove plots
  const light = new THREE.PointLight(0xffd778, 2.1, 6.2, 1.7);
  light.position.set(0, 2.25, 0);
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
