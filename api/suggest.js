// /api/suggest.js
export default async function handler(req, res) {
  try {
    // Ensure we only handle POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse incoming JSON safely
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const dataString = Buffer.concat(buffers).toString();
    const { projectName } = JSON.parse(dataString);

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

    if (!data.choices || !data.choices[0]) {
      console.error("OpenAI error response:", data);
      return res.status(500).json({ error: "No subtasks returned" });
    }

    const text = data.choices[0].message.content;

    res.status(200).json({
      subtasks: text.split("\n").filter(line => line.trim() !== "")
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
}
