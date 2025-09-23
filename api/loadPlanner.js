import { createClient } from "@supabase/supabase-js";

// 🔒 Replace with your actual project URL + anon key from Supabase
const supabase = createClient(
  "https://qbfppzfxwgklsvjogyzy.supabase.co",
  "YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZnBwemZ4d2drbHN2am9neXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDQyNDUsImV4cCI6MjA3NDEyMDI0NX0.PIiVc0ZPLKS2bvNmWTXynfdey30KhqPUTDkXYMp1qRs"
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase.from("projects").select("*");
    if (error) throw error;

    const projects = data.map(row => ({
      id: row.id,
      name: row.name,
      groupId: row.group_id,
      completed: row.completed ?? 0,
      subtasks: Array.isArray(row.subtasks) ? row.subtasks : []
    }));

    return res.status(200).json({ projects });
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data" });
  }
}
