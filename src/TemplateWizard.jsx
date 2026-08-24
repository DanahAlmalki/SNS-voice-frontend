import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Volume2,
  Play,
  Phone,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import CallModal from "./components/CallModal";
import { buildPrompt } from "./lib/buildPrompt";
import { buildOverrides } from "./lib/buildOverrides";
import {
  fetchVoices,
  fetchLlmProviders,
  groupVoicesByProvider,
  splitVoiceLabel,
  FALLBACK_VOICES,
  FALLBACK_LLM_PROVIDERS,
} from "./lib/voiceModels";
import { initialData, findTemplate, upsertTemplate } from "./lib/templates";
import { OBJECTIVES, objectiveTitle } from "./lib/objectives";
import { useLanguage } from "./lib/i18n.jsx";
import "./TemplateWizard.css";

const STEPS = [
  { id: "basics", labelKey: "wizard.stepBasics" },
  { id: "voice", labelKey: "wizard.stepVoice" },
  { id: "objective", labelKey: "wizard.stepObjective" },
  { id: "script", labelKey: "wizard.stepScript" },
  { id: "objections", labelKey: "wizard.stepObjections" },
  { id: "fallback", labelKey: "wizard.stepFallback" },
  { id: "advanced", labelKey: "wizard.stepAdvanced" },
];

const PERSONALITIES = [
  {
    id: "friendly",
    titleKey: "wizard.personalityFriendlyTitle",
    descKey: "wizard.personalityFriendlyDesc",
  },
  {
    id: "professional",
    titleKey: "wizard.personalityProfessionalTitle",
    descKey: "wizard.personalityProfessionalDesc",
  },
  {
    id: "enthusiastic",
    titleKey: "wizard.personalityEnthusiasticTitle",
    descKey: "wizard.personalityEnthusiasticDesc",
  },
  {
    id: "consultative",
    titleKey: "wizard.personalityConsultativeTitle",
    descKey: "wizard.personalityConsultativeDesc",
  },
];

// The greeting is spoken verbatim and the backend only substitutes {staff_name}.
const GREETING_TOKENS = ["{staff_name}"];

const STARTER_SCRIPTS = {
  appointment: {
    opening: "مرحباً، معك {staff_name} من شركة أكمي.",
    purpose: "أتصل بك لتحديد موعد يناسبك لعرض خدماتنا.",
    points:
      "• شرح مختصر للخدمة\n• توضيح الفائدة الرئيسية\n• اقتراح موعدين محتملين",
    cta: "هل يناسبك يوم الثلاثاء أم الأربعاء؟",
  },
  qualify: {
    opening: "مرحباً، معك {staff_name} من أكمي.",
    purpose: "أود طرح بعض الأسئلة السريعة لأرى كيف يمكننا مساعدتك.",
    points:
      "• سؤال عن الحاجة الحالية\n• سؤال عن الميزانية\n• سؤال عن الجدول الزمني",
    cta: "هل يمكنني ترتيب اتصال مع أحد مختصينا؟",
  },
  followup: {
    opening: "مرحباً، معك {staff_name}، أتواصل معك متابعةً لطلبك السابق.",
    purpose: "أردت التأكد من أن كل شيء على ما يرام.",
    points: "• تذكير بالطلب السابق\n• السؤال عن أي استفسارات",
    cta: "هل هناك ما يمكنني مساعدتك به اليوم؟",
  },
  survey: {
    opening: "مرحباً، معك {staff_name} من أكمي.",
    purpose: "لدينا استبيان قصير لتحسين خدماتنا، يستغرق دقيقة واحدة.",
    points: "• سؤال عن مستوى الرضا\n• سؤال عن اقتراحات التحسين",
    cta: "هل تمانع الإجابة على سؤالين سريعين؟",
  },
  offer: {
    opening: "مرحباً، معك {staff_name} من أكمي.",
    purpose: "لدينا عرض خاص أعتقد أنه سيثير اهتمامك.",
    points: "• تفاصيل العرض\n• مدة العرض\n• الفائدة للعميل",
    cta: "هل ترغب بالاستفادة من العرض الآن؟",
  },
};

