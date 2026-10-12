import { getUser } from "../../_lib/auth.js";

// GET: full detail of one of the logged-in user's saved sessions.
export async function onRequestGet({ request, env, params }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const row = await env.DB.prepare("SELECT * FROM explanation_sessions WHERE id = ?").bind(params.id).first();
  if (!row || row.user_id !== user.id) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return Response.json({
    id: row.id,
    concept: row.concept,
    lang: row.lang,
    grade: row.grade,
    transcript: JSON.parse(row.transcript_json || "[]"),
    material: row.material,
    checkerReport: row.checker_report,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
