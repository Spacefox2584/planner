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
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false });
  renderSubtasks();
});

// Render subtasks
function renderSubtasks() {
  subtasksDiv.innerHTML = "";
  currentProject.completed = 0;

  currentProject.subtasks.forEach((t, i) => {
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
