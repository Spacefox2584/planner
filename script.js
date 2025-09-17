let projects = [];
let currentProject = null;

// Elements
const board = document.getElementById("board");
const addProjectBtn = document.getElementById("addProject");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const subtasksDiv = document.getElementById("subtasks");
const addSubtaskBtn = document.getElementById("addSubtask");
const closeModalBtn = document.getElementById("closeModal");

// --- DEBUG LOGGING ---
console.log("Planner script loaded");

// Add new project
addProjectBtn.addEventListener("click", () => {
  const name = prompt("Project name:");
  if (!name) return;
  const project = { name, subtasks: [], completed: 0 };
  projects.push(project);
  console.log("Added project:", project);
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
  console.log("Opened project:", currentProject.name);
  renderSubtasks();
  modal.classList.remove("hidden");
}

// Add new subtask
addSubtaskBtn.addEventListener("click", () => {
  if (!currentProject) {
    console.warn("No current project selected!");
    return;
  }
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false });
  console.log("Added subtask:", name);
  renderSubtasks();
});

// Render subtasks
function renderSubtasks() {
  if (!currentProject) return;
  subtasksDiv.innerHTML = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t, i) => {
    const square = document.createElement("div");
    square.className = "square";
    if (t.done) square.classList.add("done");
    square.innerHTML = t.name;

    square.onclick = () => {
      t.done = !t.done;
      console.log("Toggled subtask:", t.name, "→", t.done);
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
  console.log("Closed modal");
});
