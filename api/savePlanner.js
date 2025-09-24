import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qbfppzfxwgklsvjogyzy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZnBwemZ4d2drbHN2am9neXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDQyNDUsImV4cCI6MjA3NDEyMDI0NX0.PIiVc0ZPLKS2bvNmWTXynfdey30KhqPUTDkXYMp1qRs"
);

// UUID generator
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { groups = [], projects = [] } = req.body;

    console.log("Incoming groups payload:", groups);
    console.log("Incoming projects payload:", projects);

    // ---- Map groups to UUIDs ----
    const mappedGroups = groups.map(g => ({
      id: g.id && typeof g.id === "string" && g.id.match(/^[0-9a-fA-F-]{36}$/)
        ? g.id
        : generateUUID(),
      name: g.name
    }));

    // Create a lookup so projects can find the correct group UUID
    const groupIdMap = {};
    groups.forEach((g, idx) => {
      groupIdMap[g.id] = mappedGroups[idx].id;
    });

    // ---- Map projects ----
    const mappedProjects = projects.map(p => ({
      name: p.name,
      completed: p.completed ?? 0,
      group_id: groupIdMap[p.groupId] || generateUUID(), // safe fallback
    }));

    console.log("Mapped groups for Supabase insert:", mappedGroups);
    console.log("Mapped projects for Supabase insert:", mappedProjects);

    // ---- Clear old data ----
    await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // ---- Insert groups ----
    let { error: groupErr } = await supabase.from("groups").insert(mappedGroups);
    if (groupErr) {
      console.error("Supabase group insert error:", groupErr);
      throw groupErr;
    }

    // ---- Insert projects ----
    let { error: projErr } = await supabase.from("projects").insert(mappedProjects);
    if (projErr) {
      console.error("Supabase project insert error:", projErr);
      throw projErr;
    }

    console.log("Supabase save success ✅");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}
