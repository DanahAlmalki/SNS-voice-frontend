// Creates/lists the campaign records the voice pipeline binds to.
// Requests go through a proxy (see vite.config.js / your backend) that adds
// the CAMPAIGN_API_KEY bearer token — the key must never reach the browser.
import { apiError } from "./apiError";

const API_BASE = import.meta.env.VITE_CAMPAIGN_API_BASE ?? "";

// Server-side limits from pipecat_server.py.
const MAX_NAME = 255;
const MAX_PROMPT = 4000;
const MAX_GREETING = 4000;

// The greeting is spoken verbatim, so newlines collapse the same way the server does.
const oneLine = (value) => (value ?? "").replace(/\s*\n+\s*/g, " ").trim();

// Deployed backend can cold-start (scale-to-zero container) or hang outright —
// cap the wait instead of leaving callers (CallModal, CampaignsPage) stuck forever.
const REQUEST_TIMEOUT_MS = 20000;

// `objective`/`audienceId`/`schedule`/`rateLimits`/`retry` are only sent when
// provided — the trial-call flow (CallModal) omits all of them.
export async function createCampaign({
  name,
  prompt,
  greeting,
  overrides,
  objective,
  audienceId,
  schedule,
  rateLimits,
  retry,
}) {
  const spokenGreeting = oneLine(greeting).slice(0, MAX_GREETING);
  const body = {
    name: (name?.trim() || "اتصال تجريبي").slice(0, MAX_NAME),
    prompt: (prompt ?? "").slice(0, MAX_PROMPT),
    requires_identity_verification: false,
    ...(spokenGreeting ? { greeting: spokenGreeting } : {}),
    ...(overrides && Object.keys(overrides).length ? { overrides } : {}),
    ...(objective ? { objective } : {}),
    ...(audienceId ? { audience_id: audienceId } : {}),
    ...(schedule ? { schedule } : {}),
    ...(rateLimits ? { rate_limits: rateLimits } : {}),
    ...(retry ? { retry } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}/api/v1/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("انتهت مهلة إنشاء الحملة — الخادم بطيء أو غير متاح");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // The 400 body names the offending field — apiError() keeps it visible.
  if (!res.ok) throw await apiError(res, "تعذّر إنشاء الحملة");

  const data = await res.json();
  if (!data?.id) throw new Error("لم يُرجع الخادم معرّف الحملة");
  return data.id;
}

// Always 7 fixed fields per item (id, name, objective, status, audience_count,
// created_at, scheduled_at) — see CampaignsPage.jsx.
export async function listCampaigns() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}/api/v1/campaigns`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("انتهت مهلة تحميل الحملات — الخادم بطيء أو غير متاح");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw await apiError(res, "تعذّر تحميل الحملات");

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
