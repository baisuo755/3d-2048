// Three.js scene setup: "Sunlit Sky-Sanctuary" diorama lighting, painter-style sky
// dome with warm off-axis solar glow, multi-altitude sunlit clouds, portrait-aware
// camera framing, and conflict-free OrbitControls touch mapping.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0xadd5ee);
  scene.fog = new THREE.FogExp2(fogColor, 0.0052);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 340);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.25, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.minDistance = 6.2;
  controls.maxDistance = 28;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = 1.38;
  // Touch default ("slide" mode): single finger belongs to 2048 swipes so
  // OrbitControls never fights tile moves; two fingers smoothly orbit & zoom.
  // Desktop mouse drag continues to orbit via controls.mouseButtons.LEFT.
  controls.touches.ONE = null;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  function setTouchMode(mode) {
    controls.touches.ONE = mode === 'orbit' ? THREE.TOUCH.ROTATE : null;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  }

  // Sunlit sky-sanctuary lighting rig:
  // Warm golden sun key + crisp sky/meadow hemisphere + cool azure rim + soft rock under-fill.
  const hemi = new THREE.HemisphereLight(0xe4f4ff, 0x90ab82, 0.88);
  scene.add(hemi);

  const isCompactDevice =
    (typeof window !== 'undefined' && window.innerWidth <= 680) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && window.innerWidth <= 900);

  const sun = new THREE.DirectionalLight(0xfff0cc, 2.55);
  sun.position.set(9.5, 14.5, 6.2);
  sun.castShadow = true;
  // 1024x1024 shadows on phones keep fill cost low without visible loss on small screens;
  // desktop keeps full 2048x2048 crisp shadows.
  const shadowSize = isCompactDevice ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const shadowSpan = 8.4;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 38;
  sun.shadow.bias = -0.00032;
  sun.shadow.normalBias = 0.024;
  scene.add(sun, sun.target);

  const rim = new THREE.DirectionalLight(0x9fd0f8, 0.58);
  rim.position.set(-10, 7.5, -8.5);
  scene.add(rim);

  const underFill = new THREE.DirectionalLight(0x9acae8, 0.62);
  underFill.position.set(4.5, -11, 8.5);
  scene.add(underFill);

  // Painterly cerulean sky dome with a soft warm solar bloom off to the right
  // (keeps cool crisp azure right behind the golden World Tree so it pops cleanly).
  const sunDirNorm = new THREE.Vector3(0.72, 0.34, -0.60).normalize();
  const skyGeo = new THREE.SphereGeometry(230, 36, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0x2565a8) },
      uMid: { value: new THREE.Color(0x64acd9) },
      uHorizon: { value: new THREE.Color(0xc5e4f5) },
      uBottom: { value: new THREE.Color(0x5b8fb8) },
      uSunGlow: { value: new THREE.Color(0xffe9bf) },
      uSunDir: { value: sunDirNorm },
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
      uniform vec3 uSunGlow;
      uniform vec3 uSunDir;
      varying vec3 vPos;
      void main() {
        vec3 dir = normalize(vPos);
        float h = dir.y;
        vec3 col;
        if (h > -0.16) {
          float up = clamp((h + 0.16) / 1.16, 0.0, 1.0);
          vec3 low = mix(uHorizon, uMid, smoothstep(0.0, 0.34, up));
          col = mix(low, uZenith, pow(up, 0.72));
        } else {
          float dn = clamp((-h - 0.16) / 0.66, 0.0, 1.0);
          col = mix(uHorizon, uBottom, smoothstep(0.0, 1.0, dn));
        }
        // Subtle warm solar halo off to one flank for atmospheric depth.
        float sunDot = max(dot(dir, uSunDir), 0.0);
        float halo = pow(sunDot, 7.0) * 0.24 + pow(sunDot, 36.0) * 0.28;
        col = mix(col, uSunGlow, clamp(halo, 0.0, 0.55));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Two-altitude sunlit cumulus clouds: upper sunlit puffs + lower distant cloud sea
  // positioned gracefully on the flanks so none clip top-center or hide behind HUD.
  const cloudGroup = new THREE.Group();
  const cloudUpperMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf8,
    emissive: 0xdeeeff,
    emissiveIntensity: 0.3,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.9,
  });
  const cloudLowerMat = new THREE.MeshStandardMaterial({
    color: 0xe6f3fc,
    emissive: 0xb7daf2,
    emissiveIntensity: 0.22,
    roughness: 0.94,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.52,
  });
  const cloudPuffGeo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = [];
  const cloudSpecs = [
    // Upper sunlit flank clouds
    { angle: 0.32, radius: 46, y: 1.6, scale: 2.2, speed: 0.008, lower: false },
    { angle: 1.52, radius: 52, y: 2.3, scale: 2.6, speed: 0.006, lower: false },
    { angle: 2.72, radius: 48, y: -2.4, scale: 2.3, speed: 0.009, lower: false },
    { angle: 4.52, radius: 54, y: -2.0, scale: 2.5, speed: 0.006, lower: false },
    { angle: 5.32, radius: 46, y: -1.6, scale: 2.1, speed: 0.007, lower: false },
    // Lower distant misty cloud bank deep beneath the sanctuary for vertical scale
    { angle: 0.9, radius: 34, y: -11.5, scale: 3.6, speed: 0.005, lower: true },
    { angle: 2.4, radius: 38, y: -13.0, scale: 4.2, speed: 0.004, lower: true },
    { angle: 4.1, radius: 36, y: -12.0, scale: 3.8, speed: 0.005, lower: true },
    { angle: 5.7, radius: 40, y: -13.5, scale: 4.0, speed: 0.004, lower: true },
  ];
  for (const spec of cloudSpecs) {
    const cluster = new THREE.Group();
    const mat = spec.lower ? cloudLowerMat : cloudUpperMat;
    const offsets = [
      [0, 0, 0, 1.05, 0.48, 0.78],
      [-0.95, -0.08, 0.18, 0.74, 0.38, 0.64],
      [0.95, -0.06, -0.14, 0.80, 0.40, 0.66],
      [0.18, 0.24, 0.08, 0.64, 0.36, 0.58],
      [-0.42, 0.16, -0.18, 0.52, 0.32, 0.50],
    ];
    for (const [ox, oy, oz, sx, sy, sz] of offsets) {
      const puff = new THREE.Mesh(cloudPuffGeo, mat);
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

  const defaultTarget = new THREE.Vector3(0, 0.2, 0);
  let lastAspect = 1;

  function frameDefault(force = false) {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const aspect = w / h;
    lastAspect = aspect;
    // Pull back on narrow portrait viewports (e.g. 390x844) so the entire
    // floating island sits comfortably inside the frame with generous sky margin.
    const portraitScale = aspect < 1 ? Math.min(2.26, 1.24 / Math.max(aspect, 0.44)) : 1.0;
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
    const dprCap = w <= 680 ? 1.75 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h);
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
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
    setTouchMode,
    tick,
    dispose() {
      window.removeEventListener('resize', resize);
      skyGeo.dispose();
      skyMat.dispose();
      cloudPuffGeo.dispose();
      cloudUpperMat.dispose();
      cloudLowerMat.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
