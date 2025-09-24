import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://YOUR-PROJECT-URL.supabase.co",
  "YOUR-ANON-KEY"
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { data, error } = await supabase.from("projects").select("*");
    if (error) throw error;

    const projects = data.map(row => ({
      id: row.id,
      name: row.name,
      groupId: row.group_id,
      completed: row.completed ?? 0
    }));

    return res.status(200).json({ projects });
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data" });
  }
}