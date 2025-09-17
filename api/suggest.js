// /api/suggest.js
export default async function handler(req, res) {
  try {
    const body = await new Response(req.body).text();
    const { projectName } = JSON.parse(body);

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
    const text = data.choices[0].message.content;

    res.status(200).json({
      subtasks: text.split("\n").filter(line => line.trim() !== "")
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
}
