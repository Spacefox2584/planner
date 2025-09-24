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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { groups, projects } = req.body || {};
    if (!Array.isArray(groups) || !Array.isArray(projects)) {
      return res
        .status(400)
        .json({ error: "Invalid payload: 'groups' and 'projects' must be arrays" });
    }

    const supabase = getClient();

    // Safe delete all using >= minimal UUID
    const delProjects = await supabase
      .from("projects")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (delProjects.error) {
      return res.status(500).json({
        error: "Delete projects failed",
        details: delProjects.error.message,
      });
    }

    const delGroups = await supabase
      .from("groups")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (delGroups.error) {
      return res.status(500).json({
        error: "Delete groups failed",
        details: delGroups.error.message,
      });
    }

    // Reinsert groups
    const gi = await supabase.from("groups").insert(groups).select("*");
    if (gi.error) {
      return res.status(500).json({
        error: "Insert groups failed",
        details: gi.error.message,
      });
    }

    // Reinsert projects
    const pi = await supabase.from("projects").insert(projects).select("*");
    if (pi.error) {
      return res.status(500).json({
        error: "Insert projects failed",
        details: pi.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      groupsInserted: gi.data?.length || 0,
      projectsInserted: pi.data?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to save planner data",
      details: err.message,
    });
  }
}