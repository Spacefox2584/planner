import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://YOUR-PROJECT-URL.supabase.co",
  "YOUR-ANON-KEY"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { projects } = req.body;
    if (!projects || !Array.isArray(projects)) return res.status(400).json({ error: "Missing projects array" });

    await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const mapped = projects.map(p => ({
      id: String(p.id),
      name: p.name,
      group_id: String(p.groupId),
      completed: p.completed ?? 0
    }));
    const { error } = await supabase.from("projects").insert(mapped);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}