// Shared auth helpers for Cloudflare Pages Functions.
// Password hashing: PBKDF2-SHA256 via the Workers runtime's Web Crypto API.
// Sessions: random opaque token stored in the auth_sessions table, sent as an
// httpOnly cookie. No JWT/signing needed — revocation is just a DELETE.

const ITERATIONS = 100000;
const SESSION_DAYS = 30;

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === expectedHashHex;
}

export function newId() {
  return crypto.randomUUID();
}

export function newToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(db, userId) {
  const token = newToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db
    .prepare("INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, now.toISOString(), expires.toISOString())
    .run();
  return { token, expires };
}

export function sessionCookieHeader(token, expires) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookieHeader() {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return match ? match[1] : null;
}

// Returns { id, email } for the logged-in user, or null.
export async function getUser(request, db) {
  const token = parseCookie(request, "session");
  if (!token) return null;
  const row = await db
    .prepare(
      "SELECT u.id as id, u.email as email FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?"
    )
    .bind(token, new Date().toISOString())
    .first();
  return row || null;
}

export function getSessionToken(request) {
  return parseCookie(request, "session");
}
