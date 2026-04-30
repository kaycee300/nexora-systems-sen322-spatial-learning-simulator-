const BACKEND_URL = "http://127.0.0.1:8001";

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

  const form = document.getElementById("progress-form");
  form.addEventListener("submit", submitProgress);
});