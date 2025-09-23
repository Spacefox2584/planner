/* =========================
   Suite Shell: tab switcher
   ========================= */
window.showTool = function (tool, btn) {
  const panes = document.querySelectorAll('.tool-pane');
  panes.forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`tool-${tool}`);
  if (target) target.classList.remove('hidden');

  const buttons = document.querySelectorAll('.suite-btn');
  buttons.forEach(b => b.classList.remove('is-active'));
  if (btn) btn.classList.add('is-active');
};

/* =========================
   Theme Toggle
   ========================= */
(function themeToggle(){
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const root = document.documentElement;
  const saved = localStorage.getItem('theme') || 'dark';
  root.setAttribute('data-theme', saved);
  toggle.checked = saved === 'dark';
  toggle.addEventListener('change', () => {
    const next = toggle.checked ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* =========================
   Planner State
   ========================= */
let groups = [];
let projects = [];

// UI refs
let lanesEl;
let subtasksDiv, subtaskCounter;
let addGroupBtn, addProjectBtn, addSubtaskBtn, generateSubtasksBtn;
let approveBtn, cancelBtn, selectAllBtn;

let pendingSubtasks = [];

/* ---- Persistence ---- */
async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    groups = Array.isArray(data.groups) ? data.groups : [];
    projects = Array.isArray(data.projects) ? data.projects : [];

    console.log("Loaded groups:", groups);
    console.log("Loaded projects:", projects);
  } catch (err) {
    console.error("Load failed:", err);
    if (groups.length === 0) {
      groups = [
        { id: uuid(), name: "Lane A", position: 0 },
        { id: uuid(), name: "Lane B", position: 1 },
      ];
    }
  }
}

async function saveState() {
  try {
    const payload = { groups, projects };
    const res = await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Save failed:", await res.json());
    } else {
      console.log("Save success.");
    }
  } catch (err) {
    console.error("Save failed:", err);
  }
}

/* ---- Actions ---- */
function onAddGroup() {
  const name = prompt("New lane name?");
  if (!name) return;
  const position = groups.length;
  const newGroup = { id: uuid(), name, position };
  groups.push(newGroup);
  console.log("Added group:", newGroup);
  render();
  saveState();
}

function onAddProject() {
  if (groups.length === 0) {
    alert("No lanes exist yet. Add a lane first.");
    return;
  }
  const name = prompt("Project name?");
  if (!name) return;
  const newProject = {
    id: uuid(),
    name,
    groupId: groups[0].id,
    completed: 0,
    subtasks: [],
  };
  projects.push(newProject);
  console.log("Added project:", newProject);
  render();
  saveState();
}

/* ---- Rendering ---- */
function render() {
  if (!lanesEl) {
    console.error("No #lanes element found in DOM");
    return;
  }
  lanesEl.innerHTML = "";

  // Fallback if no groups exist
  if (groups.length === 0) {
    groups = [
      { id: uuid(), name: "Lane A", position: 0 },
      { id: uuid(), name: "Lane B", position: 1 },
    ];
    console.log("Created fallback lanes:", groups);
  }

  const sortedGroups = [...groups].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  sortedGroups.forEach((g) => {
    const col = document.createElement("div");
    col.className = "lane";

    const title = document.createElement("h3");
    title.textContent = g.name;
    col.appendChild(title);

    const list = document.createElement("ul");
    projects
      .filter((p) => p.groupId === g.id)
      .forEach((p) => {
        const li = document.createElement("li");
        li.className = "project-item";
        li.textContent = p.name;
        list.appendChild(li);
      });
    col.appendChild(list);

    lanesEl.appendChild(col);
  });
}

/* ---- Helpers ---- */
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ---- Boot ---- */
window.addEventListener("DOMContentLoaded", async () => {
  lanesEl = document.getElementById("lanes");
  subtasksDiv = document.getElementById("subtasksDiv");
  subtaskCounter = document.getElementById("subtaskCounter");

  addGroupBtn = document.getElementById("addGroup");
  addProjectBtn = document.getElementById("addProject");

  addGroupBtn?.addEventListener("click", onAddGroup);
  addProjectBtn?.addEventListener("click", onAddProject);

  await loadState();
  render();
});
