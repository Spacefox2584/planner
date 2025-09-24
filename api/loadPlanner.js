import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xxxx.supabase.co",   // <-- your Project URL
  "ey..."                       // <-- your anon key
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase.from("projects").select("*");
    if (error) {
      console.error("Supabase select error:", error); // 🔎 DEBUG
      throw error;
    }

    const projects = data.map(row => ({
      id: row.id,
      name: row.name,
      groupId: row.group_id,
      completed: row.completed,
      subtasks: []
    }));

    console.log("Returning projects to frontend:", projects); // 🔎 DEBUG

    return res.status(200).json({ projects });
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data" });
  }
}
