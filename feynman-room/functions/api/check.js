// Dedicated Checker endpoint — unlike /api/llm (generic Dodo chat), this one
// needs DB access to pull the user's historical material for the fallback
// rule in CHECK_SYSTEM (see src/prompts.js, rule 6).
import { getUser } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const API_KEY = env.GEMINI_API_KEY;
  const MODEL = env.GEMINI_MODEL || "gemini-flash-lite-latest";
  if (!API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is not set on this Pages project." }, { status: 500 });
  }

  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { system, material, concept, script, lang, excludeSessionId } = await request.json();
  if (!material || !script) {
    return Response.json({ error: "material and script are required." }, { status: 400 });
  }

  const { results: pastSessions } = await env.DB.prepare(
    "SELECT id, concept, material FROM explanation_sessions WHERE user_id = ? AND material IS NOT NULL AND material != '' ORDER BY updated_at DESC LIMIT 10"
  )
    .bind(user.id)
    .all();

  const relevant = pastSessions.filter((s) => s.id !== excludeSessionId);
  let historicalBlock = "";
  if (relevant.length > 0) {
    const label = lang === "zh" ? "[歷史教材：過去學習記錄]" : "[HISTORICAL MATERIAL FROM PAST SESSIONS]";
    const parts = relevant.map((s) => {
      const header = lang === "zh" ? "（過去關於「" + (s.concept || "未命名") + "」的教材）" : "(past material on \"" + (s.concept || "untitled") + "\")";
      return header + "\n" + s.material;
    });
    historicalBlock = "\n\n" + label + "\n" + parts.join("\n\n---\n\n");
  }

  const materialHeader = lang === "zh" ? "[課程教材]\n" : "[COURSE MATERIAL]\n";
  const transcriptHeader = lang === "zh" ? "\n\n[口頭解釋逐字稿]\n概念：" : "\n\n[MY SPOKEN EXPLANATION TRANSCRIPT]\nConcept: ";

  const userContent = materialHeader + material.trim() + historicalBlock + transcriptHeader + (concept || "") + "\n" + script;

  const geminiBody = {
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { maxOutputTokens: 1000 },
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiBody) }
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return Response.json({ error: data.error?.message || "Gemini request failed" }, { status: upstream.status });
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
    return Response.json({ content: [{ type: "text", text }], historicalSessionsUsed: relevant.length });
  } catch (err) {
    return Response.json({ error: "Could not reach Gemini API: " + err.message }, { status: 502 });
  }
}
