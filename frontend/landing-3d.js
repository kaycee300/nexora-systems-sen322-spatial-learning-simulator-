/* ============================================================
   SkillScape Landing Page — Interactive 3D Hero (Three.js r128)
   ============================================================ */

(function landing3D() {
  const canvas = document.getElementById('landingCanvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const stage = document.getElementById('landingStage');
  const width = stage.clientWidth || 560;
  const height = stage.clientHeight || 460;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x0f766e, 0.85);
  scene.add(hemi);
  const key = new THREE.PointLight(0x22d3ee, 1.3, 25);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x6366f1, 0.9, 25);
  rim.position.set(-4, -1, 4);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const palettes = [
    [0x0f766e, 0x5eead4],
    [0x6366f1, 0xa5b4fc],
    [0xf59e0b, 0xfcd34d],
    [0x06b6d4, 0x67e8f9],
    [0x8b5cf6, 0xc4b5fd],
  ];

  const build = (icon, pos, size, palette) => {
    const geo = new THREE.IcosahedronGeometry(size, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: palette[0], emissive: palette[1],
      emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.6, flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  const gems = [];
  gems.push(build(0, [-1.8, -0.6, -1.2], 0.9, palettes[0]));
  gems.push(build(1, [1.7, 0.5, -0.8], 0.75, palettes[1]));
  gems.push(build(2, [-0.4, 1.2, -1.6], 0.62, palettes[2]));
  gems.push(build(3, [0.6, -1.1, -1.4], 0.55, palettes[3]));
  gems.push(build(4, [2.2, -1.3, -1.0], 0.7, palettes[4]));

  const ringGeo = new THREE.TorusGeometry(3.4, 0.03, 10, 90);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.6;
  scene.add(ring);

  const ring2Geo = new THREE.TorusGeometry(2.4, 0.012, 8, 70);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.4 });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = -Math.PI / 2.8;
  scene.add(ring2);

  const sparks = [];
  for (let i = 0; i < 80; i++) {
    const g = new THREE.SphereGeometry(0.025, 4, 4);
    const m = new THREE.MeshBasicMaterial({ color: 0x99f6e4 });
    const s = new THREE.Mesh(g, m);
    s.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7);
    scene.add(s);
    sparks.push(s);
  }

  const label = document.getElementById('canvasMode');
  let mode = 0;
  const modes = ['Interactive 3D', 'Drag to explore'];

  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    targetX = (px - 0.5) * 0.6;
    targetY = (0.5 - py) * 0.4;
  });
  renderer.domElement.addEventListener('mouseleave', () => {
    targetX = 0; targetY = 0;
  });

  let targetX = 0, targetY = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    group.rotation.y = t * 0.28 + targetX * 0.3;
    group.rotation.x = 0.12 + targetY;
    group.rotation.z = Math.sin(t * 0.12) * 0.05;

    gems.forEach((g, i) => {
      const s = 1 + Math.sin(t * 1.4 + i * 1.2) * 0.1;
      g.scale.set(s, s, s);
      g.position.y += Math.sin(t * 0.8 + i) * 0.0006;
    });

    ring.rotation.z = t * 0.18;
    ring2.rotation.z = -t * 0.22;
    ring2.rotation.x = -Math.PI / 2.8 + Math.sin(t * 0.2) * 0.1;

    camera.position.x += (targetX * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (targetY * 0.5 - camera.position.y + 1.2) * 0.05;
    camera.lookAt(0, 0, 0);

    sparks.forEach((s, i) => {
      s.position.y += Math.sin(t * 1.2 + i * 1.7) * 0.0022;
    });

    renderer.render(scene, camera);
  }
  animate();

  setInterval(() => {
    mode = (mode + 1) % modes.length;
    if (label) label.textContent = modes[mode];
  }, 6000);

  window.addEventListener('resize', () => {
    const w = stage.clientWidth || 560;
    const h = stage.clientHeight || 460;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();