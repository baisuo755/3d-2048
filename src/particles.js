// Particle systems for Grove:
// 1. Multi-tone fluttering leaf bursts + subtle golden sparkles on high-tier merges.
// 2. Expanding plot bloom rings on merge and golden island shockwave on World Tree win.
// 3. Ambient & celebration fireflies around the World Tree + gentle meadow pollen motes.
// 4. Waterfall mist puffs at the sanctuary edge.
// All particles respect prefers-reduced-motion (dropped when reduced).

import * as THREE from 'three';

const LEAF_GEO = new THREE.OctahedronGeometry(0.088, 0);
const FIREFLY_GEO = new THREE.IcosahedronGeometry(0.075, 0);
const RING_GEO = new THREE.RingGeometry(0.32, 0.44, 24);
const MIST_GEO = new THREE.IcosahedronGeometry(0.11, 0);
const POLLEN_GEO = new THREE.OctahedronGeometry(0.032, 0);

export function createParticles(scene) {
  const leafGroup = new THREE.Group();
  const fireflyGroup = new THREE.Group();
  const ringGroup = new THREE.Group();
  const ambientGroup = new THREE.Group();
  scene.add(leafGroup, fireflyGroup, ringGroup, ambientGroup);

  const leaves = [];
  const winFireflies = [];
  const ambientFireflies = [];
  const rings = [];
  const mistPuffs = [];
  const pollenMotes = [];
  let worldTreeAnchors = [];
  let waterfallOrigin = null;
  let reducedMotion = false;
  let compactMode = false;

  const fireflyMat = new THREE.MeshBasicMaterial({
    color: 0xffd24a,
    transparent: true,
    opacity: 0.96,
  });

  const fireflyMintMat = new THREE.MeshBasicMaterial({
    color: 0x8ef5c4,
    transparent: true,
    opacity: 0.9,
  });

  const pollenMat = new THREE.MeshBasicMaterial({
    color: 0xfff6cf,
    transparent: true,
    opacity: 0.52,
  });

  function initPollen() {
    for (const p of pollenMotes) ambientGroup.remove(p.mesh);
    pollenMotes.length = 0;
    if (reducedMotion) return;
    const count = compactMode ? 10 : 16;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(POLLEN_GEO, pollenMat);
      ambientGroup.add(mesh);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const rad = 1.0 + Math.random() * 3.6;
      pollenMotes.push({
        mesh,
        baseX: Math.cos(angle) * rad,
        baseY: 0.45 + Math.random() * 2.2,
        baseZ: Math.sin(angle) * rad,
        phase: Math.random() * Math.PI * 2,
        speed: 0.45 + Math.random() * 0.55,
      });
    }
  }

  function setWaterfallOrigin(pos) {
    waterfallOrigin = pos ? { x: pos.x, y: pos.y, z: pos.z } : null;
  }

  function clear() {
    for (const p of leaves) {
      leafGroup.remove(p.mesh);
      p.mesh.material.dispose();
    }
    leaves.length = 0;

    for (const r of rings) {
      ringGroup.remove(r.mesh);
      r.mesh.material.dispose();
    }
    rings.length = 0;

    for (const f of winFireflies) {
      fireflyGroup.remove(f.mesh);
    }
    winFireflies.length = 0;

    for (const m of mistPuffs) {
      ambientGroup.remove(m.mesh);
      m.mesh.material.dispose();
    }
    mistPuffs.length = 0;
  }

  function rebuildAmbientFireflies() {
    for (const f of ambientFireflies) {
      fireflyGroup.remove(f.mesh);
    }
    ambientFireflies.length = 0;

    if (reducedMotion || worldTreeAnchors.length === 0) return;

    const perTree = compactMode ? 11 : 16;
    for (const anchor of worldTreeAnchors) {
      for (let i = 0; i < perTree; i++) {
        const mesh = new THREE.Mesh(FIREFLY_GEO, i % 4 === 0 ? fireflyMintMat : fireflyMat);
        fireflyGroup.add(mesh);
        ambientFireflies.push({
          mesh,
          anchor,
          angle: (i / perTree) * Math.PI * 2 + Math.random() * 0.4,
          radius: 0.52 + Math.random() * 0.82,
          baseY: 1.1 + Math.random() * 2.15,
          speed: 0.6 + Math.random() * 0.8,
          bobAmp: 0.14 + Math.random() * 0.18,
          bobFreq: 1.8 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  function setWorldTreePositions(positions) {
    worldTreeAnchors = positions.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    rebuildAmbientFireflies();
  }

  function setReducedMotion(flag) {
    reducedMotion = Boolean(flag);
    if (reducedMotion) {
      clear();
    }
    initPollen();
    rebuildAmbientFireflies();
  }

  function spawnMergeRing(x, y, z, colorHex = 0x6ac94a, maxScale = 2.0, life = 0.34) {
    if (reducedMotion) return;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(RING_GEO, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.025, z);
    mesh.scale.setScalar(0.55);
    ringGroup.add(mesh);
    rings.push({ mesh, age: 0, life, startScale: 0.55, maxScale });
  }

  function setCompactMode(flag) {
    const next = Boolean(flag);
    if (next === compactMode) return;
    compactMode = next;
    initPollen();
    rebuildAmbientFireflies();
  }

  function spawnLeafBurst(x, y, z, colorHex = 0x6ac94a, count = 16, sparkle = false) {
    if (reducedMotion) return;
    const scaledCount = compactMode ? Math.max(8, Math.round(count * 0.65)) : count;
    const baseCol = new THREE.Color(colorHex);
    const lightCol = baseCol.clone().offsetHSL(0.02, 0.05, 0.14);

    for (let i = 0; i < scaledCount; i++) {
      const isSparkle = sparkle && i % 4 === 0;
      const mat = new THREE.MeshStandardMaterial({
        color: isSparkle ? 0xffe478 : i % 2 === 0 ? baseCol : lightCol,
        emissive: isSparkle ? 0xffb830 : 0x000000,
        emissiveIntensity: isSparkle ? 0.7 : 0,
        roughness: isSparkle ? 0.35 : 0.72,
        flatShading: true,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(LEAF_GEO, mat);
      if (isSparkle) {
        mesh.scale.set(0.65, 0.65, 0.65);
      } else {
        mesh.scale.set(1.2, 0.32, 0.78);
      }
      mesh.position.set(x, y, z);
      leafGroup.add(mesh);

      const angle = (i / scaledCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = 1.15 + Math.random() * 1.65;
      leaves.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 1.7 + Math.random() * 1.85,
        vz: Math.sin(angle) * speed,
        rx: (Math.random() - 0.5) * 9.5,
        ry: (Math.random() - 0.5) * 9.5,
        rz: (Math.random() - 0.5) * 9.5,
        age: 0,
        life: 0.56 + Math.random() * 0.46,
      });
    }
  }

  function triggerWinFireflies(x, y, z) {
    if (reducedMotion) return;
    // Dramatic golden shockwave ring expanding across the sanctuary.
    spawnMergeRing(x, 0.16, z, 0xffd75e, 9.5, 0.95);

    const count = compactMode ? 32 : 48;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(FIREFLY_GEO, i % 4 === 0 ? fireflyMintMat : fireflyMat);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const rad = 0.22 + Math.random() * 0.85;
      mesh.position.set(x + Math.cos(angle) * rad, y + 0.35 + Math.random() * 1.3, z + Math.sin(angle) * rad);
      fireflyGroup.add(mesh);
      winFireflies.push({
        mesh,
        vx: Math.cos(angle) * (0.45 + Math.random() * 1.05),
        vy: 1.2 + Math.random() * 2.1,
        vz: Math.sin(angle) * (0.45 + Math.random() * 1.05),
        age: 0,
        life: 1.8 + Math.random() * 1.3,
      });
    }
  }

  let mistAccum = 0;

  function tick(dt, elapsed) {
    // Update fluttering leaf burst particles.
    for (let i = leaves.length - 1; i >= 0; i--) {
      const p = leaves[i];
      p.age += dt;
      if (p.age >= p.life) {
        leafGroup.remove(p.mesh);
        p.mesh.material.dispose();
        leaves.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      p.vy -= 4.7 * dt;
      p.vx *= Math.max(0, 1 - 1.55 * dt);
      p.vz *= Math.max(0, 1 - 1.55 * dt);
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rx * dt;
      p.mesh.rotation.y += p.ry * dt;
      p.mesh.rotation.z += p.rz * dt;
      p.mesh.material.opacity = 1 - t * t;
    }

    // Update expanding ground bloom rings.
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        ringGroup.remove(r.mesh);
        r.mesh.material.dispose();
        rings.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      const eased = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(r.startScale + (r.maxScale - r.startScale) * eased);
      r.mesh.material.opacity = 0.72 * (1 - t);
    }

    // Update celebration fireflies.
    for (let i = winFireflies.length - 1; i >= 0; i--) {
      const f = winFireflies[i];
      f.age += dt;
      if (f.age >= f.life) {
        fireflyGroup.remove(f.mesh);
        winFireflies.splice(i, 1);
        continue;
      }
      const t = f.age / f.life;
      f.mesh.position.x += (f.vx + Math.sin(elapsed * 3.2 + i) * 0.42) * dt;
      f.mesh.position.y += f.vy * (1 - t * 0.42) * dt;
      f.mesh.position.z += (f.vz + Math.cos(elapsed * 3.2 + i) * 0.42) * dt;
      const pulse = (1 - t) * (0.78 + 0.35 * Math.sin(elapsed * 11 + i));
      f.mesh.scale.setScalar(Math.max(0.01, pulse * 1.3));
    }

    // Update ambient orbiting fireflies around active World Trees.
    for (const f of ambientFireflies) {
      f.angle += f.speed * dt;
      const pulse = 0.68 + 0.45 * Math.sin(elapsed * 4.5 + f.phase);
      f.mesh.position.set(
        f.anchor.x + Math.cos(f.angle) * f.radius,
        f.anchor.y + f.baseY + Math.sin(elapsed * f.bobFreq + f.phase) * f.bobAmp,
        f.anchor.z + Math.sin(f.angle) * f.radius
      );
      f.mesh.scale.setScalar(pulse);
    }

    // Gentle sunlit pollen drifting above the meadow.
    if (!reducedMotion) {
      for (const m of pollenMotes) {
        m.mesh.position.set(
          m.baseX + Math.sin(elapsed * m.speed + m.phase) * 0.45,
          m.baseY + Math.cos(elapsed * m.speed * 0.8 + m.phase) * 0.22,
          m.baseZ + Math.cos(elapsed * m.speed * 0.9 + m.phase) * 0.45
        );
        m.mesh.rotation.y += dt * 1.1;
      }

      // Delicate waterfall mist puffs drifting off the waterfall cliff edge.
      if (waterfallOrigin) {
        mistAccum += dt;
        if (mistAccum >= 0.24 && mistPuffs.length < 10) {
          mistAccum = 0;
          const mMat = new THREE.MeshBasicMaterial({
            color: 0xecf9ff,
            transparent: true,
            opacity: 0.55,
          });
          const mesh = new THREE.Mesh(MIST_GEO, mMat);
          mesh.position.set(
            waterfallOrigin.x + (Math.random() - 0.5) * 0.28,
            waterfallOrigin.y,
            waterfallOrigin.z + (Math.random() - 0.5) * 0.28
          );
          ambientGroup.add(mesh);
          mistPuffs.push({
            mesh,
            vy: -0.75 - Math.random() * 0.45,
            vx: 0.16 + Math.random() * 0.14,
            vz: 0.16 + Math.random() * 0.14,
            age: 0,
            life: 1.25 + Math.random() * 0.5,
          });
        }
      }
      for (let i = mistPuffs.length - 1; i >= 0; i--) {
        const mp = mistPuffs[i];
        mp.age += dt;
        if (mp.age >= mp.life) {
          ambientGroup.remove(mp.mesh);
          mp.mesh.material.dispose();
          mistPuffs.splice(i, 1);
          continue;
        }
        const t = mp.age / mp.life;
        mp.mesh.position.x += mp.vx * dt;
        mp.mesh.position.y += mp.vy * dt;
        mp.mesh.position.z += mp.vz * dt;
        mp.mesh.scale.setScalar(0.75 + t * 1.15);
        mp.mesh.material.opacity = 0.52 * (1 - t);
      }
    }
  }

  initPollen();

  function dispose() {
    clear();
    for (const f of ambientFireflies) fireflyGroup.remove(f.mesh);
    ambientFireflies.length = 0;
    for (const m of pollenMotes) ambientGroup.remove(m.mesh);
    pollenMotes.length = 0;
    fireflyMat.dispose();
    fireflyMintMat.dispose();
    pollenMat.dispose();
    scene.remove(leafGroup, fireflyGroup, ringGroup, ambientGroup);
  }

  return {
    spawnLeafBurst,
    spawnMergeRing,
    triggerWinFireflies,
    setWorldTreePositions,
    setWaterfallOrigin,
    setReducedMotion,
    setCompactMode,
    clear,
    tick,
    dispose,
  };
}
