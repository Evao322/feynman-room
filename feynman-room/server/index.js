import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

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

// Record-then-transcribe voice input — works in Safari too, unlike the browser's
// SpeechRecognition API (which Safari never implemented).
app.post("/api/transcribe", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it to feynman-room/.env (see .env.example).",
    });
  }

  const { audioBase64, mimeType, languageHint } = req.body;
  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: "audioBase64 and mimeType are required." });
  }

  const geminiBody = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          {
            text:
              "Transcribe this audio recording exactly as spoken. The speaker is speaking in " +
              (languageHint || "English") +
              ". Output only the raw transcription text with natural punctuation — no preamble, no translation, no explanation.",
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 1000 },
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
      return res.status(upstream.status).json({ error: data.error?.message || "Gemini transcription failed" });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n").trim();
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: "Could not reach Gemini API: " + err.message });
  }
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Feynman Room proxy listening on http://localhost:${PORT}`);
});
