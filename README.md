# 費曼房間 (The Feynman Room)

An educational AI prototype built for a graduate AI & Education course project. It pairs each logged-in student with two separate LLM-backed agents that deliberately refuse to teach:

- **阿呆 (Ah Dai)** — a listener with no knowledge of the subject. It cannot teach or correct — it only asks clarifying questions (capped at two sentences) to expose gaps in the student's spoken/typed explanation, then paraphrases back using *only* what the student actually said.
- **查核員 (Checker)** — a RAG-style agent that compares the student's explanation transcript against uploaded course material (pasted text or PDF) and reports matches / contradictions / omissions, each with a citation. It never teaches or evaluates, and falls back to the student's own material from past sessions before giving up.

**Core design thesis: the AI's value lies in what it refuses to do.** Both agents' system prompts encode hard behavioral rules — most of the engineering in this repo is about preserving and testing those rules, not adding capability.

## Why

The product targets the *illusion of fluency*: students mistake familiarity with material for the ability to actually retrieve and explain it. The flow draws on:

- **Self-explanation effect** (Chi et al., 1989) — explaining aloud exposes knowledge gaps
- **ICAP framework** (Chi & Wylie, 2014) — the two-sentence cap keeps the learner *constructive*, not passive
- **Retrieval practice / testing effect** (Roediger & Karpicke, 2006)
- **Contingent scaffolding / ZPD** (Wood et al., 1976)

A student picks a concept and a subject, explains it (voice or typed, no notes), goes through a few rounds of Ah Dai's clarifying questions, hears Ah Dai paraphrase it back, marks their own transcript green/amber/red, and gets a cross-check against their own uploaded course material from the Checker — then goes back to the red points and re-explains them.

See [`files/feynman-handoff.md`](files/feynman-handoff.md) for the full product spec and theoretical framing.

## Tech stack

- **Frontend**: Vite + React, single component (`feynman-room/src/App.jsx`) — no router, a plain state machine for `setup` / `talk` / `check` stages
- **Backend**: Cloudflare Pages Functions (file-based routing) — there is no Node/Express server; everything runs in the Cloudflare Workers runtime
- **Database**: Cloudflare D1 (SQLite) — users, sessions, transcripts, stuck points
- **LLM**: Google Gemini (free tier) for chat, the Checker's comparison, and voice transcription
- **Image generation**: Cloudflare Workers AI (`flux-1-schnell`, also free tier) generates a label-free summary diagram once Ah Dai's paraphrase lands
- **Auth**: PBKDF2-SHA256 password hashing + opaque-token cookie sessions, no JWT

## Repo layout

```
files/                       reference docs: handoff doc, reconstruction package, original single-file artifact
migrations/*.sql              D1 schema (users, auth_sessions, explanation_sessions, stuck_points)
feynman-room/                 the actual working app — Vite/React frontend + Cloudflare Pages Functions backend + D1
  src/prompts.js               DOI_SYSTEM (Ah Dai), RESTATE_CMD, CHECK_SYSTEM — source of truth for agent behavior
  src/App.jsx                  entire UI: one component, auth gate + setup/talk/check stages
  functions/api/auth/*.js      register / login / logout / me
  functions/api/sessions/*.js   list / create-or-update / get-one saved session
  functions/api/llm.js          Ah Dai chat
  functions/api/check.js        Checker (RAG against uploaded + historical material)
  functions/api/generate-image.js  concept-summary diagram via Cloudflare Workers AI
  functions/api/transcribe.js    voice input transcription
```

## Running locally

```bash
cd feynman-room
npm install
npm run db:migrate:local
npm run dev
```

This starts `wrangler pages dev` on `:8788` (open this URL), which proxies a Vite dev server for instant reload. D1 only exists inside the Cloudflare Workers runtime, so a plain `node server.js` cannot work here — `wrangler pages dev` is the only local dev path.

You'll need a `feynman-room/.dev.vars` file (gitignored) with:

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-flash-lite-latest
```

## Deploying

```bash
cd feynman-room
npm run deploy
```

Deploys to Cloudflare Pages. `GEMINI_API_KEY` must be set as a Pages secret in production (`wrangler pages secret put GEMINI_API_KEY --project-name=feynman-room`); Workers AI (image generation) uses the same Cloudflare account, no extra key needed.

## Status

Course project prototype, not production software. See [`CLAUDE.md`](CLAUDE.md) for detailed architecture notes and known quirks.
