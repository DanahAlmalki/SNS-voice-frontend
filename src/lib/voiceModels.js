// Fetches the TTS voice registry + selectable LLM providers from the backend
// (pipecat_server.py's GET /api/v1/voices and GET /api/v1/llm_providers) so
// the wizard can offer every engine actually loaded on the deployment instead
// of a hardcoded, easily-stale client-side list. Falls back to a small static
// default on any network/parse error so the wizard still works (e.g. offline
// dev, or an older backend that predates these endpoints).
const API_BASE = import.meta.env.VITE_CAMPAIGN_API_BASE ?? "";

// Same timeout pattern as campaigns.js — a cold-started/unreachable backend
// must not hang the wizard forever, it should just fall back silently.
const REQUEST_TIMEOUT_MS = 8000;

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Matches the OmniVoice-only preset table this project shipped with before
// multi-provider support — kept only as an offline/error fallback.
export const FALLBACK_VOICES = [
  { id: "salwa", label: "سلوى (نسائي)", provider: "omnivoice" },
  { id: "silma", label: "سلمى (نسائي)", provider: "omnivoice" },
  { id: "fahad", label: "فهد (رجالي)", provider: "omnivoice" },
  { id: "sultan", label: "سلطان (رجالي)", provider: "omnivoice" },
  { id: "salim", label: "سالم (رجالي)", provider: "omnivoice" },
];

export const FALLBACK_LLM_PROVIDERS = [
  { id: "azure_openai", label: "Azure OpenAI", model: "" },
];

export async function fetchVoices() {
  try {
    const data = await getJson("/api/v1/voices");
    return Array.isArray(data) && data.length ? data : FALLBACK_VOICES;
  } catch {
    return FALLBACK_VOICES;
  }
}

export async function fetchLlmProviders() {
  try {
    const data = await getJson("/api/v1/llm_providers");
    return Array.isArray(data) && data.length ? data : FALLBACK_LLM_PROVIDERS;
  } catch {
    return FALLBACK_LLM_PROVIDERS;
  }
}

// Backend group names are proper nouns (kept as-is in both languages); this
// only supplies display order + a friendlier vs. raw provider id.
const PROVIDER_DISPLAY = {
  omnivoice: "OmniVoice",
  namaa: "NAMAA",
};
const PROVIDER_ORDER = ["omnivoice", "namaa"];

export function providerLabel(providerId) {
  return PROVIDER_DISPLAY[providerId] || providerId;
}

// Groups a flat GET /api/v1/voices list by provider, ordered so the default
// engine (OmniVoice) appears first, then any others the deployment loaded.
export function groupVoicesByProvider(voices) {
  const byProvider = new Map();
  for (const voice of voices) {
    const key = voice.provider || "other";
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key).push(voice);
  }
  const orderedKeys = [
    ...PROVIDER_ORDER.filter((k) => byProvider.has(k)),
    ...[...byProvider.keys()].filter((k) => !PROVIDER_ORDER.includes(k)),
  ];
  return orderedKeys.map((provider) => ({
    provider,
    label: providerLabel(provider),
    voices: byProvider.get(provider),
  }));
}

// Backend labels look like "سلوى (نسائي)" — split into a bold name + a small
// hint so new providers render with the same chip layout the wizard already
// used for the original 5 OmniVoice presets.
export function splitVoiceLabel(label) {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(label || "");
  return match ? { name: match[1], hint: match[2] } : { name: label || "", hint: "" };
}
