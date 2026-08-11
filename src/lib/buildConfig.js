// Maps the wizard values onto the backend config field names (config.py).
// Blank advanced fields are dropped so the backend keeps its own defaults.

const LANGUAGE_MAP = {
  ar: { stt: "ar", ttsLang: "a", omni: "ars" },
  en: { stt: "en", ttsLang: "a", omni: "eng" },
};

// UI voice label -> backend TTS voice + optional clone reference clip.
const VOICE_MAP = {
  "صوت نسائي": { voice: "zariyah", ref_audio: "./voices/salwa-tts-audio.wav" },
  "صوت رجالي": { voice: "hamdan", ref_audio: "" },
  "صوت محايد": { voice: "zariyah", ref_audio: "" },
};

const SPEED_MAP = { slow: 0.85, normal: 1.0, fast: 1.15 };

const numOpt = (value) => {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const prune = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export function buildConfig(data) {
  const lang = LANGUAGE_MAP[data.language] ?? LANGUAGE_MAP.ar;
  const voice = VOICE_MAP[data.voice] ?? { voice: "zariyah", ref_audio: "" };
  const opening = data.opening?.trim() || "";

  return {
    stt: prune({
      language: lang.stt,
      beam_size: numOpt(data.sttBeamSize),
      best_of: numOpt(data.sttBestOf),
      condition_on_previous_text: data.sttConditionOnPrevious || undefined,
      hallucination_silence_threshold_sec: numOpt(
        data.sttHallucinationSilenceSec,
      ),
      initial_prompt: data.sttInitialPrompt?.trim() || undefined,
    }),
    tts: prune({
      voice: voice.voice,
      lang: lang.ttsLang,
      speed: SPEED_MAP[data.speed] ?? 1.0,
      omnivoice_language: lang.omni,
      omnivoice_ref_audio: voice.ref_audio || undefined,
      omnivoice_num_step: numOpt(data.ttsNumStep),
      omnivoice_guidance_scale: numOpt(data.ttsGuidanceScale),
      omnivoice_duration: numOpt(data.ttsDuration),
      omnivoice_seed: numOpt(data.ttsSeed),
      omnivoice_add_shadda: data.ttsAddShadda,
    }),
    llm: prune({
      temperature: numOpt(data.temperature),
      top_p: numOpt(data.topP),
      seed: data.seed === "" ? undefined : numOpt(data.seed),
      max_tokens: numOpt(data.maxTokens),
    }),
    vad: prune({
      threshold: numOpt(data.vadThreshold),
      min_silence_duration_ms: numOpt(data.minSilenceDurationMs),
      barge_in_threshold: numOpt(data.bargeInThreshold),
      barge_in_min_duration_ms: numOpt(data.bargeInMinDurationMs),
    }),
    greeting: prune({
      enabled: Boolean(data.greetingEnabled) && opening !== "",
      message: opening || undefined,
    }),
  };
}
