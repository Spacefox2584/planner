let projects = [];
let currentProject = null;

// Elements
const board = document.getElementById("board");
const addProjectBtn = document.getElementById("addProject");
const runTestsBtn = document.getElementById("runTests");
const testResultsDiv = document.getElementById("testResults");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const subtasksDiv = document.getElementById("subtasks");
const addSubtaskBtn = document.getElementById("addSubtask");
const closeModalBtn = document.getElementById("closeModal");

// Ensure modal is hidden on page load
window.addEventListener("DOMContentLoaded", () => {
  modal.classList.add("hidden");
});

// Add new project
addProjectBtn.addEventListener("click", () => {
  const name = prompt("Project name:");
  if (!name) return;
  const project = { name, subtasks: [], completed: 0 };
  projects.push(project);
  renderProjects();
});

// Render all projects
function renderProjects() {
  board.innerHTML = "";
  projects.forEach((p, index) => {
    const square = document.createElement("div");
    square.className = "square";
    square.innerHTML = `<strong>${p.name}</strong>
      <div>${p.completed}/${p.subtasks.length}</div>
      <div class="progress" style="width:${progressPercent(p)}%"></div>`;
    square.onclick = () => openProject(index);
    board.appendChild(square);
  });
}

function progressPercent(project) {
  if (project.subtasks.length === 0) return 0;
  return (project.completed / project.subtasks.length) * 100;
}

// Open project modal
function openProject(index) {
  currentProject = projects[index];
  modalTitle.textContent = currentProject.name;
  renderSubtasks();
  modal.classList.remove("hidden");
}

// Add new subtask
addSubtaskBtn.addEventListener("click", () => {
  if (!currentProject) return;
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false });
  renderSubtasks();
});

// Render subtasks
function renderSubtasks() {
  if (!currentProject) return;
  subtasksDiv.innerHTML = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t) => {
    const square = document.createElement("div");
    square.className = "square";
    if (t.done) square.classList.add("done");
    square.innerHTML = t.name;

    square.onclick = () => {
      t.done = !t.done;
      renderSubtasks();
    };

    subtasksDiv.appendChild(square);
    if (t.done) currentProject.completed++;
  });

  renderProjects();
}

// Close modal
closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// === TEST SUITE ===
function runTests() {
  let report = "=== Running Planner Tests ===\n";
  projects = [];
  renderProjects();

  // Add project
  projects.push({ name: "Test Project", subtasks: [], completed: 0 });
  renderProjects();
  report += projects.length === 1 ? "✅ Project added\n" : "❌ Project add failed\n";

  // Add subtasks
  currentProject = projects[0];
  currentProject.subtasks.push({ name: "Subtask A", done: false });
  currentProject.subtasks.push({ name: "Subtask B", done: false });
  renderSubtasks();
  report += currentProject.subtasks.length === 2 ? "✅ Subtasks added\n" : "❌ Subtasks add failed\n";

  // Toggle
  currentProject.subtasks[0].done = true;
  renderSubtasks();
  report += currentProject.completed === 1 ? "✅ Progress updates\n" : "❌ Progress failed\n";

  // Done
  report += "=== Tests complete ===";
  console.log(report);
  testResultsDiv.textContent = report;

  // Reset state (so test data doesn’t pollute)
  projects = [];
  currentProject = null;
  renderProjects();
  subtasksDiv.innerHTML = "";
}

// Bind button
runTestsBtn.addEventListener("click", runTests);
