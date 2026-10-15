import { getUser, newId } from "../../_lib/auth.js";

// GET: list the logged-in user's saved sessions (summary only, newest first).
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT id, concept, subject, lang, grade, created_at, updated_at FROM explanation_sessions WHERE user_id = ? ORDER BY updated_at DESC"
  )
    .bind(user.id)
    .all();
  return Response.json({ sessions: results });
}

// POST: create a new session, or update an existing one (pass its id) owned by this user.
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json();
  const { id, concept, subject, lang, grade, transcript, material, checkerReport } = body;
  const now = new Date().toISOString();
  const transcriptJson = JSON.stringify(transcript || []);

  if (id) {
    const existing = await env.DB.prepare("SELECT user_id FROM explanation_sessions WHERE id = ?").bind(id).first();
    if (!existing || existing.user_id !== user.id) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }
    await env.DB.prepare(
      "UPDATE explanation_sessions SET concept = ?, subject = ?, lang = ?, grade = ?, transcript_json = ?, material = ?, checker_report = ?, updated_at = ? WHERE id = ?"
    )
      .bind(concept || "", subject || "", lang || "en", grade || "", transcriptJson, material || "", checkerReport || "", now, id)
      .run();
    return Response.json({ id });
  }

  const newSessionId = newId();
  await env.DB.prepare(
    "INSERT INTO explanation_sessions (id, user_id, concept, subject, lang, grade, transcript_json, material, checker_report, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      newSessionId,
      user.id,
      concept || "",
      subject || "",
      lang || "en",
      grade || "",
      transcriptJson,
      material || "",
      checkerReport || "",
      now,
      now
    )
    .run();
  return Response.json({ id: newSessionId });
}
