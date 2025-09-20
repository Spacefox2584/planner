import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await kv.get("planner-data");
    console.log("Loaded from KV:", data);

    if (!data) {
      return res.status(200).json({ groups: [], projects: [] });
    }

    return res.status(200).json(JSON.parse(data));
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data" });
  }
}
