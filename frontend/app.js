const BACKEND_URL = "http://localhost:8000";
const STORAGE_KEY = "skillscape-current-user";

let currentUser = null;
let currentLessonRuntime = null;
let currentLessonSession = null;
let lessonSimulation = null;
let simulationState = null;

const ELECTRICAL_ACTIONS = [
  "inspect_panel",
  "pick_multimeter",
  "identify_live_wire",
  "secure_circuit",
];

function setMessage(text, tone = "default", elementId = "progress-message") {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = text;
  messageEl.style.color = tone === "error" ? "#ff9d8d" : tone === "success" ? "#ffd08b" : "#efceb0";
}

function saveCurrentUser(user) {
  currentUser = user;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  currentUser = null;
  window.localStorage.removeItem(STORAGE_KEY);
}

function loadCurrentUser() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    currentUser = JSON.parse(raw);
    return currentUser;
  } catch {
    clearCurrentUser();
    return null;
  }
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

async function fetchSkillCourse(skillId) {
  const response = await fetch(`${BACKEND_URL}/skills/${skillId}/course`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load course path.");
  }

  return data;
}

async function fetchLessonRuntime(lessonId) {
  const query = currentUser ? `?user_id=${currentUser.id}` : "";
  const response = await fetch(`${BACKEND_URL}/lessons/${lessonId}/runtime${query}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load lesson runtime.");
  }

  return data;
}

async function askAICoach(payload) {
  const response = await fetch(`${BACKEND_URL}/ai/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to get AI coaching.");
  }

  return data;
}

