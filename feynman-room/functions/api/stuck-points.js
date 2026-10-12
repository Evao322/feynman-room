import { getUser, newId } from "../_lib/auth.js";

// GET: list the logged-in user's recorded "I'm stuck" moments, newest first.
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT id, session_id, concept, trigger_question, created_at FROM stuck_points WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(user.id)
    .all();
  return Response.json({ stuckPoints: results });
}

// POST: record one "I'm stuck" moment — the Ah Dai question that the student
// could not answer, captured at the moment they hit "I'm stuck".
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { sessionId, concept, triggerQuestion } = await request.json();
  const id = newId();
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO stuck_points (id, user_id, session_id, concept, trigger_question, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, user.id, sessionId || null, concept || "", triggerQuestion || "", now)
    .run();
  return Response.json({ id });
}
