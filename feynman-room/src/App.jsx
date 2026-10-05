import React, { useState, useRef, useEffect, useCallback } from "react";
import { PROMPTS } from "./prompts.js";

/* ─── palette ─────────────────────────────────────────── */
const C = {
  paper: "#EBEFEC",
  card: "#F6F8F6",
  ink: "#1C282B",
  muted: "#6E7C7E",
  faint: "#9AA6A6",
  rule: "#D3DBD7",
  fill: "#E2E7E3",
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

/* ─── i18n ────────────────────────────────────────────── */
const STRINGS = {
  en: {
    appName: "Feynman Room",
    tagline: "A listener who never teaches.",
    conceptLabel: "Concept for today",
    conceptPlaceholder: "e.g. conservation of momentum",
    inputModeLabel: "Input mode",
    typing: "Typing",
    voice: "Voice",
    voiceUnsupported: "This browser does not support microphone recording. Please switch to typing.",
    languageLabel: "Language",
    voiceLanguageLabel: "Voice language",
    cantonese: "Cantonese",
    mandarin: "Mandarin",
    enterRoom: "Enter Room",
    howThisWorks: "How this works",
    guideTitle: "How this works",
    guideIntro:
      "Dodo has never studied what you're about to explain, and he won't teach you. He only raises his hand when you skip a step. The place where you cannot go on is the place where you haven't yet learned.",
    guideSteps: [
      ["Opening statement", "Without looking at your notes, explain the concept. Dodo will not interrupt."],
      ["Questioning", 'He asks one question at a time, two sentences max. If you\'re stuck, press "I\'m stuck" — he won\'t give you a hint.'],
      ["Outsider test", "He repeats back what he understood in his own words. Anything you left out, he leaves out too — the holes are what you missed."],
      ["Three-colour marking", "Fluent sections go green, hesitant ones amber, stuck ones red."],
      ["Checker", "Paste in your course material. The Checker only verifies whether you're consistent with it — not whether you're correct."],
    ],
    tabTalk: "Talk",
    tabMark: "Mark",
    tabCheck: "Check",
    dodoGreeting:
      "Hi, I'm Dodo. I have never studied this. What are you going to explain to me? Start talking — I won't interrupt. When you're done, I'll start asking.",
    explainPlaceholder: "Explain the concept…",
    keepGoingPlaceholder: "Keep going…",
    listeningPlaceholder: "Recording… tap the square to stop",
    transcribingPlaceholder: "Transcribing…",
    imStuck: "I'm stuck",
    askRepeat: "Ask Dodo to repeat back",
    done: "Done",
    meDodoCount: (me, dodo) => `Me ${me} · Dodo ${dodo}`,
    ruleBreaksSuffix: (n) => ` · Rule breaks ${n}`,
    dodoThinking: "Dodo is thinking…",
    flagTitle: "Flag a rule break",
    marking: "Marking",
    nothingHereYet: "Nothing here yet — go back to Talk first.",
    green: "Green",
    amber: "Amber",
    red: "Red",
    redPoints: (n) => `${n} red point${n > 1 ? "s" : ""} to revisit`,
    nextCheck: "Next — Check",
    backToTalk: "Back to Talk",
    checker: "Checker",
    courseMaterial: "Course material",
    materialPlaceholder: "Paste the relevant section from your textbook or notes…",
    runCheck: "Run check",
    checking: "Checking…",
    checkResults: "Check results",
    exportLabel: "Export",
    copyMap: "Copy Explanation Map",
    copied: "Copied",
    goBackRed: "Go back and explain the red points",
    connectionFailedSuffix: " — please try sending again.",
    connectionFailedSuffix2: " — please try again.",
    copyFailed: "Copy failed — please select manually from the text box below.",
  },
  zh: {
    appName: "費曼房間",
    tagline: "一個絕不教你的聆聽者。",
    conceptLabel: "今天要解釋的概念",
    conceptPlaceholder: "例如：動量守恆",
    inputModeLabel: "輸入方式",
    typing: "打字",
    voice: "語音",
    voiceUnsupported: "這個瀏覽器不支援錄音功能，請切換成打字。",
    languageLabel: "顯示語言",
    voiceLanguageLabel: "語音辨識語言",
    cantonese: "粵語",
    mandarin: "普通話",
    enterRoom: "進入房間",
    howThisWorks: "使用說明",
    guideTitle: "使用說明",
    guideIntro:
      "多多從來沒有學過你即將要解釋的東西，他也不會教你。他只會在你跳過某個步驟時舉手。你講不下去的地方，就是你還沒學會的地方。",
    guideSteps: [
      ["開場陳述", "不要看筆記，直接解釋這個概念。多多不會打斷你。"],
      ["提問階段", "他一次只問一個問題，最多兩句話。如果卡住了，按「我卡住了」——他不會給你提示。"],
      ["外行人複述測試", "他會用自己的話把聽到的內容複述一次。你漏講的部分，他也會漏掉——那些空缺就是你還沒搞懂的地方。"],
      ["三色標記", "講得流暢的標綠色，猶豫的標黃色，卡住的標紅色。"],
      ["查核員", "貼上你的課程教材。查核員只核對你講的內容跟教材是否一致——不是核對你講得對不對。"],
    ],
    tabTalk: "對話",
    tabMark: "標記",
    tabCheck: "查核",
    dodoGreeting:
      "嗨，我是多多。這個我完全沒學過。你要跟我解釋什麼？開始講吧——我不會打斷你。你講完之後，我會開始發問。",
    explainPlaceholder: "開始解釋這個概念…",
    keepGoingPlaceholder: "繼續講…",
    listeningPlaceholder: "錄音中…再按一次方塊停止",
    transcribingPlaceholder: "轉換文字中…",
    imStuck: "我卡住了",
    askRepeat: "請多多複述一次",
    done: "完成",
    meDodoCount: (me, dodo) => `我 ${me} · 多多 ${dodo}`,
    ruleBreaksSuffix: (n) => ` · 違規次數 ${n}`,
    dodoThinking: "多多正在想…",
    flagTitle: "標記違規",
    marking: "標記",
    nothingHereYet: "這裡還沒有內容——先回到對話畫面吧。",
    green: "綠色",
    amber: "黃色",
    red: "紅色",
    redPoints: (n) => `有 ${n} 個紅點需要回頭複習`,
    nextCheck: "下一步 — 查核",
    backToTalk: "回到對話",
    checker: "查核員",
    courseMaterial: "課程教材",
    materialPlaceholder: "貼上教科書或筆記裡相關的段落…",
    runCheck: "開始查核",
    checking: "查核中…",
    checkResults: "查核結果",
    exportLabel: "匯出",
    copyMap: "複製解釋地圖",
    copied: "已複製",
    goBackRed: "回去解釋紅點部分",
    connectionFailedSuffix: " — 請再試一次。",
    connectionFailedSuffix2: " — 請再試一次。",
    copyFailed: "複製失敗 — 請在下方文字框手動選取。",
  },
};

const VOICE_LANG_LABEL = {
  en: { _: "English" },
  zh: { mandarin: "Mandarin Chinese", cantonese: "Cantonese" },
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function transcribeAudio(base64, mimeType, languageHint) {
  const url = import.meta.env.DEV ? "http://localhost:3001/api/transcribe" : "/api/transcribe";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64, mimeType, languageHint }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Transcription failed (" + res.status + ")");
  return data.text;
}

/* ─── api ─────────────────────────────────────────────── */
async function callClaude(system, messages, maxTokens = 1000) {
  const url = import.meta.env.DEV ? "http://localhost:3001/api/llm" : "/api/llm";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.error ? " — " + body.error : "";
    } catch (e) {}
    throw new Error("Connection failed (" + res.status + ")" + detail);
  }
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

