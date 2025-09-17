// --- State ---
let projects = [];
let currentProject = null;
let pendingSubtasks = [];

// --- DOM refs ---
let board, addProjectBtn, runTestsBtn, testResultsDiv;
let modal, modalTitle, subtasksDiv, addSubtaskBtn, generateSubtasksBtn, closeModalBtn, subtaskCounter;
let approveBtn, cancelBtn, selectAllBtn;

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

  // Approval buttons (will be added dynamically)
  approveBtn = document.createElement("button");
  approveBtn.textContent = "✅ Approve Selected";
  approveBtn.addEventListener("click", approvePending);

  cancelBtn = document.createElement("button");
  cancelBtn.textContent = "❌ Cancel";
  cancelBtn.addEventListener("click", cancelPending);

  selectAllBtn = document.createElement("button");
  selectAllBtn.textContent = "Select All";
  selectAllBtn.addEventListener("click", toggleSelectAll);

  // Start hidden
  modal.classList.add("hidden");

  // Bind events
  addProjectBtn.addEventListener("click", onAddProject);
  addSubtaskBtn.addEventListener("click", onAddSubtask);
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  runTestsBtn.addEventListener("click", runTests);
  generateSubtasksBtn.addEventListener("click", onGenerateSubtasks);
});

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
  subtaskCounter.textContent = "";
}

// --- AI Generation ---
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
    } catch {
      throw new Error(`Bad response from server (status ${res.status})`);
    }
    if (!res.ok || data?.error) throw new Error(data?.error || `Server error (status ${res.status})`);

    let lines = Array.isArray(data.subtasks) ? data.subtasks : String(data.subtasks || "").split("\n");

    // Clean + filter AI fluff
    let cleaned = lines
      .map(t => t.replace(/^\s*\d+[\.\)]\s*/, ""))
      .map(t => t.replace(/^\s*[-*]\s*/, ""))
      .map(t => t.trim())
      .filter(t => t.length > 0 && !/^sure|here are|of course/i.test(t));

    const total = cleaned.length;
    pendingSubtasks = cleaned.slice(0, 22); // show up to 22 for review
    renderPendingSubtasks(total);

  } catch (err) {
    alert(`Generate failed: ${err.message}`);
  } finally {
    setGenerateLoading(false);
  }
}

function renderPendingSubtasks(total) {
  subtasksDiv.innerHTML = "";
  pendingSubtasks.forEach((task, i) => {
    const row = document.createElement("div");
    row.className = "task-row pending-task";
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.index = i;
    label.appendChild(cb);
    label.append(" " + task);
    row.appendChild(label);
    subtasksDiv.appendChild(row);
  });
  subtaskCounter.textContent = `0/${total} selected`;

  // Add controls
  subtasksDiv.appendChild(selectAllBtn);
  subtasksDiv.appendChild(approveBtn);
  subtasksDiv.appendChild(cancelBtn);
}

function toggleSelectAll() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => (cb.checked = !allChecked));
  updateCounter();
}

function approvePending() {
  const selected = [];
  subtasksDiv.querySelectorAll("input[type=checkbox]:checked").forEach(cb => {
    selected.push(pendingSubtasks[cb.dataset.index]);
  });
  if (selected.length === 0) {
    alert("No subtasks selected.");
    return;
  }
  selected.forEach(task => currentProject.subtasks.push({ name: task, done: false }));
  pendingSubtasks = [];
  renderSubtasks();
}

function cancelPending() {
  pendingSubtasks = [];
  renderSubtasks();
}

function updateCounter() {
  const total = pendingSubtasks.length;
  const checked = subtasksDiv.querySelectorAll("input[type=checkbox]:checked").length;
  subtaskCounter.textContent = `${checked}/${total} selected`;
}

// --- Rendering ---
function renderProjects() {
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
  modal.classList.remove("hidden");
}

function renderSubtasks() {
  subtasksDiv.innerHTML = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "task-row" + (t.done ? " done" : "");
    row.textContent = t.name;

    // Click anywhere toggles done
    row.onclick = () => {
      t.done = !t.done;
      renderSubtasks();
    };

    // Double-click to edit
    row.ondblclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Edit subtask:", t.name);
      if (newName) {
        t.name = newName.trim();
        renderSubtasks();
      }
    };

    // Delete button
    const del = document.createElement("span");
    del.className = "task-delete";
    del.textContent = "×";
    del.onclick = (e) => {
      e.stopPropagation();
      currentProject.subtasks.splice(i, 1);
      renderSubtasks();
    };
    row.appendChild(del);

    subtasksDiv.appendChild(row);
    if (t.done) currentProject.completed++;
  });

  renderProjects();
  subtaskCounter.textContent = "";
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

function setGenerateLoading(isLoading) {
  generateSubtasksBtn.disabled = isLoading;
  generateSubtasksBtn.textContent = isLoading ? "… Generating" : "✨ Generate Example Subtasks";
}

// --- Test suite (unchanged core) ---
function runTests() {
  let report = "=== Running Planner Tests ===\n";
  projects = [];
  renderProjects();

  projects.push({ name: "Test Project", subtasks: [], completed: 0 });
  renderProjects();
  report += "✅ Project added\n";

  currentProject = projects[0];
  currentProject.subtasks.push({ name: "Subtask A", done: false });
  currentProject.subtasks.push({ name: "Subtask B", done: false });
  renderSubtasks();
  report += "✅ Subtasks added\n";

  currentProject.subtasks[0].done = true;
  renderSubtasks();
  report += "✅ Progress updates\n";

  report += "=== Tests complete ===";
  testResultsDiv.textContent = report;
}
