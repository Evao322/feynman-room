// Concept-summary image via Cloudflare Workers AI (flux-1-schnell) — free tier,
// no separate API key needed since it uses the same Cloudflare account as D1/Pages.
// Diffusion models render text/labels unreliably (worse for non-Latin scripts), so
// the prompt explicitly asks for a label-free diagram regardless of UI language.
import { getUser } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { concept, summary } = await request.json();
  if (!summary) return Response.json({ error: "summary is required." }, { status: 400 });

  const prompt =
    "A simple, minimal black-and-white line diagram that visually illustrates this concept explanation. " +
    "Use only simple shapes, arrows, and icons. Do NOT include any text, words, letters, or labels anywhere in the image. " +
    "Concept: " +
    (concept || "") +
    ". Explanation: " +
    summary.slice(0, 600);

  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt });
    if (!result || !result.image) {
      return Response.json({ error: "Image generation returned no image." }, { status: 502 });
    }
    return Response.json({ image: result.image, mimeType: "image/jpeg" });
  } catch (err) {
    return Response.json({ error: "Image generation failed: " + err.message }, { status: 502 });
  }
}
