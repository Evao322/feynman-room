# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The Feynman Room — an educational AI prototype for a graduate AI & Education course project (40% of the grade). It is a multi-user browser tool that pairs each logged-in student with two separate LLM-backed agents:

- **Ah Dai** (阿呆) — a listener with no knowledge of the subject, forbidden to teach or correct. It only asks clarifying questions (capped at two sentences) to expose gaps in the student's spoken/typed explanation, then paraphrases back using *only* what the student said.
- **Checker** (查核員) — a RAG-style agent that compares the student's explanation transcript against uploaded course material (pasted text or PDF) and reports matches/contradictions/omissions, each with a citation. It never teaches or evaluates. When the current material doesn't cover something, it falls back to the student's own material from past sessions before giving up (see rule 6 in `CHECK_SYSTEM`).

The core design thesis (foreground this in any docs/report work): *the AI's value lies in what it refuses to do*. Both agents' system prompts encode hard behavioral rules; most engineering work on this repo is about preserving/testing those rules, not adding capability.

Full product spec, theoretical framing (self-explanation effect, ICAP, retrieval practice, ZPD), and the project's outstanding to-dos live in `files/feynman-handoff.md`. `files/feynman-room-en.jsx` is the original single-file Claude-Artifact version of the app (kept for reference — the live app is `feynman-room/`).

## Repo layout

```
files/                       reference docs: handoff doc, reconstruction package, original single-file artifact
migrations/0001_init.sql     D1 schema: users, auth_sessions, explanation_sessions, stuck_points
feynman-room/                the actual working app — Vite/React frontend + Cloudflare Pages Functions backend + D1
  src/prompts.js             DOI_SYSTEM (Ah Dai), RESTATE_CMD, CHECK_SYSTEM — the only source of truth for agent behavior
  src/App.jsx                entire UI: one component, auth gate + four stages (setup/talk/mark/check), local state
  functions/_lib/auth.js     password hashing (PBKDF2) + session cookie helpers, shared by every function below
  functions/api/auth/*.js    register / login / logout / me
  functions/api/sessions/*.js  list / create-or-update / get-one saved session (full transcript + material + report)
  functions/api/stuck-points.js  records the Ah Dai question that triggered each "I'm stuck"
  functions/api/llm.js       Ah Dai chat — Anthropic-shaped request in, Gemini generateContent call out
  functions/api/check.js     Checker — same adapter, plus pulls the student's past session material for the historical-fallback rule
  functions/api/transcribe.js  record-then-transcribe voice input via Gemini (works in Safari, unlike SpeechRecognition)
  functions/api/generate-image.js  concept-summary diagram via Cloudflare Workers AI (flux-1-schnell) — not Gemini
  .dev.vars                  GEMINI_API_KEY / GEMINI_MODEL for local `wrangler pages dev` (gitignored, never commit)
```

## Commands

All commands run from `feynman-room/`:

```bash
npm install                # first-time setup
npm run dev                 # wrangler pages dev on :8788, proxying Vite on :5173 — this is the ONLY local dev path (see below)
npm run build                # production build (vite build)
npm run deploy                # build + wrangler pages deploy dist --project-name=feynman-room
npm run db:migrate:local       # apply migrations/*.sql to the local D1 (.wrangler/state)
npm run db:migrate:remote      # apply migrations/*.sql to the production D1 — run this after adding a new migration file
npm run test:adversarial        # scripts/adversarial-test.mjs — requires `npm run dev` running in another terminal
```

There is no unit test suite or linter configured. `test:adversarial` is a scripted integration check, not a unit test — it logs into (or registers) a dedicated test account, then sends the documented attack-prompt list (from `files/feynman-handoff.md`) through the live Ah Dai/Checker prompts and writes raw transcripts to `scripts/adversarial-report.md` (gitignored, regenerated each run). It does **not** auto-judge pass/fail — read the transcript and fill in the verdict yourself.

