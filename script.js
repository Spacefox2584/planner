// ----------------------------
// Planner Tool – v2.4 (Supabase Persistence)
// ----------------------------

// Global State
let projects = [];
let groups = [
  { id: Date.now(), name: "Lane A" },
  { id: Date.now() + 1, name: "Lane B" }
];

// ----------------------------
// Load from Supabase (via API)
// ----------------------------
async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    const data = await res.json();

    if (data.projects) {
      projects = data.projects;
      console.log("Loaded projects into state:", projects);
      renderProjects();
    } else {
      console.warn("No projects returned from API, using defaults");
      renderProjects();
    }
  } catch (err) {
    console.error("Load state failed:", err);
    renderProjects(); // fallback render
  }
}

// ----------------------------
// Save to Supabase (via API)
// ----------------------------
async function saveState() {
  try {
    const res = await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects })
    });

    const data = await res.json();
    if (res.ok) {
      console.log("Save success:", data);
    } else {
      console.error("Save failed:", data);
    }
  } catch (err) {
    console.error("Save state failed:", err);
  }
}

// ----------------------------
// Utility Helpers
// ----------------------------
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function findGroup(id) {
  return groups.find(g => g.id === id);
}

// ----------------------------
// Project Handling
// ----------------------------
function addProject(name, groupId) {
  const project = {
    id: generateId(),
    name,
    groupId,
    subtasks: [],
    completed: 0
  };

  projects.push(project);
  renderProjects();
  saveState();
}

function deleteProject(id) {
  projects = projects.filter(p => p.id !== id);
  renderProjects();
  saveState();
}

function updateCompletion(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const total = project.subtasks.length;
  const done = project.subtasks.filter(s => s.done).length;
  project.completed = total > 0 ? Math.round((done / total) * 100) : 0;

  renderProjects();
  saveState();
}

function addSubtask(projectId, name) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  project.subtasks.push({ id: generateId(), name, done: false });
  updateCompletion(projectId);
}

function toggleSubtask(projectId, subtaskId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const subtask = project.subtasks.find(s => s.id === subtaskId);
  if (subtask) subtask.done = !subtask.done;

  updateCompletion(projectId);
}

// ----------------------------
// Rendering
// ----------------------------
function renderProjects() {
  groups.forEach(group => {
    const container = document.getElementById(`group-${group.id}`);
    if (!container) return;

    container.innerHTML = "";
    projects
      .filter(p => p.groupId == group.id)
      .forEach(project => {
        const div = document.createElement("div");
        div.className = "project-card";

        const title = document.createElement("h3");
        title.textContent = project.name;
        div.appendChild(title);

        const progress = document.createElement("p");
        progress.textContent = `${project.completed}% complete`;
        div.appendChild(progress);

        // Subtasks list
        const ul = document.createElement("ul");
        project.subtasks.forEach(st => {
          const li = document.createElement("li");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = st.done;
          checkbox.addEventListener("change", () =>
            toggleSubtask(project.id, st.id)
          );
          li.appendChild(checkbox);
          li.appendChild(document.createTextNode(st.name));
          ul.appendChild(li);
        });
        div.appendChild(ul);

        // Add subtask button
        const addSubtaskBtn = document.createElement("button");
        addSubtaskBtn.textContent = "+ Subtask";
        addSubtaskBtn.addEventListener("click", () => {
          const name = prompt("Subtask name:");
          if (name) addSubtask(project.id, name);
        });
        div.appendChild(addSubtaskBtn);

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteProject(project.id));
        div.appendChild(deleteBtn);

        container.appendChild(div);
      });
  });
}

// ----------------------------
// Group Rendering
// ----------------------------
function renderGroups() {
  const groupContainer = document.getElementById("groups");
  if (!groupContainer) return;

  groupContainer.innerHTML = "";
  groups.forEach(group => {
    const col = document.createElement("div");
    col.className = "group";
    col.id = `group-${group.id}`;

    const header = document.createElement("h2");
    header.textContent = group.name;
    col.appendChild(header);

    const addProjectBtn = document.createElement("button");
    addProjectBtn.textContent = "+ Project";
    addProjectBtn.addEventListener("click", () => {
      const name = prompt("Project name:");
      if (name) addProject(name, group.id);
    });
    col.appendChild(addProjectBtn);

    groupContainer.appendChild(col);
  });

  renderProjects();
}

// ----------------------------
// Drag and Drop (using SortableJS)
// ----------------------------
function setupDragAndDrop() {
  groups.forEach(group => {
    const el = document.getElementById(`group-${group.id}`);
    if (!el) return;

    new Sortable(el, {
      group: "shared",
      animation: 150,
      onEnd: evt => {
        const item = evt.item;
        const projectName = item.querySelector("h3").textContent;
        const project = projects.find(p => p.name === projectName);
        if (project) {
          const newGroupId = parseInt(evt.to.id.replace("group-", ""), 10);
          project.groupId = newGroupId;
          saveState();
        }
      }
    });
  });
}

// ----------------------------
// Theme Toggle
// ----------------------------
function setupThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
  });
}

// ----------------------------
// Init
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderGroups();
  setupDragAndDrop();
  setupThemeToggle();
  loadState();
});
