import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using environment variables (Vercel ready)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars.");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projects } = req.body || {};
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: "Invalid payload: 'projects' must be an array" });
    }

    const supabase = getClient();

    // Normalize incoming objects – DO NOT send client 'id' to a UUID column
    const mapped = projects.map((p) => ({
      // id is intentionally omitted; let Postgres default (uuid) assign it
      name: String(p.name ?? "").slice(0, 255),
      group_id: p.groupId ? String(p.groupId) : null,
      completed: Number.isFinite(p.completed) ? p.completed : 0,
      subtasks: Array.isArray(p.subtasks) ? p.subtasks : []
    }));

    // Replace existing snapshot with new one to avoid dupes
    const del = await supabase.from("projects").delete().neq("id", null);
    if (del.error) {
      console.error("Supabase delete error:", del.error);
      return res.status(500).json({ error: "Supabase delete failed", details: del.error.message });
    }

    const { data, error } = await supabase.from("projects").insert(mapped).select("id");
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Supabase insert failed", details: error.message });
    }

    return res.status(200).json({ success: true, inserted: data?.length ?? 0 });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data", details: err.message });
  }
}
