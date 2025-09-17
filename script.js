// --- State ---
let projects = [];
let currentProject = null;

// --- DOM refs ---
let board, addProjectBtn, runTestsBtn, testResultsDiv;
let modal, modalTitle, subtasksDiv, addSubtaskBtn, generateSubtasksBtn, closeModalBtn, subtaskCounter;

window.addEventListener("DOMContentLoaded", () => {
  // Grab elements
  board = document.getElementById("board");
  addProjectBtn = document.getElementById("addProject");
  runTestsBtn = document.getElementById("runTests");
  testResultsDiv = document.getElementById("testResults");

  modal = document.getElementById("modal");
  modalTitle = document.getElementById("modalTitle");
  subtasksDiv = document.getElementById("subtasks");
  addSubtaskBtn = document.getElementById("addSubtask");
  generateSubtasksBtn = document.getElementById("generateSubtasks");
  closeModalBtn = document.getElementById("closeModal");
  subtaskCounter = document.getElementById("subtaskCounter");

  // Start hidden
  modal.classList.add("hidden");

  // Bind events
  addProjectBtn.addEventListener("click", onAddProject);
  addSubtaskBtn.addEventListener("click", onAddSubtask);
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  runTestsBtn.addEventListener("click", runTests);
  generateSubtasksBtn.addEventListener("click", onGenerateSubtasks);
});

// --- UI Helpers ---
function setGenerateLoading(isLoading) {
  if (!generateSubtasksBtn) return;
  generateSubtasksBtn.disabled = isLoading;
  generateSubtasksBtn.textContent = isLoading ? "… Generating" : "✨ Generate Example Subtasks";
}

function showError(message) {
  console.error("[Planner Error]", message);
  alert(message);
}

// --- Core actions ---
function onAddProject() {
  const name = prompt("Project name:");
  if (!name) return;
  const project = { name, subtasks: [], completed: 0 };
  projects.push(project);
  renderProjects();
}

function onAddSubtask() {
  if (!currentProject) return;
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false });
  renderSubtasks();
  if (subtaskCounter) subtaskCounter.textContent = ""; // reset counter if manual
}

async function onGenerateSubtasks() {
  if (!currentProject) return;

  setGenerateLoading(true);
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: currentProject.name })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Bad response from server (status ${res.status})`);
    }

    if (!res.ok || data?.error) {
      throw new Error(data?.error || `Server error (status ${res.status})`);
    }

    // Handle array or string
    let lines = Array.isArray(data.subtasks)
      ? data.subtasks
      : String(data.subtasks || "").split("\n");

    // Clean + limit
    let cleaned = lines
      .map(t => t.replace(/^\s*\d+[\.\)]\s*/, "")) // strip "1." / "1)"
      .map(t => t.replace(/^\s*[-*]\s*/, ""))      // strip "-" / "*"
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const total = cleaned.length;
    const tasks = cleaned.slice(0, 8); // hard cap

    if (tasks.length === 0) {
      showError("No subtasks returned. Try a more specific project name.");
      return;
    }

    tasks.forEach(task => currentProject.subtasks.push({ name: task, done: false }));

    renderSubtasks();
    if (subtaskCounter) {
      subtaskCounter.textContent = total > tasks.length
        ? `${tasks.length}/${total} subtasks shown`
        : `${tasks.length} subtasks`;
    }
  } catch (err) {
    showError(`Generate failed: ${err.message}`);
  } finally {
    setGenerateLoading(false);
  }
}

// --- Rendering ---
function renderProjects() {
  if (!board) return;
  board.innerHTML = "";
  projects.forEach((p, index) => {
    const square = document.createElement("div");
    square.className = "square";
    square.innerHTML = `<strong>${escapeHtml(p.name)}</strong>
      <div>${p.completed}/${p.subtasks.length}</div>
      <div class="progress" style="width:${progressPercent(p)}%"></div>`;
    square.onclick = () => openProject(index);
    board.appendChild(square);
  });
}

function openProject(index) {
  currentProject = projects[index];
  modalTitle.textContent = currentProject.name;
  renderSubtasks();
  if (subtaskCounter) subtaskCounter.textContent = "";
  modal.classList.remove("hidden");
}

function renderSubtasks() {
  if (!currentProject || !subtasksDiv) return;
  subtasksDiv.innerHTML = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t) => {
    const square = document.createElement("div");
    square.className = "square";
    if (t.done) square.classList.add("done");
    square.textContent = t.name;
    square.onclick = () => {
      t.done = !t.done;
      renderSubtasks();
    };
    subtasksDiv.appendChild(square);
    if (t.done) currentProject.completed++;
  });

  renderProjects();
}

function progressPercent(project) {
  if (project.subtasks.length === 0) return 0;
  return (project.completed / project.subtasks.length) * 100;
}

// --- Utils ---
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// --- Test suite ---
function runTests() {
  let report = "=== Running Planner Tests ===\n";
  projects = [];
  renderProjects();

  projects.push({ name: "Test Project", subtasks: [], completed: 0 });
  renderProjects();
  report += projects.length === 1 ? "✅ Project added\n" : "❌ Project add failed\n";

  currentProject = projects[0];
  currentProject.subtasks.push({ name: "Subtask A", done: false });
  currentProject.subtasks.push({ name: "Subtask B", done: false });
  renderSubtasks();
  report += currentProject.subtasks.length === 2 ? "✅ Subtasks added\n" : "❌ Subtasks add failed\n";

  currentProject.subtasks[0].done = true;
  renderSubtasks();
  report += currentProject.completed === 1 ? "✅ Progress updates\n" : "❌ Progress failed\n";

  report += "=== Tests complete ===";
  console.log(report);
  if (testResultsDiv) testResultsDiv.textContent = report;

  projects = [];
  currentProject = null;
  renderProjects();
  if (subtasksDiv) subtasksDiv.innerHTML = "";
}
