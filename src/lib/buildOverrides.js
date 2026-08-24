// Maps the wizard values onto the campaign `overrides` map (campaigns.py).
// The map is sparse and strictly typed: unknown keys, strings-for-numbers or
// 0/1-for-booleans are all rejected with a 400, so blank fields are dropped.

// Preset keys accepted by the backend voice registry.
// `label`/`hint` are Arabic (default/backward-compatible); `labelEn`/`hintEn`
// are used when the UI language toggle is set to English — see voiceLabel()/
// voiceHint() below.
export const VOICE_PRESETS = [
  { id: "salwa", label: "سلوى", labelEn: "Salwa", hint: "نسائي", hintEn: "Female" },
  { id: "silma", label: "سلمى", labelEn: "Salma", hint: "نسائي", hintEn: "Female" },
  { id: "fahad", label: "فهد", labelEn: "Fahad", hint: "رجالي", hintEn: "Male" },
  { id: "sultan", label: "سلطان", labelEn: "Sultan", hint: "رجالي", hintEn: "Male" },
  { id: "salim", label: "سالم", labelEn: "Saleem", hint: "رجالي", hintEn: "Male" },
];

export function voiceLabel(voice, lang) {
  if (!voice) return "";
  return (lang === "en" ? voice.labelEn : voice.label) || voice.label;
}

export function voiceHint(voice, lang) {
  if (!voice) return "";
  return (lang === "en" ? voice.hintEn : voice.hint) || voice.hint;
}

const SPEED_MAP = { slow: 0.85, normal: 1.0, fast: 1.15 };

// Same cap the backend applies to `initial_speech_recognition_prompt`.
const MAX_STT_PROMPT = 4000;

// Out-of-range values are rejected with a 400 rather than clamped, so they are
// dropped here and the backend default applies instead.
const inRange = (n, { min, max, exclusiveMin } = {}) => {
  if (exclusiveMin !== undefined && n <= exclusiveMin) return false;
  if (min !== undefined && n < min) return false;
  if (max !== undefined && n > max) return false;
  return true;
};

const num = (value, range) => {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return inRange(n, range) ? n : undefined;
};

const int = (value, range) => {
  const n = num(value);
  if (n === undefined) return undefined;
  const rounded = Math.round(n);
  return inRange(rounded, range) ? rounded : undefined;
};

const text = (value) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

// Any provider's voice id is accepted here — the wizard only ever offers ids
// fetched live from GET /api/v1/voices (src/lib/voiceModels.js), and the
// backend (campaigns.py) is the real source of truth/validation anyway, so
// this just needs to drop blanks, not re-validate against a fixed set.
const isPreset = (id) => typeof id === "string" && id.trim() !== "";

export function buildOverrides(data) {
  const overrides = {
    voice: isPreset(data.voice) ? data.voice : undefined,
    temperature: num(data.temperature, { min: 0 }),
    max_tokens: int(data.maxTokens, { min: 1 }),
    seed: int(data.seed),
    voice_speed: SPEED_MAP[data.speed],
    guidance_scale: num(data.ttsGuidanceScale, { exclusiveMin: 0 }),
    generation_steps: int(data.ttsNumStep, { min: 1 }),
    add_shadda_automatically: Boolean(data.ttsAddShadda),
    vad_threshold: num(data.vadThreshold, { min: 0, max: 1 }),
    silence_duration_ms: int(data.minSilenceDurationMs, { min: 0 }),
    min_barge_in_duration_ms: int(data.bargeInMinDurationMs, { min: 0 }),
    beam_size: int(data.sttBeamSize, { min: 1 }),
    condition_on_previous_text: Boolean(data.sttConditionOnPrevious),
    initial_speech_recognition_prompt: text(data.sttInitialPrompt)?.slice(
      0,
      MAX_STT_PROMPT,
    ),
    // "" (default/unset) is dropped by text() so the backend/env default applies.
    llm_provider: text(data.llmProvider),
    llm_model: text(data.llmModel),
  };

  return Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  );
}
