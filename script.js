// State
let groups = [];
let projects = [];
let currentProject = null;
let pendingSubtasks = [];

// DOM refs
let whiteboard, modal, modalTitle, subtasksDiv, subtaskCounter;
let addGroupBtn, addProjectBtn, addSubtaskBtn, generateSubtasksBtn, closeModalBtn;
let approveBtn, cancelBtn, selectAllBtn;

// Boot
window.addEventListener("DOMContentLoaded", () => {
  whiteboard = document.getElementById("whiteboard");
  modal = document.getElementById("modal");
  modalTitle = document.getElementById("modalTitle");
  subtasksDiv = document.getElementById("subtasks");
  subtaskCounter = document.getElementById("subtaskCounter");

  addGroupBtn = document.getElementById("addGroup");
  addProjectBtn = document.getElementById("addProject");
  addSubtaskBtn = document.getElementById("addSubtask");
  generateSubtasksBtn = document.getElementById("generateSubtasks");
  closeModalBtn = document.getElementById("closeModal");

  approveBtn = document.getElementById("approveBtn");
  cancelBtn = document.getElementById("cancelBtn");
  selectAllBtn = document.getElementById("selectAllBtn");

  addGroupBtn.addEventListener("click", onAddGroup);
  addProjectBtn.addEventListener("click", onAddProject);
  addSubtaskBtn.addEventListener("click", onAddSubtask);
  generateSubtasksBtn.addEventListener("click", onGenerateSubtasks);
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  approveBtn.addEventListener("click", approvePendingSubtasks);
  cancelBtn.addEventListener("click", cancelPendingSubtasks);
  selectAllBtn.addEventListener("click", toggleSelectAll);

  modal.classList.add("hidden");

  // Preload a couple of lanes and projects so it's not empty
  const t = Date.now();
  groups = [
    { id: t + 1, name: "Lane A" },
    { id: t + 2, name: "Lane B" }
  ];
  projects = [
    { id: t + 11, name: "ThrottleBoss Website", groupId: groups[0].id, subtasks: [], completed: 0 },
    { id: t + 12, name: "Supplier Outreach",     groupId: groups[1].id, subtasks: [], completed: 0 }
  ];

  renderGroups();
});

/* ========= Groups (Headings) ========= */
function onAddGroup() {
  const name = prompt("Heading name:");
  if (!name) return;
  groups.push({ id: Date.now(), name });
  renderGroups();
}

function renameGroup(groupId) {
  const g = groups.find(x => x.id === groupId);
  if (!g) return;
  const name = prompt("Rename heading:", g.name);
  if (!name) return;
  g.name = name;
  renderGroups();
}

function deleteGroup(groupId) {
  if (!confirm("Delete heading and keep its projects? (They will move to the first heading if available)")) return;
  const remaining = groups.filter(g => g.id !== groupId);
  const fallback = remaining[0]?.id;
  projects.forEach(p => {
    if (p.groupId === groupId && fallback) p.groupId = fallback;
  });
  groups = remaining;
  renderGroups();
}

function renderGroups() {
  whiteboard.innerHTML = "";
  groups.forEach(group => {
    const g = document.createElement("div");
    g.className = "group";
    g.innerHTML = `
      <div class="group-header">
        <div class="group-title">${escapeHtml(group.name)}</div>
        <div class="group-actions">
          <button onclick="renameGroup(${group.id})">✎ Rename</button>
          <button onclick="deleteGroup(${group.id})">🗑 Delete</button>
        </div>
      </div>
      <div id="group-${group.id}" class="project-row"></div>
    `;
    whiteboard.appendChild(g);

    // Make lane sortable
    const listEl = g.querySelector(".project-row");
    Sortable.create(listEl, {
      group: "projects",
      animation: 150,
      onAdd: evt => {
        const projId = Number(evt.item.dataset.pid);
        const p = projects.find(x => x.id === projId);
        if (p) p.groupId = group.id;
      }
    });
  });

  renderProjects(true);
}

/* ========= Projects ========= */
function onAddProject() {
  if (!groups.length) {
    alert("Add a heading first!");
    return;
  }
  const name = prompt("Project name:");
  if (!name) return;
  projects.push({
    id: Date.now(),
    name,
    groupId: groups[0].id,
    subtasks: [],
    completed: 0
  });
  renderProjects(true);
}

function renameProject(pid) {
  const p = projects.find(x => x.id === pid);
  if (!p) return;
  const name = prompt("Rename project:", p.name);
  if (!name) return;
  p.name = name;
  renderProjects();
}

function deleteProject(pid) {
  if (!confirm("Delete this project?")) return;
  projects = projects.filter(p => p.id !== pid);
  renderProjects(true);
}

