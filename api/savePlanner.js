import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qbfppzfxwgklsvjogyzy.supabase.co",   // <-- your Project URL
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZnBwemZ4d2drbHN2am9neXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDQyNDUsImV4cCI6MjA3NDEyMDI0NX0.PIiVc0ZPLKS2bvNmWTXynfdey30KhqPUTDkXYMp1qRs"                       // <-- your anon key
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projects } = req.body;

    console.log("Incoming projects payload:", projects); // 🔎 DEBUG

    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({ error: "Missing projects array" });
    }

    // Map into DB format
    const mapped = projects.map(p => ({
      group_id: String(p.groupId || ""),
      name: p.name,
      completed: p.completed ?? 0
    }));

    console.log("Mapped projects for Supabase insert:", mapped); // 🔎 DEBUG

    // Clear old data
    await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert new data
    const { error } = await supabase.from("projects").insert(mapped);
    if (error) {
      console.error("Supabase insert error:", error); // 🔎 DEBUG
      throw error;
    }

    console.log("Supabase insert success"); // 🔎 DEBUG

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}
