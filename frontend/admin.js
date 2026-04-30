const BACKEND_URL = "http://127.0.0.1:8001";

async function fetchScenarios() {
  const response = await fetch(`${BACKEND_URL}/scenarios`);
  const scenarios = await response.json();
  return scenarios;
}

async function fetchProgress() {
  const response = await fetch(`${BACKEND_URL}/progress`);
  const progress = await response.json();
  return progress;
}

function renderScenarios(scenarios) {
  const listEl = document.getElementById("admin-scenario-list");
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
      <p style="margin-top: 0.75rem; font-size: 0.95rem; color: #d1d9ff;">ID: ${scenario.id}</p>
    `;
    listEl.appendChild(card);
  });
}

function renderProgress(progress) {
  const listEl = document.getElementById("progress-list");
  listEl.innerHTML = "";

  if (!progress.length) {
    listEl.innerHTML = "<div class=\"scenario-item\">No progress records.</div>";
    return;
  }

  progress.forEach((p) => {
    const card = document.createElement("div");
    card.className = "scenario-item";
    card.innerHTML = `
      <h3>${p.student_name}</h3>
      <p>Scenario ID: ${p.scenario_id} - Status: ${p.status}</p>
      <p style="font-size: 0.9rem; color: #d1d9ff;">Updated: ${new Date(p.updated_at).toLocaleString()}</p>
    `;
    listEl.appendChild(card);
  });
}

async function addScenario(event) {
  event.preventDefault();
  const messageEl = document.getElementById("add-message");
  messageEl.textContent = "Adding scenario...";

  const payload = {
    title: document.getElementById("scenario-title").value.trim(),
    description: document.getElementById("scenario-description").value.trim(),
    tool: document.getElementById("scenario-tool").value.trim(),
    difficulty: document.getElementById("scenario-difficulty").value,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to add scenario.");
    }

    messageEl.textContent = "Scenario added successfully.";
    messageEl.style.color = "#a7ffb8";
    document.getElementById("add-scenario-form").reset();
    // Refresh scenarios
    const scenarios = await fetchScenarios();
    renderScenarios(scenarios);
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.style.color = "#ff9b9b";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const scenarios = await fetchScenarios();
  renderScenarios(scenarios);

  const progress = await fetchProgress();
  renderProgress(progress);

  const form = document.getElementById("add-scenario-form");
  form.addEventListener("submit", addScenario);
});