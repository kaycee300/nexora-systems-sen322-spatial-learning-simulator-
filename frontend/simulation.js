/* ============================================================
   SkillScape Circuit Builder — interactive 3D simulation
   ============================================================ */

(function circuitSim() {
  const canvas = document.getElementById('simCanvas');
  const stage = document.getElementById('stage');
  if (!canvas || typeof THREE === 'undefined') return;

  const W = stage.clientWidth || 800;
  const H = stage.clientHeight || 600;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x0b1220, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1220, 18, 30);

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(4.5, 4, 7);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x0f766e, 0.65);
  scene.add(hemi);
  const key = new THREE.PointLight(0xfff5d1, 1.1, 20);
  key.position.set(3, 6, 5);
  scene.add(key);
  const cyan = new THREE.PointLight(0x06b6d4, 0.5, 15);
  cyan.position.set(-4, 3, 2);
  scene.add(cyan);

  /* ---------- Ground / table ---------- */
  const tableGeo = new THREE.BoxGeometry(12, 0.3, 9);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, -0.35, 0);
  table.receiveShadow = true;
  scene.add(table);

  const boardGeo = new THREE.BoxGeometry(8, 0.28, 5);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x155e75, roughness: 0.4, metalness: 0.3 });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 0.05, 0);
  board.receiveShadow = true;
  scene.add(board);

  /* ---------- Data ---------- */
  // Four circuits: each has two terminal nodes. terminal.pos on the board.
  const CIRCUITS = [
    { label: 'A', color: 0xfbbf24, from: [-2.4, 0.6], to: [-0.8, 0.6] },
    { label: 'B', color: 0x5eead4, from: [0.8, 0.6], to: [2.4, 0.6] },
    { label: 'C', color: 0x818cf8, from: [-2.4, -0.6], to: [-0.8, -0.6] },
    { label: 'D', color: 0xfb7185, from: [0.8, -0.6], to: [2.4, -0.6] },
  ];

  const wireCoils = [];   // selectable coils at bottom-left
  const terminals = {};   // "cx-0" => mesh
  const wires = {};       // "cx" => {mesh, a, b}
  const rayTargets = [];
  let connected = {};     // "cx" => true
  let moves = 0;
  let selected = null;    // { circuit, terminal: 'from'|'to' }
  let completedCount = 0;

  /* ---------- Build terminals ---------- */
  const termGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.14, 20);
  const ringGeo = new THREE.TorusGeometry(0.3, 0.06, 10, 24);

  CIRCUITS.forEach((c, i) => {
    ['from', 'to'].forEach((side) => {
      const [x, y] = side === 'from' ? c.from : c.to;
      const group = new THREE.Group();
      group.position.set(x, 0.28, y);

      const base = new THREE.Mesh(termGeo, new THREE.MeshStandardMaterial({ color: c.color, metalness: 0.7, roughness: 0.3, emissive: c.color, emissiveIntensity: 0.15 }));
      base.castShadow = true;
      group.add(base);

      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.5 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      group.add(ring);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      label.position.set(0, 0.1, 0.32);
      group.add(label);

      group.userData = { circuit: c.label, side, id: `${c.label}-${side}` };
      scene.add(group);
      rayTargets.push(group);
      terminals[`${c.label}-${side}`] = group;

      // draw a canvas texture for the terminal label
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${c.label}${side === 'from' ? '◄' : '►'}`, 64, 32);
      const tex = new THREE.CanvasTexture(cv);
      label.material.map = tex; label.material.needsUpdate = true;
    });
  });

  /* ---------- Wire coils (selectable) ---------- */
  for (let i = 0; i < CIRCUITS.length; i++) {
    const c = CIRCUITS[i];
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.07, 10, 28),
      new THREE.MeshStandardMaterial({ color: c.color, metalness: 0.6, roughness: 0.3, emissive: c.color, emissiveIntensity: 0.2 })
    );
    coil.position.set(-3.4, 0.6, -1.6 + i * 0.95);
    coil.rotation.x = Math.PI / 4;
    coil.userData = { coilFor: c.label };
    coil.castShadow = true;
    scene.add(coil);
    rayTargets.push(coil);
    wireCoils.push(coil);
  }

  // a base tray under the coils
  const trayGeo = new THREE.BoxGeometry(1.6, 0.08, 4.2);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.set(-3.4, 0.28, -1.6 + 0.95 * 1.5);
  scene.add(tray);

  /* ---------- Lighting globes above completed circuits ---------- */
  function addGlobe(c) {
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: c.color, emissiveIntensity: 1.6 })
    );
    const [x, z] = [(c.from[0] + c.to[0]) / 2, (c.from[1] + c.to[1]) / 2];
    globe.position.set(x, 1.35, z);
    scene.add(globe);
    const glow = new THREE.PointLight(c.color, 0.9, 3.5);
    glow.position.copy(globe.position);
    scene.add(glow);
  }

  /* ---------- Wire connecting ---------- */
  function connectWire(label) {
    const c = CIRCUITS.find((x) => x.label === label);
    const a = terminals[`${label}-from`];
    const b = terminals[`${label}-to`];

    const mat = new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 0.5, metalness: 0.6 });
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12), mat);

    const ax = a.position.clone();
    const bx = b.position.clone();
    ax.y = 0.14; bx.y = 0.14;
    const dir = bx.clone().sub(ax);
    const len = dir.length();
    wire.scale.set(1, len, 1);
    wire.position.copy(ax.clone().add(bx).multiplyScalar(0.5));
    wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(wire);
    wires[label] = wire;

    connected[label] = true;
    completedCount += 1;
    connectedCount += 1;
    addGlobe(c);
  }

  /* ---------- Selection ---------- */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const hint = document.getElementById('modeHint');
  let hintTimer = null;

  function flashHint(msg) {
    hint.textContent = msg;
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('show'), 2200);
  }

  function updateHud() {
    document.getElementById('hudCircuits').textContent = `${completedCount}/4`;
    document.getElementById('hudMoves').textContent = moves;
    const score = Math.max(0, 400 + completedCount * 50 - moves * 10);
    document.getElementById('hudScore').textContent = score;
    document.getElementById('hudMode').textContent = selected ? `Wiring ${selected.circuit}` : completedCount === 4 ? 'Complete!' : 'Pick wire';
    document.getElementById('assessBtn').disabled = completedCount < 4;
  }
  updateHud();

  function handleClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (!selected) {
      // picking a coil
      const hits = raycaster.intersectObjects(wireCoils, true);
      if (hits.length) {
        const label = hits[0].object.userData.coilFor ? hits[0].object.userData.coilFor : hits[0].object.parent.userData.coilFor;
        if (connected[label]) { flashHint(`${label} is already wired.`); return; }
        selected = { circuit: label };
        flashHint(`Wiring circuit ${label} — click a terminal to start.`);
        moves += 1;
        updateHud();
      }
      return;
    }

    // picking a terminal
    const hits = raycaster.intersectObjects(Object.values(terminals), true);
    if (hits.length) {
      const node = hits[0].object.parent || hits[0].object;
      const data = node.userData;
      if (data.circuit === selected.circuit) {
        connectWire(selected.circuit);
        selected = null;
        markTask(data.circuit);
        moves += 1;
        updateHud();
      } else {
        flashHint(`That terminal belongs to circuit ${data.circuit}.`);
      }
      return;
    }
    selected = null;
    updateHud();
  }

  let connectedCount = 0;
  function markTask(label) {
    // Task 1 = power source (marked on first connection), 2-5 = circuits A-D
    const taskIdx = connectedCount === 1 ? 1 : CIRCUITS.findIndex((c) => c.label === label) + 2;
    const tasks = document.querySelectorAll('#taskList .task');
    for (let i = 0; i < taskIdx; i++) {
      if (i < tasks.length) tasks[i].classList.add('done');
    }
    setTimeout(() => {
      if (completedCount === 4) {
        document.getElementById('assessBtn').disabled = false;
        document.getElementById('hudMode').textContent = 'Complete!';
      }
    }, 250);
  }

  canvas.addEventListener('click', handleClick);

  /* ---------- Orbit (drag) ---------- */
  let dragging = false, prevX = 0, prevY = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX; prevY = e.clientY;
    camera.position.x += dx * 0.005;
    camera.position.y -= dy * 0.005;
    camera.position.x = Math.max(-6, Math.min(6, camera.position.x));
    camera.position.y = Math.max(0.8, Math.min(7, camera.position.y));
    camera.lookAt(0, 0, 0);
  });

  /* ---------- Hover cursor ---------- */
  canvas.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const targets = selected ? Object.values(terminals) : wireCoils;
    const hits = raycaster.intersectObjects(targets, true);
    canvas.style.cursor = hits.length ? 'pointer' : 'default';
  });

  /* ---------- Ambient sparkles ---------- */
  const sparks = [];
  for (let i = 0; i < 60; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x99f6e4, transparent: true, opacity: 0.7 })
    );
    s.position.set((Math.random() - 0.5) * 14, Math.random() * 5 - 1, (Math.random() - 0.5) * 10);
    scene.add(s); sparks.push(s);
  }

  /* ---------- Animate ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    wireCoils.forEach((c, i) => {
      c.position.y = 0.6 + Math.sin(t * 1.5 + i * 0.9) * 0.05;
      c.rotation.z = Math.PI / 4 + Math.sin(t * 0.8 + i) * 0.2;
    });

    // pulse connected globes
    scene.children.forEach((child) => {
      if (child.userData && child.userData.pulse) {
        const s = 1 + Math.sin(t * 3) * 0.1;
        child.scale.set(s, s, s);
      }
    });

    sparks.forEach((s, i) => s.position.y += Math.sin(t + i * 1.3) * 0.0015);

    // gentle idle camera sway unless dragging
    if (!dragging && !selected) {
      camera.position.y = 4 + Math.sin(t * 0.15) * 0.2;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }
  animate();

  /* ---------- Reset ---------- */
  document.getElementById('resetBtn').addEventListener('click', () => {
    Object.keys(wires).forEach((k) => scene.remove(wires[k]));
    Object.assign(connected, {});
    completedCount = 0; connectedCount = 0; moves = 0; selected = null;
    document.querySelectorAll('#taskList .task').forEach((t) => t.classList.remove('done'));
    document.querySelectorAll('#taskList .task')[0].classList.add('done');
    document.getElementById('assessBtn').disabled = true;
    updateHud();
    flashHint('Session reset. Pick a wire coil to begin.');
  });

  /* ---------- Assessment ---------- */
  document.getElementById('assessBtn').addEventListener('click', () => {
    const score = Math.max(0, 400 + completedCount * 50 - moves * 10);
    const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Proficient' : score >= 60 ? 'Competent' : 'Needs practice';
    localStorage.setItem('skillscape-sim', JSON.stringify({ score, grade, moves, completed: completedCount, time: new Date().toISOString() }));
    window.location.href = `catalog.html?result=${encodeURIComponent(JSON.stringify({ score, grade, moves, completed: completedCount }))}`;
  });

  /* ---------- Resize ---------- */
  window.addEventListener('resize', () => {
    const w = stage.clientWidth || 800;
    const h = stage.clientHeight || 600;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();