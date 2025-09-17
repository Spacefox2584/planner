// /api/suggest.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const dataString = Buffer.concat(buffers).toString();
    const { projectName } = JSON.parse(dataString);

    console.log("📌 Project:", projectName);

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that breaks projects into clear subtasks." },
          { role: "user", content: `List 5 subtasks for this project: ${projectName}` }
        ]
      })
    });

    const data = await response.json();
    console.log("🔍 Raw OpenAI response:", JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: data.error?.message || "OpenAI did not return choices" });
    }

    const text = data.choices[0].message.content;
    const subtasks = text.split("\n").filter(line => line.trim() !== "");

    res.status(200).json({ subtasks });
  } catch (error) {
    console.error("💥 API Error:", error);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
}
