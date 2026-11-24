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
  const fogColor = new THREE.Color(0xaed4ec);
  scene.fog = new THREE.FogExp2(fogColor, 0.0065);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 320);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.25, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
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

  // Warm sunlit botanical lighting: crisp sky + warm meadow bounce + golden sun.
  const hemi = new THREE.HemisphereLight(0xdff2ff, 0x8ca684, 0.86);
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

  // Cool sky rim light + soft sky under-fill so floating island cliffs stay sculpted.
  const rim = new THREE.DirectionalLight(0xa4d0f5, 0.52);
  rim.position.set(-9, 7, -8);
  scene.add(rim);

  const underFill = new THREE.DirectionalLight(0x9ec9e8, 0.55);
  underFill.position.set(4, -10, 8);
  scene.add(underFill);

  // Gradient sunlit azure sky dome: cool airy blue behind the island so the
  // golden World Tree and fireflies pop cleanly without washing into the horizon.
  const skyGeo = new THREE.SphereGeometry(220, 32, 18);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0x2d6da8) },
      uMid: { value: new THREE.Color(0x6db0dc) },
      uHorizon: { value: new THREE.Color(0xc2e1f4) },
      uBottom: { value: new THREE.Color(0x6a9cc0) },
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
        if (h > -0.16) {
          float up = clamp((h + 0.16) / 1.16, 0.0, 1.0);
          vec3 low = mix(uHorizon, uMid, smoothstep(0.0, 0.36, up));
          col = mix(low, uZenith, pow(up, 0.72));
        } else {
          float dn = clamp((-h - 0.16) / 0.64, 0.0, 1.0);
          col = mix(uHorizon, uBottom, smoothstep(0.0, 1.0, dn));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Distant low-poly clouds positioned on the flanks (never clipped dead-center
  // at the top edge or colliding with the mobile HUD), with warm underside bounce.
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdceeff,
    emissiveIntensity: 0.24,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.86,
  });
  const cloudPuffGeo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = [];
  const cloudSpecs = [
    { angle: 0.35, radius: 46, y: 1.8, scale: 2.3, speed: 0.009 },
    { angle: 1.55, radius: 52, y: 2.6, scale: 2.7, speed: 0.007 },
    { angle: 2.75, radius: 48, y: -2.6, scale: 2.4, speed: 0.01 },
    { angle: 4.55, radius: 52, y: -2.4, scale: 2.5, speed: 0.006 },
    { angle: 5.35, radius: 46, y: -1.8, scale: 2.2, speed: 0.008 },
  ];
  for (const spec of cloudSpecs) {
    const cluster = new THREE.Group();
    const offsets = [
      [0, 0, 0, 1.0, 0.52, 0.78],
      [-0.95, -0.08, 0.2, 0.72, 0.42, 0.65],
      [0.95, -0.06, -0.15, 0.78, 0.44, 0.68],
      [0.2, 0.25, 0.1, 0.62, 0.38, 0.6],
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

  const defaultTarget = new THREE.Vector3(0, 0.2, 0);
  let lastAspect = 1;

  function frameDefault(force = false) {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    const aspect = w / h;
    lastAspect = aspect;
    // Pull back on narrow portrait viewports (e.g. 390x844) so all 8 corners
    // of the floating island sit inside the frame with generous sky margin.
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
    setTouchMode,
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
