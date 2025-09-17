// Generate subtasks with AI
generateSubtasksBtn.addEventListener("click", async () => {
  if (!currentProject) return;

  const res = await fetch("/api/suggest", {
    method: "POST",
    body: JSON.stringify({ projectName: currentProject.name })
  });

  const data = await res.json();
  console.log("AI suggested subtasks:", data);

  // Clean output
  let tasks = data.subtasks
    .map(t => t.replace(/^\d+[\.\)]\s*/, "")) // strip "1.", "1)"
    .map(t => t.replace(/^[-*]\s*/, ""))      // strip "-" or "*"
    .map(t => t.trim())                       // trim spaces
    .filter(t => t.length > 0);               // remove empties

  // Limit to 10 tasks
  tasks = tasks.slice(0, 10);

  tasks.forEach(task => {
    currentProject.subtasks.push({ name: task, done: false });
  });

  renderSubtasks();
});
