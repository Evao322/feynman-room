import { verifyPassword, createSession, sessionCookieHeader } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await env.DB.prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?")
    .bind(normalizedEmail)
    .first();
  if (!user) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const { token, expires } = await createSession(env.DB, user.id);
  return new Response(JSON.stringify({ id: user.id, email: user.email }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookieHeader(token, expires) },
  });
}
