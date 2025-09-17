const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { projectName } = req.body;
  if (!projectName) {
    return res.status(400).json({ error: "Missing project name" });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful planning assistant. Respond with a simple numbered list of subtasks only. Do not include preambles like 'Sure!' or 'Here are some subtasks'."
        },
        {
          role: "user",
          content: `Suggest some subtasks for the project: ${projectName}`
        }
      ],
      max_tokens: 200
    });

    const text = response.choices[0]?.message?.content || "";

    let tasks = text.split("\n").map(t =>
      t
        .replace(/^\s*\d+[\.\)]\s*/, "")
        .replace(/^\s*[-*]\s*/, "")
        .trim()
    );

    tasks = tasks.filter(
      t =>
        t &&
        !/^sure|here are|of course|okay/i.test(t) &&
        t.length > 2
    );

    tasks = tasks.slice(0, 20);

    return res.status(200).json({ subtasks: tasks });
  } catch (err) {
    console.error("OpenAI API error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to generate subtasks", details: err.message });
  }
};
