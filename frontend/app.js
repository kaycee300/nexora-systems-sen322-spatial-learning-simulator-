const BACKEND_URL = "http://localhost:8000";

function setMessage(text, tone = "default") {
  const messageEl = document.getElementById("progress-message");
  messageEl.textContent = text;
  messageEl.style.color = tone === "error" ? "#ff9d8d" : tone === "success" ? "#ffd08b" : "#efceb0";
}

async function fetchScenarios() {
  const response = await fetch(`${BACKEND_URL}/scenarios`);

  if (!response.ok) {
    throw new Error("Unable to load scenarios from the backend.");
  }

  return response.json();
}

async function fetchSkills() {
  const response = await fetch(`${BACKEND_URL}/skills`);

  if (!response.ok) {
    throw new Error("Unable to load skill tracks from the backend.");
  }

  return response.json();
}

function renderSkills(skills) {
  const listEl = document.getElementById("skill-list");
  const countEl = document.getElementById("skill-count");

  countEl.textContent = String(skills.length);
  listEl.innerHTML = "";

  if (!skills.length) {
    listEl.innerHTML = "<div class=\"skill-card loading-card\">No skill tracks available.</div>";
    return;
  }

  skills.forEach((skill) => {
    const card = document.createElement("article");
    card.className = "skill-card";
    card.innerHTML = `
      <h3>${skill.title}</h3>
      <p>${skill.description}</p>
      <div class="skill-meta">
        <span>${skill.category}</span>
        <span>${skill.difficulty}</span>
        <span>Demand: ${skill.demand_level}</span>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function updateSpotlight(scenario) {
  document.getElementById("spotlight-title").textContent = scenario.title;
  document.getElementById("spotlight-description").textContent = scenario.description;
  document.getElementById("spotlight-tool").textContent = scenario.tool;
  document.getElementById("spotlight-difficulty").textContent = scenario.difficulty;
  document.getElementById("spotlight-id").textContent = `Scenario ID: ${scenario.id}`;
  document.getElementById("scene-discipline").textContent = scenario.title;
  document.getElementById("scenario-id").value = scenario.id;
}

function renderScenarios(scenarios) {
  const listEl = document.getElementById("scenario-list");
  const countEl = document.getElementById("scenario-count");

  countEl.textContent = String(scenarios.length);
  listEl.innerHTML = "";

  if (!scenarios.length) {
    listEl.innerHTML = "<div class=\"scenario-item loading-card\">No scenarios available.</div>";
    return;
  }

  updateSpotlight(scenarios[0]);

  scenarios.forEach((scenario, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `scenario-item${index === 0 ? " is-active" : ""}`;
    card.innerHTML = `
      <h3>${scenario.title}</h3>
      <p>${scenario.description}</p>
      <div class="scenario-meta">
        <span>${scenario.tool}</span>
        <span>${scenario.difficulty}</span>
      </div>
      <p class="scenario-id">Scenario ID: ${scenario.id}</p>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".scenario-item").forEach((item) => {
        item.classList.remove("is-active");
      });
      card.classList.add("is-active");
      updateSpotlight(scenario);
    });

    listEl.appendChild(card);
  });
}

function renderScenarioError(message) {
  const listEl = document.getElementById("scenario-list");
  listEl.innerHTML = `<div class="scenario-item loading-card">${message}</div>`;
  document.getElementById("spotlight-title").textContent = "Backend unavailable";
  document.getElementById("spotlight-description").textContent =
    "Start the API on port 8000 to populate the training catalog.";
}

function initScene() {
  const canvas = document.getElementById("three-canvas");
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const clock = new THREE.Clock();
  const pointer = { x: 0, y: 0 };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const gradientLight = new THREE.HemisphereLight(0xffe7ca, 0x0f0d0c, 1.4);
  scene.add(gradientLight);

  const keyLight = new THREE.DirectionalLight(0xffb259, 1.8);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x67e8f9, 16, 20);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);

  const group = new THREE.Group();
  scene.add(group);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.8, 0.38, 48),
    new THREE.MeshStandardMaterial({
      color: 0x2a1d16,
      metalness: 0.35,
      roughness: 0.55,
      emissive: 0x130d09,
    }),
  );
  platform.position.y = -1.45;
  group.add(platform);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.06, 24, 100),
    new THREE.MeshStandardMaterial({
      color: 0xffb259,
      emissive: 0x9a4c12,
      metalness: 0.75,
      roughness: 0.24,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.95;
  group.add(ring);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.92, 1),
    new THREE.MeshStandardMaterial({
      color: 0xfff1dd,
      emissive: 0x4a2b19,
      metalness: 0.25,
      roughness: 0.22,
    }),
  );
  group.add(core);

  const orbitGroup = new THREE.Group();
  group.add(orbitGroup);

  const orbitMaterial = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x16434c,
    metalness: 0.7,
    roughness: 0.18,
  });

  for (let index = 0; index < 6; index += 1) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), orbitMaterial);
    const angle = (index / 6) * Math.PI * 2;
    pod.position.set(Math.cos(angle) * 1.65, 0.15, Math.sin(angle) * 1.65);
    pod.lookAt(0, 0.2, 0);
    orbitGroup.add(pod);
  }

  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 180;
  const positions = new Float32Array(starsCount * 3);

  for (let index = 0; index < starsCount; index += 1) {
    const stride = index * 3;
    positions[stride] = (Math.random() - 0.5) * 12;
    positions[stride + 1] = Math.random() * 6 - 1;
    positions[stride + 2] = (Math.random() - 0.5) * 12;
  }

  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({
      color: 0xffddb6,
      size: 0.045,
      transparent: true,
      opacity: 0.9,
    }),
  );
  scene.add(stars);

  camera.position.set(0, 1.1, 6.2);

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener("resize", resize);

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });

  canvas.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  function animate() {
    const elapsed = clock.getElapsedTime();

    group.rotation.y = elapsed * 0.24 + pointer.x * 0.22;
    group.rotation.x = Math.sin(elapsed * 0.5) * 0.08 + pointer.y * 0.12;
    core.rotation.x = elapsed * 0.3;
    core.rotation.y = elapsed * 0.45;
    core.position.y = Math.sin(elapsed * 1.4) * 0.12;
    orbitGroup.rotation.y = -elapsed * 0.6;
    ring.material.emissiveIntensity = 1.2 + Math.sin(elapsed * 1.8) * 0.2;
    stars.rotation.y = elapsed * 0.02;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

async function submitProgress(event) {
  event.preventDefault();
  setMessage("Saving progress...");

  const payload = {
    student_name: document.getElementById("student-name").value.trim(),
    scenario_id: Number(document.getElementById("scenario-id").value),
    status: document.getElementById("progress-status").value,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save progress.");
    }

    setMessage("Progress saved successfully.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initScene();

  try {
    const [skills, scenarios] = await Promise.all([fetchSkills(), fetchScenarios()]);
    renderSkills(skills);
    renderScenarios(scenarios);
  } catch (error) {
    document.getElementById("skill-list").innerHTML =
      `<div class="skill-card loading-card">${error.message}</div>`;
    renderScenarioError(error.message);
  }

  document.getElementById("progress-form").addEventListener("submit", submitProgress);
});
