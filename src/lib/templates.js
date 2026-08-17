// Persists wizard-created templates in the browser (no backend endpoint exists for templates).
import { OBJECTIVES, objectiveTitle } from "./objectives";
import { VOICE_PRESETS, voiceHint } from "./buildOverrides";

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
// `nameEn`/`purposeEn`/`updatedEn` are only used for these demo seeds when the
// UI language is English; real user-saved templates keep whatever the user
// typed regardless of UI language.
const DEMO_TEMPLATES = [
  {
    id: "demo-1",
    updated: "قبل يومين",
    updatedEn: "2 days ago",
    data: {
      name: "حملة حجز المواعيد",
      nameEn: "Appointment Booking Campaign",
      objective: "appointment",
      voice: "salwa",
      purpose: "قالب لتحديد مواعيد مع العملاء المحتملين وعرض الخدمات.",
      purposeEn: "A template for booking appointments with leads and presenting services.",
    },
  },
  {
    id: "demo-2",
    updated: "قبل ٥ أيام",
    updatedEn: "5 days ago",
    data: {
      name: "تأهيل العملاء المحتملين",
      nameEn: "Lead Qualification",
      objective: "qualify",
      voice: "fahad",
      purpose: "أسئلة سريعة لتقييم اهتمام العميل وجاهزيته للشراء.",
      purposeEn: "Quick questions to assess a lead's interest and readiness to buy.",
    },
  },
  {
    id: "demo-3",
    updated: "قبل أسبوع",
    updatedEn: "a week ago",
    data: {
      name: "متابعة الطلبات",
      nameEn: "Order Follow-up",
      objective: "followup",
      voice: "",
      purpose: "الاتصال بالعملاء للتأكد من رضاهم بعد الطلب.",
      purposeEn: "Calling customers to confirm their satisfaction after an order.",
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
export function describeTemplate(record, lang = "ar") {
  const d = record.data || {};
  const voicePreset = VOICE_PRESETS.find((v) => v.id === d.voice);
  const isEn = lang === "en";
  const name = (isEn ? d.nameEn : d.name) || d.name;
  const purpose = (isEn ? d.purposeEn : d.purpose) || d.purpose;
  const updated = (isEn ? record.updatedEn : record.updated) || record.updated;
  return {
    id: record.id,
    name: name || (isEn ? "Untitled template" : "قالب بدون اسم"),
    description: purpose || d.opening || "",
    objective:
      objectiveTitle(OBJECTIVES.find((o) => o.id === d.objective), lang) ||
      (isEn ? "No objective" : "بدون هدف"),
    voice: voicePreset
      ? isEn
        ? `${voiceHint(voicePreset, lang)} voice`
        : `صوت ${voiceHint(voicePreset, lang)}`
      : isEn
        ? "Not set"
        : "غير محدد",
    updated: updated || "",
  };
}