function renderProjects(clearContainers = false) {
  if (clearContainers) {
    groups.forEach(g => {
      const container = document.getElementById(`group-${g.id}`);
      if (container) container.innerHTML = "";
    });
  }

  projects.forEach(p => {
    const container = document.getElementById(`group-${p.groupId}`);
    if (!container) return;

    let card = document.getElementById(`project-${p.id}`);
    const percent = Math.round(progressPercent(p));
    if (!card) {
      card = document.createElement("div");
      card.className = "project";
      card.id = `project-${p.id}`;
      card.dataset.pid = String(p.id);
      card.innerHTML = `
        <div class="fill" style="height:${percent}%;"></div>
        <div class="label" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        <div class="percent">${percent}%</div>
        <div class="p-actions">
          <button class="icon-btn" title="Rename" onclick="event.stopPropagation(); renameProject(${p.id});">✎</button>
          <button class="icon-btn" title="Delete" onclick="event.stopPropagation(); deleteProject(${p.id});">🗑</button>
        </div>
      `;
      card.onclick = () => openProject(p.id);
      container.appendChild(card);
    } else {
      card.querySelector(".label").textContent = p.name;
      card.querySelector(".label").setAttribute("title", p.name);
      card.querySelector(".percent").textContent = `${percent}%`;
      card.querySelector(".fill").style.height = `${percent}%`;
      if (!card.parentElement || card.parentElement.id !== `group-${p.groupId}`) {
        container.appendChild(card);
      }
    }
  });
}

function progressPercent(project) {
  return project.subtasks.length ? (project.completed / project.subtasks.length) * 100 : 0;
}

/* ========= Modal + Subtasks ========= */
function openProject(id) {
  currentProject = projects.find(p => p.id === id);
  modalTitle.textContent = currentProject.name;
  renderSubtasks();
  modal.classList.remove("hidden");
}

function onAddSubtask() {
  if (!currentProject) return;
  const name = prompt("Subtask name:");
  if (!name) return;
  currentProject.subtasks.push({ name, done: false, notes: "" });
  renderSubtasks();
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

    // Notes icon (inline SVG)
    const noteBtn = document.createElement("button");
    noteBtn.className = "note-btn";
    noteBtn.title = "Notes";
    noteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#1f2937" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 1H7a1 1 0 0 0-1 1v14c0 .552.448 1 1 1h10a1 1 0 0 0 1-1V9h-4a1 1 0 0 1-1-1V4z"/>
      </svg>
    `;
    noteBtn.onclick = (e) => {
      e.stopPropagation();
      const note = prompt("Notes:", t.notes || "");
      if (note !== null) t.notes = note;
    };
    row.appendChild(noteBtn);

    const del = document.createElement("span");
    del.className = "delete-btn";
    del.title = "Delete subtask";
    del.textContent = "×";
    del.onclick = (e) => {
      e.stopPropagation();
      currentProject.subtasks.splice(i, 1);
      renderSubtasks();
    };
    row.appendChild(del);

    // Toggle done by clicking anywhere
    row.onclick = () => {
      t.done = !t.done;
      renderSubtasks();
    };

    subtasksDiv.appendChild(row);
    if (t.done) currentProject.completed++;
  });

  // Update project progress visuals
  renderProjects();
}

/* ========= AI Subtasks (approval flow) ========= */
async function onGenerateSubtasks() {
  if (!currentProject) return;
  generateSubtasksBtn.disabled = true;
  generateSubtasksBtn.textContent = "… Generating";
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: currentProject.name })
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || "Server error");

    let lines = Array.isArray(data.subtasks) ? data.subtasks : String(data.subtasks || "").split("\n");
    let cleaned = lines
      .map(t => t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^\s*[-*]\s*/, "").trim())
      .filter(t => t && !/^sure|here are|of course|okay/i.test(t));

    pendingSubtasks = cleaned.slice(0, 20);
    renderPendingSubtasks();
  } catch (err) {
    alert(`Generate failed: ${err.message}`);
  } finally {
    generateSubtasksBtn.disabled = false;
    generateSubtasksBtn.textContent = "✨ Generate Example Subtasks";
  }
}

function renderPendingSubtasks() {
  subtasksDiv.innerHTML = "";
  subtaskCounter.textContent = `${pendingSubtasks.length} suggestions`;
  pendingSubtasks.forEach((task, i) => {
    const row = document.createElement("div");
    row.className = "task-row pending-task";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.index = i;

    const label = document.createElement("span");
    label.textContent = task;

    row.appendChild(cb);
    row.appendChild(label);

    // whole row toggles checkbox
    row.onclick = (e) => {
      if (e.target.tagName !== "INPUT") cb.checked = !cb.checked;
    };

    subtasksDiv.appendChild(row);
  });

  document.getElementById("approvalControls").classList.remove("hidden");
}

function approvePendingSubtasks() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  checkboxes.forEach(cb => {
    if (cb.checked) {
      currentProject.subtasks.push({ name: pendingSubtasks[cb.dataset.index], done: false, notes: "" });
    }
  });
  pendingSubtasks = [];
  document.getElementById("approvalControls").classList.add("hidden");
  renderSubtasks();
}

function cancelPendingSubtasks() {
  pendingSubtasks = [];
  document.getElementById("approvalControls").classList.add("hidden");
  renderSubtasks();
}

function toggleSelectAll() {
  const checkboxes = subtasksDiv.querySelectorAll("input[type=checkbox]");
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  selectAllBtn.textContent = allChecked ? "☑ Select All" : "☐ Deselect All";
}

/* ========= Utils ========= */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}
