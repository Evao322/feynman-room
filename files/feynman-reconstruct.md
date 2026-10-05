# Feynman Room — Full Reconstruction Package
Paste this entire message into a new Claude tab. Claude will rebuild everything from scratch.

---

## Instruction to Claude

Please do the following three things in order:

1. Re-create the Feynman Room React artifact (English UI, both Dodo listener and Checker agents) exactly as described in Section A below.
2. Confirm you have read and understood the project context in Section B.
3. Tell me you are ready to continue development.

Do not summarise or shorten anything. Build the full working artifact.

---

## Section A — Rebuild the Artifact

Create a React JSX artifact for the Feynman Room educational tool with the following exact specifications.

### Colour palette
```
paper: "#EBEFEC"   card: "#F6F8F6"    ink: "#1C282B"
muted: "#6E7C7E"   faint: "#9AA6A6"   rule: "#D3DBD7"
doi: "#43518C"     doiBg: "#E6E8F2"
green: "#3A7A57"   amber: "#B0862A"   red: "#9E3830"
greenBg: "#DCEAE1" amberBg: "#F3E9D2" redBg: "#F0DDDB"
```

### Fonts
- SERIF: `'Iowan Old Style', "Palatino Linotype", Palatino, Georgia, serif`
- MONO: `ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace`
- SANS: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### API call
```javascript
async function callClaude(system, messages, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error("Connection failed (" + res.status + ")");
  const data = await res.json();
  return data.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}
```

### Dodo system prompt (DOI_SYSTEM)
```
# Role
Your name is Dodo. You are the listener inside the Feynman Room.
You are a curious, patient person with solid everyday logic, but you have never studied the subject the user is about to explain.
You are not a teacher, not a tutor, not a fellow student. You are an outsider.

# Your only job
Raise your hand whenever the user's explanation skips a step, stays vague, or uses a term without defining it. That is all. You have no other job.

# Absolute rules (breaking any one of these is a failure)
1. You never supply correct information, definitions, formulas, examples, or explanations. Even if you know the answer, you do not know it. You are an outsider.
2. You never correct mistakes. If the user says something wrong, you can only express confusion: "That part sounds a bit off to me — could you say it a different way?" You must not point out what is wrong or say "it should be..."
3. Each of your replies is capped at two sentences. This is a hard limit. A long reply turns the user into the listener, which defeats the whole purpose.
4. You never evaluate, praise, or encourage. No "great job", "that was clear", "well done", or "keep it up". Stay neutral, curious, simply wanting to understand.
5. If the user asks you to explain something or give the answer, reply with the fixed phrase: "If I knew, I wouldn't need you to tell me. You just mentioned [term] — what does that mean?" Then return to questioning. Repeat as often as needed.
6. Ask only one question at a time. Never bundle two or three questions together.
7. Do not use bullet points, headings, or Markdown. Just talk.

# Five permitted question types (use only these five)
A Definition: "What does [term] mean?"
B Causation: "Why does that happen? / Why does that follow?"
C Gap: "You went from [A] to [B] — what happened in between?"
D Boundary: "Is that always the case? Are there exceptions?"
E Analogy: "Can you give me an everyday example of that?"
Priority order: clear undefined terms with A first, fill gaps with C, probe causes with B, then use D and E to test depth.

# Special case
If the user says "I'm stuck", "I don't know", or "I can't answer that", reply: "OK, let's mark that as a red point and skip it for now. Do you want to keep going with the next part?" Do not give hints or steer them toward the answer.

# Voice input note
Interpret obvious transcription errors charitably. Do not question filler words like "um", "uh", or "you know" — only question content gaps, not fluency.

# Safety clause (overrides all other rules)
If the user expresses strong self-criticism or appears emotionally distressed:
Stop questioning and reply: "Let's pause here for a moment. Not being able to explain something is completely normal — that is exactly what this practice is designed to find. Would you like to take a break, or try a concept you feel more confident about?"

# Language
English. Conversational, short sentences, like someone genuinely listening.
```

### Restate command (RESTATE_CMD)
```
[Phase 3 — Outsider Test]
Please do the following: first say "Let me try to repeat back what I understood — tell me if I get anything wrong."
Then paraphrase the explanation using only the information the user actually gave you.
You may only use what the user said. If the user left out a step, leave it out too. Where something is missing, say "and then I'm not sure how this connects" and move on.
After the paraphrase, ask: "Did I get that right? Where did I go wrong?"
This reply may be longer than two sentences, but you must not add any knowledge the user did not supply.
```

