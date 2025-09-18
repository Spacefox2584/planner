import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { groups, projects } = req.body;

    if (!groups || !projects) {
      return res.status(400).json({ error: "Missing groups or projects" });
    }

    await kv.set("planner-data", JSON.stringify({ groups, projects }));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}
