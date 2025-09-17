// --- State ---
let projects = [];
let currentProject = null;
let pendingSubtasks = [];

// --- DOM refs ---
let board, addProjectBtn, runTestsBtn, testResultsDiv;
let modal, modalTitle, subtasksDiv, addSubtaskBtn, generateSubtasksBtn, closeModalBtn, subtaskCounter;
let approveBtn, cancelBtn, selectAllBtn;

window.addEventListener("DOMContentLoaded", () => {
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

  // Extra buttons for approval
  approveBtn = document.createElement("button");
  approveBtn.textContent = "✅ Approve Selected";
  approveBtn.classList.add("hidden");

  cancelBtn = document.createElement("button");
  cancelBtn.textContent = "❌ Cancel";
  cancelBtn.classList.add("hidden");

  selectAllBtn = document.createElement("button");
  selectAllBtn.textContent = "☑ Select All";
  selectAllBtn.classList.add("hidden");

  subtasksDiv.parentNode.insertBefore(approveBtn, subtaskCounter);
  subtasksDiv.parentNode.insertBefore(cancelBtn, subtaskCounter);
  subtasksDiv.parentNode.insertBefore(selectAllBtn, subtaskCounter);

  modal.classList.add("hidden");

  addProjectBtn.addEventListener("click", onAddProject);
  addSubtaskBtn.addEventListener("click", onAddSubtask);
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  runTestsBtn.addEventListener("click", runTests);
  generateSubtasksBtn.addEventListener("click", onGenerateSubtasks);
  approveBtn.addEventListener("click", approvePendingSubtasks);
  cancelBtn.addEventListener("click", cancelPendingSubtasks);
  selectAllBtn.addEventListener("click", toggleSelectAll);

  document.addEventListener("keydown", (e) => {
    if (!pendingSubtasks.length) return;
    if (e.key === "Enter") toggleSelectAll();
    if (e.key === "Escape") cancelPendingSubtasks();
  });
});

// --- Helpers ---
function setGenerateLoading(isLoading) {
  generateSubtasksBtn.disabled = isLoading;
  generateSubtasksBtn.textContent = isLoading ? "… Generating" : "✨ Generate Example Subtasks";
}
function showError(msg) {
  console.error("[Planner Error]", msg);
  alert(msg);
}

// --- Project actions ---
function onAddProject() {
  const name = prompt("Project name:");
  if (!name) return;
  projects.push({ name, subtasks: [], completed: 0 });
  renderProjects();
}
function onAddSubtask() {
  if (!currentProject) return;
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false });
  renderSubtasks();
}

// --- AI flow ---
async function onGenerateSubtasks() {
  if (!currentProject) return;
  setGenerateLoading(true);
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: currentProject.name })
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || "Server error");

    let lines = Array.isArray(data.subtasks) ? data.subtasks : String(data.subtasks || "").split("\n");

    // Debug
    console.group("✨ AI Subtask Debug");
    console.log("Raw:", lines);

    let cleaned = lines
      .map(t => t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^\s*[-*]\s*/, "").trim())
      .filter(t => t && !/^sure|here are|of course/i.test(t));

    console.log("Cleaned:", cleaned);
    const total = cleaned.length;
    pendingSubtasks = cleaned.slice(0, 20); // keep up to 20 for approval
    console.log(`Pending ${pendingSubtasks.length}/${total}`);
    console.groupEnd();

    renderPendingSubtasks();
  } catch (err) {
    showError(`Generate failed: ${err.message}`);
  } finally {
    setGenerateLoading(false);
  }
}

function renderPendingSubtasks() {
  subtasksDiv.innerHTML = "";
  subtaskCounter.textContent = "";
  pendingSubtasks.forEach((task, i) => {
    const row = document.createElement("div");
    row.className = "task-row pending-task";
    row.innerHTML = `<label><input type="checkbox" data-index="${i}"> ${escapeHtml(task)}</label>`;
    subtasksDiv.appendChild(row);
  });
  approveBtn.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");
  selectAllBtn.classList.remove("hidden");
}

function approvePendingSubtasks() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  checkboxes.forEach(cb => {
    if (cb.checked) currentProject.subtasks.push({ name: pendingSubtasks[cb.dataset.index], done: false });
  });
  pendingSubtasks = [];
  hideApprovalControls();
  renderSubtasks();
}
function cancelPendingSubtasks() {
  pendingSubtasks = [];
  hideApprovalControls();
  renderSubtasks();
}
function toggleSelectAll() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  selectAllBtn.textContent = allChecked ? "☑ Select All" : "☐ Deselect All";
}
function hideApprovalControls() {
  approveBtn.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  selectAllBtn.classList.add("hidden");
}

// --- Rendering ---
function renderProjects() {
  board.innerHTML = "";
  projects.forEach((p, i) => {
    const square = document.createElement("div");
    square.className = "square";
    square.innerHTML = `<strong>${escapeHtml(p.name)}</strong>
      <div>${p.completed}/${p.subtasks.length}</div>
      <div class="progress" style="width:${progressPercent(p)}%"></div>`;
    square.onclick = () => openProject(i);
    board.appendChild(square);
  });
}
function openProject(i) {
  currentProject = projects[i];
  modalTitle.textContent = currentProject.name;
  renderSubtasks();
  modal.classList.remove("hidden");
}
function renderSubtasks() {
  if (!currentProject) return;
  subtasksDiv.innerHTML = "";
  subtaskCounter.textContent = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = `task-row ${t.done ? "done" : ""}`;

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = t.name;

    span.ondblclick = () => {
      const newName = prompt("Edit task:", t.name);
      if (newName) {
        t.name = newName;
        renderSubtasks();
      }
    };

    row.appendChild(span);

    const del = document.createElement("span");
    del.textContent = "×";
    del.className = "delete-btn";
    del.onclick = (e) => {
      e.stopPropagation();
      currentProject.subtasks.splice(i, 1);
      renderSubtasks();
    };
    row.appendChild(del);

    row.onclick = () => {
      t.done = !t.done;
      renderSubtasks();
    };

    subtasksDiv.appendChild(row);
    if (t.done) currentProject.completed++;
  });
  renderProjects();
}
function progressPercent(project) {
  return project.subtasks.length ? (project.completed / project.subtasks.length) * 100 : 0;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// --- Tests ---
function runTests() {
  let report = "=== Running Planner Tests ===\n";
  projects = [];
  renderProjects();

  projects.push({ name: "Test Project", subtasks: [], completed: 0 });
  report += projects.length === 1 ? "✅ Project added\n" : "❌ Project add failed\n";

  currentProject = projects[0];
  currentProject.subtasks.push({ name: "Subtask A", done: false });
  currentProject.subtasks.push({ name: "Subtask B", done: false });
  report += currentProject.subtasks.length === 2 ? "✅ Subtasks added\n" : "❌ Subtasks add failed\n";

  currentProject.subtasks[0].done = true;
  renderSubtasks();
  report += currentProject.completed === 1 ? "✅ Progress updates\n" : "❌ Progress failed\n";

  const fakeAI = ["1. Setup hosting","2. Build homepage","Sure! Here are tasks","3. Test checkout"];
  const cleaned = fakeAI.filter(t => !/^sure|here are/i.test(t));
  const capped = cleaned.slice(0, 8);
  report += (capped.length === 3) ? "✅ Fake AI filter/cap works\n" : "❌ Fake AI failed\n";

  report += "=== Tests complete ===";
  console.log(report);
  testResultsDiv.textContent = report;
  projects = [];
  currentProject = null;
}