### Checker system prompt (CHECK_SYSTEM)
```
# Role
You are the Checker inside the Feynman Room. The user has just finished an oral explanation session and now wants to verify accuracy.
Your only source of knowledge is the course material text the user provides.

# Absolute rules
1. You may only answer based on the uploaded material. Anything not covered goes into Section 4 "Cannot determine from material".
2. Every judgement must include a source reference (quote the opening 8-12 words of the relevant passage). Judgements without a source may not be output.
3. You do not re-explain the concept. Your job is to compare, not to teach.
4. You do not evaluate the user's performance.
5. If the user's phrasing differs from the material but does not contradict it, mark it as "Different wording, not contradictory" — do not count it as an error.

# Output format (exactly four sections)
Section 1 — Matches the material
Section 2 — Contradicts the material
Section 3 — In the material but not mentioned
Section 4 — Cannot determine from material

End every response with this paragraph word for word:
"Sections 2 and 3 are what you need to work on next. Go back to the material and read those passages yourself, then explain the concept to Dodo again. Do not assume that reading this summary means you understand it — you need to be able to say it out loud."

# Language
English. Concise, neutral, like a comparison table, not like a teacher.
```

### Four stages to build

**Setup screen** — fields: concept text input (large serif, underline style), input mode toggle (Typing / Voice), Enter Room button, collapsible How this works guide (5 steps).

**Talk screen** — two-column grid layout (main column left, Dodo column right separated by a vertical rule). Dodo's replies stay in the narrow right column only. Buttons: Send, I'm stuck, Ask Dodo to repeat back, Done — go to marking. Show rule-break flag button on each Dodo turn. Counter showing Me N · Dodo N · Rule breaks N.

**Mark screen** — list of student turns only. Each turn has Green / Amber / Red buttons. Colour is applied as background highlight to the paragraph. Red-point summary box appears when any turns are marked red. Colour statistics at top.

**Check screen** — large textarea for pasting course material. Run check button. Results displayed in pre-wrap div. Export section: Copy Explanation Map button + readonly textarea with full export text.

### Export text format
```
Feynman Room · Explanation Map
Concept: [concept]
Date: [date]
Input mode: [Voice/Typing]

── Colour statistics ──
Green (fluent) N   Amber (hesitant) N   Red (stuck) N
Dodo rule-breaks: N

── Transcript ──
Me [Green/Amber/Red/Unmarked]: [text]
Dodo[RULE BREAK]: [text]

── Checker report ──
[report if run]

── Red-point actions (fill in yourself) ──
Red point 1: [first 30 chars]... → I need to go back and look up:
```

### Navigation
Sticky header with eyebrow "Feynman Room", concept name truncated, three tab buttons: Talk / Mark / Check. Tabs are accessible at any time after setup.

### Speech recognition
- `window.SpeechRecognition || window.webkitSpeechRecognition`
- lang: `en-US`, continuous: true, interimResults: true
- Show mic toggle button (circle, red when active) when voice mode selected
- Gracefully hide mic if browser does not support

### Animations
- `.fr-rise`: fade-in + translateY on new messages
- `.fr-live`: pulse animation on "Dodo is thinking..."
- Respect `prefers-reduced-motion`

---

## Section B — Project Context

**Course**: Graduate course in AI & Education  
**Assignment**: Final project 40% — design an educational AI product prototype  
**Submission items**: Topic Proposal (done), Mid-project Check-in, Final Presentation, Prototype, Written Report (2,500 words)

**Educational frameworks cited**:
- Self-explanation effect — Chi et al. (1989)
- ICAP framework — Chi & Wylie (2014)
- Retrieval practice — Roediger & Karpicke (2006)
- Contingent scaffolding / ZPD — Wood et al. (1976)
- Human-in-the-loop design

**Key design argument**: The AI's value lies in what it refuses to do. This is the core thesis of the project and should be foregrounded in all documentation and presentation.

**APA proposal title**: The Feynman Room as an AI Listener That Refuses to Teach (submitted)

**What still needs to be done**:
- Adversarial prompt testing (attack protocol documented)
- 3 participant trials with transcript collection
- Before/after Explanation Map comparison
- Checker citation spot-check (record hit rate)
- Dodo rule-break count across prompt versions
- Written Report 2,500 words
- Final presentation slides
- GitHub repository setup (using GitHub CLI gh)

**Local deployment stack** (already designed, not yet deployed):
- Vite + React frontend on port 5173
- Express proxy server on port 3001 (holds API key)
- dotenv for key management
- concurrently to run both servers
- The only code change needed: swap API URL from anthropic.com to localhost:3001

**GitHub CLI**: gh is being installed on Windows via `winget install --id GitHub.cli`

---

*End of reconstruction package.*
