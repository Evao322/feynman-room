# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The Feynman Room — an educational AI prototype for a graduate AI & Education course project (40% of the grade). It is a browser tool that pairs a student with two separate LLM-backed agents:

- **Dodo** — a listener with no knowledge of the subject, forbidden to teach or correct. It only asks clarifying questions (capped at two sentences) to expose gaps in the student's spoken/typed explanation, then paraphrases back using *only* what the student said.
- **Checker** — a RAG-style agent that compares the student's explanation transcript against pasted course material and reports matches/contradictions/omissions, each with a citation. It never teaches or evaluates.

The core design thesis (foreground this in any docs/report work): *the AI's value lies in what it refuses to do*. Both agents' system prompts encode hard behavioral rules; most engineering work on this repo is about preserving/testing those rules, not adding capability.

Full product spec, theoretical framing (self-explanation effect, ICAP, retrieval practice, ZPD), and the project's outstanding to-dos live in `files/feynman-handoff.md`. `files/feynman-room-en.jsx` is the original single-file Claude-Artifact version of the app (kept for reference — the live app is `feynman-room/`).

## Repo layout

```
files/                       reference docs: handoff doc, reconstruction package, original single-file artifact
feynman-room/                the actual working app (Vite/React frontend + Express proxy backend)
  src/prompts.js             DOI_SYSTEM (Dodo), RESTATE_CMD, CHECK_SYSTEM — the only source of truth for agent behavior
  src/App.jsx                entire UI: one component, four stages (setup/talk/mark/check) switched on local state
  server/index.js            Express proxy — adapts the app's Anthropic-shaped request into a Gemini generateContent call
  scripts/adversarial-test.mjs   automated prompt-injection/robustness test runner (see below)
  .env                        GEMINI_API_KEY / GEMINI_MODEL / SERVER_PORT (gitignored, never commit)
```

## Commands

All commands run from `feynman-room/`:

```bash
npm install            # first-time setup
npm run dev             # starts Vite (5173) + Express proxy (3001) together via concurrently
npm run dev:client      # Vite only
npm run dev:server      # Express proxy only
npm run build            # production build (vite build)
npm run test:adversarial # runs scripts/adversarial-test.mjs against the local proxy — requires `npm run dev` already running in another terminal with a real key in .env
```

There is no unit test suite or linter configured. `test:adversarial` is a scripted integration check, not a unit test — it sends the documented attack-prompt list (from `files/feynman-handoff.md`) through the live Dodo/Checker prompts and writes raw transcripts to `scripts/adversarial-report.md` (gitignored, regenerated each run). It does **not** auto-judge pass/fail — read the transcript and fill in the verdict yourself.

## Architecture notes

**Provider-adapter pattern in the proxy.** The frontend's `callClaude()` in `src/App.jsx` sends an Anthropic-Messages-shaped payload (`{ system, messages, max_tokens }`) to `http://localhost:3001/api/llm`. `server/index.js` translates that into Gemini's `generateContent` format (role `assistant`→`model`, `system`→`system_instruction`, etc.) and translates the response back into `{ content: [{ type: "text", text }] }` before returning it. This means the frontend code is written against an Anthropic-like interface even though the actual backend is Google Gemini — if you ever swap providers again, change only `server/index.js`, not `App.jsx`.

**API key never touches the frontend.** `GEMINI_API_KEY` lives only in `feynman-room/.env`, read by `server/index.js`. Do not move API calls into the frontend or pass the key through client-visible code.

**Prompts are the product.** `src/prompts.js` exports `DOI_SYSTEM`, `RESTATE_CMD`, and `CHECK_SYSTEM` as plain string constants, imported by both `App.jsx` (the live app) and `scripts/adversarial-test.mjs` (the test runner) so there is exactly one copy of each agent's behavioral contract. When editing agent behavior, edit here — never duplicate the prompt text elsewhere.

**Model selection.** `GEMINI_MODEL` defaults to `gemini-flash-lite-latest` in both `server/index.js` and `.env.example`. Gemini model availability shifts over time (several model IDs have been deprecated or hit capacity limits during this project) — if requests start failing with "no longer available" or "high demand" errors, check `GET https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY` for the current list of models usable with the project's key before picking a replacement.

**Single-component UI.** `App.jsx` has no router and no child components beyond small presentational helpers (`Eyebrow`, `Btn`). The four stages (`setup`, `talk`, `mark`, `check`) are plain `if` branches inside one function component, gated by `useState("setup")`. Conversation history, three-color marking state, and the Checker report all live in that one component's state and are serialized into the "Explanation Map" export text at the bottom of the `check` stage.

**Git on Windows / this environment.** The repo filesystem is flagged by Git as having "dubious ownership" (common for network/mounted drives on Windows) — git commands in this environment need `-c safe.directory=<repo path>` or they'll fail outright. Likewise, the system's Git Credential Manager can hang waiting for a GUI prompt on `push`; use `gh`'s credential helper explicitly (`-c credential.helper= -c credential.helper="!gh auth git-credential"`) to avoid it.
