/* sim-core.js — shared 3D workshop shell */
(function (global) {
  'use strict';

  const BACKEND = 'http://127.0.0.1:8084';
  const params = new URLSearchParams(window.location.search);
  const modules = {};

  /* ---------- tiny label helper (canvas sprite) ---------- */
  function makeLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 46px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(text, 256, 48);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.45, 1);
    return sprite;
  }

  /* ---------- shell ---------- */
  function start(config) {
    if (!config || !config.build) { console.error('sim-core: missing config.build'); return; }
    if (typeof THREE === 'undefined') { console.error('sim-core: THREE is not loaded'); return; }

    const projectId = params.get('project');
    const course = params.get('course') || '';

    /* populate shell */
    document.title = (config.name || 'Workshop') + ' — SkillScape';
    const titleEl = document.getElementById('simTitle');
    if (titleEl) titleEl.textContent = (config.name || 'Workshop') + simulation_emoji(config.name);
    const nameEl = document.getElementById('simName');
    if (nameEl) nameEl.textContent = config.name || 'Workshop';
    const descEl = document.getElementById('simDesc');
    if (descEl) descEl.textContent = config.desc || '';

    const taskList = document.getElementById('taskList');
    if (taskList) {
      taskList.innerHTML = config.tasks.map((t, i) => `
        <div class="task" data-id="${i + 1}">
          <div class="check">✓</div>
          <div><div class="t-title">${t.title}</div><div class="t-desc">${t.desc || ''}</div></div>
        </div>`).join('');
    }

    /* scene */
    const el = document.getElementById('stage');
    const canvas = document.getElementById('simCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const size = () => ({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
    renderer.setSize(size().w, size().h);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, size().w / size().h, 0.1, 100);
    camera.position.set(0, 3, 9);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(4, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5eead4, 0.5);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const world = new THREE.Group();
    world.rotation.x = Math.PI * 0.02;
    scene.add(world);

    /* floor disc */
    const floorGeo = new THREE.CircleGeometry(6, 48);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    world.add(floor);

    const core = {
      modules, projectId, course, config, scene, camera, renderer, world,
      clickables: [],
      state: { completed: 0, moves: 0, total: config.tasks.length },
      makeLabel,
      setMode: (t) => { const el = document.getElementById('hudMode'); if (el) el.textContent = t; },
      flash(msg) {
        const m = document.getElementById('modeHint');
        if (!m) return;
        m.textContent = msg;
        m.classList.add('show');
        clearTimeout(flash._t);
        flash._t = setTimeout(() => m.classList.remove('show'), 2600);
      },
      completeTask() {
        const s = core.state;
        if (s.completed < s.total) s.completed += 1;
        core.renderTasks();
        core.updateHud();
        if (s.completed === s.total) {
          core.flash('All tasks complete — submit your assessment!');
          core.renderCoach();
        }
      },
      renderTasks() {
        const nodes = document.querySelectorAll('#taskList .task');
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].classList.toggle('done', i < core.state.completed);
        }
      },
      updateHud() {
        const s = core.state;
        const hud = (id) => document.getElementById(id);
        if (hud('hudProgress')) hud('hudProgress').textContent = `${s.completed}/${s.total}`;
        if (hud('hudMoves')) hud('hudMoves').textContent = s.moves;
        if (hud('hudScore')) hud('hudScore').textContent = core.score();
        const assess = hud('assessBtn');
        if (assess) assess.disabled = s.completed < s.total;
      },
      score() {
        const s = core.state;
        if (s.total === 0) return 0;
        const eff = Math.max(0, 1 - Math.min(0.5, s.moves * 0.004));
        return Math.max(0, Math.min(100, Math.round((s.completed / s.total) * 100 * eff)));
      },
      /* ---------- coach ---------- */
      coachBtn: document.getElementById('coachBtn'),
      coachBox: document.getElementById('coachBox'),
      coachMsg: document.getElementById('coachMsg'),
      coachIdx: {},
      phase() { return config.phase ? config.phase(core) : (core.state.completed === 0 ? 'start' : core.state.completed >= core.state.total ? 'done' : 'mid'); },
      hintFor() {
        const bucket = core.phase();
        const pool = (config.hints && config.hints[bucket]) || (config.hints && config.hints.any) || ['Ask the AI coach a question!'];
        core.coachIdx[bucket] = core.coachIdx[bucket] || 0;
        return pool[core.coachIdx[bucket]++ % pool.length];
      },
      showCoach() {
        if (!core.coachBox || !core.coachMsg) return;
        core.coachBox.style.display = 'block';
        core.coachMsg.innerHTML = `<span class="coach-tag">AI COACH</span><br>${core.hintFor()}`;
        const status = document.getElementById('coachStatus');
        if (status) status.textContent = 'Coach ready — ask for a hint below.';
      },
      renderCoach() { core.showCoach(); },
      /* ---------- drag rotate ---------- */
      drag: { on: false, x: 0, y: 0 },
    };

    if (core.coachBtn) core.coachBtn.addEventListener('click', () => core.showCoach());
    if (core.coachBox) { core.coachBox.style.display = 'block'; core.coachMsg.innerHTML = `<span class="coach-tag">AI COACH</span><br>${config.intro || 'Follow the tasks on the left. Click things in the scene to interact, drag to rotate the view. Ask me for a hint whenever you get stuck.'}`; }

    /* interactions */
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function pick(ev) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(core.clickables, true);
      if (!hits.length) return null;
      let obj = hits[0].object;
      while (obj && !obj.userData.tag && obj.parent) obj = obj.parent;
      return obj && obj.userData.tag ? obj : null;
    }

    canvas.addEventListener('pointerdown', (ev) => {
      const hit = pick(ev);
      if (hit) {
        core.drag.on = false;
        if (config.onClick) config.onClick(hit, core, ev);
        return;
      }
      core.drag.on = true;
      core.drag.x = ev.clientX; core.drag.y = ev.clientY;
    });

    window.addEventListener('pointermove', (ev) => {
      if (!core.drag.on) return;
      world.rotation.y += (ev.clientX - core.drag.x) * 0.005;
      world.rotation.x += (ev.clientY - core.drag.y) * 0.003;
      world.rotation.x = Math.max(-0.6, Math.min(0.6, world.rotation.x));
      core.drag.x = ev.clientX; core.drag.y = ev.clientY;
    });

    window.addEventListener('pointerup', () => { core.drag.on = false; });
    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      camera.position.z = Math.max(4.5, Math.min(15, camera.position.z + ev.deltaY * 0.008));
      camera.position.y = camera.position.z * 0.4;
    }, { passive: false });

    /* assessment */
    document.getElementById('assessBtn').addEventListener('click', () => {
      const score = core.score();
      const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Proficient' : score >= 60 ? 'Competent' : 'Needs practice';
      const record = { score, grade, moves: core.state.moves, completed: core.state.completed, time: new Date().toISOString() };
      try { localStorage.setItem(core.projectId ? `skillscape-sim-${core.projectId}` : 'skillscape-sim', JSON.stringify(record)); } catch (err) {}
      reportProgress(score);
      window.location.href = `catalog.html?result=${encodeURIComponent(JSON.stringify(record))}`;
    });

    async function reportProgress(score) {
      if (!projectId) return;
      const token = localStorage.getItem('skillscape-token');
      if (!token) return;
      try {
        await fetch(`${BACKEND}/projects/${projectId}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ progress: 100, score }),
        });
      } catch (err) { console.warn('backend offline — progress not saved'); }
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      core.state.completed = 0; core.state.moves = 0;
      core.renderTasks(); core.updateHud();
      if (config.reset) config.reset(core);
      core.flash('Session reset. Follow the tasks to rebuild.');
    });

    window.addEventListener('resize', () => {
      const s = size();
      renderer.setSize(s.w, s.h);
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
    });

    /* proactive coach when stuck */
    core._stuckCoached = false;
    const origUpdate = core.updateHud.bind(core);
    core.updateHud = function () {
      origUpdate();
      const s = core.state;
      if (s.moves >= 7 && s.completed < s.total && !core._stuckCoached) {
        core._stuckCoached = true;
        core.showCoach();
      }
    };

    /* merge module helper methods onto core so modules can call them via core */
    Object.keys(config).forEach((k) => {
      if (typeof config[k] === 'function') core[k] = config[k];
    });

    /* build the world */
    if (config.build) config.build(core);
    core.updateHud();
    core.setMode(config.startMode || 'Ready');

    /* animate */
    const clock = new THREE.Clock();
    (function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (config.animate) config.animate(core, dt);
      renderer.render(scene, camera);
    })();

    core.renderTasks();
    core.flash(config.intro || 'Welcome! Drag to rotate, click objects to act.');
  }

  function simulation_emoji() { return ' 🔧'; }

  global.SimCore = { modules, start };
})(window);