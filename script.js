let groups = [];
let projects = [];
let currentProject = null;
let pendingSubtasks = [];

// DOM refs
let whiteboard, modal, modalTitle, subtasksDiv, subtaskCounter;
let addGroupBtn, addProjectBtn, addSubtaskBtn, generateSubtasksBtn, closeModalBtn;
let approveBtn, cancelBtn, selectAllBtn;

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

  modal.classList.add("hidden");

  addGroupBtn.addEventListener("click", onAddGroup);
  addProjectBtn.addEventListener("click", onAddProject);
  addSubtaskBtn.addEventListener("click", onAddSubtask);
  generateSubtasksBtn.addEventListener("click", onGenerateSubtasks);
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  approveBtn.addEventListener("click", approvePendingSubtasks);
  cancelBtn.addEventListener("click", cancelPendingSubtasks);
  selectAllBtn.addEventListener("click", toggleSelectAll);

  // Init with one group
  groups.push({ name: "Top Priority", id: Date.now() });
  renderGroups();
});

// Groups
function onAddGroup() {
  const name = prompt("Group name:");
  if (!name) return;
  groups.push({ name, id: Date.now() });
  renderGroups();
}

function renderGroups() {
  whiteboard.innerHTML = "";
  groups.forEach(group => {
    const g = document.createElement("div");
    g.className = "group";
    g.innerHTML = `<h3>${escapeHtml(group.name)}</h3>
      <div id="group-${group.id}" class="project-list"></div>`;
    whiteboard.appendChild(g);

    const listEl = g.querySelector(".project-list");
    Sortable.create(listEl, {
      group: "projects",
      animation: 150,
      onEnd: () => {
        // could update state later
      }
    });
  });
  renderProjects();
}

// Projects
function onAddProject() {
  if (!groups.length) {
    alert("Add a group first!");
    return;
  }
  const name = prompt("Project name:");
  if (!name) return;
  projects.push({ name, id: Date.now(), subtasks: [], completed: 0, groupId: groups[0].id });
  renderProjects();
}

function renderProjects() {
  projects.forEach(p => {
    const container = document.getElementById(`group-${p.groupId}`);
    if (!container) return;
    let existing = document.getElementById(`project-${p.id}`);
    if (!existing) {
      const div = document.createElement("div");
      div.className = "project";
      div.id = `project-${p.id}`;
      div.innerHTML = `
        <strong>${escapeHtml(p.name)}</strong>
        <div class="progress" style="width:${progressPercent(p)}%"></div>
        <div class="percent">${Math.round(progressPercent(p))}%</div>
      `;
      div.onclick = () => openProject(p.id);
      container.appendChild(div);
    } else {
      existing.querySelector(".progress").style.width = `${progressPercent(p)}%`;
      existing.querySelector(".percent").textContent = `${Math.round(progressPercent(p))}%`;
    }
  });
}

// Modal + Subtasks
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

    const notesBtn = document.createElement("button");
    notesBtn.textContent = "📝";
    notesBtn.onclick = (e) => {
      e.stopPropagation();
      const note = prompt("Notes:", t.notes || "");
      if (note !== null) {
        t.notes = note;
      }
    };
    row.appendChild(notesBtn);

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

// AI Subtasks
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
      .filter(t => t && !/^sure|here are|of course/i.test(t));

    pendingSubtasks = cleaned.slice(0, 20); // cap at 20
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

    // Whole row clickable
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

// Helpers
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}
