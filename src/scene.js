// Three.js scene setup: renderer, portrait-aware camera, orbit controls,
// sunlit lighting, gradient sky dome, and drifting low-poly clouds.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0xcce0ea);
  scene.fog = new THREE.FogExp2(fogColor, 0.0085);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 320);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6.2;
  controls.maxDistance = 24;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = 1.38;

  // Warm sunlit botanical lighting: cool sky + warm moss bounce + crisp sun.
  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x6b7c54, 0.78);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d4, 2.45);
  sun.position.set(8.5, 14.5, 6.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowSpan = 8.2;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 36;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  // Cool sky rim light from opposite angle to give canopies crisp low-poly separation.
  const rim = new THREE.DirectionalLight(0xa4d0f5, 0.5);
  rim.position.set(-9, 7, -8);
  scene.add(rim);

  // Gradient sunlit sky dome (procedural shader, no external textures).
  // Horizon is shifted slightly downward so a 3/4 top-down camera still frames
  // warm sunlit mist and airy blue sky around the floating island.
  const skyGeo = new THREE.SphereGeometry(220, 32, 18);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0x4a8bc2) },
      uMid: { value: new THREE.Color(0x9bd0e8) },
      uHorizon: { value: new THREE.Color(0xf4ecdb) },
      uBottom: { value: new THREE.Color(0x8bb9d4) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 col;
        if (h > -0.18) {
          float up = clamp((h + 0.18) / 1.18, 0.0, 1.0);
          vec3 low = mix(uHorizon, uMid, smoothstep(0.0, 0.34, up));
          col = mix(low, uZenith, pow(up, 0.72));
        } else {
          float dn = clamp((-h - 0.18) / 0.62, 0.0, 1.0);
          col = mix(uHorizon, uBottom, smoothstep(0.0, 1.0, dn));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Subtle distant low-poly clouds drifting lazily around the sky.
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.85,
  });
  const cloudPuffGeo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = [];
  const cloudSpecs = [
    { angle: 0.4, radius: 34, y: 1.5, scale: 2.6, speed: 0.012 },
    { angle: 1.5, radius: 40, y: 3.5, scale: 3.2, speed: 0.009 },
    { angle: 2.8, radius: 36, y: -1.5, scale: 2.7, speed: 0.014 },
    { angle: 4.0, radius: 42, y: 2.0, scale: 3.4, speed: 0.008 },
    { angle: 5.2, radius: 35, y: -2.2, scale: 2.5, speed: 0.011 },
  ];
  for (const spec of cloudSpecs) {
    const cluster = new THREE.Group();
    const offsets = [
      [0, 0, 0, 1.0, 0.55, 0.8],
      [-0.95, -0.1, 0.2, 0.72, 0.44, 0.65],
      [0.95, -0.08, -0.15, 0.78, 0.46, 0.68],
      [0.2, 0.28, 0.1, 0.62, 0.42, 0.6],
    ];
    for (const [ox, oy, oz, sx, sy, sz] of offsets) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set(ox, oy, oz);
      puff.scale.set(sx, sy, sz);
      cluster.add(puff);
    }
    cluster.scale.setScalar(spec.scale);
    cluster.position.set(
      Math.cos(spec.angle) * spec.radius,
      spec.y,
      Math.sin(spec.angle) * spec.radius
    );
    cluster.lookAt(0, spec.y, 0);
    cloudGroup.add(cluster);
    clouds.push({ mesh: cluster, ...spec });
  }
  scene.add(cloudGroup);

  const defaultTarget = new THREE.Vector3(0, 0.25, 0);
  let lastAspect = 1;

  function frameDefault(force = false) {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const aspect = w / h;
    lastAspect = aspect;
    // Pull back gracefully on narrow portrait viewports (e.g. 390px mobile)
    // so the whole 4x4 floating island fits with generous sky margin.
    const portraitScale = aspect < 1 ? Math.min(1.88, 1.06 / Math.max(aspect, 0.44)) : 1.0;
    const baseX = 8.2;
    const baseY = 6.9;
    const baseZ = 9.9;
    camera.position.set(baseX * portraitScale, baseY * portraitScale, baseZ * portraitScale);
    controls.target.copy(defaultTarget);
    if (force) {
      controls.update();
    }
  }

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const newAspect = w / h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
    // Re-frame gently if switching between portrait and landscape breakpoints.
    if ((lastAspect < 1) !== (newAspect < 1)) {
      frameDefault(true);
    }
    lastAspect = newAspect;
  }

  resize();
  frameDefault(true);
  window.addEventListener('resize', resize);

  function tick(dt, reducedMotion) {
    if (!reducedMotion) {
      for (const c of clouds) {
        c.angle += c.speed * dt;
        c.mesh.position.x = Math.cos(c.angle) * c.radius;
        c.mesh.position.z = Math.sin(c.angle) * c.radius;
        c.mesh.lookAt(0, c.y, 0);
      }
    }
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    defaultTarget,
    frameDefault,
    tick,
    dispose() {
      window.removeEventListener('resize', resize);
      skyGeo.dispose();
      skyMat.dispose();
      cloudPuffGeo.dispose();
      cloudMat.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
