import { createClient } from "@supabase/supabase-js";

// 🔒 Replace with your actual project URL + anon key from Supabase
const supabase = createClient(
  "https://qbfppzfxwgklsvjogyzy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZnBwemZ4d2drbHN2am9neXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDQyNDUsImV4cCI6MjA3NDEyMDI0NX0.PIiVc0ZPLKS2bvNmWTXynfdey30KhqPUTDkXYMp1qRs"
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projects } = req.body;
    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({ error: "Missing projects array" });
    }

    // Clear table so deletes persist
    await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert fresh data
    const mapped = projects.map(p => ({
      id: String(p.id),
      name: p.name,
      group_id: String(p.groupId),
      completed: p.completed ?? 0,
      subtasks: p.subtasks ?? []
    }));

    const { error } = await supabase.from("projects").insert(mapped);
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}
