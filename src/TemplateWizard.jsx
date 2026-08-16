import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Volume2,
  Play,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Target,
  Bell,
  ClipboardList,
  Gift,
} from "lucide-react";
import CallModal from "./components/CallModal";
import { buildPrompt } from "./lib/buildPrompt";
import { buildOverrides, VOICE_PRESETS } from "./lib/buildOverrides";
import { saveTemplate } from "./lib/templates";
import "./TemplateWizard.css";

const STEPS = [
  { id: "basics", label: "المعلومات الأساسية" },
  { id: "voice", label: "الصوت والشخصية" },
  { id: "objective", label: "هدف المكالمة" },
  { id: "script", label: "النص والنقاط" },
  { id: "objections", label: "الردود على الاعتراضات" },
  { id: "fallback", label: "الحالات الاحتياطية والامتثال" },
  { id: "advanced", label: "إعدادات متقدمة (اختياري)" },
];

const PERSONALITIES = [
  { id: "friendly", title: "ودود", desc: "دافئ وعفوي كصديق مساعد" },
  { id: "professional", title: "احترافي", desc: "رسمي ومصقول كرجل أعمال" },
  { id: "enthusiastic", title: "متحمّس", desc: "نشيط ومفعم بالحيوية" },
  { id: "consultative", title: "استشاري", desc: "هادئ وصبور ومقنع" },
];

const OBJECTIVES = [
  { id: "appointment", title: "حجز موعد", icon: CalendarCheck },
  { id: "qualify", title: "تأهيل عميل محتمل", icon: Target },
  { id: "followup", title: "متابعة أو تذكير", icon: Bell },
  { id: "survey", title: "استبيان أو تقييم", icon: ClipboardList },
  { id: "offer", title: "الترويج لعرض", icon: Gift },
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

const initialData = {
  name: "",
  language: "ar",
  brand: "",
  product: "",
  voice: "",
  speed: "normal",
  personality: "friendly",
  objective: "",
  opening: "",
  purpose: "",
  points: "",
  cta: "",
  objections: [{ trigger: "", response: "" }],
  voicemail: "hangup",
  voicemailText: "",
  transfer: false,
  transferNumber: "",
  optOut: "",
  maxDuration: 5,
  // Blank = keep the backend default (shown as the input placeholder).
  temperature: "",
  seed: "",
  maxTokens: "",
  ttsNumStep: "",
  ttsGuidanceScale: "",
  ttsAddShadda: true,
  vadThreshold: "",
  minSilenceDurationMs: "",
  bargeInMinDurationMs: "",
  sttBeamSize: "",
  sttConditionOnPrevious: false,
  sttInitialPrompt: "",
};

export default function TemplateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [showCall, setShowCall] = useState(false);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const overrides = useMemo(() => buildOverrides(data), [data]);

  const chooseObjective = (id) => {
    const starter = STARTER_SCRIPTS[id] || {};
    set({ objective: id, ...starter });
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    const voicePreset = VOICE_PRESETS.find((v) => v.id === data.voice);
    const objectiveLabel =
      OBJECTIVES.find((o) => o.id === data.objective)?.title || "بدون هدف";
    saveTemplate({
      id: Date.now(),
      name: data.name || "قالب بدون اسم",
      description: data.purpose || data.opening || "",
      objective: objectiveLabel,
      voice: voicePreset ? `صوت ${voicePreset.hint}` : "غير محدد",
      updated: "الآن",
    });
    navigate("/templates");
  };

  return (
    <div className="wizard-page" dir="rtl">
      <header className="page-head">
        <h1 className="page-head__title">إنشاء قالب مكالمة</h1>
        <p className="page-head__sub">
          صمّم شخصية الوكيل ونص المكالمة الصادرة خطوة بخطوة.
        </p>
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
                {s.label}
              </li>
            ))}
          </ol>

          <div className="wizard__content">
            {step === 0 && <BasicsStep data={data} set={set} />}
            {step === 1 && <VoiceStep data={data} set={set} />}
            {step === 2 && (
              <ObjectiveStep data={data} choose={chooseObjective} />
            )}
            {step === 3 && <ScriptStep data={data} set={set} />}
            {step === 4 && <ObjectionsStep data={data} set={set} />}
            {step === 5 && <FallbackStep data={data} set={set} />}
            {step === 6 && <AdvancedStep data={data} set={set} />}
          </div>

          <div className="wizard__nav">
            <button
              className="btn btn--ghost"
              onClick={back}
              disabled={step === 0}
            >
              <ArrowRight size={18} />
              السابق
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn--primary" onClick={next}>
                التالي
                <ArrowLeft size={18} />
              </button>
            ) : (
              <button className="btn btn--primary" onClick={finish}>
                <Check size={18} />
                حفظ القالب
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <aside className="wizard__preview">
          <h3 className="preview__title">معاينة مباشرة</h3>
          <ScriptPreview data={data} />
          <button className="btn btn--test" onClick={() => setShowCall(true)}>
            <Play size={16} />
            اتصال تجريبي
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
  return (
    <section>
      <h2>المعلومات الأساسية</h2>
      <Field label="اسم القالب">
        <input
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="مثال: حملة حجز المواعيد"
        />
      </Field>
      <Field label="اللغة">
        <select
          value={data.language}
          onChange={(e) => set({ language: e.target.value })}
        >
          <option value="ar">العربية</option>
          <option value="en">الإنجليزية</option>
        </select>
      </Field>
      <Field label="اسم النشاط التجاري">
        <input
          value={data.brand}
          onChange={(e) => set({ brand: e.target.value })}
          placeholder="مثال: شركة أكمي"
        />
      </Field>
      <Field label="صف شركتك أو جهتك" hint="يساعد الوكيل على فهم السياق">
        <textarea
          value={data.product}
          onChange={(e) => set({ product: e.target.value })}
          rows={2}
        />
      </Field>
    </section>
  );
}

