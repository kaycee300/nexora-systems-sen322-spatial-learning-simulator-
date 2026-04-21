const BACKEND_URL = "http://localhost:8000";

async function fetchScenarios() {
  const response = await fetch(`${BACKEND_URL}/scenarios`);
  const scenarios = await response.json();
  return scenarios;
}

function renderScenarios(scenarios) {
  const listEl = document.getElementById("scenario-list");
  listEl.innerHTML = "";

  if (!scenarios.length) {
    listEl.innerHTML = "<div class=\"scenario-item\">No scenarios available.</div>";
    return;
  }

  scenarios.forEach((scenario) => {
    const card = document.createElement("div");
    card.className = "scenario-item";
    card.innerHTML = `
      <h3>${scenario.title}</h3>
      <p>${scenario.description}</p>
      <div>
        <span>${scenario.tool}</span>
        <span style="margin-left: 0.75rem;">${scenario.difficulty}</span>
      </div>
      <p style="margin-top: 0.75rem; font-size: 0.95rem; color: #d1d9ff;">Scenario ID: ${scenario.id}</p>
    `;
    listEl.appendChild(card);
  });
}

async function initScene() {
  const canvas = document.getElementById("three-canvas");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const geometry = new THREE.BoxGeometry(1.6, 1, 0.6);
  const material = new THREE.MeshStandardMaterial({ color: 0x5e7bfd, metalness: 0.4, roughness: 0.2 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0x8fc6ff, 1.2);
  pointLight.position.set(3, 3, 3);
  scene.add(pointLight);

  camera.position.set(2.5, 1.5, 3);
  camera.lookAt(0, 0, 0);

  window.addEventListener("resize", () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  });

  function animate() {
    requestAnimationFrame(animate);
    cube.rotation.y += 0.01;
    cube.rotation.x += 0.005;
    renderer.render(scene, camera);
  }

  animate();
}

async function submitProgress(event) {
  event.preventDefault();
  const messageEl = document.getElementById("progress-message");
  messageEl.textContent = "Saving progress...";

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

    messageEl.textContent = "Progress saved successfully.";
    messageEl.style.color = "#a7ffb8";
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.style.color = "#ff9b9b";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const scenarios = await fetchScenarios();
  renderScenarios(scenarios);
  initScene();

  const form = document.getElementById("progress-form");
  form.addEventListener("submit", submitProgress);
});
