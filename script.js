/* =========================
   Suite Shell: tab switcher
   ========================= */
window.showTool = function (tool, btn) {
  const panes = document.querySelectorAll(".tool-pane");
  panes.forEach((p) => p.classList.add("hidden"));
  const target = document.getElementById(`tool-${tool}`);
  if (target) target.classList.remove("hidden");

  const buttons = document.querySelectorAll(".suite-btn");
  buttons.forEach((b) => b.classList.remove("is-active"));
  if (btn) btn.classList.add("is-active");
};

/* =========================
   Theme Toggle
   ========================= */
(function themeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  const root = document.documentElement;
  const saved = localStorage.getItem("theme") || "dark";
  root.setAttribute("data-theme", saved);
  toggle.checked = saved === "dark";
  toggle.addEventListener("change", () => {
    const next = toggle.checked ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
})();

/* =========================
   Planner State
   ========================= */
let groups = [];   // [{id, name, position}]
let projects = []; // [{id, name, groupId, completed, subtasks:[] }]

// UI refs
let lanesEl, addGroupBtn, addProjectBtn;

/* ---- Helpers ---- */
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function isUuid(v) {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/* ---- Persistence ---- */
async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    groups = Array.isArray(data.groups) ? data.groups : [];
    projects = Array.isArray(data.projects) ? data.projects : [];

    // If DB returned nothing, create fallbacks (never blank)
    if (groups.length === 0) {
      groups = [
        { id: uuid(), name: "Lane A", position: 0 },
        { id: uuid(), name: "Lane B", position: 1 },
      ];
    }
    if (projects.length === 0) {
      projects = [
        { id: uuid(), name: "Example Project 1", groupId: groups[0].id, completed: 0, subtasks: [] },
        { id: uuid(), name: "Example Project 2", groupId: groups[1].id, completed: 0, subtasks: [] },
      ];
    }
  } catch (err) {
    console.error("Load failed:", err);
    // Hard fallback
    groups = [
      { id: uuid(), name: "Lane A", position: 0 },
      { id: uuid(), name: "Lane B", position: 1 },
    ];
    projects = [
      { id: uuid(), name: "Example Project 1", groupId: groups[0].id, completed: 0, subtasks: [] },
      { id: uuid(), name: "Example Project 2", groupId: groups[1].id, completed: 0, subtasks: [] },
    ];
  }
}

async function saveState() {
  try {
    const payload = {
      groups,
      projects: projects.map((p) => ({
        ...p,
        id: isUuid(p.id) ? p.id : uuid(),
        groupId: isUuid(p.groupId) ? p.groupId : (groups[0]?.id ?? null),
        completed: Number.isFinite(p.completed) ? p.completed : 0,
        subtasks: Array.isArray(p.subtasks) ? p.subtasks : [],
      })),
    };

    const res = await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Save failed:", err);
      alert("Save failed. See console for details.");
    }
  } catch (err) {
    console.error("Save failed:", err);
  }
}

/* ---- Actions ---- */
function onAddGroup() {
  const name = prompt("New lane name?");
  if (!name) return;
  const newGroup = { id: uuid(), name, position: groups.length };
  groups.push(newGroup);
  render();
  saveState();
}

function onRenameGroup(id) {
  const g = groups.find((x) => x.id === id);
  if (!g) return;
  const name = prompt("Rename lane:", g.name);
  if (!name) return;
  g.name = name;
  render();
  saveState();
}

function onDeleteGroup(id) {
  // remove its projects too
  projects = projects.filter((p) => p.groupId !== id);
  groups = groups.filter((g) => g.id !== id);
  // reindex positions
  groups.forEach((g, i) => g.position = i);
  render();
  saveState();
}

function onAddProject() {
  if (groups.length === 0) { alert("No lanes yet. Add a lane first."); return; }
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
  render();
  saveState();
}

function onDeleteProject(id) {
  projects = projects.filter((p) => p.id !== id);
  render();
  saveState();
}

/* ---- Rendering ---- */
function render() {
  if (!lanesEl) return;
  // Remove only existing lane nodes (keeps the controls separate)
  const old = lanesEl.querySelectorAll(".lane");
  old.forEach((n) => n.remove());

  // Ensure order is stable
  const sortedGroups = [...groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  sortedGroups.forEach((g) => {
    const lane = document.createElement("div");
    lane.className = "lane";

    // header
    const header = document.createElement("div");
    header.className = "lane-header";

    const title = document.createElement("h3");
    title.className = "lane-title";
    title.textContent = g.name;

    const actions = document.createElement("div");
    actions.className = "lane-actions";
    const btnRename = document.createElement("button");
    btnRename.className = "action";
    btnRename.textContent = "Rename";
    btnRename.onclick = () => onRenameGroup(g.id);

    const btnDelete = document.createElement("button");
    btnDelete.className = "action";
    btnDelete.textContent = "Delete";
    btnDelete.onclick = () => onDeleteGroup(g.id);

    actions.appendChild(btnRename);
    actions.appendChild(btnDelete);
    header.appendChild(title);
    header.appendChild(actions);
    lane.appendChild(header);

    // projects
    const grid = document.createElement("div");
    grid.className = "projects";

    projects
      .filter((p) => p.groupId === g.id)
      .forEach((p) => {
        const card = document.createElement("div");
        card.className = "project";

        const top = document.createElement("div");
        top.className = "project-top";

        const h4 = document.createElement("h4");
        h4.className = "project-title";
        h4.textContent = p.name;

        const del = document.createElement("button");
        del.className = "project-del";
        del.setAttribute("title", "Delete project");
        del.textContent = "×";
        del.onclick = () => onDeleteProject(p.id);

        top.appendChild(h4);
        top.appendChild(del);

        const info = document.createElement("div");
        info.className = "progress";
        const pct = Math.max(0, Math.min(100, Number(p.completed) || 0));
        info.innerHTML = `<span>Progress</span><span>${pct}%</span>`;

        const bar = document.createElement("div");
        bar.className = "progress-bar";
        const fill = document.createElement("span");
        fill.style.width = `${pct}%`;
        bar.appendChild(fill);

        card.appendChild(top);
        card.appendChild(info);
        card.appendChild(bar);
        grid.appendChild(card);
      });

    lane.appendChild(grid);
    lanesEl.appendChild(lane);
  });
}

/* ---- Boot ---- */
window.addEventListener("DOMContentLoaded", async () => {
  lanesEl = document.getElementById("lanes");
  addGroupBtn = document.getElementById("addGroup");
  addProjectBtn = document.getElementById("addProject");

  addGroupBtn?.addEventListener("click", onAddGroup);
  addProjectBtn?.addEventListener("click", onAddProject);

  await loadState();
  render();
});
