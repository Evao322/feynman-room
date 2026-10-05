// Cloudflare Pages Function — same adapter as server/index.js, for the hosted deployment.
// GEMINI_API_KEY / GEMINI_MODEL are bound as Pages secrets/vars (never committed).
export async function onRequestPost({ request, env }) {
  const API_KEY = env.GEMINI_API_KEY;
  const MODEL = env.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is not set on this Pages project." }, { status: 500 });
  }

  const { system, messages = [], max_tokens } = await request.json();

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
      return Response.json({ error: data.error?.message || "Gemini request failed" }, { status: upstream.status });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
    return Response.json({ content: [{ type: "text", text }] });
  } catch (err) {
    return Response.json({ error: "Could not reach Gemini API: " + err.message }, { status: 502 });
  }
}
