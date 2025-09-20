import { Redis } from "@upstash/redis";

// 🔑 Replace these with your actual values from Upstash REST API
const redis = new Redis({
  url: "https://xxx.upstash.io",   // <-- your KV_REST_API_URL
  token: "eyJhbGciOi..."           // <-- your KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { groups, projects } = req.body;

    if (!groups || !projects) {
      return res.status(400).json({ error: "Missing groups or projects" });
    }

    const payload = JSON.stringify({ groups, projects });
    console.log("Saving to KV:", payload);

    await redis.set("planner-data", payload);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save planner data" });
  }
}
