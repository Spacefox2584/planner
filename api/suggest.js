import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Manually parse request body (works reliably on Vercel)
    let body = {};
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const data = Buffer.concat(buffers).toString();
      body = data ? JSON.parse(data) : {};
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { projectName } = body;
    if (!projectName) {
      return res.status(400).json({ error: "Missing project name" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful planning assistant. Respond with a simple numbered list of subtasks only. No preambles."
        },
        {
          role: "user",
          content: `Suggest some subtasks for the project: ${projectName}`
        }
      ],
      max_tokens: 240
    });

    const text = response.choices?.[0]?.message?.content || "";
    let tasks = text.split("\n").map(t =>
      t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^\s*[-*]\s*/, "").trim()
    );
    tasks = tasks.filter(t =>
      t && t.length > 2 && !/^sure|here are|of course|okay/i.test(t)
    ).slice(0, 20);

    return res.status(200).json({ subtasks: tasks });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return res.status(500).json({
      error: "Failed to generate subtasks",
      details: err?.message || "Unknown error"
    });
  }
}
