import React, { useState, useRef, useEffect, useCallback } from "react";

/* ─── palette ─────────────────────────────────────────── */
const C = {
  paper: "#EBEFEC",
  card: "#F6F8F6",
  ink: "#1C282B",
  muted: "#6E7C7E",
  faint: "#9AA6A6",
  rule: "#D3DBD7",
  doi: "#43518C",
  doiBg: "#E6E8F2",
  green: "#3A7A57",
  amber: "#B0862A",
  red: "#9E3830",
  greenBg: "#DCEAE1",
  amberBg: "#F3E9D2",
  redBg: "#F0DDDB",
};

const SERIF = 'Iowan Old Style, "Palatino Linotype", Palatino, Georgia, "Noto Serif TC", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace';
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif';

/* ─── prompts ─────────────────────────────────────────── */
const DOI_SYSTEM = `# Role
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
The user's input may come from speech recognition and may contain transcription errors or missing punctuation. Interpret obvious errors charitably using the most likely subject-matter term. Do not question filler words like "um", "uh", or "you know" — only question content gaps, not fluency.

# Safety clause (overrides all other rules)
If the user expresses strong self-criticism ("I'm terrible at this", "I'll never get it", "I'm not cut out for this") or appears emotionally distressed:
Stop the questioning flow and reply: "Let's pause here for a moment. Not being able to explain something is completely normal — that is exactly what this practice is designed to find. Would you like to take a break, or try a concept you feel more confident about?"
Do not continue questioning. Do not lecture.

# Language
English. Conversational, short sentences, like someone genuinely listening.`;

const RESTATE_CMD = `[Phase 3 — Outsider Test]
Please do the following: first say "Let me try to repeat back what I understood — tell me if I get anything wrong."
Then paraphrase the explanation using only the information the user actually gave you.
You may only use what the user said. If the user left out a step, leave it out of your paraphrase too — do not fill gaps with your own knowledge. Where something is missing, say "and then I'm not sure how this connects" and move on.
After the paraphrase, ask: "Did I get that right? Where did I go wrong?"
This reply may be longer than two sentences, but you must not add any knowledge the user did not supply.`;

const CHECK_SYSTEM = `# Role
You are the Checker inside the Feynman Room. The user has just finished an oral explanation session and now wants to verify accuracy.
Your only source of knowledge is the course material text the user provides.

# Absolute rules
1. You may only answer based on the uploaded material. Anything not covered by the material — regardless of whether you know it — goes into Section 4 "Cannot determine from material".
2. Every judgement must include a source reference from the material (quote the opening 8-12 words of the relevant passage, or give a paragraph number). Judgements without a source may not be output.
3. You do not re-explain the concept. Your job is to compare, not to teach. If the user asks for a full explanation, reply: "My job is to tell you what matches and what does not. For the full explanation, please refer to the material at [source]."
4. You do not evaluate the user's performance. No "well explained", "needs improvement", or similar phrases.
5. If the user's phrasing differs from the material but does not contradict it (paraphrase, analogy not in the material), mark it as "Different wording, not contradictory" — do not count it as an error.

# Output format (exactly four sections, use these headings, no Markdown symbols)
Section 1 — Matches the material
List each item. Format: You said: "(transcript phrase, under 15 words)" / Source: (opening words of material passage)

Section 2 — Contradicts the material
List each item. Format: You said: "(phrase)" / Material states: (paraphrase of material, no added explanation) / Source: (opening words) / Difference: (one sentence describing the gap, no explanation of why)

Section 3 — In the material but not mentioned
For each item write only: The material mentions [key point name] at [source]. You did not cover it.
Do not explain what that key point means.

Section 4 — Cannot determine from material
What the user said that the material does not cover.

End every response with this paragraph, word for word:
Sections 2 and 3 are what you need to work on next. Go back to the material and read those passages yourself, then explain the concept to Dodo again. Do not assume that reading this summary means you understand it — you need to be able to say it out loud.

# Language
English. Concise, neutral, like a comparison table, not like a teacher.`;

