import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getClient();

    // 1) Load groups (lanes)
    let { data: groups, error: gErr } = await supabase
      .from("groups")
      .select("*")
      .order("position", { ascending: true })
      .order("name", { ascending: true });

    if (gErr) {
      console.error("Supabase groups select error:", gErr);
      return res
        .status(500)
        .json({ error: "Failed to load groups", details: gErr.message });
    }

    // If no groups exist, seed Lane A + Lane B
    if (!groups || groups.length === 0) {
      const defaults = [
        { name: "Lane A", position: 0 },
        { name: "Lane B", position: 1 },
      ];
      const ins = await supabase.from("groups").insert(defaults).select("*");
      if (ins.error) {
        console.error("Supabase groups bootstrap error:", ins.error);
        return res.status(500).json({
          error: "Failed to bootstrap groups",
          details: ins.error.message,
        });
      }
      groups = ins.data || [];
    }

    // 2) Load projects — don’t assume created_at exists
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .order("name", { ascending: true });

    if (pErr) {
      console.error("Supabase projects select error:", pErr);
      return res
        .status(500)
        .json({ error: "Failed to load projects", details: pErr.message });
    }

    // 3) Normalize payload for client
    const normalizedGroups = (groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      position: typeof g.position === "number" ? g.position : null,
    }));

    const normalizedProjects = (projects || []).map((row) => ({
      id: row.id,
      name: row.name,
      groupId: row.group_id ?? null,
      completed: row.completed ?? 0,
      subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    }));

    return res.status(200).json({
      groups: normalizedGroups,
      projects: normalizedProjects,
    });
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({
      error: "Failed to load planner data",
      details: err.message,
    });
  }
}
