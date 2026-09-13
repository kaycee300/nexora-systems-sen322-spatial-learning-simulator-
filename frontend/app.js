/* ============================================================
   SkillScape App JS — shared across dashboard/catalog pages
   ============================================================ */

const BACKEND_URL = 'http://127.0.0.1:8084';

function getUser() {
  try { return JSON.parse(localStorage.getItem('skillscape-user') || 'null'); } catch (e) { return null; }
}
function getToken() { return localStorage.getItem('skillscape-token'); }
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showToast(message, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---------- Auth guard ---------- */
(function guard() {
  if (!getToken()) {
    window.location.href = 'signin.html';
    return;
  }
  const user = getUser();
  if (user) {
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const email = document.getElementById('userEmail');
    if (avatar) avatar.textContent = getInitials(user.name || user.email);
    if (name) name.textContent = user.name || user.email;
    if (email) email.textContent = user.email || '';
    const welcome = document.getElementById('welcomeMsg');
    if (welcome && user.name) welcome.textContent = `Welcome back, ${user.name.split(' ')[0]}`;
  }
  fetch(`${BACKEND_URL}/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((me) => {
      const clean = {
        email: me.email, name: me.full_name,
        email_verified: Boolean(me.email_verified),
        role: me.role,
      };
      localStorage.setItem('skillscape-user', JSON.stringify(clean));
      const avatar = document.getElementById('userAvatar');
      const name = document.getElementById('userName');
      if (avatar) avatar.textContent = getInitials(me.full_name);
      if (name) name.textContent = me.full_name;
      if (email) email.textContent = me.email;
      const welcome = document.getElementById('welcomeMsg');
      if (welcome) welcome.textContent = `Welcome back, ${me.full_name.split(' ')[0]}`;
    })
    .catch(() => {});

  const signout = document.getElementById('signout');
  if (signout) signout.addEventListener('click', () => {
    localStorage.removeItem('skillscape-token');
    localStorage.removeItem('skillscape-user');
    window.location.href = 'signin.html';
  });
})();

/* ---------- Mobile sidebar ---------- */
(function sidebarToggle() {
  const btn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
})();

/* ---------- Randomize live-ish stats ---------- */
(function liveStats() {
  const hours = document.getElementById('statHours');
  const streak = document.getElementById('streakStat');
  if (hours) hours.textContent = (1 + Math.floor(Math.random() * 11));
  if (streak) streak.textContent = (3 + Math.floor(Math.random() * 9));
})();

/* ---------- 3D Skill Tree (Three.js r128) ---------- */
(function skillTree() {
  const canvas = document.getElementById('skillCanvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const wrap = document.getElementById('sceneWrap');
  const width = wrap.clientWidth || 600;
  const height = 320;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const key = new THREE.PointLight(0x22d3ee, 1.2, 30);
  key.position.set(4, 4, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0x0f766e, 0.8, 30);
  fill.position.set(-4, -2, 4);
  scene.add(fill);

  const group = new THREE.Group();
  scene.add(group);

  const colors = [0x14b8a6, 0x6366f1, 0xf59e0b, 0x06b6d4, 0x8b5cf6];
  const nodes = [];
  const positions = [
    [0, 0, 0],
    [-2.4, 1.8, 0.2], [2.4, 1.8, -0.2],
    [-3.6, -1.9, 0.1], [3.6, -1.9, -0.1],
    [0, 3.4, 0], [0, -3.2, 0],
    [-1.6, -2.6, 0.3], [1.6, 3.2, -0.3],
  ];
  const radius = [0.55, 0.42, 0.42, 0.36, 0.36, 0.5, 0.46, 0.3, 0.3];

  positions.forEach((p, i) => {
    const geo = new THREE.IcosahedronGeometry(radius[i], 1);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      roughness: 0.25, metalness: 0.45, flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p[0], p[1], p[2]);
    group.add(mesh);
    nodes.push({ mesh, base: p.slice(), phase: Math.random() * Math.PI * 2 });
  });

  // connective core
  const coreGeo = new THREE.TorusGeometry(2.1, 0.02, 8, 64);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.55 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.rotation.x = Math.PI / 2.4;
  group.add(core);

  // glowing wireframe ring
  const ringGeo = new THREE.TorusGeometry(3.1, 0.008, 6, 80);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.z = Math.PI / 2;
  scene.add(ring);

  // floating sparkles
  const sparks = [];
  for (let i = 0; i < 60; i++) {
    const g = new THREE.SphereGeometry(0.02, 4, 4);
    const m = new THREE.MeshBasicMaterial({ color: 0x99f6e4 });
    const s = new THREE.Mesh(g, m);
    s.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6,
    );
    scene.add(s);
    sparks.push(s);
  }

  let hover = null;
  let target = null;
  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    target = { x: mx * 1.2, y: my * 0.9 };
  });
  renderer.domElement.addEventListener('mouseleave', () => { target = null; });

  const clock = new THREE.Clock();
  let rotationFrame = 0;
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    group.rotation.y = Math.sin(t * 0.25) * 0.5 + rotationFrame;
    group.rotation.x = Math.sin(t * 0.18) * 0.18;

    nodes.forEach((n, i) => {
      const scale = 1 + Math.sin(t * 1.2 + n.phase) * 0.12;
      n.mesh.scale.set(scale, scale, scale);
    });

    if (target) {
      camera.position.x += (target.x - camera.position.x) * 0.06;
      camera.position.y += (target.y - camera.position.y) * 0.06;
      camera.lookAt(0, 0, 0);
    }

    core.rotation.z = t * 0.2;
    ring.rotation.x = t * 0.12;
    ring.rotation.y = t * 0.16;

    sparks.forEach((s, i) => {
      s.position.y += Math.sin(t + i) * 0.002;
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = wrap.clientWidth || 600;
    renderer.setSize(w, height);
    camera.aspect = w / height;
    camera.updateProjectionMatrix();
  });
})();

/* ---------- 3D Tilt cards ---------- */
(function tilts() {
  const cards = document.querySelectorAll('.course-card');
  cards.forEach((card) => {
    const inner = card.querySelector('.course-card-inner');
    if (!inner) return;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      inner.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => {
      inner.style.transform = 'rotateY(0) rotateX(0)';
    });
    card.addEventListener('click', () => {
      if (card.dataset.sim) {
        window.location.href = `simulation.html?course=${encodeURIComponent(card.dataset.sim)}`;
      }
    });
  });
})();

/* ---------- Notification toasts (dummy) ---------- */
(function notif() {
  const btn = document.getElementById('notifBtn');
  if (btn) btn.addEventListener('click', () => showToast('No new notifications — nice and calm.', 'info'));
})();