/* ─── api ─────────────────────────────────────────────── */
async function callClaude(system, messages, maxTokens = 1000) {
  const res = await fetch("http://localhost:3001/api/claude", {
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
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/* ─── small pieces ────────────────────────────────────── */
function Eyebrow({ children, color }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: color || C.faint,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, tone = "solid", small }) {
  const base = {
    fontFamily: SANS,
    fontSize: small ? 12 : 14,
    padding: small ? "5px 10px" : "9px 16px",
    borderRadius: 2,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all .15s",
    letterSpacing: "0.02em",
  };
  const tones = {
    solid: { background: C.ink, color: C.card, border: "1px solid " + C.ink },
    ghost: { background: "transparent", color: C.muted, border: "1px solid " + C.rule },
    quiet: { background: "transparent", color: C.faint, border: "none", padding: 0 },
  };
  return (
    <button className="fr-btn" onClick={onClick} disabled={disabled} style={{ ...base, ...tones[tone] }}>
      {children}
    </button>
  );
}

/* ─── main ────────────────────────────────────────────── */
export default function FeynmanRoom() {
  const [stage, setStage] = useState("setup"); // setup | talk | mark | check
  const [concept, setConcept] = useState("");
  const [phase, setPhase] = useState("monologue"); // monologue | dialogue | restate | done
  const [turns, setTurns] = useState([]); // {id, role:'me'|'doi', text, hidden, color, flagged}
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("type");
  const [listening, setListening] = useState(false);
  const [voiceOK, setVoiceOK] = useState(true);
  const [material, setMaterial] = useState("");
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const scrollRef = useRef(null);
  const recRef = useRef(null);
  const baseRef = useRef("");

  const myTurns = turns.filter((t) => t.role === "me" && !t.hidden);
  const myCount = myTurns.length;

  /* speech recognition */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceOK(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let fin = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t;
        else interim += t;
      }
      if (fin) baseRef.current += fin;
      setDraft(baseRef.current + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch (e) {}
    };
  }, []);

  const toggleMic = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      baseRef.current = draft ? draft + " " : "";
      try {
        rec.start();
        setListening(true);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, busy]);

  const push = (role, text, hidden = false) => {
    const t = { id: Date.now() + Math.random(), role, text, hidden, color: null, flagged: false };
    setTurns((p) => [...p, t]);
    return t;
  };

  const buildMsgs = useCallback(
    (extra) => {
      const list = [...turns, ...(extra ? [extra] : [])].map((t) => ({
        role: t.role === "me" ? "user" : "assistant",
        content: t.text,
      }));
      return list;
    },
    [turns]
  );

  const send = async (textOverride, hidden = false) => {
    const text = (textOverride ?? draft).trim();
    if (!text || busy) return;
    setErr("");
    if (listening) {
      recRef.current && recRef.current.stop();
      setListening(false);
    }
    const mine = { role: "me", text, hidden };
    const msgs = buildMsgs(mine);
    push("me", text, hidden);
    setDraft("");
    baseRef.current = "";
    setBusy(true);
    try {
      const reply = await callClaude(
        DOI_SYSTEM + "\n\n# Concept the user is explaining today\n" + concept,
        msgs,
        hidden ? 700 : 300
      );
      push("doi", reply);
      if (phase === "monologue") setPhase("dialogue");
    } catch (e) {
      setErr(e.message + " — please try sending again.");
    }
    setBusy(false);
  };

  const doRestate = () => {
    setPhase("restate");
    send(RESTATE_CMD, true);
  };

  const runCheck = async () => {
    if (!material.trim() || busy) return;
    setErr("");
    setBusy(true);
    setReport("");
    const script = myTurns.map((t, i) => (i + 1) + ". " + t.text).join("\n");
    try {
      const out = await callClaude(
        CHECK_SYSTEM,
        [
          {
            role: "user",
            content:
              "[COURSE MATERIAL]\n" +
              material.trim() +
              "\n\n[MY SPOKEN EXPLANATION TRANSCRIPT]\nConcept: " +
              concept +
              "\n" +
              script,
          },
        ],
        1000
      );
      setReport(out);
    } catch (e) {
      setErr(e.message + " — please try again.");
    }
    setBusy(false);
  };

  const setColor = (id, color) =>
    setTurns((p) => p.map((t) => (t.id === id ? { ...t, color: t.color === color ? null : color } : t)));
  const toggleFlag = (id) =>
    setTurns((p) => p.map((t) => (t.id === id ? { ...t, flagged: !t.flagged } : t)));

  const counts = {
    green: myTurns.filter((t) => t.color === "green").length,
    amber: myTurns.filter((t) => t.color === "amber").length,
    red: myTurns.filter((t) => t.color === "red").length,
  };
  const flagCount = turns.filter((t) => t.role === "doi" && t.flagged).length;

  const exportText = () => {
    const L = [];
    L.push("Feynman Room · Explanation Map");
    L.push("Concept: " + concept);
    L.push("Date: " + new Date().toLocaleString("en-US"));
    L.push("Input mode: " + (mode === "voice" ? "Voice" : "Typing"));
    L.push("");
    L.push("── Colour statistics ──");
    L.push("Green (fluent) " + counts.green + "   Amber (hesitant) " + counts.amber + "   Red (stuck) " + counts.red);
    L.push("Dodo rule-breaks: " + flagCount);
    L.push("");
    L.push("── Transcript ──");
    turns
      .filter((t) => !t.hidden)
      .forEach((t) => {
        if (t.role === "me") {
          const tag = t.color === "green" ? "[Green]" : t.color === "amber" ? "[Amber]" : t.color === "red" ? "[Red]" : "[Unmarked]";
          L.push("Me " + tag + ": " + t.text);
        } else {
          L.push("Dodo" + (t.flagged ? "[RULE BREAK]" : "") + ": " + t.text);
        }
      });
    if (report) {
      L.push("");
      L.push("── Checker report ──");
      L.push(report);
    }
    L.push("");
    L.push("── Red-point actions (fill in yourself) ──");
    myTurns
      .filter((t) => t.color === "red")
      .forEach((t, i) => L.push("Red point " + (i + 1) + ": " + t.text.slice(0, 30) + "... → I need to go back and look up:"));
    return L.join("\n");
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(exportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setErr("Copy failed — please select manually from the text box below.");
    }
  };

  /* ── styles ── */
  const css = `
    .fr-btn:hover:not(:disabled){opacity:.75}
    .fr-in:focus{outline:2px solid ${C.ink};outline-offset:1px}
    .fr-mark:hover{filter:brightness(.96)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    .fr-live{animation:pulse 1.4s ease-in-out infinite}
    @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .fr-rise{animation:rise .35s ease-out}
    .fr-grid{display:grid;grid-template-columns:1fr 260px;gap:0}
    @media (max-width:720px){.fr-grid{grid-template-columns:1fr}}
    @media (prefers-reduced-motion:reduce){.fr-live,.fr-rise{animation:none}}
    ::selection{background:${C.amberBg}}
  `;

  /* ── setup ── */
  if (stage === "setup") {
    return (
      <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
        <style>{css}</style>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "56px 24px 80px" }}>
          <Eyebrow>Feynman Room</Eyebrow>
          <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 400, margin: "10px 0 0", letterSpacing: "-0.01em" }}>
            Feynman Room
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.75, color: C.muted, margin: "18px 0 0" }}>
            Inside this room is someone called Dodo. He has never studied what you are about to explain, and he will not teach you.
            He will only raise his hand when you skip a step and say he does not follow.
            <br />
            The place where you cannot go on is the place where you have not yet learned.
          </p>

          <div style={{ height: 1, background: C.rule, margin: "34px 0 28px" }} />

          <label style={{ display: "block" }}>
            <Eyebrow>Concept for today</Eyebrow>
            <input
              className="fr-in"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && concept.trim() && setStage("talk")}
              placeholder="e.g. Why does conservation of momentum require zero net external force"
              style={{
                width: "100%",
                marginTop: 10,
                padding: "12px 0",
                fontFamily: SERIF,
                fontSize: 20,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid " + C.ink,
                color: C.ink,
              }}
            />
          </label>
          <p style={{ fontSize: 12.5, color: C.faint, margin: "10px 0 0", lineHeight: 1.6 }}>
            Pick one concept, not a whole chapter. Too broad and the conversation drifts — and the transcript becomes impossible to mark.
          </p>

          <div style={{ marginTop: 30 }}>
            <Eyebrow>Input mode</Eyebrow>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[
                ["type", "Typing"],
                ["voice", "Voice"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  className="fr-btn"
                  onClick={() => setMode(k)}
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    padding: "8px 18px",
                    borderRadius: 2,
                    cursor: "pointer",
                    background: mode === k ? C.ink : "transparent",
                    color: mode === k ? C.card : C.muted,
                    border: "1px solid " + (mode === k ? C.ink : C.rule),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {!voiceOK && (
              <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>
                This browser does not support speech recognition. Please use Chrome, or switch to typing.
              </p>
            )}
          </div>

          <div style={{ marginTop: 38 }}>
            <Btn onClick={() => concept.trim() && setStage("talk")} disabled={!concept.trim()}>
              Enter Room
            </Btn>
          </div>

          <button
            className="fr-btn"
            onClick={() => setShowGuide(!showGuide)}
            style={{ background: "none", border: "none", padding: 0, marginTop: 40, cursor: "pointer" }}
          >
            <Eyebrow>{showGuide ? "▾ Hide guide" : "▸ How this works"}</Eyebrow>
          </button>
          {showGuide && (
            <div className="fr-rise" style={{ marginTop: 16, fontSize: 14, lineHeight: 1.85, color: C.muted }}>
              <p style={{ margin: "0 0 14px" }}>
                <strong style={{ color: C.ink }}>1   Opening statement</strong>
                <br />
                Without looking at your notes, explain the concept. Dodo will not interrupt.
              </p>
              <p style={{ margin: "0 0 14px" }}>
                <strong style={{ color: C.ink }}>2   Questioning</strong>
                <br />
                He asks one question at a time, two sentences maximum. If you are stuck, press "I'm stuck" — he will not give you a hint.
              </p>
              <p style={{ margin: "0 0 14px" }}>
                <strong style={{ color: C.ink }}>3   Outsider test</strong>
                <br />
                He repeats back what he understood in his own words. Anything you left out, he leaves out too — the holes are what you missed.
              </p>
              <p style={{ margin: "0 0 14px" }}>
                <strong style={{ color: C.ink }}>4   Three-colour marking</strong>
                <br />
                Fluent sections go green, hesitant ones amber, stuck ones red.
              </p>
              <p style={{ margin: "0 0 14px" }}>
                <strong style={{ color: C.ink }}>5   Checker</strong>
                <br />
                Paste in your course material. The Checker only verifies whether you are consistent with the material — not whether you are correct. Those are different things.
              </p>
              <p style={{ margin: 0, color: C.faint, fontSize: 13 }}>
                Anything you explain fluently but incorrectly, Dodo cannot catch — only the Checker can. Together they give you the full picture.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── shared header ── */
  const Header = () => (
    <div
      style={{
        borderBottom: "1px solid " + C.rule,
        background: C.paper,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 940,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow>Feynman Room</Eyebrow>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 19,
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {concept}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["talk", "Talk"],
            ["mark", "Mark"],
            ["check", "Check"],
          ].map(([k, label]) => (
            <button
              key={k}
              className="fr-btn"
              onClick={() => setStage(k)}
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.1em",
                padding: "6px 12px",
                borderRadius: 2,
                cursor: "pointer",
                background: stage === k ? C.ink : "transparent",
                color: stage === k ? C.card : C.faint,
                border: "1px solid " + (stage === k ? C.ink : C.rule),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── talk ── */
  if (stage === "talk") {
    return (
      <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink, display: "flex", flexDirection: "column" }}>
        <style>{css}</style>
        <Header />

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 940, margin: "0 auto", padding: "28px 24px 20px" }}>
            {turns.length === 0 && (
              <div className="fr-grid">
                <div style={{ paddingRight: 28 }} />
                <div style={{ borderLeft: "1px solid " + C.rule, paddingLeft: 18 }}>
                  <Eyebrow color={C.doi}>Dodo</Eyebrow>
                  <p style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.8, color: C.doi, margin: "8px 0 0" }}>
                    Hi, I'm Dodo. I have never studied this. What are you going to explain to me? Start talking — I won't interrupt. When you're done, I'll start asking.
                  </p>
                </div>
              </div>
            )}

            {turns
              .filter((t) => !t.hidden)
              .map((t) =>
                t.role === "me" ? (
                  <div key={t.id} className="fr-grid fr-rise" style={{ marginBottom: 22 }}>
                    <div style={{ paddingRight: 28 }}>
                      <p
                        style={{
                          fontFamily: SERIF,
                          fontSize: 18.5,
                          lineHeight: 1.85,
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          background:
                            t.color === "green"
                              ? C.greenBg
                              : t.color === "amber"
                              ? C.amberBg
                              : t.color === "red"
                              ? C.redBg
                              : "transparent",
                          boxShadow: t.color ? "0 0 0 4px " + (t.color === "green" ? C.greenBg : t.color === "amber" ? C.amberBg : C.redBg) : "none",
                        }}
                      >
                        {t.text}
                      </p>
                    </div>
                    <div />
                  </div>
                ) : (
                  <div key={t.id} className="fr-grid fr-rise" style={{ marginBottom: 22 }}>
                    <div style={{ paddingRight: 28 }} />
                    <div style={{ borderLeft: "1px solid " + C.rule, paddingLeft: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <Eyebrow color={C.doi}>Dodo</Eyebrow>
                        <button
                          className="fr-btn"
                          onClick={() => toggleFlag(t.id)}
                          title="Did Dodo give an answer or start teaching? Flag it — this is your research data."
                          style={{
                            fontFamily: MONO,
                            fontSize: 9.5,
                            letterSpacing: "0.1em",
                            padding: "2px 6px",
                            borderRadius: 2,
                            cursor: "pointer",
                            background: t.flagged ? C.red : "transparent",
                            color: t.flagged ? C.card : C.faint,
                            border: "1px solid " + (t.flagged ? C.red : C.rule),
                          }}
                        >
                          Rule break
                        </button>
                      </div>
                      <p style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.8, color: C.doi, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                        {t.text}
                      </p>
                    </div>
                  </div>
                )
              )}

            {busy && (
              <div className="fr-grid">
                <div />
                <div style={{ borderLeft: "1px solid " + C.rule, paddingLeft: 18 }}>
                  <span className="fr-live" style={{ fontFamily: MONO, fontSize: 12, color: C.faint }}>
                    Dodo is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div style={{ borderTop: "1px solid " + C.rule, background: C.card }}>
          <div style={{ maxWidth: 940, margin: "0 auto", padding: "14px 24px 18px" }}>
            {err && <p style={{ color: C.red, fontSize: 12.5, margin: "0 0 10px" }}>{err}</p>}

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              {mode === "voice" && voiceOK && (
                <button
                  className="fr-btn"
                  onClick={toggleMic}
                  disabled={busy}
                  style={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 23,
                    cursor: "pointer",
                    background: listening ? C.red : "transparent",
                    border: "1px solid " + (listening ? C.red : C.rule),
                    color: listening ? C.card : C.muted,
                    fontSize: 17,
                  }}
                  title={listening ? "Stop" : "Start speaking"}
                >
                  {listening ? "■" : "●"}
                </button>
              )}
              <textarea
                className="fr-in"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  baseRef.current = e.target.value;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={mode === "voice" ? 3 : 2}
                placeholder={
                  listening
                    ? "Listening... press the square to stop"
                    : turns.length === 0
                    ? "Without looking at your notes, explain the concept. Send when done."
                    : "Keep going. ⌘/Ctrl + Enter to send"
                }
                style={{
                  flex: 1,
                  resize: "vertical",
                  padding: "10px 12px",
                  fontFamily: SERIF,
                  fontSize: 16.5,
                  lineHeight: 1.7,
                  background: C.paper,
                  border: "1px solid " + C.rule,
                  borderRadius: 2,
                  color: C.ink,
                }}
              />
              <Btn onClick={() => send()} disabled={busy || !draft.trim()}>
                Send
              </Btn>
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Btn tone="ghost" small onClick={() => send("I'm stuck")} disabled={busy || turns.length === 0}>
                I'm stuck
              </Btn>
              <Btn tone="ghost" small onClick={doRestate} disabled={busy || myCount < 3 || phase === "restate"}>
                Ask Dodo to repeat back
              </Btn>
              <Btn tone="ghost" small onClick={() => setStage("mark")} disabled={myCount < 2}>
                Done — go to marking →
              </Btn>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, letterSpacing: "0.08em", marginLeft: "auto" }}>
                Me {myCount} · Dodo {turns.filter((t) => t.role === "doi").length}
                {flagCount > 0 && " · Rule breaks " + flagCount}
              </span>
            </div>
            {myCount >= 3 && myCount < 6 && phase === "dialogue" && (
              <p style={{ fontSize: 11.5, color: C.faint, margin: "8px 0 0" }}>
                Six to ten rounds of questioning before asking him to repeat back tends to work best. Keep any single session under fifteen minutes — longer than that and he may start forgetting his rules.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── mark ── */
  if (stage === "mark") {
    const marked = myTurns.filter((t) => t.color).length;
    return (
      <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
        <style>{css}</style>
        <Header />
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "30px 24px 80px" }}>
          <Eyebrow>Phase 4</Eyebrow>
          <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, margin: "8px 0 6px" }}>Three-colour marking</h2>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: C.muted, margin: "0 0 6px" }}>
            Green = explained without pausing and held up under questioning. Amber = paused for more than three seconds, or corrected yourself. Red = stuck, or answered a different question.
          </p>
          <p style={{ fontSize: 12.5, color: C.faint, margin: 0 }}>
            There is no right answer here. You know best where you actually got stuck.
          </p>

          <div style={{ display: "flex", gap: 20, margin: "24px 0 6px", fontFamily: MONO, fontSize: 12 }}>
            <span style={{ color: C.green }}>Green {counts.green}</span>
            <span style={{ color: C.amber }}>Amber {counts.amber}</span>
            <span style={{ color: C.red }}>Red {counts.red}</span>
            <span style={{ color: C.faint, marginLeft: "auto" }}>
              {marked}/{myCount}
            </span>
          </div>
          <div style={{ height: 1, background: C.rule, marginBottom: 26 }} />

          {myTurns.length === 0 && <p style={{ color: C.faint }}>Nothing here yet. Go back to Talk and explain something.</p>}

          {myTurns.map((t, i) => (
            <div key={t.id} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, letterSpacing: "0.1em", marginRight: 6 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {[
                  ["green", "Green", C.green, C.greenBg],
                  ["amber", "Amber", C.amber, C.amberBg],
                  ["red", "Red", C.red, C.redBg],
                ].map(([k, label, col, bg]) => (
                  <button
                    key={k}
                    className="fr-mark"
                    onClick={() => setColor(t.id, k)}
                    style={{
                      fontFamily: SANS,
                      fontSize: 12,
                      padding: "3px 12px",
                      borderRadius: 2,
                      cursor: "pointer",
                      background: t.color === k ? bg : "transparent",
                      color: t.color === k ? col : C.faint,
                      border: "1px solid " + (t.color === k ? col : C.rule),
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p
                style={{
                  fontFamily: SERIF,
                  fontSize: 17.5,
                  lineHeight: 1.85,
                  margin: 0,
                  padding: "6px 10px",
                  whiteSpace: "pre-wrap",
                  borderLeft: "3px solid " + (t.color === "green" ? C.green : t.color === "amber" ? C.amber : t.color === "red" ? C.red : C.rule),
                  background: t.color === "green" ? C.greenBg : t.color === "amber" ? C.amberBg : t.color === "red" ? C.redBg : "transparent",
                }}
              >
                {t.text}
              </p>
            </div>
          ))}

          {counts.red > 0 && (
            <div style={{ marginTop: 34, padding: "18px 20px", background: C.card, border: "1px solid " + C.rule }}>
              <Eyebrow color={C.red}>Red points</Eyebrow>
              <p style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 0", lineHeight: 1.7 }}>
                For each red point, write one sentence: "What exactly do I need to go back and look up?" Be specific — page number or concept name, not just "review this".
                The export file has spaces reserved for each one.
              </p>
            </div>
          )}

          <div style={{ marginTop: 30, display: "flex", gap: 10 }}>
            <Btn onClick={() => setStage("check")}>Next — Check →</Btn>
            <Btn tone="ghost" onClick={() => setStage("talk")}>
              Back to Talk
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ── check ── */
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
      <style>{css}</style>
      <Header />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "30px 24px 80px" }}>
        <Eyebrow>Phase 5</Eyebrow>
        <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, margin: "8px 0 6px" }}>Checker</h2>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: C.muted, margin: "0 0 4px" }}>
          Dodo never saw the course material, so he can catch what you failed to say — but not what you said incorrectly. The Checker does the opposite.
        </p>
        <p style={{ fontSize: 12.5, color: C.faint, margin: 0, lineHeight: 1.7 }}>
          The Checker verifies whether you are consistent with the material — not whether you are correct. If the material contains an error, the Checker will follow the material.
        </p>

        <div style={{ height: 1, background: C.rule, margin: "26px 0 22px" }} />

        <Eyebrow>Paste your course material (just the section on this concept — three to eight pages is enough)</Eyebrow>
        <textarea
          className="fr-in"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          rows={9}
          placeholder={"The relevant section from your textbook, your lecture notes, or a key-criteria table you made yourself.\n\nAdding a criteria table improves accuracy significantly. Format like this:\n[Required conditions] ...\n[Common wrong statements] ...\n[Must mention to be complete] 1. 2. 3."}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px 14px",
            fontFamily: SANS,
            fontSize: 14,
            lineHeight: 1.7,
            background: C.card,
            border: "1px solid " + C.rule,
            borderRadius: 2,
            color: C.ink,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
          <Btn onClick={runCheck} disabled={busy || !material.trim() || myCount === 0}>
            {busy ? "Checking..." : "Run check"}
          </Btn>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, letterSpacing: "0.08em" }}>
            Submitting {myCount} transcript segments
          </span>
        </div>
        {err && <p style={{ color: C.red, fontSize: 12.5, marginTop: 10 }}>{err}</p>}

        {report && (
          <div className="fr-rise" style={{ marginTop: 30, padding: "22px 24px", background: C.card, border: "1px solid " + C.rule }}>
            <Eyebrow>Check results</Eyebrow>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 14.5,
                lineHeight: 1.85,
                whiteSpace: "pre-wrap",
                marginTop: 12,
                color: C.ink,
              }}
            >
              {report}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.faint, marginTop: 20, lineHeight: 1.7 }}>
              Spot-check three of the source references against the material to confirm they actually exist. Citation fabrication is the most common failure mode in systems like this — your hit rate is the most valuable number in your report.
            </p>
          </div>
        )}

        <div style={{ height: 1, background: C.rule, margin: "36px 0 22px" }} />

        <Eyebrow>Export</Eyebrow>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 14px", lineHeight: 1.7 }}>
          Transcript, colour statistics, rule-break count, checker report, and red-point fields — all in one copy. This page does not save automatically.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Btn onClick={copyAll}>{copied ? "Copied" : "Copy Explanation Map"}</Btn>
          <Btn tone="ghost" onClick={() => setStage("talk")}>
              Go back and explain the red points
            </Btn>
        </div>
        <textarea
          readOnly
          value={exportText()}
          rows={8}
          onFocus={(e) => e.target.select()}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 12,
            fontFamily: MONO,
            fontSize: 11.5,
            lineHeight: 1.65,
            background: C.card,
            border: "1px solid " + C.rule,
            borderRadius: 2,
            color: C.muted,
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}