function Btn({ children, onClick, disabled, tone = "solid", small, full }) {
  const base = {
    fontFamily: SANS,
    fontWeight: 600,
    fontSize: small ? 13 : 15,
    padding: small ? "7px 14px" : "12px 20px",
    borderRadius: 980,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "transform .12s ease, opacity .12s ease",
    width: full ? "100%" : "auto",
    whiteSpace: "nowrap",
  };
  const tones = {
    solid: { background: C.ink, color: C.card },
    ghost: { background: C.fill, color: C.ink },
  };
  return (
    <button className="fr-btn" onClick={onClick} disabled={disabled} style={{ ...base, ...tones[tone] }}>
      {children}
    </button>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: C.fill, borderRadius: 10, padding: 2, gap: 2 }}>
      {options.map(([k, label]) => (
        <button
          key={k}
          className="fr-btn"
          onClick={() => onChange(k)}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 8,
            padding: "7px 10px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: value === k ? C.card : "transparent",
            color: value === k ? C.ink : C.muted,
            boxShadow: value === k ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            transition: "all .2s ease",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fr-rise"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.paper,
          borderRadius: "20px 20px 0 0",
          maxWidth: 560,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "12px 22px 36px",
          boxShadow: "0 -4px 24px rgba(0,0,0,.2)",
        }}
      >
        <div style={{ width: 36, height: 5, background: C.rule, borderRadius: 3, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, margin: 0 }}>{title}</h2>
          <button
            className="fr-btn"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              border: "none",
              background: C.fill,
              color: C.muted,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
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
  const [lang, setLang] = useState("en"); // en | zh
  const [voiceLang, setVoiceLang] = useState("mandarin"); // cantonese | mandarin (used when lang === "zh")

  const [transcribing, setTranscribing] = useState(false);

  const t = STRINGS[lang];
  const prompts = PROMPTS[lang];

  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const myTurns = turns.filter((t) => t.role === "me" && !t.hidden);
  const myCount = myTurns.length;

  const languageHint = lang === "zh" ? VOICE_LANG_LABEL.zh[voiceLang] : VOICE_LANG_LABEL.en._;

  /* mic support check — MediaRecorder works in both Chrome and Safari (14.1+), unlike SpeechRecognition */
  useEffect(() => {
    const ok = typeof window !== "undefined" && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
    setVoiceOK(ok);
  }, []);

  const pickMimeType = () => {
    const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    return candidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
  };

  const toggleMic = async () => {
    if (listening) {
      mediaRecorderRef.current && mediaRecorderRef.current.stop();
      return;
    }
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        streamRef.current && streamRef.current.getTracks().forEach((tr) => tr.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, blob.type, languageHint);
          if (text) setDraft((d) => (d ? d + " " : "") + text);
        } catch (e) {
          setErr(e.message);
        }
        setTranscribing(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch (e) {
      setErr(
        e.name === "NotFoundError"
          ? "No microphone found. Please check your device's microphone."
          : "Microphone access was denied. Please allow microphone access in your browser settings."
      );
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
    const mine = { role: "me", text, hidden };
    const msgs = buildMsgs(mine);
    push("me", text, hidden);
    setDraft("");
    setBusy(true);
    try {
      const conceptHeader = lang === "zh" ? "\n\n# 使用者今天要解釋的概念\n" : "\n\n# Concept the user is explaining today\n";
      const reply = await callClaude(prompts.DOI_SYSTEM + conceptHeader + concept, msgs, hidden ? 700 : 300);
      push("doi", reply);
      if (phase === "monologue") setPhase("dialogue");
    } catch (e) {
      setErr(e.message + t.connectionFailedSuffix);
    }
    setBusy(false);
  };

  const doRestate = () => {
    setPhase("restate");
    send(prompts.RESTATE_CMD, true);
  };

  const runCheck = async () => {
    if (!material.trim() || busy) return;
    setErr("");
    setBusy(true);
    setReport("");
    const script = myTurns.map((t, i) => (i + 1) + ". " + t.text).join("\n");
    try {
      const materialHeader = lang === "zh" ? "[課程教材]\n" : "[COURSE MATERIAL]\n";
      const transcriptHeader = lang === "zh" ? "\n\n[口頭解釋逐字稿]\n概念：" : "\n\n[MY SPOKEN EXPLANATION TRANSCRIPT]\nConcept: ";
      const out = await callClaude(
        prompts.CHECK_SYSTEM,
        [
          {
            role: "user",
            content: materialHeader + material.trim() + transcriptHeader + concept + "\n" + script,
          },
        ],
        1000
      );
      setReport(out);
    } catch (e) {
      setErr(e.message + t.connectionFailedSuffix2);
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
    L.push("Language: " + (lang === "zh" ? "Traditional Chinese (" + (voiceLang === "cantonese" ? "Cantonese" : "Mandarin") + ")" : "English"));
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
      setErr(t.copyFailed);
    }
  };

  /* ── styles ── */
  const css = `
    * { box-sizing: border-box; }
    .fr-btn:active:not(:disabled){ transform: scale(0.96); }
    .fr-btn:hover:not(:disabled){ opacity:.82; }
    .fr-in:focus{ outline: 2px solid ${C.ink}; outline-offset: 1px; }
    textarea.fr-in, input.fr-in { font-family: inherit; }
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    .fr-live{animation:pulse 1.4s ease-in-out infinite}
    @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .fr-rise{animation:rise .3s ease-out}
    @media (prefers-reduced-motion:reduce){.fr-live,.fr-rise{animation:none}}
    ::selection{background:${C.amberBg}}
  `;

  const GuideSheet = (
    <Sheet open={showGuide} onClose={() => setShowGuide(false)} title={t.guideTitle}>
      <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.7, color: C.muted, margin: "0 0 20px" }}>{t.guideIntro}</p>
      {t.guideSteps.map(([title, body], i) => (
        <div key={title} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: C.doiBg,
              color: C.doi,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SANS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.ink }}>{title}</div>
            <div style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.55, color: C.muted, marginTop: 2 }}>{body}</div>
          </div>
        </div>
      ))}
    </Sheet>
  );

  /* ── setup ── */
  if (stage === "setup") {
    return (
      <div
        style={{
          background: C.paper,
          minHeight: "100vh",
          fontFamily: SANS,
          color: C.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
        }}
      >
        <style>{css}</style>
        <div style={{ maxWidth: 400, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>{t.appName}</h1>
            <p style={{ fontFamily: SERIF, fontSize: 15, color: C.muted, margin: "6px 0 0" }}>{t.tagline}</p>
          </div>

          <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <Eyebrow>{t.conceptLabel}</Eyebrow>
            <input
              className="fr-in"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && concept.trim() && setStage("talk")}
              placeholder={t.conceptPlaceholder}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px 14px",
                fontFamily: SERIF,
                fontSize: 17,
                background: C.fill,
                border: "none",
                borderRadius: 12,
                color: C.ink,
              }}
            />

            <div style={{ marginTop: 18 }}>
              <Eyebrow>{t.inputModeLabel}</Eyebrow>
              <div style={{ marginTop: 8 }}>
                <Segmented
                  options={[
                    ["type", t.typing],
                    ["voice", t.voice],
                  ]}
                  value={mode}
                  onChange={setMode}
                />
              </div>
              {!voiceOK && <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{t.voiceUnsupported}</p>}
            </div>

            <div style={{ marginTop: 18 }}>
              <Eyebrow>{t.languageLabel}</Eyebrow>
              <div style={{ marginTop: 8 }}>
                <Segmented
                  options={[
                    ["en", "English"],
                    ["zh", "繁體中文"],
                  ]}
                  value={lang}
                  onChange={setLang}
                />
              </div>
            </div>

            {lang === "zh" && (
              <div className="fr-rise" style={{ marginTop: 18 }}>
                <Eyebrow>{t.voiceLanguageLabel}</Eyebrow>
                <div style={{ marginTop: 8 }}>
                  <Segmented
                    options={[
                      ["mandarin", t.mandarin],
                      ["cantonese", t.cantonese],
                    ]}
                    value={voiceLang}
                    onChange={setVoiceLang}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <Btn full onClick={() => concept.trim() && setStage("talk")} disabled={!concept.trim()}>
              {t.enterRoom}
            </Btn>
          </div>

          <button
            className="fr-btn"
            onClick={() => setShowGuide(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              marginTop: 18,
              background: "none",
              border: "none",
              color: C.muted,
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              padding: 8,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                border: "1.5px solid currentColor",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
              }}
            >
              i
            </span>
            {t.howThisWorks}
          </button>
        </div>
        {GuideSheet}
      </div>
    );
  }

  /* ── shared header ── */
  const Header = () => (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(235,239,236,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "0.5px solid " + C.rule,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 16,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: 1,
          }}
        >
          {concept}
        </div>
        <div style={{ width: 230, flexShrink: 0 }}>
          <Segmented
            options={[
              ["talk", t.tabTalk],
              ["mark", t.tabMark],
              ["check", t.tabCheck],
            ]}
            value={stage}
            onChange={setStage}
          />
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
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 16px 12px" }}>
            {turns.length === 0 && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div
                  style={{
                    maxWidth: "78%",
                    background: C.doiBg,
                    color: C.doi,
                    padding: "11px 15px",
                    borderRadius: 18,
                    fontFamily: MONO,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                  }}
                >
                  {t.dodoGreeting}
                </div>
              </div>
            )}

            {turns
              .filter((t) => !t.hidden)
              .map((turn) =>
                turn.role === "me" ? (
                  <div key={turn.id} className="fr-rise" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <div
                      style={{
                        maxWidth: "78%",
                        background:
                          turn.color === "green"
                            ? C.greenBg
                            : turn.color === "amber"
                            ? C.amberBg
                            : turn.color === "red"
                            ? C.redBg
                            : C.card,
                        color: C.ink,
                        padding: "11px 15px",
                        borderRadius: 18,
                        fontFamily: SERIF,
                        fontSize: 16,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                      }}
                    >
                      {turn.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={turn.id}
                    className="fr-rise"
                    style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 6, marginBottom: 10 }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        background: C.doiBg,
                        color: C.doi,
                        padding: "11px 15px",
                        borderRadius: 18,
                        fontFamily: MONO,
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {turn.text}
                    </div>
                    <button
                      className="fr-btn"
                      onClick={() => toggleFlag(turn.id)}
                      title={t.flagTitle}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        border: "none",
                        flexShrink: 0,
                        background: turn.flagged ? C.red : C.rule,
                        color: turn.flagged ? "#fff" : C.muted,
                        fontSize: 10.5,
                        cursor: "pointer",
                      }}
                    >
                      ⚑
                    </button>
                  </div>
                )
              )}

            {busy && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div
                  className="fr-live"
                  style={{
                    background: C.doiBg,
                    color: C.doi,
                    padding: "11px 15px",
                    borderRadius: 18,
                    fontFamily: MONO,
                    fontSize: 13,
                  }}
                >
                  {t.dodoThinking}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div
          style={{
            borderTop: "0.5px solid " + C.rule,
            background: "rgba(246,248,246,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "10px 16px 14px" }}>
            {err && <p style={{ color: C.red, fontSize: 13, margin: "0 0 8px" }}>{err}</p>}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              {mode === "voice" && voiceOK && (
                <button
                  className="fr-btn"
                  onClick={toggleMic}
                  disabled={busy || transcribing}
                  style={{
                    width: 57,
                    height: 57,
                    flexShrink: 0,
                    borderRadius: 28.5,
                    cursor: "pointer",
                    border: "none",
                    background: listening ? C.red : C.fill,
                    color: listening ? "#fff" : C.muted,
                    fontSize: 23,
                    opacity: transcribing ? 0.5 : 1,
                  }}
                  title={listening ? "Stop" : "Start speaking"}
                >
                  {listening ? "■" : "●"}
                </button>
              )}
              <textarea
                className="fr-in"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={mode === "voice" ? 2 : 1}
                disabled={transcribing}
                placeholder={
                  listening
                    ? t.listeningPlaceholder
                    : transcribing
                    ? t.transcribingPlaceholder
                    : turns.length === 0
                    ? t.explainPlaceholder
                    : t.keepGoingPlaceholder
                }
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "10px 14px",
                  fontFamily: SERIF,
                  fontSize: 16,
                  lineHeight: 1.5,
                  background: C.fill,
                  border: "none",
                  borderRadius: 20,
                  color: C.ink,
                  maxHeight: 120,
                }}
              />
              <button
                className="fr-btn"
                onClick={() => send()}
                disabled={busy || !draft.trim()}
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 19,
                  border: "none",
                  cursor: busy || !draft.trim() ? "not-allowed" : "pointer",
                  background: busy || !draft.trim() ? C.rule : C.ink,
                  color: C.card,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ↑
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Btn tone="ghost" small onClick={() => send("I'm stuck")} disabled={busy || turns.length === 0}>
                {t.imStuck}
              </Btn>
              <Btn tone="ghost" small onClick={doRestate} disabled={busy || myCount < 3 || phase === "restate"}>
                {t.askRepeat}
              </Btn>
              <Btn tone="ghost" small onClick={() => setStage("mark")} disabled={myCount < 2}>
                {t.done}
              </Btn>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, marginLeft: "auto" }}>
                {t.meDodoCount(myCount, turns.filter((turn) => turn.role === "doi").length)}
                {flagCount > 0 && t.ruleBreaksSuffix(flagCount)}
              </span>
            </div>
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
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 400, margin: 0 }}>{t.marking}</h2>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: C.faint }}>
              {marked}/{myCount}
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 18, fontFamily: MONO, fontSize: 12 }}>
            <span style={{ color: C.green }}>● {counts.green}</span>
            <span style={{ color: C.amber }}>● {counts.amber}</span>
            <span style={{ color: C.red }}>● {counts.red}</span>
          </div>

          {myTurns.length === 0 && <p style={{ color: C.faint, fontSize: 14 }}>{t.nothingHereYet}</p>}

          {myTurns.map((turn) => (
            <div
              key={turn.id}
              style={{
                background: C.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,.05)",
                borderLeft:
                  "4px solid " +
                  (turn.color === "green" ? C.green : turn.color === "amber" ? C.amber : turn.color === "red" ? C.red : "transparent"),
              }}
            >
              <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{turn.text}</p>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  ["green", t.green, C.green, C.greenBg],
                  ["amber", t.amber, C.amber, C.amberBg],
                  ["red", t.red, C.red, C.redBg],
                ].map(([k, label, col, bg]) => (
                  <button
                    key={k}
                    className="fr-btn"
                    onClick={() => setColor(turn.id, k)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "none",
                      fontFamily: SANS,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: turn.color === k ? bg : C.fill,
                      color: turn.color === k ? col : C.muted,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {counts.red > 0 && (
            <div style={{ background: C.redBg, borderRadius: 14, padding: "14px 16px", margin: "8px 0 20px" }}>
              <p style={{ fontFamily: SANS, fontSize: 13.5, color: C.red, fontWeight: 600, margin: 0 }}>{t.redPoints(counts.red)}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn onClick={() => setStage("check")}>{t.nextCheck}</Btn>
            <Btn tone="ghost" onClick={() => setStage("talk")}>
              {t.backToTalk}
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
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 60px" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 400, margin: "0 0 16px" }}>{t.checker}</h2>

        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <Eyebrow>{t.courseMaterial}</Eyebrow>
          <textarea
            className="fr-in"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            rows={8}
            placeholder={t.materialPlaceholder}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "12px 14px",
              fontFamily: SANS,
              fontSize: 14,
              lineHeight: 1.6,
              background: C.fill,
              border: "none",
              borderRadius: 12,
              color: C.ink,
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Btn onClick={runCheck} disabled={busy || !material.trim() || myCount === 0} full>
              {busy ? t.checking : t.runCheck}
            </Btn>
          </div>
        </div>

        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}

        {report && (
          <div
            className="fr-rise"
            style={{ marginTop: 20, padding: "18px 18px", background: C.card, borderRadius: 18, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}
          >
            <Eyebrow>{t.checkResults}</Eyebrow>
            <div style={{ fontFamily: SANS, fontSize: 14.5, lineHeight: 1.75, whiteSpace: "pre-wrap", marginTop: 10, color: C.ink }}>
              {report}
            </div>
          </div>
        )}

        <div style={{ marginTop: 28, background: C.card, borderRadius: 18, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Eyebrow>{t.exportLabel}</Eyebrow>
            <div style={{ marginLeft: "auto" }}>
              <Btn small onClick={copyAll}>
                {copied ? t.copied : t.copyMap}
              </Btn>
            </div>
          </div>
          <textarea
            readOnly
            value={exportText()}
            rows={7}
            onFocus={(e) => e.target.select()}
            style={{
              width: "100%",
              padding: 12,
              fontFamily: MONO,
              fontSize: 11.5,
              lineHeight: 1.65,
              background: C.fill,
              border: "none",
              borderRadius: 12,
              color: C.muted,
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Btn tone="ghost" full onClick={() => setStage("talk")}>
              {t.goBackRed}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
