import { getSessionToken, clearSessionCookieHeader } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const token = getSessionToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM auth_sessions WHERE token = ?").bind(token).run();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookieHeader() },
  });
}
