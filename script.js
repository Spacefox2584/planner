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
   Planner State (persisted)
   ========================= */
let groups = [];   // [{id, name, position}]
let projects = []; // [{id, name, groupId, completed, subtasks:[] }]

// UI refs
let lanesEl, subtasksDiv, subtaskCounter;
let addGroupBtn, addProjectBtn, addSubtaskBtn, generateSubtasksBtn;
let approveBtn, cancelBtn, selectAllBtn;

let pendingSubtasks = [];

/* ---- Persistence via API ---- */
async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    groups = Array.isArray(data.groups) ? data.groups : [];
    projects = Array.isArray(data.projects) ? data.projects : [];
  } catch (err) {
    console.error("Load failed:", err);
    if (groups.length === 0) {
      groups = [
        { id: uuid(), name: "Lane A", position: 0 },
        { id: uuid(), name: "Lane B", position: 1 }
      ];
    }
  }
}

async function saveState() {
  try {
    const payload = {
      groups,
      projects: projects.map(p => ({
        ...p,
        groupId: groups.find(g => g.id === p.groupId)?.id || (groups[0]?.id ?? null),
        completed: Number.isFinite(p.completed) ? p.completed : 0,
        subtasks: Array.isArray(p.subtasks) ? p.subtasks : []
      }))
    };

    const res = await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)   // 👈 sends groups + projects properly
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
  groups.push({ id: uuid(), name, position });
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
  projects.push({
    id: uuid(),
    name,
    groupId: groups[0].id,
    completed: 0,
    subtasks: []
  });
  render();
  saveState();
}

function onAddSubtask() {
  const p = pickProject();
  if (!p) return alert("Create a project first.");
  const text = prompt("Subtask text?");
  if (!text) return;
  p.subtasks = p.subtasks || [];
  p.subtasks.push({ id: uuid(), text, done: false });
  render();
  saveState();
}

async function onGenerateSubtasks() {
  generateSubtasksBtn.disabled = true;
  generateSubtasksBtn.textContent = "Generating…";
  try {
    pendingSubtasks = Array.from({ length: 5 }).map((_, i) => ({
      id: uuid(),
      text: `Suggested task ${i + 1}`
    }));
    renderPendingSubtasks();
  } catch (err) {
    alert(`Generate failed: ${err.message}`);
  } finally {
    generateSubtasksBtn.disabled = false;
    generateSubtasksBtn.textContent = "✨ Generate Example Subtasks";
  }
}

function acceptSelectedSubtasks() {
  const p = pickProject();
  if (!p) return alert("Create a project first.");
  const checks = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const toAdd = [];
  checks.forEach((cb, i) => { if (cb.checked) toAdd.push(pendingSubtasks[i]); });
  p.subtasks = p.subtasks || [];
  toAdd.forEach(t => p.subtasks.push({ id: uuid(), text: t.text, done: false }));
  pendingSubtasks = [];
  renderPendingSubtasks();
  render();
  saveState();
}

function toggleSelectAll() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  selectAllBtn.textContent = allChecked ? "☑ Select All" : "☐ Deselect All";
}

/* ---- Helpers ---- */
function pickProject() {
  return projects[0]; // just grab the first project for now
}

function renderPendingSubtasks() {
  if (!subtasksDiv) return;
  subtasksDiv.innerHTML = "";
  subtaskCounter.textContent = `${pendingSubtasks.length} suggestions`;
  pendingSubtasks.forEach((task, i) => {
    const row = document.createElement("div");
    row.className = "task-row pending-task";
    row.innerHTML = `
      <label>
        <input type="checkbox" data-i="${i}" />
        <span>${escapeHtml(task.text)}</span>
      </label>
    `;
    subtasksDiv.appendChild(row);
  });
}

function render() {
  if (!lanesEl) return;
  lanesEl.innerHTML = "";

  const sortedGroups = [...groups].sort((a,b) => (a.position ?? 0) - (b.position ?? 0));

  sortedGroups.forEach(g => {
    const col = document.createElement('div');
    col.className = 'lane';
    const title = document.createElement('h3');
    title.textContent = g.name;
    col.appendChild(title);

    const list = document.createElement('ul');
    projects
      .filter(p => p.groupId === g.id)
      .forEach(p => {
        const li = document.createElement('li');
        li.className = 'project-item';
        li.textContent = p.name;
        list.appendChild(li);
      });
    col.appendChild(list);

    lanesEl.appendChild(col);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
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
  addSubtaskBtn = document.getElementById("addSubtask");
  generateSubtasksBtn = document.getElementById("generateSubtasks");
  approveBtn = document.getElementById("approveBtn");
  cancelBtn = document.getElementById("cancelBtn");
  selectAllBtn = document.getElementById("selectAllBtn");

  addGroupBtn?.addEventListener("click", onAddGroup);
  addProjectBtn?.addEventListener("click", onAddProject);
  addSubtaskBtn?.addEventListener("click", onAddSubtask);
  generateSubtasksBtn?.addEventListener("click", onGenerateSubtasks);
  approveBtn?.addEventListener("click", acceptSelectedSubtasks);
  cancelBtn?.addEventListener("click", () => { pendingSubtasks = []; renderPendingSubtasks(); });
  selectAllBtn?.addEventListener("click", toggleSelectAll);

  await loadState();
  render();
});
