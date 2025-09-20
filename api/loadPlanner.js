import { Redis } from "@upstash/redis";

// 🔑 Replace these with your actual values from Upstash REST API
const redis = new Redis({
  url: "https://welcome-pangolin-5168.upstash.io",   // <-- your KV_REST_API_URL
  token: "eyJhbGciOi..."           // <-- your KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await redis.get("planner-data");
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
