import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

// Accepts the same shape the app already sends to Claude ({ system, messages, max_tokens })
// and adapts it to Gemini's generateContent format, then adapts the reply back to the
// Anthropic-style { content: [{ type: "text", text }] } shape so the frontend needs no changes.
app.post("/api/llm", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it to feynman-room/.env (see .env.example).",
    });
  }

  const { system, messages = [], max_tokens } = req.body;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const geminiBody = {
    contents,
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    ...(max_tokens ? { generationConfig: { maxOutputTokens: max_tokens } } : {}),
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message || "Gemini request failed" });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(502).json({ error: "Could not reach Gemini API: " + err.message });
  }
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Feynman Room proxy listening on http://localhost:${PORT}`);
});
