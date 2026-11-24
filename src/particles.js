// Particle systems for Grove:
// 1. Leaf bursts when two matching trees merge and grow.
// 2. Ambient + celebration golden fireflies around the World Tree (2048).
// All particles respect prefers-reduced-motion (dropped when reduced).

import * as THREE from 'three';

const LEAF_GEO = new THREE.OctahedronGeometry(0.085, 0);
const FIREFLY_GEO = new THREE.IcosahedronGeometry(0.052, 0);

export function createParticles(scene) {
  const leafGroup = new THREE.Group();
  const fireflyGroup = new THREE.Group();
  scene.add(leafGroup, fireflyGroup);

  const leaves = [];
  const winFireflies = [];
  const ambientFireflies = [];
  let worldTreeAnchors = [];
  let reducedMotion = false;

  const fireflyMat = new THREE.MeshBasicMaterial({
    color: 0xffe985,
    transparent: true,
    opacity: 0.92,
  });

  function clear() {
    for (const p of leaves) {
      leafGroup.remove(p.mesh);
      p.mesh.material.dispose();
    }
    leaves.length = 0;

    for (const f of winFireflies) {
      fireflyGroup.remove(f.mesh);
    }
    winFireflies.length = 0;
  }

  function rebuildAmbientFireflies() {
    for (const f of ambientFireflies) {
      fireflyGroup.remove(f.mesh);
    }
    ambientFireflies.length = 0;

    if (reducedMotion || worldTreeAnchors.length === 0) return;

    const perTree = 14;
    for (const anchor of worldTreeAnchors) {
      for (let i = 0; i < perTree; i++) {
        const mesh = new THREE.Mesh(FIREFLY_GEO, fireflyMat);
        fireflyGroup.add(mesh);
        ambientFireflies.push({
          mesh,
          anchor,
          angle: (i / perTree) * Math.PI * 2 + Math.random() * 0.4,
          radius: 0.55 + Math.random() * 0.72,
          baseY: 1.15 + Math.random() * 1.95,
          speed: 0.65 + Math.random() * 0.75,
          bobAmp: 0.14 + Math.random() * 0.16,
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
    rebuildAmbientFireflies();
  }

  function spawnLeafBurst(x, y, z, colorHex = 0x6ac94a, count = 16) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.75,
        flatShading: true,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(LEAF_GEO, mat);
      mesh.scale.set(1.15, 0.35, 0.75);
      mesh.position.set(x, y, z);
      leafGroup.add(mesh);

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = 1.1 + Math.random() * 1.5;
      leaves.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 1.6 + Math.random() * 1.7,
        vz: Math.sin(angle) * speed,
        rx: (Math.random() - 0.5) * 9,
        ry: (Math.random() - 0.5) * 9,
        rz: (Math.random() - 0.5) * 9,
        age: 0,
        life: 0.55 + Math.random() * 0.45,
      });
    }
  }

  function triggerWinFireflies(x, y, z) {
    if (reducedMotion) return;
    const count = 34;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(FIREFLY_GEO, fireflyMat);
      const angle = Math.random() * Math.PI * 2;
      const rad = 0.25 + Math.random() * 0.7;
      mesh.position.set(x + Math.cos(angle) * rad, y + 0.5 + Math.random() * 1.2, z + Math.sin(angle) * rad);
      fireflyGroup.add(mesh);
      winFireflies.push({
        mesh,
        vx: Math.cos(angle) * (0.4 + Math.random() * 0.9),
        vy: 1.1 + Math.random() * 1.8,
        vz: Math.sin(angle) * (0.4 + Math.random() * 0.9),
        swirl: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.6),
        age: 0,
        life: 1.6 + Math.random() * 1.2,
      });
    }
  }

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
      p.vy -= 4.8 * dt;
      p.vx *= Math.max(0, 1 - 1.6 * dt);
      p.vz *= Math.max(0, 1 - 1.6 * dt);
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rx * dt;
      p.mesh.rotation.y += p.ry * dt;
      p.mesh.rotation.z += p.rz * dt;
      p.mesh.material.opacity = 1 - t * t;
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
      f.mesh.position.x += (f.vx + Math.sin(elapsed * 3 + i) * 0.35) * dt;
      f.mesh.position.y += f.vy * (1 - t * 0.45) * dt;
      f.mesh.position.z += (f.vz + Math.cos(elapsed * 3 + i) * 0.35) * dt;
      const pulse = (1 - t) * (0.75 + 0.35 * Math.sin(elapsed * 10 + i));
      f.mesh.scale.setScalar(Math.max(0.01, pulse * 1.25));
    }

    // Update ambient orbiting fireflies around active World Trees.
    for (const f of ambientFireflies) {
      f.angle += f.speed * dt;
      const pulse = 0.65 + 0.45 * Math.sin(elapsed * 4.5 + f.phase);
      f.mesh.position.set(
        f.anchor.x + Math.cos(f.angle) * f.radius,
        f.anchor.y + f.baseY + Math.sin(elapsed * f.bobFreq + f.phase) * f.bobAmp,
        f.anchor.z + Math.sin(f.angle) * f.radius
      );
      f.mesh.scale.setScalar(pulse);
    }
  }

  function dispose() {
    clear();
    for (const f of ambientFireflies) {
      fireflyGroup.remove(f.mesh);
    }
    ambientFireflies.length = 0;
    fireflyMat.dispose();
    scene.remove(leafGroup, fireflyGroup);
  }

  return {
    spawnLeafBurst,
    triggerWinFireflies,
    setWorldTreePositions,
    setReducedMotion,
    clear,
    tick,
    dispose,
  };
}
