import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getClient();

    const { data: groups, error: gErr } = await supabase.from("groups").select("*");
    if (gErr) {
      return res.status(500).json({ error: "Failed to load groups", details: gErr.message });
    }

    const { data: projects, error: pErr } = await supabase.from("projects").select("*");
    if (pErr) {
      return res.status(500).json({ error: "Failed to load projects", details: pErr.message });
    }

    return res.status(200).json({ groups, projects });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load planner data", details: err.message });
  }
}