async function submitLessonAttempt(payload) {
  const response = await fetch(`${BACKEND_URL}/lessons/${payload.lesson_id}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: payload.user_id,
      answer: payload.answer,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to submit lesson attempt.");
  }

  return data;
}

async function saveLessonCompletion(payload) {
  const response = await fetch(`${BACKEND_URL}/lessons/${payload.lesson_id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: payload.user_id,
      status: payload.status,
      score: payload.score,
      feedback: payload.feedback,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to update lesson completion.");
  }

  return data;
}

async function startLessonSession(lessonId, userId) {
  const response = await fetch(`${BACKEND_URL}/lessons/${lessonId}/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to start lesson session.");
  }

  return data;
}

async function logLessonEvent(sessionId, payload) {
  const response = await fetch(`${BACKEND_URL}/lesson-sessions/${sessionId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to log lesson event.");
  }

  return data;
}

async function completeLessonSession(sessionId, payload) {
  const response = await fetch(`${BACKEND_URL}/lesson-sessions/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to complete lesson session.");
  }

  return data;
}

function createInitialSimulationState() {
  return {
    actions: [],
    score: 0,
    message: "Start the lesson session, then inspect the panel first.",
    panelInspected: false,
    toolPicked: false,
    wireIdentified: false,
    circuitSecured: false,
    mistakes: 0,
  };
}

function setSimulationMessage(text, tone = "default") {
  const el = document.getElementById("simulation-message");
  el.textContent = text;
  el.style.color = tone === "error" ? "#ff9d8d" : tone === "success" ? "#ffd08b" : "#efceb0";
}

function syncSimulationButtons() {
  document.querySelectorAll(".simulation-action").forEach((button) => {
    button.classList.toggle("is-complete", simulationState.actions.includes(button.dataset.action));
  });
  document.getElementById("runtime-score-pill").textContent = `Score: ${simulationState.score}`;
}

function buildSimulationScene() {
  const canvas = document.getElementById("lesson-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.2, 7.2);

  const ambient = new THREE.HemisphereLight(0xffedcf, 0x120f0d, 1.3);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffb25d, 1.6);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x67e8f9, 12, 16);
  fillLight.position.set(-4, 3, 4);
  scene.add(fillLight);

  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.7, 0.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x211814, metalness: 0.28, roughness: 0.65 }),
  );
  stage.position.y = -1.8;
  scene.add(stage);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 2.7, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x2d241f, metalness: 0.08, roughness: 0.82 }),
  );
  board.position.set(0, 0, 0);
  scene.add(board);

  const wireLive = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f4f4f, emissive: 0x111111 }),
  );
  wireLive.rotation.z = Math.PI / 2;
  wireLive.position.set(0, 0.6, 0.2);
  scene.add(wireLive);

  const wireNeutral = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f4f4f, emissive: 0x111111 }),
  );
  wireNeutral.rotation.z = Math.PI / 2;
  wireNeutral.position.set(0, 0, 0.2);
  scene.add(wireNeutral);

  const wireGround = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f4f4f, emissive: 0x111111 }),
  );
  wireGround.rotation.z = Math.PI / 2;
  wireGround.position.set(0, -0.6, 0.2);
  scene.add(wireGround);

  const meter = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.2, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x1f3d49, emissive: 0x092028, metalness: 0.32, roughness: 0.35 }),
  );
  meter.position.set(-2.25, -0.25, 0.55);
  scene.add(meter);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd78f, emissive: 0x4f3310, metalness: 0.15, roughness: 0.3 }),
  );
  lamp.position.set(1.5, 1.0, 0.6);
  scene.add(lamp);

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function animate() {
    const elapsed = clock.getElapsedTime();
    board.rotation.y = Math.sin(elapsed * 0.5) * 0.06;
    lamp.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.03 + (simulationState?.circuitSecured ? 0.08 : 0));
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  return { scene, renderer, camera, board, wireLive, wireNeutral, wireGround, meter, lamp };
}

function renderSimulationState() {
  if (!lessonSimulation || !simulationState) {
    return;
  }

  lessonSimulation.board.material.color.set(simulationState.panelInspected ? 0x3b2d26 : 0x2d241f);
  lessonSimulation.meter.position.x = simulationState.toolPicked ? -1.3 : -2.25;
  lessonSimulation.wireLive.material.color.set(simulationState.wireIdentified ? 0xff9a3d : 0x4f4f4f);
  lessonSimulation.wireLive.material.emissive.set(simulationState.wireIdentified ? 0x6a2f00 : 0x111111);
  lessonSimulation.wireNeutral.material.color.set(0x7e92b8);
  lessonSimulation.wireGround.material.color.set(0x4fb17c);
  lessonSimulation.lamp.material.emissive.set(simulationState.circuitSecured ? 0xffa01c : 0x4f3310);

  syncSimulationButtons();
  setSimulationMessage(simulationState.message, simulationState.mistakes ? "default" : "success");
}

function initLessonPlayer() {
  lessonSimulation = buildSimulationScene();
  simulationState = createInitialSimulationState();
  renderSimulationState();
}

function isElectricalRuntime(runtime) {
  return runtime?.skill?.slug === "electrical-installation";
}

async function ensureLessonSession() {
  if (!requireSignedInForLessonAction()) {
    return null;
  }
  if (!currentLessonRuntime) {
    setMessage("Select a lesson first.", "error", "lesson-attempt-message");
    return null;
  }
  if (currentLessonSession) {
    return currentLessonSession;
  }

  currentLessonSession = await startLessonSession(currentLessonRuntime.lesson.id, currentUser.id);
  document.getElementById("runtime-status-pill").textContent = `Status: ${currentLessonSession.status}`;
  return currentLessonSession;
}

async function runSimulationAction(action) {
  if (!currentLessonRuntime) {
    setSimulationMessage("Select a lesson first.", "error");
    return;
  }
  if (!isElectricalRuntime(currentLessonRuntime)) {
    setSimulationMessage("Interactive simulation is currently available for Electrical Installation lessons.", "error");
    return;
  }

  const session = await ensureLessonSession();
  if (!session) {
    return;
  }

  if (simulationState.actions.includes(action)) {
    setSimulationMessage("That action is already complete.");
    return;
  }

  let correct = false;

  if (action === "inspect_panel" && simulationState.actions.length === 0) {
    simulationState.panelInspected = true;
    simulationState.score += 25;
    simulationState.message = "Panel inspected. Pick the multimeter next.";
    correct = true;
  } else if (action === "pick_multimeter" && simulationState.panelInspected) {
    simulationState.toolPicked = true;
    simulationState.score += 25;
    simulationState.message = "Tool selected. Identify the live wire safely.";
    correct = true;
  } else if (action === "identify_live_wire" && simulationState.toolPicked) {
    simulationState.wireIdentified = true;
    simulationState.score += 25;
    simulationState.message = "Live wire identified. Secure the circuit to finish.";
    correct = true;
  } else if (action === "secure_circuit" && simulationState.wireIdentified) {
    simulationState.circuitSecured = true;
    simulationState.score += 25;
    simulationState.message = "Circuit secured. You can now complete the lesson.";
    correct = true;
  } else {
    simulationState.mistakes += 1;
    simulationState.score = Math.max(0, simulationState.score - 10);
    simulationState.message = "Wrong order. Re-check the safe sequence before proceeding.";
  }

  if (correct) {
    simulationState.actions.push(action);
  }

  renderSimulationState();
  await logLessonEvent(session.id, {
    event_type: correct ? action : "sequence_error",
    event_value: correct ? action : `${action}:out_of_order`,
  });
}

async function resetSimulation() {
  simulationState = createInitialSimulationState();
  currentLessonSession = null;
  document.getElementById("runtime-status-pill").textContent = "Status: not started";
  renderSimulationState();
}

function renderLessonRuntime(runtime) {
  currentLessonRuntime = runtime;
  currentLessonSession = runtime.active_session;
  document.getElementById("runtime-lesson-title").textContent = runtime.lesson.title;
  document.getElementById("runtime-lesson-context").textContent =
    `${runtime.skill.title} • ${runtime.course.title} • ${runtime.module.title}`;
  document.getElementById("runtime-skill-pill").textContent = runtime.skill.title;
  document.getElementById("runtime-module-pill").textContent = runtime.module.title;
  document.getElementById("runtime-status-pill").textContent =
    `Status: ${runtime.active_session?.status || runtime.completion?.status || "not started"}`;
  document.getElementById("runtime-prompt").textContent = runtime.prompt;

  const checklistEl = document.getElementById("runtime-checklist");
  checklistEl.innerHTML = runtime.checklist.map((item) => `<li>${item}</li>`).join("");

  const rubricEl = document.getElementById("runtime-rubric");
  rubricEl.innerHTML = runtime.rubric.map((item) => `<li>${item}</li>`).join("");

  document.getElementById("lesson-answer").value = "";
  document.getElementById("lesson-attempt-message").textContent = "";
  document.getElementById("lesson-completion-message").textContent = "";

  const coachEl = document.getElementById("ai-coach-response");
  coachEl.textContent = runtime.completion?.feedback
    || "Ask the AI coach for feedback or submit an assessment to generate lesson feedback.";

  if (isElectricalRuntime(runtime)) {
    simulationState = createInitialSimulationState();
    if (runtime.active_session) {
      simulationState.message = "Session resumed. Continue the safe sequence.";
    }
    renderSimulationState();
  } else {
    setSimulationMessage("This lesson supports assessment and coaching. The flagship interactive simulator is currently built for Electrical Installation.");
  }
}

function renderCourse(course) {
  document.getElementById("course-title").textContent = course.title;
  document.getElementById("course-summary").textContent = course.summary;
  document.getElementById("course-level").textContent = course.level;
  document.getElementById("course-duration").textContent = `${course.duration_weeks} weeks`;
  document.getElementById("course-outcome").textContent = course.outcome;

  const moduleList = document.getElementById("course-module-list");
  moduleList.innerHTML = "";

  course.modules.forEach((module) => {
    const moduleCard = document.createElement("article");
    moduleCard.className = "progress-panel module-card";

    const lessonMarkup = module.lessons
      .map(
        (lesson) => `
          <button type="button" class="lesson-card lesson-launch" data-lesson-id="${lesson.id}">
            <strong>${lesson.position}. ${lesson.title}</strong>
            <p>${lesson.objective}</p>
            <span>${lesson.format} • ${lesson.duration_minutes} min</span>
          </button>
        `
      )
      .join("");

    moduleCard.innerHTML = `
      <p class="note-label">Module ${module.position}</p>
      <h3>${module.title}</h3>
      <p>${module.description}</p>
      <div class="lesson-list">${lessonMarkup}</div>
    `;
    moduleList.appendChild(moduleCard);
  });

  document.querySelectorAll(".lesson-launch").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const runtime = await fetchLessonRuntime(Number(button.dataset.lessonId));
        renderLessonRuntime(runtime);
        window.location.hash = "lesson-runtime";
      } catch (error) {
        setMessage(error.message, "error", "lesson-attempt-message");
      }
    });
  });
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

  const defaultSlug = "electrical-installation";

  skills.forEach((skill, index) => {
    const card = document.createElement("button");
    card.type = "button";
    const isActive = skill.slug === defaultSlug || (index === 0 && !skills.some((item) => item.slug === defaultSlug));
    card.className = `skill-card${isActive ? " is-active" : ""}`;
    card.innerHTML = `
      <h3>${skill.title}</h3>
      <p>${skill.description}</p>
      <div class="skill-meta">
        <span>${skill.category}</span>
        <span>${skill.difficulty}</span>
        <span>Demand: ${skill.demand_level}</span>
      </div>
    `;
    card.addEventListener("click", async () => {
      document.querySelectorAll(".skill-card").forEach((item) => item.classList.remove("is-active"));
      card.classList.add("is-active");

      try {
        const course = await fetchSkillCourse(skill.id);
        renderCourse(course);
      } catch (error) {
        document.getElementById("course-module-list").innerHTML =
          `<div class="progress-panel loading-card">${error.message}</div>`;
      }
    });
    listEl.appendChild(card);
  });
}

async function registerUser(payload) {
  const response = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to create account.");
  }
  return data;
}

async function loginUser(payload) {
  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to login.");
  }
  return data;
}

async function fetchDashboard(userId) {
  const response = await fetch(`${BACKEND_URL}/users/${userId}/dashboard`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load dashboard.");
  }
  return data;
}

function syncProgressIdentity() {
  const studentNameInput = document.getElementById("student-name");

  if (currentUser) {
    studentNameInput.value = currentUser.name;
    studentNameInput.disabled = true;
    document.getElementById("logout-button").classList.remove("auth-hidden");
  } else {
    studentNameInput.disabled = false;
    studentNameInput.value = "";
    document.getElementById("logout-button").classList.add("auth-hidden");
  }
}

function renderDashboardState(dashboard) {
  document.getElementById("dashboard-title").textContent = `Welcome back, ${dashboard.user.name}`;
  document.getElementById("dashboard-subtitle").textContent =
    dashboard.user.learning_goal || "Your learning profile is active. Pick a scenario and keep building momentum.";
  document.getElementById("dashboard-total").textContent = String(dashboard.total_progress_entries);
  document.getElementById("dashboard-completed").textContent = String(dashboard.completed_lessons || dashboard.completed_sessions);
  document.getElementById("dashboard-active").textContent = String(dashboard.active_simulation_sessions || dashboard.active_lessons || dashboard.in_progress_sessions);

  const activityEl = document.getElementById("dashboard-activity");
  activityEl.innerHTML = "";
  if (!dashboard.recent_activity.length) {
    activityEl.innerHTML = "<div class=\"dashboard-item empty-state\">No progress entries yet. Save your first session to populate this list.</div>";
  } else {
    dashboard.recent_activity.forEach((item) => {
      const card = document.createElement("div");
      card.className = "dashboard-item";
      card.innerHTML = `
        <strong>${item.student_name}</strong>
        <p>Scenario ID: ${item.scenario_id}</p>
        <span>${item.status}</span>
      `;
      activityEl.appendChild(card);
    });
  }

  const recommendationsEl = document.getElementById("dashboard-recommendations");
  recommendationsEl.innerHTML = "";
  dashboard.recommended_skills.forEach((skill) => {
    const card = document.createElement("div");
    card.className = "dashboard-item";
    card.innerHTML = `
      <strong>${skill.title}</strong>
      <p>${skill.category}</p>
      <span>${skill.difficulty}</span>
    `;
    recommendationsEl.appendChild(card);
  });

  const coursesEl = document.getElementById("dashboard-courses");
  coursesEl.innerHTML = "";
  if (dashboard.recommended_courses.length) {
    dashboard.recommended_courses.forEach((course) => {
      const card = document.createElement("div");
      card.className = "dashboard-item";
      card.innerHTML = `
        <strong>${course.title}</strong>
        <p>${course.summary}</p>
        <span>${course.level}</span>
      `;
      coursesEl.appendChild(card);
    });
  }
}

function renderLoggedOutDashboard() {
  document.getElementById("dashboard-title").textContent = "Sign in to unlock your dashboard";
  document.getElementById("dashboard-subtitle").textContent =
    "Accounts are now supported. Once you log in, your recent sessions and recommended skills will appear here.";
  document.getElementById("dashboard-total").textContent = "0";
  document.getElementById("dashboard-completed").textContent = "0";
  document.getElementById("dashboard-active").textContent = "0";
  document.getElementById("dashboard-activity").innerHTML =
    "<div class=\"dashboard-item empty-state\">No learner data yet.</div>";
  document.getElementById("dashboard-recommendations").innerHTML =
    "<div class=\"dashboard-item empty-state\">Your recommended tracks will appear here after login.</div>";
  document.getElementById("dashboard-courses").innerHTML =
    "<div class=\"dashboard-item empty-state\">Your recommended courses will appear here after login.</div>";
}

function requireSignedInForLessonAction() {
  if (currentUser) {
    return true;
  }
  setMessage("Sign in to run lesson assessments and completion tracking.", "error", "lesson-attempt-message");
  return false;
}

async function refreshDashboard() {
  syncProgressIdentity();

  if (!currentUser) {
    renderLoggedOutDashboard();
    return;
  }

  try {
    const dashboard = await fetchDashboard(currentUser.id);
    renderDashboardState(dashboard);
  } catch (error) {
    setMessage(error.message, "error", "auth-message");
  }
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
    user_id: currentUser ? currentUser.id : null,
    student_name: document.getElementById("student-name").value.trim() || null,
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
    if (currentUser) {
      await refreshDashboard();
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function handleAskAICoach() {
  if (!currentLessonRuntime) {
    setMessage("Select a lesson first.", "error", "lesson-attempt-message");
    return;
  }

  const answer = document.getElementById("lesson-answer").value.trim();
  if (!answer) {
    setMessage("Write an answer before asking the AI coach.", "error", "lesson-attempt-message");
    return;
  }

  setMessage("Getting coaching feedback...", "default", "lesson-attempt-message");

  try {
    const response = await askAICoach({
      user_id: currentUser ? currentUser.id : null,
      lesson_id: currentLessonRuntime.lesson.id,
      answer,
    });
    document.getElementById("ai-coach-response").textContent =
      `${response.feedback} (${response.provider})`;
    setMessage("AI coach feedback ready.", "success", "lesson-attempt-message");
  } catch (error) {
    setMessage(error.message, "error", "lesson-attempt-message");
  }
}

async function handleSubmitLessonAttempt() {
  if (!requireSignedInForLessonAction()) {
    return;
  }
  if (!currentLessonRuntime) {
    setMessage("Select a lesson first.", "error", "lesson-attempt-message");
    return;
  }

  const answer = document.getElementById("lesson-answer").value.trim();
  if (!answer) {
    setMessage("Write an answer before submitting the assessment.", "error", "lesson-attempt-message");
    return;
  }

  setMessage("Submitting assessment...", "default", "lesson-attempt-message");

  try {
    const attempt = await submitLessonAttempt({
      lesson_id: currentLessonRuntime.lesson.id,
      user_id: currentUser.id,
      answer,
    });
    document.getElementById("ai-coach-response").textContent = attempt.feedback;
    setMessage(`Assessment scored ${attempt.score}/100.`, "success", "lesson-attempt-message");
  } catch (error) {
    setMessage(error.message, "error", "lesson-attempt-message");
  }
}

async function updateLessonCompletion(status) {
  if (!requireSignedInForLessonAction()) {
    return;
  }
  if (!currentLessonRuntime) {
    setMessage("Select a lesson first.", "error", "lesson-completion-message");
    return;
  }

  try {
    const completion = await saveLessonCompletion({
      lesson_id: currentLessonRuntime.lesson.id,
      user_id: currentUser.id,
      status,
      feedback: document.getElementById("ai-coach-response").textContent,
      score: status === "Completed" ? 100 : null,
    });
    currentLessonRuntime.completion = completion;
    document.getElementById("runtime-status-pill").textContent = `Status: ${completion.status}`;
    setMessage(`Lesson marked ${completion.status.toLowerCase()}.`, "success", "lesson-completion-message");
    await refreshDashboard();
  } catch (error) {
    setMessage(error.message, "error", "lesson-completion-message");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setMessage("Creating account...", "default", "auth-message");

  try {
    const response = await registerUser({
      name: document.getElementById("register-name").value.trim(),
      email: document.getElementById("register-email").value.trim(),
      password: document.getElementById("register-password").value,
      learning_goal: document.getElementById("register-goal").value.trim() || null,
    });
    saveCurrentUser(response.user);
    setMessage("Account created and signed in.", "success", "auth-message");
    document.getElementById("register-form").reset();
    await refreshDashboard();
  } catch (error) {
    setMessage(error.message, "error", "auth-message");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage("Logging in...", "default", "auth-message");

  try {
    const response = await loginUser({
      email: document.getElementById("login-email").value.trim(),
      password: document.getElementById("login-password").value,
    });
    saveCurrentUser(response.user);
    setMessage("Login successful.", "success", "auth-message");
    document.getElementById("login-form").reset();
    await refreshDashboard();
  } catch (error) {
    setMessage(error.message, "error", "auth-message");
  }
}

function handleLogout() {
  clearCurrentUser();
  currentLessonSession = null;
  syncProgressIdentity();
  renderLoggedOutDashboard();
  setMessage("Logged out.", "default", "auth-message");
}

window.addEventListener("DOMContentLoaded", async () => {
  initScene();
  loadCurrentUser();
  syncProgressIdentity();
  renderLoggedOutDashboard();
  initLessonPlayer();

  try {
    const [skills, scenarios] = await Promise.all([fetchSkills(), fetchScenarios()]);
    renderSkills(skills);
    renderScenarios(scenarios);
    if (skills.length) {
      const defaultSkill = skills.find((skill) => skill.slug === "electrical-installation") || skills[0];
      const firstCourse = await fetchSkillCourse(defaultSkill.id);
      renderCourse(firstCourse);
    }
  } catch (error) {
    document.getElementById("skill-list").innerHTML =
      `<div class="skill-card loading-card">${error.message}</div>`;
    renderScenarioError(error.message);
    document.getElementById("course-module-list").innerHTML =
      `<div class="progress-panel loading-card">${error.message}</div>`;
  }

  if (currentUser) {
    await refreshDashboard();
  }

  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-button").addEventListener("click", handleLogout);
  document.getElementById("start-session-button").addEventListener("click", async () => {
    try {
      await ensureLessonSession();
      setSimulationMessage("Lesson session started. Inspect the panel first.", "success");
    } catch (error) {
      setSimulationMessage(error.message, "error");
    }
  });
  document.getElementById("reset-simulation-button").addEventListener("click", resetSimulation);
  document.querySelectorAll(".simulation-action").forEach((button) => {
    button.addEventListener("click", () => {
      runSimulationAction(button.dataset.action);
    });
  });
  document.getElementById("ask-ai-button").addEventListener("click", handleAskAICoach);
  document.getElementById("submit-attempt-button").addEventListener("click", handleSubmitLessonAttempt);
  document.getElementById("complete-lesson-button").addEventListener("click", async () => {
    await updateLessonCompletion("Completed");
    if (currentLessonSession) {
      await completeLessonSession(currentLessonSession.id, {
        status: "Completed",
        score: simulationState?.score || 100,
        notes: simulationState?.actions.join(", ") || "completed",
      });
    }
  });
  document.getElementById("start-lesson-button").addEventListener("click", () => updateLessonCompletion("In progress"));
  document.getElementById("progress-form").addEventListener("submit", submitProgress);
});
