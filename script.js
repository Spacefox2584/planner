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
let whiteboard, modal;
let addGroupBtn, addProjectBtn, addSubtaskBtn, generateSubtasksBtn, closeModalBtn;
let approveBtn, cancelBtn, selectAllBtn;
let subtasksDiv, subtaskCounter;

let pendingSubtasks = [];

/* ---- Persistence helpers (Supabase via /api) ---- */
async function saveState() {
  try {
    const res = await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects })
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

async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    const data = await res.json();
    if (Array.isArray(data.projects)) {
      projects = data.projects;
    }
  } catch (err) {
    console.error("Load failed:", err);
  }
}

/* Ensure we have at least two default lanes if none exist */
function ensureDefaultLanes() {
  if (groups.length >= 2) return;
  const t = Date.now();
  groups = [
    { id: String(t + 1), name: "Lane A" },
    { id: String(t + 2), name: "Lane B" }
  ];
  projects.forEach(p => { if (!p.groupId) p.groupId = groups[0].id; });
}

/* ---- Demo UI plumbing (consistent with 2.5/2.6) ---- */
function onAddGroup() {
  const name = prompt("New lane name?");
  if (!name) return;
  groups.push({ id: cryptoRandomId(), name });
  render();
}

function onAddProject() {
  const name = prompt("Project name?");
  if (!name) return;
  projects.push({
    id: cryptoRandomId(),
    name,
    groupId: groups[0]?.id || null,
    completed: 0,
    subtasks: []
  });
  render();
  saveState();
}

function onAddSubtask() {
  const p = projects[0];
  if (!p) return alert("Make a project first.");
  p.subtasks = p.subtasks || [];
  p.subtasks.push({ id: cryptoRandomId(), text: `Task ${p.subtasks.length+1}`, done: false });
  render();
  saveState();
}

async function onGenerateSubtasks() {
  generateSubtasksBtn.disabled = true;
  generateSubtasksBtn.textContent = "Generating…";
  try {
    // placeholder generator – keep behavior identical to v2.6
    pendingSubtasks = Array.from({length:5}).map((_,i)=> ({
      id: cryptoRandomId(),
      text: `Suggested task ${i+1}`
    }));
    renderPendingSubtasks();
  } catch (err) {
    alert(`Generate failed: ${err.message}`);
  } finally {
    generateSubtasksBtn.disabled = false;
    generateSubtasksBtn.textContent = "✨ Generate Example Subtasks";
  }
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

function acceptSelectedSubtasks() {
  const checks = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const toAdd = [];
  checks.forEach((cb) => {
    if (cb.checked) {
      const idx = Number(cb.dataset.i);
      const t = pendingSubtasks[idx];
      if (t) toAdd.push(t);
    }
  });
  if (!projects.length) return alert("Create a project first.");
  const p = projects[0];
  p.subtasks = p.subtasks || [];
  toAdd.forEach(t => p.subtasks.push({ id: cryptoRandomId(), text: t.text, done: false }));
  pendingSubtasks = [];
  renderPendingSubtasks();
  render();
  saveState();
}

/* ---- Render ---- */
function render() {
  const lanes = document.getElementById("lanes");
  if (!lanes) return;
  lanes.innerHTML = "";
  ensureDefaultLanes();

  groups.forEach(g => {
    const col = document.createElement('div');
    col.className = 'lane';
    const title = document.createElement('h3');
    title.textContent = g.name;
    col.appendChild(title);

    const list = document.createElement('ul');
    projects.filter(p => p.groupId === g.id).forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.name;
      list.appendChild(li);
    });
    col.appendChild(list);

    lanes.appendChild(col);
  });
}

/* ---- Utilities ---- */
function toggleSelectAll() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  selectAllBtn.textContent = allChecked ? "☑ Select All" : "☐ Deselect All";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function cryptoRandomId() {
  // Browser-safe UUID-ish id for client-side only
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---- Boot ---- */
window.addEventListener("DOMContentLoaded", async () => {
  whiteboard = document.getElementById("whiteboard");
  modal = document.getElementById("modal");

  subtasksDiv = document.getElementById("subtasksDiv");
  subtaskCounter = document.getElementById("subtaskCounter");

  addGroupBtn = document.getElementById("addGroup");
  addProjectBtn = document.getElementById("addProject");
  addSubtaskBtn = document.getElementById("addSubtask");
  generateSubtasksBtn = document.getElementById("generateSubtasks");
  closeModalBtn = document.getElementById("closeModal");

  approveBtn = document.getElementById("approveBtn");
  cancelBtn = document.getElementById("cancelBtn");
  selectAllBtn = document.getElementById("selectAllBtn");

  if (!whiteboard) return;

  addGroupBtn?.addEventListener("click", onAddGroup);
  addProjectBtn?.addEventListener("click", onAddProject);
  addSubtaskBtn?.addEventListener("click", onAddSubtask);
  generateSubtasksBtn?.addEventListener("click", onGenerateSubtasks);
  approveBtn?.addEventListener("click", acceptSelectedSubtasks);
  selectAllBtn?.addEventListener("click", toggleSelectAll);
  cancelBtn?.addEventListener("click", () => { pendingSubtasks = []; renderPendingSubtasks(); });

  await loadState();     // ← pulls existing projects from Supabase
  ensureDefaultLanes();  // ← keep UI sane even if DB empty
  render();
});