export default function TemplateWizard() {
  const navigate = useNavigate();
  const { t, lang, dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const { id: templateId } = useParams();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    const existing = templateId ? findTemplate(templateId) : null;
    return existing ? { ...initialData, ...existing.data } : initialData;
  });
  const [showCall, setShowCall] = useState(false);
  const [callMode, setCallMode] = useState("browser");
  const [voices, setVoices] = useState(FALLBACK_VOICES);
  const [llmProviders, setLlmProviders] = useState(FALLBACK_LLM_PROVIDERS);

  // Loaded once per wizard session — reflects whichever TTS/LLM engines are
  // actually enabled on this deployment (see pipecat_server.py's GET
  // /api/v1/voices + /api/v1/llm_providers) instead of a hardcoded list.
  useEffect(() => {
    fetchVoices().then(setVoices);
    fetchLlmProviders().then(setLlmProviders);
  }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const overrides = useMemo(() => buildOverrides(data), [data]);
  const voiceGroups = useMemo(() => groupVoicesByProvider(voices), [voices]);

  const openCall = (mode) => {
    setCallMode(mode);
    setShowCall(true);
  };

  const chooseObjective = (id) => {
    const starter = STARTER_SCRIPTS[id] || {};
    set({ objective: id, ...starter });
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    upsertTemplate({ id: templateId ?? Date.now(), updated: t("wizard.now"), data });
    navigate("/templates");
  };

  return (
    <div className="wizard-page" dir={dir}>
      <header className="page-head">
        <h1 className="page-head__title">
          {templateId ? t("wizard.pageTitleEdit") : t("wizard.pageTitleNew")}
        </h1>
        <p className="page-head__sub">{t("wizard.pageSub")}</p>
      </header>
      <div className="wizard">
        {/* Left: form */}
        <div className="wizard__form">
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`steps__item ${i === step ? "is-active" : ""} ${
                  i < step ? "is-done" : ""
                }`}
                onClick={() => setStep(i)}
              >
                <span className="steps__num">
                  {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                {t(s.labelKey)}
              </li>
            ))}
          </ol>

          <div className="wizard__content">
            {step === 0 && <BasicsStep data={data} set={set} />}
            {step === 1 && (
              <VoiceStep data={data} set={set} voiceGroups={voiceGroups} />
            )}
            {step === 2 && (
              <ObjectiveStep data={data} choose={chooseObjective} />
            )}
            {step === 3 && <ScriptStep data={data} set={set} />}
            {step === 4 && <ObjectionsStep data={data} set={set} />}
            {step === 5 && <FallbackStep data={data} set={set} />}
            {step === 6 && (
              <AdvancedStep data={data} set={set} llmProviders={llmProviders} />
            )}
          </div>

          <div className="wizard__nav">
            <button
              className="btn btn--ghost"
              onClick={back}
              disabled={step === 0}
            >
              <BackIcon size={18} />
              {t("wizard.previous")}
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn--primary" onClick={next}>
                {t("wizard.next")}
                <NextIcon size={18} />
              </button>
            ) : (
              <button className="btn btn--primary" onClick={finish}>
                <Check size={18} />
                {templateId ? t("wizard.saveChanges") : t("wizard.saveTemplate")}
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <aside className="wizard__preview">
          <h3 className="preview__title">{t("wizard.previewTitle")}</h3>
          <ScriptPreview data={data} />
          <button className="btn btn--test" onClick={() => openCall("browser")}>
            <Play size={16} />
            {t("wizard.trialCall")}
          </button>
          <button
            className="btn btn--test-outline"
            onClick={() => openCall("phone")}
          >
            <Phone size={16} />
            {t("wizard.realCall")}
          </button>
        </aside>
      </div>

      <CallModal
        open={showCall}
        onClose={() => setShowCall(false)}
        prompt={buildPrompt(data)}
        greeting={data.opening}
        name={data.name}
        overrides={overrides}
        mode={callMode}
      />
    </div>
  );
}

/* ---------- Shared field ---------- */

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <small className="field__hint">{hint}</small>}
    </label>
  );
}

/* ---------- Steps ---------- */

function BasicsStep({ data, set }) {
  const { t } = useLanguage();
  return (
    <section>
      <h2>{t("wizard.stepBasics")}</h2>
      <Field label={t("wizard.templateNameLabel")}>
        <input
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={t("wizard.templateNamePlaceholder")}
        />
      </Field>
      <Field label={t("wizard.languageLabel")}>
        <select
          value={data.language}
          onChange={(e) => set({ language: e.target.value })}
        >
          <option value="ar">{t("wizard.langArabic")}</option>
          <option value="en">{t("wizard.langEnglish")}</option>
        </select>
      </Field>
      <Field label={t("wizard.brandLabel")}>
        <input
          value={data.brand}
          onChange={(e) => set({ brand: e.target.value })}
          placeholder={t("wizard.brandPlaceholder")}
        />
      </Field>
      <Field label={t("wizard.describeLabel")} hint={t("wizard.describeHint")}>
        <textarea
          value={data.product}
          onChange={(e) => set({ product: e.target.value })}
          rows={2}
        />
      </Field>
    </section>
  );
}

