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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase select error:", error);
      return res.status(500).json({ error: "Supabase select failed", details: error.message });
    }

    const projects = (data || []).map((row) => ({
      id: row.id,                               // UUID from DB
      name: row.name,
      groupId: row.group_id ?? null,
      completed: row.completed ?? 0,
      subtasks: Array.isArray(row.subtasks) ? row.subtasks : []
    }));

    return res.status(200).json({ projects });
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data", details: err.message });
  }
}
