// Record-then-transcribe voice input via Gemini — works in Safari too, unlike the
// browser's SpeechRecognition API (which Safari never implemented).
import { getUser } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const API_KEY = env.GEMINI_API_KEY;
  const MODEL = env.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is not set on this Pages project." }, { status: 500 });
  }

  const { audioBase64, mimeType, languageHint } = await request.json();
  if (!audioBase64 || !mimeType) {
    return Response.json({ error: "audioBase64 and mimeType are required." }, { status: 400 });
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
      return Response.json({ error: data.error?.message || "Gemini transcription failed" }, { status: upstream.status });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n").trim();
    return Response.json({ text });
  } catch (err) {
    return Response.json({ error: "Could not reach Gemini API: " + err.message }, { status: 502 });
  }
}
