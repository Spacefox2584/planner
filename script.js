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
function toggleTheme() {
  const body = document.body;
  const current = body.getAttribute("data-theme") || "light";
  const newTheme = current === "light" ? "dark" : "light";
  body.setAttribute("data-theme", newTheme);
  localStorage.setItem("suite-theme", newTheme);
}

// Apply saved theme
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("suite-theme") || "light";
  document.body.setAttribute("data-theme", saved);
  showTool('planner', document.querySelector('.suite-btn[data-tool="planner"]'));
});

/* ========= Planner logic (keep same as before) ========= */
/* ... (your existing Planner code from earlier goes here unchanged) ... */
