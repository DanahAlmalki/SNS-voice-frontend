import { useEffect, useRef, useState } from "react";
import { X, PhoneOff, Copy, Check, Mic, Loader2 } from "lucide-react";
import { useVoiceAgent } from "../lib/useVoiceAgent";
import { createCampaign } from "../lib/campaigns";
import "./CallModal.css";

const STATE_LABEL = {
  idle: "جاهز",
  listening: "يستمع…",
  user_speaking: "أنت تتحدث…",
  processing_stt: "يحلّل كلامك…",
  thinking_llm: "يفكّر…",
  speaking_tts: "الوكيل يتحدث…",
  interrupted: "تمت المقاطعة",
};

export default function CallModal({ open, onClose, prompt, name, config }) {
  const [tab, setTab] = useState("call");
  const [copied, setCopied] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const { start, stop, connected, state, messages, vadProb, error } =
    useVoiceAgent();
  const started = useRef(false);
  const chatEndRef = useRef(null);

  // Register the prompt as a campaign, then open the socket bound to its id.
  useEffect(() => {
    if (open && !started.current) {
      started.current = true;
      setSetupError(null);
      createCampaign({ name, prompt, config })
        .then((campaignId) => start(campaignId))
        .catch((err) => setSetupError(err.message || "تعذّر بدء المكالمة"));
    }
    if (!open && started.current) {
      started.current = false;
      stop();
      setTab("call");
      setCopied(false);
      setSetupError(null);
    }
  }, [open, start, stop, prompt, name, config]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && open && handleEnd();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const handleEnd = () => {
    stop();
    onClose();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isSpeaking = state === "speaking_tts";
  const isThinking = state === "processing_stt" || state === "thinking_llm";
  const isListening = state === "listening" || state === "user_speaking";

  const orbClass = isSpeaking
    ? "is-speaking"
    : isThinking
      ? "is-thinking"
      : isListening
        ? "is-listening"
        : "";

  return (
    <div className="modal-overlay" onClick={handleEnd}>
      <div
        className="call-modal"
        role="dialog"
        aria-modal="true"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="call-modal__head">
          <div className="call-modal__tabs">
            <button
              className={`call-tab ${tab === "call" ? "is-active" : ""}`}
              onClick={() => setTab("call")}
            >
              المكالمة
            </button>
            <button
              className={`call-tab ${tab === "prompt" ? "is-active" : ""}`}
              onClick={() => setTab("prompt")}
            >
              المطالبة
            </button>
          </div>
          <button
            className="modal__close"
            onClick={handleEnd}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </header>

        {tab === "call" ? (
          <div className="call-view">
            <div className="call-stage">
              <div
                className={`agent-orb ${orbClass}`}
                style={{ "--vad": vadProb }}
              >
                <span className="agent-orb__ring" />
                <span className="agent-orb__ring agent-orb__ring--2" />
                <span className="agent-orb__core">
                  {isThinking ? (
                    <Loader2 className="spin" size={26} />
                  ) : (
                    <Mic size={26} />
                  )}
                </span>
              </div>
              <p className="call-status">
                {setupError
                  ? setupError
                  : error
                    ? error
                    : connected
                      ? (STATE_LABEL[state] ?? state)
                      : "جارٍ الاتصال…"}
              </p>
            </div>

            <div className="call-chat">
              {messages.length === 0 && !error && !setupError && (
                <p className="muted call-chat__empty">
                  ابدأ بالتحدث وسيظهر الحوار هنا.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`bubble bubble--${m.role}`}>
                  {m.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <footer className="call-modal__foot">
              <span className="mic-meter" title="مستوى الصوت">
                <Mic size={14} />
                <span className="mic-meter__bar">
                  <span
                    className="mic-meter__fill"
                    style={{ width: `${Math.round(vadProb * 100)}%` }}
                  />
                </span>
              </span>
              <button className="btn btn--danger" onClick={handleEnd}>
                <PhoneOff size={16} />
                إنهاء المكالمة
              </button>
            </footer>
          </div>
        ) : (
          <div className="prompt-view">
            <pre className="prompt-view__body" dir="ltr">
              {prompt}
            </pre>
            <footer className="call-modal__foot">
              <button className="btn btn--subtle" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
