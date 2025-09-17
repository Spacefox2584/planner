function randomPastel() {
  const colors = ["#FFFA9C", "#AEEEEE", "#FFB6C1", "#D1FFD6", "#FFDAB9", "#C6C6FF"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function onAddProject() {
  if (!groups.length) {
    alert("Add a group first!");
    return;
  }
  const name = prompt("Project name:");
  if (!name) return;
  projects.push({
    name,
    id: Date.now(),
    subtasks: [],
    completed: 0,
    groupId: groups[0].id,
    color: randomPastel()   // 🎨 assign a color
  });
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
      div.style.background = p.color || "#FFFA9C";  // 🎨 use stored color
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
