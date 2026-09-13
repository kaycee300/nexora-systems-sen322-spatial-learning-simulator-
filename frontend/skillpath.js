/* ============================================================
   SkillScape 3D Skill Path — interactive cluster network
   ============================================================ */

(function skillPath() {
  const canvas = document.getElementById('pathCanvas');
  const stage = document.getElementById('pathStage');
  const tipEl = document.getElementById('pathTip');
  if (!canvas || typeof THREE === 'undefined') return;

  const W = stage.clientWidth || 900;
  const H = 480;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 12);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);
  const key = new THREE.PointLight(0x22d3ee, 1.25, 40);
  key.position.set(5, 5, 8);
  scene.add(key);
  const fill = new THREE.PointLight(0x818cf8, 0.9, 40);
  fill.position.set(-5, -3, 6);
  scene.add(fill);

  const group = new THREE.Group();
  scene.add(group);

  /* Skill clusters — positions around a sphere */
  const CLUSTERS = [
    { key: 'electrical', color: 0xf59e0b, label: 'Electrical', skills: 5 },
    { key: 'carpentry', color: 0xd97706, label: 'Carpentry', skills: 4 },
    { key: 'culinary', color: 0xdb2777, label: 'Culinary', skills: 4 },
    { key: 'ai', color: 0x6366f1, label: 'AI & Planning', skills: 4 },
    { key: 'plumbing', color: 0x0284c7, label: 'Plumbing', skills: 3 },
    { key: 'robotics', color: 0x8b5cf6, label: 'Robotics', skills: 3 },
  ];

  const radius = 4.4;
  const phiBase = Math.PI / 5;
  const clusters = [];

  function nodeSphereMesh(color, size, rough) {
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.45, flatShading: true, emissive: color, emissiveIntensity: 0.2 })
    );
  }

  CLUSTERS.forEach((c, i) => {
    const a = (i / CLUSTERS.length) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const y = Math.sin(a * 2) * 0.8;

    const cluster = new THREE.Group();
    cluster.position.set(x, y, z);

    // main node
    const main = nodeSphereMesh(c.color, 0.75, 0.25);
    cluster.add(main);

    // orbiting mini nodes = skills
    const orbits = [];
    for (let s = 0; s < c.skills; s++) {
      const ring = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 10),
        new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 0.35 })
      );
      ring.position.set(Math.cos((s / c.skills) * Math.PI * 2) * 1.25, Math.sin((s / c.skills) * Math.PI * 2) * 1.25, 0);
      cluster.add(ring);
      orbits.push({ mesh: ring, phase: s * 1.3 });
    }

    cluster.userData = { ...c, orbits };
    group.add(cluster);
    clusters.push(cluster);
  });

  // connections between clusters
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const a = clusters[i].position;
      const b = clusters[j].position;
      const dir = b.clone().sub(a);
      const len = dir.length();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), lineMat);
      rod.position.copy(a.clone().add(b).multiplyScalar(0.5));
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      group.add(rod);
    }
  }

  // center core
  const coreGeo = new THREE.TorusGeometry(2.1, 0.02, 8, 64);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.5 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.rotation.x = Math.PI / 2.4;
  group.add(core);

  // ring
  const ringGeo = new THREE.TorusGeometry(5.4, 0.012, 8, 90);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // sparkles
  const sparks = [];
  for (let i = 0; i < 80; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0x99f6e4 }));
    s.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
    scene.add(s); sparks.push(s);
  }

  /* ---------- Interaction ---------- */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let selectedCluster = null;
  let targetRotX = 0, targetRotY = 0;

  function onMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    mouse.x = px * 2 - 1;
    mouse.y = -(py * 2 - 1);

    targetRotX += (px * 0.6 - targetRotX) * 0.06;
    targetRotY += ((0.5 - py) * 0.4 - targetRotY) * 0.06;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clusters, true);
    if (hits.length) {
      const node = hits[0].object;
      const cl = node.parent && node.parent.userData ? node.parent : node;
      const data = cl.userData;
      renderer.domElement.style.cursor = 'pointer';
      tipEl.innerHTML = `<strong>${data.label}</strong> — ${data.skills} skills in this cluster · click to open roadmap`;
      tipEl.classList.add('show');
      selectedCluster = cl;
      selectorSphere(cl);
    } else {
      renderer.domElement.style.cursor = 'default';
      tipEl.classList.remove('show');
      removeSelector();
    }
  }

  let selector = null;
  function selectorSphere(cl) {
    if (selector && selector.parent === cl) return;
    removeSelector();
    selector = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.12, wireframe: true })
    );
    cl.add(selector);
  }
  function removeSelector() {
    if (selector && selector.parent) selector.parent.remove(selector);
    selector = null;
  }

  function onLeave() {
    targetRotX = 0; targetRotY = 0;
    tipEl.classList.remove('show');
    renderer.domElement.style.cursor = 'default';
    removeSelector();
  }

  function onClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clusters, true);
    if (hits.length) {
      const node = hits[0].object;
      const cl = node.parent && node.parent.userData ? node.parent : node;
      const key = cl.userData.key;
      const section = document.getElementById(`road-${key}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.style.boxShadow = '0 0 0 3px rgba(94,234,212,0.5)';
        setTimeout(() => (section.style.boxShadow = ''), 2000);
      }
    }
  }

  renderer.domElement.addEventListener('mousemove', onMove);
  renderer.domElement.addEventListener('mouseleave', onLeave);
  renderer.domElement.addEventListener('click', onClick);

  /* ---------- Animate ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    group.rotation.y = t * 0.12 + targetRotX;
    group.rotation.x = Math.sin(t * 0.1) * 0.1 + targetRotY;

    clusters.forEach((cl) => {
      cl.userData.orbits.forEach((o, i) => {
        const s = 1 + Math.sin(t * 2 + o.phase) * 0.4;
        o.mesh.scale.set(s, s, s);
        o.mesh.position.x = Math.cos(t * 0.8 + o.phase) * 1.25;
        o.mesh.position.y = Math.sin(t * 0.9 + o.phase) * 1.25;
      });
      const ms = 1 + Math.sin(t * 1.4) * 0.08;
      cl.scale.set(ms, ms, ms);
    });

    core.rotation.z = t * 0.18;
    ring.rotation.z = t * 0.08;
    ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.12) * 0.08;

    sparks.forEach((s, i) => (s.position.y += Math.sin(t + i * 1.7) * 0.002));

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = stage.clientWidth || 900;
    renderer.setSize(w, H);
    camera.aspect = w / H;
    camera.updateProjectionMatrix();
  });
})();