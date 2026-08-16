// Persists wizard-created templates in the browser (no backend endpoint exists for templates).
import { OBJECTIVES } from "./objectives";
import { VOICE_PRESETS } from "./buildOverrides";

const STORAGE_KEY = "sns-templates";

export const initialData = {
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

// Seed templates shown before the user saves any of their own.
const DEMO_TEMPLATES = [
  {
    id: "demo-1",
    updated: "قبل يومين",
    data: {
      name: "حملة حجز المواعيد",
      objective: "appointment",
      voice: "salwa",
      purpose: "قالب لتحديد مواعيد مع العملاء المحتملين وعرض الخدمات.",
    },
  },
  {
    id: "demo-2",
    updated: "قبل ٥ أيام",
    data: {
      name: "تأهيل العملاء المحتملين",
      objective: "qualify",
      voice: "fahad",
      purpose: "أسئلة سريعة لتقييم اهتمام العميل وجاهزيته للشراء.",
    },
  },
  {
    id: "demo-3",
    updated: "قبل أسبوع",
    data: {
      name: "متابعة الطلبات",
      objective: "followup",
      voice: "",
      purpose: "الاتصال بالعملاء للتأكد من رضاهم بعد الطلب.",
    },
  },
];

export function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Saved edits shadow the demo seed that shares their id. Tombstoned (deleted)
// records stay in storage so a deleted demo seed doesn't reappear.
export function listTemplates() {
  const saved = loadTemplates();
  const savedIds = new Set(saved.map((t) => t.id));
  return [
    ...saved.filter((t) => !t.deleted),
    ...DEMO_TEMPLATES.filter((t) => !savedIds.has(t.id)),
  ];
}

export function findTemplate(id) {
  return listTemplates().find((t) => String(t.id) === String(id)) ?? null;
}

export function upsertTemplate(record) {
  const saved = loadTemplates();
  const idx = saved.findIndex((t) => String(t.id) === String(record.id));
  if (idx >= 0) saved[idx] = record;
  else saved.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return record;
}

export function deleteTemplate(id) {
  const saved = loadTemplates();
  const idx = saved.findIndex((t) => String(t.id) === String(id));
  const tombstone = { id, deleted: true };
  if (idx >= 0) saved[idx] = tombstone;
  else saved.unshift(tombstone);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

// Flattens a wizard record into the summary shown on the templates list/cards.
export function describeTemplate(record) {
  const d = record.data || {};
  const voicePreset = VOICE_PRESETS.find((v) => v.id === d.voice);
  return {
    id: record.id,
    name: d.name || "قالب بدون اسم",
    description: d.purpose || d.opening || "",
    objective:
      OBJECTIVES.find((o) => o.id === d.objective)?.title || "بدون هدف",
    voice: voicePreset ? `صوت ${voicePreset.hint}` : "غير محدد",
    updated: record.updated || "",
  };
}
