import { hashPassword, newId, createSession, sessionCookieHeader } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();
  if (!email || !password || password.length < 8) {
    return Response.json({ error: "Email and a password of at least 8 characters are required." }, { status: 400 });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first();
  if (existing) {
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { hash, salt } = await hashPassword(password);
  const id = newId();
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, normalizedEmail, hash, salt, now)
    .run();

  const { token, expires } = await createSession(env.DB, id);
  return new Response(JSON.stringify({ id, email: normalizedEmail }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookieHeader(token, expires) },
  });
}