function VoiceStep({ data, set }) {
  return (
    <section>
      <h2>الصوت والشخصية</h2>
      <Field label="اختيار الصوت">
        <div className="voice-list">
          {VOICE_PRESETS.map((v) => (
            <button
              key={v.id}
              className={`voice-chip ${data.voice === v.id ? "is-selected" : ""}`}
              onClick={() => set({ voice: v.id })}
            >
              <Volume2 size={16} />
              {v.label}
              <small>{v.hint}</small>
            </button>
          ))}
        </div>
      </Field>
      <Field label="سرعة التحدث">
        <div className="segmented">
          {[
            ["slow", "بطيء"],
            ["normal", "عادي"],
            ["fast", "سريع"],
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
      <Field label="الشخصية">
        <div className="cards">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              className={`card ${data.personality === p.id ? "is-selected" : ""}`}
              onClick={() => set({ personality: p.id })}
            >
              <strong>{p.title}</strong>
              <span>{p.desc}</span>
            </button>
          ))}
        </div>
      </Field>
    </section>
  );
}

function ObjectiveStep({ data, choose }) {
  return (
    <section>
      <h2>هدف المكالمة</h2>
      <p className="muted">
        اختر الهدف وسنقوم بتعبئة نص مبدئي جاهز يمكنك تعديله.
      </p>
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
              <strong>{o.title}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TokenBar({ onInsert, tokens }) {
  return (
    <div className="tokens">
      <span className="tokens__label">إدراج حقل:</span>
      {tokens.map((t) => (
        <button key={t} className="token" onClick={() => onInsert(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

function ScriptStep({ data, set }) {
  const append = (field) => (token) =>
    set({ [field]: (data[field] || "") + " " + token });

  return (
    <section>
      <h2>النص والنقاط الرئيسية</h2>

      <Field
        label="الافتتاحية"
        hint="تُنطق كما هي في بداية المكالمة — {staff_name} يُستبدل باسم الصوت المختار."
      >
        <TokenBar tokens={GREETING_TOKENS} onInsert={append("opening")} />
        <textarea
          value={data.opening}
          onChange={(e) => set({ opening: e.target.value })}
          rows={2}
        />
      </Field>

      <Field label="سبب الاتصال">
        <textarea
          value={data.purpose}
          onChange={(e) => set({ purpose: e.target.value })}
          rows={2}
        />
      </Field>

      <Field label="النقاط الرئيسية">
        <textarea
          value={data.points}
          onChange={(e) => set({ points: e.target.value })}
          rows={4}
        />
      </Field>

      <Field label="الدعوة لاتخاذ إجراء">
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
      <h2>الردود على الاعتراضات</h2>
      <p className="muted">اختياري: كيف يرد الوكيل في المواقف الشائعة.</p>
      {data.objections.map((o, i) => (
        <div className="objection" key={i}>
          <Field label="إذا قال العميل…">
            <input
              value={o.trigger}
              onChange={(e) => update(i, { trigger: e.target.value })}
              placeholder="مثال: أنا مشغول الآن"
            />
          </Field>
          <Field label="يرد الوكيل…">
            <input
              value={o.response}
              onChange={(e) => update(i, { response: e.target.value })}
              placeholder="مثال: بالطبع، متى يناسبك أن أعاود الاتصال؟"
            />
          </Field>
          <button className="btn btn--danger btn--sm" onClick={() => remove(i)}>
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      ))}
      <button className="btn btn--subtle" onClick={add}>
        <Plus size={18} />
        إضافة اعتراض
      </button>
    </section>
  );
}

function FallbackStep({ data, set }) {
  return (
    <section>
      <h2>الحالات الاحتياطية والامتثال</h2>

      <Field label="عند الوصول للبريد الصوتي">
        <div className="segmented">
          {[
            ["hangup", "إنهاء المكالمة"],
            ["leave", "ترك رسالة"],
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
        <Field label="نص الرسالة الصوتية">
          <textarea
            value={data.voicemailText}
            onChange={(e) => set({ voicemailText: e.target.value })}
            rows={2}
          />
        </Field>
      )}

      <Field label="التحويل إلى موظف بشري">
        <label className="switch">
          <input
            type="checkbox"
            checked={data.transfer}
            onChange={(e) => set({ transfer: e.target.checked })}
          />
          <span>تفعيل التحويل</span>
        </label>
      </Field>

      {data.transfer && (
        <Field label="رقم التحويل">
          <input
            value={data.transferNumber}
            onChange={(e) => set({ transferNumber: e.target.value })}
            placeholder="+966..."
          />
        </Field>
      )}

      <Field
        label="التعامل مع طلب إلغاء الاشتراك"
        hint="مهم للامتثال القانوني للمكالمات الصادرة"
      >
        <textarea
          value={data.optOut}
          onChange={(e) => set({ optOut: e.target.value })}
          rows={2}
          placeholder="مثال: بالطبع، سأزيل رقمك من قائمتنا فوراً. شكراً لوقتك."
        />
      </Field>

      <Field label="أقصى مدة للمكالمة (دقائق)">
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

function AdvancedStep({ data, set }) {
  return (
    <section className="adv-step">
      <h2>إعدادات متقدمة</h2>
      <p className="muted">
        اختياري — اترك الحقل فارغاً لاستخدام القيمة الافتراضية.
      </p>

      <h3 className="adv-group">Language model</h3>
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
  const rows = [
    ["الافتتاحية", data.opening],
    ["سبب الاتصال", data.purpose],
    ["النقاط", data.points],
    ["الدعوة لاتخاذ إجراء", data.cta],
  ].filter(([, v]) => v);

  if (!rows.length) {
    return <p className="muted">اختر هدف المكالمة لعرض النص المبدئي هنا.</p>;
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