**Why there is no plain `node server.js` option anymore:** the backend needs D1 (Cloudflare's SQLite), which only exists inside the Cloudflare Workers runtime — a plain Node/Express process cannot bind to it. `wrangler pages dev` emulates that runtime locally (D1 included, state persisted under `.wrangler/state`) while still proxying to Vite for instant frontend reload. There used to be a `server/index.js` Express proxy for local dev; it was removed when D1 was introduced — don't recreate it as a way to "simplify" local dev, it physically cannot reach D1.

**Windows-specific dev quirk:** `wrangler pages dev --proxy <port> -- <command>` would normally auto-detect the proxied dev server's port via `wmic`, which is broken/missing in some Windows environments. That's why `package.json`'s `dev` script hardcodes both `--port 8788` (wrangler's own port — open this one in the browser) and `--proxy 5173` (Vite's port, must match `vite.config.js`). If you ever see "Could not automatically determine proxy port", this is why — don't remove the explicit `--proxy 5173`.

## Architecture notes

**Auth gates everything.** `App.jsx` calls `GET /api/auth/me` on mount; until that resolves there's a blank screen, and if it comes back with no user the login/register screen renders instead of the setup/talk/mark/check stages — there is no guest mode. Sessions are an opaque random token in an httpOnly cookie, looked up against the `auth_sessions` table (see `functions/_lib/auth.js`); there's no JWT/signing, so revocation is just `DELETE FROM auth_sessions`. Passwords are PBKDF2-SHA256 (100k iterations) via the Workers runtime's native Web Crypto — never bcrypt/argon2 (not available in Workers).

**Provider-adapter pattern in the Gemini calls.** The frontend's `callClaude()` (for Ah Dai) and `callCheck()` (for the Checker) in `src/App.jsx` send an Anthropic-Messages-shaped payload (`{ system, messages/script, max_tokens }`) to `/api/llm` or `/api/check`. Those functions translate that into Gemini's `generateContent` format (role `assistant`→`model`, `system`→`system_instruction`, etc.) and translate the response back into `{ content: [{ type: "text", text }] }` before returning it. This means the frontend code is written against an Anthropic-like interface even though the actual backend is Google Gemini — if you ever swap providers again, change only the `functions/api/*.js` files, not `App.jsx`.

**API key never touches the frontend.** `GEMINI_API_KEY` lives only in `.dev.vars` locally (gitignored) and as a Cloudflare Pages secret in production (`wrangler pages secret put GEMINI_API_KEY --project-name=feynman-room` — the user must run this themselves; never pipe a real key through an agent). Read by the Functions in `functions/api/`. Do not move Gemini calls into the frontend.

**Why `/api/check` is separate from `/api/llm`.** Both proxy to Gemini, but the Checker alone needs to read the logged-in student's past `explanation_sessions.material` rows out of D1 to satisfy `CHECK_SYSTEM`'s rule 6 (use historical material as a fallback before saying "cannot determine"). `/api/check` fetches up to 10 of the user's most recent past sessions with non-empty material (excluding the session currently being edited, via `excludeSessionId`), concatenates them into a `[HISTORICAL MATERIAL FROM PAST SESSIONS]` block, and appends it to the user message. It returns `historicalSessionsUsed` so the UI can show a small "also checked N past sessions" note.

**Prompts are the product.** `src/prompts.js` exports `DOI_SYSTEM`, `RESTATE_CMD`, `CHECK_SYSTEM` (English) and their `_ZH` Traditional Chinese counterparts, bundled as `PROMPTS.en` / `PROMPTS.zh`, imported by `App.jsx` and `scripts/adversarial-test.mjs` so there is exactly one copy of each agent's behavioral contract per language. When editing agent behavior, edit here — never duplicate the prompt text elsewhere, and mirror any rule change into both the English and `_ZH` versions.

**Session auto-save, not explicit save buttons.** Once a student is past the opening turn, a debounced `useEffect` (1.2s after `turns`/`material`/`report` last changed) upserts the whole session — transcript, material, Checker report — to `POST /api/sessions`. The first call has no `id` and the server creates one; the returned `id` is stored in `sessionId` state and reused for every later upsert, so there is one row per concept-explaining session, continuously updated, not one row per message.

**Stuck points are captured at the moment of the trigger, not derived later.** The "I'm stuck" button sends the *localized* trigger phrase (`t.imStuck` — must exactly match the phrase `DOI_SYSTEM`/`DOI_SYSTEM_ZH`'s special-case rule listens for, so don't translate one without the other). `send()` detects that exact string client-side and fire-and-forgets a `POST /api/stuck-points` with the *previous* Ah Dai turn's text as `triggerQuestion`, before even sending the message to Gemini.

**PDF upload is 100% client-side.** `extractPdfText()` in `App.jsx` dynamically imports `pdfjs-dist` (lazy-loaded, ~2.2MB worker chunk — this is why it's a dynamic `import()`, not a top-level one) and runs entirely in the browser; extracted text is appended into the same `material` textarea the paste flow uses, so the Checker's code path doesn't know or care whether material came from typing, pasting, or a PDF. There's no server-side PDF handling and no file is ever uploaded anywhere.

**History view is read-only by design.** `HistorySheet` in `App.jsx` lists then displays a past `explanation_sessions` row (plus any `stuck_points` rows whose `session_id` matches) — it does not support resuming/editing a past session. If you're asked to add "continue a past session", that's new scope, not a bug.

**Marking is inline, not a separate stage.** There used to be a standalone `mark` stage; it was merged into `talk` so three-colour marking happens directly next to each of the student's own bubbles via `MarkDots` (a `.fr-turn-row` flex container that's `row` on desktop — buttons beside the bubble — and `column` below `max-width:600px` — buttons stacked under the bubble, per the CSS in the `css` template string). Don't recreate a separate Mark screen/stage.

**Single-component UI.** `App.jsx` has no router. The stage machine (`setup`, `talk`, `check`) is plain `if` branches inside one function component, gated by `useState("setup")`; the auth gate (`authLoading` / `!user`) and the History `Sheet` sit outside/around that stage machine rather than being stages themselves.

**Summary image uses Workers AI, not Gemini.** `functions/api/generate-image.js` calls `env.AI.run("@cf/black-forest-labs/flux-1-schnell", ...)` — Cloudflare's own free-tier inference, bound via `[ai] binding = "AI"` in `wrangler.toml`, not a Gemini key. It auto-fires once per session from a `useEffect` in `App.jsx` when the outsider-test restate reply lands (`phase === "restate"` plus a new non-hidden `doi` turn; the effect then flips `phase` to `"done"` so it only fires once). The prompt explicitly forbids any text/labels in the image, because diffusion models render text unreliably (worse for non-Latin scripts) regardless of UI language. The model's safety classifier has a real false-positive rate on completely benign prompts (observed in testing) — that's why there's a manual Retry button next to `imageError`, not just a dead-end failure. The image is never persisted to D1 (avoids bloating session rows with base64 blobs) — it's session-only; a "Download image" link lets the student save it themselves.

**Git on Windows / this environment.** The repo filesystem is flagged by Git as having "dubious ownership" (common for network/mounted drives on Windows) — git commands in this environment need `-c safe.directory=<repo path>` or they'll fail outright. Likewise, the system's Git Credential Manager can hang waiting for a GUI prompt on `push`; use `gh`'s credential helper explicitly (`-c credential.helper= -c credential.helper="!gh auth git-credential"`) to avoid it.
