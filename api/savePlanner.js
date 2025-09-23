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

function isUuid(v) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { groups, projects } = req.body || {};
    if (!Array.isArray(groups) || !Array.isArray(projects)) {
      return res
        .status(400)
        .json({ error: "Invalid payload: 'groups' and 'projects' must be arrays" });
    }

    // Normalize records
    const gRecords = groups.map((g, idx) => {
      const record = {
        name: String(g.name ?? "").slice(0, 255),
        position: Number.isFinite(g.position) ? g.position : idx,
      };
      if (isUuid(g.id)) record.id = g.id; // keep UUID if valid
      return record;
    });

    const pRecords = projects.map((p) => {
      const record = {
        name: String(p.name ?? "").slice(0, 255),
        group_id: isUuid(p.groupId) ? p.groupId : null,
        completed: Number.isFinite(p.completed) ? p.completed : 0,
        subtasks: Array.isArray(p.subtasks) ? p.subtasks : [],
      };
      if (isUuid(p.id)) record.id = p.id; // keep UUID if valid
      return record;
    });

    const supabase = getClient();

    // Replace snapshot (wipe → insert fresh)
    const delProjects = await supabase.from("projects").delete().neq("id", null);
    if (delProjects.error) {
      console.error("Supabase delete projects error:", delProjects.error);
      return res.status(500).json({
        error: "Delete projects failed",
        details: delProjects.error.message,
      });
    }

    const delGroups = await supabase.from("groups").delete().neq("id", null);
    if (delGroups.error) {
      console.error("Supabase delete groups error:", delGroups.error);
      return res.status(500).json({
        error: "Delete groups failed",
        details: delGroups.error.message,
      });
    }

    // Insert groups
    let insertedGroups = [];
    if (gRecords.length > 0) {
      const gi = await supabase
        .from("groups")
        .insert(gRecords)
        .select("id,name,position")
        .order("position");
      if (gi.error) {
        console.error("Supabase insert groups error:", gi.error);
        return res.status(500).json({
          error: "Insert groups failed",
          details: gi.error.message,
        });
      }
      insertedGroups = gi.data || [];
    }

    // Map old group ids if client didn’t send them
    const haveClientGroupIds = gRecords.every((gr) => !!gr.id);
    if (!haveClientGroupIds && insertedGroups.length > 0) {
      const firstGroupId = insertedGroups[0]?.id || null;
      pRecords.forEach((pr) => {
        if (!pr.group_id) pr.group_id = firstGroupId;
      });
    }

    // Insert projects
    if (pRecords.length > 0) {
      const pi = await supabase.from("projects").insert(pRecords).select("id");
      if (pi.error) {
        console.error("Supabase insert projects error:", pi.error);
        return res.status(500).json({
          error: "Insert projects failed",
          details: pi.error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      groupsInserted: insertedGroups.length,
      projectsInserted: pRecords.length,
    });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({
      error: "Failed to save planner data",
      details: err.message,
    });
  }
}