function VoiceStep({ data, set, voiceGroups }) {
  const { t } = useLanguage();
  return (
    <section>
      <h2>{t("wizard.stepVoice")}</h2>
      <Field label={t("wizard.chooseVoiceLabel")}>
        <div className="voice-groups">
          {voiceGroups.map((group) => (
            <div className="voice-group" key={group.provider}>
              <h4 className="voice-group__label">{group.label}</h4>
              <div className="voice-list">
                {group.voices.map((v) => {
                  const { name, hint } = splitVoiceLabel(v.label);
                  return (
                    <button
                      key={v.id}
                      className={`voice-chip ${data.voice === v.id ? "is-selected" : ""}`}
                      onClick={() => set({ voice: v.id })}
                    >
                      <Volume2 size={16} />
                      {name}
                      {hint && <small>{hint}</small>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Field>
      <Field label={t("wizard.speedLabel")}>
        <div className="segmented">
          {[
            ["slow", t("wizard.speedSlow")],
            ["normal", t("wizard.speedNormal")],
            ["fast", t("wizard.speedFast")],
          ].map(([val, lbl]) => (
            <button
              key={val}
              className={data.speed === val ? "is-selected" : ""}
              onClick={() => set({ speed: val })}
            >
              {lbl}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("wizard.personalityLabel")}>
        <div className="cards">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              className={`card ${data.personality === p.id ? "is-selected" : ""}`}
              onClick={() => set({ personality: p.id })}
            >
              <strong>{t(p.titleKey)}</strong>
              <span>{t(p.descKey)}</span>
            </button>
          ))}
        </div>
      </Field>
    </section>
  );
}

function ObjectiveStep({ data, choose }) {
  const { t, lang } = useLanguage();
  return (
    <section>
      <h2>{t("wizard.stepObjective")}</h2>
      <p className="muted">{t("wizard.objectiveDesc")}</p>
      <div className="cards cards--objective">
        {OBJECTIVES.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              className={`card card--tile ${
                data.objective === o.id ? "is-selected" : ""
              }`}
              onClick={() => choose(o.id)}
            >
              <span className="card__icon">
                <Icon size={22} strokeWidth={2} />
              </span>
              <strong>{objectiveTitle(o, lang)}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TokenBar({ onInsert, tokens }) {
  const { t } = useLanguage();
  return (
    <div className="tokens">
      <span className="tokens__label">{t("wizard.insertField")}</span>
      {tokens.map((token) => (
        <button key={token} className="token" onClick={() => onInsert(token)}>
          {token}
        </button>
      ))}
    </div>
  );
}

function ScriptStep({ data, set }) {
  const { t } = useLanguage();
  const append = (field) => (token) =>
    set({ [field]: (data[field] || "") + " " + token });

  return (
    <section>
      <h2>{t("wizard.stepScript")}</h2>

      <Field label={t("wizard.openingLabel")} hint={t("wizard.openingHint")}>
        <TokenBar tokens={GREETING_TOKENS} onInsert={append("opening")} />
        <textarea
          value={data.opening}
          onChange={(e) => set({ opening: e.target.value })}
          rows={2}
        />
      </Field>

      <Field label={t("wizard.reasonLabel")}>
        <textarea
          value={data.purpose}
          onChange={(e) => set({ purpose: e.target.value })}
          rows={2}
        />
      </Field>

      <Field label={t("wizard.keyPointsLabel")}>
        <textarea
          value={data.points}
          onChange={(e) => set({ points: e.target.value })}
          rows={4}
        />
      </Field>

      <Field label={t("wizard.ctaLabel")}>
        <textarea
          value={data.cta}
          onChange={(e) => set({ cta: e.target.value })}
          rows={2}
        />
      </Field>
    </section>
  );
}

function ObjectionsStep({ data, set }) {
  const { t } = useLanguage();
  const update = (i, patch) => {
    const list = data.objections.map((o, idx) =>
      idx === i ? { ...o, ...patch } : o,
    );
    set({ objections: list });
  };
  const add = () =>
    set({ objections: [...data.objections, { trigger: "", response: "" }] });
  const remove = (i) =>
    set({ objections: data.objections.filter((_, idx) => idx !== i) });

  return (
    <section>
      <h2>{t("wizard.stepObjections")}</h2>
      <p className="muted">{t("wizard.objectionsDesc")}</p>
      {data.objections.map((o, i) => (
        <div className="objection" key={i}>
          <Field label={t("wizard.triggerLabel")}>
            <input
              value={o.trigger}
              onChange={(e) => update(i, { trigger: e.target.value })}
              placeholder={t("wizard.triggerPlaceholder")}
            />
          </Field>
          <Field label={t("wizard.responseLabel")}>
            <input
              value={o.response}
              onChange={(e) => update(i, { response: e.target.value })}
              placeholder={t("wizard.responsePlaceholder")}
            />
          </Field>
          <button className="btn btn--danger btn--sm" onClick={() => remove(i)}>
            <Trash2 size={16} />
            {t("wizard.deleteBtn")}
          </button>
        </div>
      ))}
      <button className="btn btn--subtle" onClick={add}>
        <Plus size={18} />
        {t("wizard.addObjection")}
      </button>
    </section>
  );
}

function FallbackStep({ data, set }) {
  const { t } = useLanguage();
  return (
    <section>
      <h2>{t("wizard.stepFallback")}</h2>

      <Field label={t("wizard.voicemailLabel")}>
        <div className="segmented">
          {[
            ["hangup", t("wizard.voicemailHangup")],
            ["leave", t("wizard.voicemailLeave")],
          ].map(([val, lbl]) => (
            <button
              key={val}
              className={data.voicemail === val ? "is-selected" : ""}
              onClick={() => set({ voicemail: val })}
            >
              {lbl}
            </button>
          ))}
        </div>
      </Field>

      {data.voicemail === "leave" && (
        <Field label={t("wizard.voicemailTextLabel")}>
          <textarea
            value={data.voicemailText}
            onChange={(e) => set({ voicemailText: e.target.value })}
            rows={2}
          />
        </Field>
      )}

      <Field label={t("wizard.humanTransferLabel")}>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.transfer}
            onChange={(e) => set({ transfer: e.target.checked })}
          />
          <span>{t("wizard.enableTransfer")}</span>
        </label>
      </Field>

      {data.transfer && (
        <Field label={t("wizard.transferNumberLabel")}>
          <input
            value={data.transferNumber}
            onChange={(e) => set({ transferNumber: e.target.value })}
            placeholder="+966..."
          />
        </Field>
      )}

      <Field
        label={t("wizard.optOutLabel")}
        hint={t("wizard.optOutHint")}
      >
        <textarea
          value={data.optOut}
          onChange={(e) => set({ optOut: e.target.value })}
          rows={2}
          placeholder={t("wizard.optOutPlaceholder")}
        />
      </Field>

      <Field label={t("wizard.maxDurationLabel")}>
        <input
          type="number"
          min={1}
          max={30}
          value={data.maxDuration}
          onChange={(e) => set({ maxDuration: Number(e.target.value) })}
        />
      </Field>
    </section>
  );
}

function NumberField({ label, value, onChange, placeholder, step, min, max }) {
  return (
    <Field label={label}>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function AdvancedStep({ data, set, llmProviders }) {
  const { t } = useLanguage();
  // A single flat dropdown instead of a provider-select + model-select pair:
  // picking "Groq" used to leave the model field a plain text box until the
  // user also touched a second control, which made the model list invisible
  // by default. Each curated model is now its own top-level option (already
  // tags which provider it belongs to via the label); providers with no
  // catalog (Azure OpenAI/vLLM - a single self-hosted deployment, nothing to
  // list) contribute one "use this provider" option instead.
  const llmOptions = llmProviders.flatMap((p) =>
    p.models?.length
      ? p.models.map((m) => ({ provider: p.id, model: m.id, label: `${p.label} — ${m.label}` }))
      : [{ provider: p.id, model: "", label: p.label }]
  );
  const selectedValue = data.llmProvider ? `${data.llmProvider}::${data.llmModel || ""}` : "";
  const hasMatch = llmOptions.some((o) => `${o.provider}::${o.model}` === selectedValue);
  const selectedProviderLabel =
    llmProviders.find((p) => p.id === data.llmProvider)?.label || data.llmProvider;
  return (
    <section className="adv-step">
      <h2>{t("wizard.stepAdvanced")}</h2>
      <p className="muted">{t("wizard.advancedIntro")}</p>

      <h3 className="adv-group">Language model</h3>
      <div className="adv-grid">
        <Field label={t("wizard.llmModelLabel")}>
          <select
            value={hasMatch ? selectedValue : ""}
            onChange={(e) => {
              const [provider, model] = e.target.value.split("::");
              set({ llmProvider: provider || "", llmModel: model || "" });
            }}
          >
            <option value="">{t("wizard.llmProviderDefault")}</option>
            {!hasMatch && data.llmProvider && (
              <option value={selectedValue}>
                {selectedProviderLabel} — {data.llmModel || t("wizard.llmModelPlaceholder")}
              </option>
            )}
            {llmOptions.map((o) => (
              <option key={`${o.provider}::${o.model}`} value={`${o.provider}::${o.model}`}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="adv-grid">
        <NumberField
          label="Temperature"
          value={data.temperature}
          step="0.1"
          min="0"
          placeholder="0.2"
          onChange={(v) => set({ temperature: v })}
        />
        <NumberField
          label="Seed"
          value={data.seed}
          step="1"
          placeholder="42"
          onChange={(v) => set({ seed: v })}
        />
        <NumberField
          label="Max tokens"
          value={data.maxTokens}
          step="1"
          min="1"
          placeholder="500"
          onChange={(v) => set({ maxTokens: v })}
        />
      </div>

      <h3 className="adv-group">Voice quality</h3>
      <div className="adv-grid">
        <NumberField
          label="Generation steps"
          value={data.ttsNumStep}
          step="1"
          min="1"
          placeholder="32"
          onChange={(v) => set({ ttsNumStep: v })}
        />
        <NumberField
          label="Guidance scale"
          value={data.ttsGuidanceScale}
          step="0.1"
          min="0.1"
          placeholder="1.5"
          onChange={(v) => set({ ttsGuidanceScale: v })}
        />
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={data.ttsAddShadda}
          onChange={(e) => set({ ttsAddShadda: e.target.checked })}
        />
        <span>Add shadda automatically</span>
      </label>

      <h3 className="adv-group">Speech detection &amp; barge-in</h3>
      <div className="adv-grid">
        <NumberField
          label="Detection sensitivity"
          value={data.vadThreshold}
          step="0.01"
          min="0"
          max="1"
          placeholder="0.85"
          onChange={(v) => set({ vadThreshold: v })}
        />
        <NumberField
          label="Silence duration (ms)"
          value={data.minSilenceDurationMs}
          step="50"
          min="0"
          placeholder="1200"
          onChange={(v) => set({ minSilenceDurationMs: v })}
        />
        <NumberField
          label="Min barge-in duration (ms)"
          value={data.bargeInMinDurationMs}
          step="50"
          min="0"
          placeholder="450"
          onChange={(v) => set({ bargeInMinDurationMs: v })}
        />
      </div>

      <h3 className="adv-group">Speech to text</h3>
      <div className="adv-grid">
        <NumberField
          label="Beam size"
          value={data.sttBeamSize}
          step="1"
          min="1"
          placeholder="5"
          onChange={(v) => set({ sttBeamSize: v })}
        />
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={data.sttConditionOnPrevious}
          onChange={(e) => set({ sttConditionOnPrevious: e.target.checked })}
        />
        <span>Condition on previous text</span>
      </label>
      <Field label="Initial speech-recognition prompt">
        <textarea
          rows={2}
          value={data.sttInitialPrompt}
          placeholder="مثال: إي نعم، صح، نفس العنوان ما تغيّر..."
          onChange={(e) => set({ sttInitialPrompt: e.target.value })}
        />
      </Field>
    </section>
  );
}

/* ---------- Preview ---------- */

function ScriptPreview({ data }) {
  const { t } = useLanguage();
  const rows = [
    [t("wizard.previewOpening"), data.opening],
    [t("wizard.previewReason"), data.purpose],
    [t("wizard.previewPoints"), data.points],
    [t("wizard.previewCta"), data.cta],
  ].filter(([, v]) => v);

  if (!rows.length) {
    return <p className="muted">{t("wizard.previewEmpty")}</p>;
  }

  return (
    <div className="preview-card">
      {rows.map(([label, value]) => (
        <div className="preview-row" key={label}>
          <span className="preview-row__label">{label}</span>
          <p>{value}</p>
        </div>
      ))}
    </div>
  );
}
