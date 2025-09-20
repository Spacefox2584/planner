import { kv } from "@vercel/kv";
console.log("KV_REST_API_URL present:", !!process.env.KV_REST_API_URL);
console.log("KV_REST_API_TOKEN present:", !!process.env.KV_REST_API_TOKEN);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await kv.get("planner-data");

    if (!data) {
      return res.status(200).json({ groups: [], projects: [] });
    }

    return res.status(200).json(JSON.parse(data));
  } catch (err) {
    console.error("Load error:", err);
    return res.status(500).json({ error: "Failed to load planner data" });
  }
}
