/* =========================
   Tab Switcher
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
function toggleTheme() {
  const body = document.body;
  const current = body.getAttribute("data-theme") || "light";
  const newTheme = current === "light" ? "dark" : "light";
  body.setAttribute("data-theme", newTheme);
  localStorage.setItem("suite-theme", newTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("suite-theme") || "light";
  document.body.setAttribute("data-theme", saved);
  showTool('planner', document.querySelector('.suite-btn[data-tool="planner"]'));
});

/* =========================
   Planner v2.5 - projects only persisted
   ========================= */
let groups = [];
let projects = [];
let whiteboard;

/* ---- Persistence helpers ---- */
async function saveState() {
  try {
    await fetch("/api/savePlanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects })
    });
  } catch (err) {
    console.error("Save failed:", err);
  }
}

async function loadState() {
  try {
    const res = await fetch("/api/loadPlanner");
    const data = await res.json();
    if (data.projects) {
      projects = data.projects;
    }
  } catch (err) {
    console.error("Load failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  whiteboard = document.getElementById("whiteboard");
  if (!whiteboard) return;

  await loadState();

  if (!projects.length) {
    const t = Date.now();
    groups = [{ id: t+1, name: "Lane A"}, {id: t+2, name:"Lane B"}];
    projects = [
      { id: t+11, name:"ThrottleBoss Website", groupId: groups[0].id, completed:0 },
      { id: t+12, name:"Supplier Outreach", groupId: groups[1].id, completed:0 }
    ];
  }

  renderProjects();
});

function renderProjects() {
  whiteboard.innerHTML = "";
  projects.forEach(p => {
    const card = document.createElement("div");
    card.className = "project";
    card.textContent = p.name;
    whiteboard.appendChild(card);
  });
}