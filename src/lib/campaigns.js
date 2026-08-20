// Creates/lists/edits/deletes the campaign records the voice pipeline binds to.
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
const TIMEOUT_MESSAGES = {
  create: "انتهت مهلة إنشاء الحملة — الخادم بطيء أو غير متاح",
  update: "انتهت مهلة تحديث الحملة — الخادم بطيء أو غير متاح",
  list: "انتهت مهلة تحميل الحملات — الخادم بطيء أو غير متاح",
  get: "انتهت مهلة تحميل الحملة — الخادم بطيء أو غير متاح",
  delete: "انتهت مهلة حذف الحملة — الخادم بطيء أو غير متاح",
  start: "انتهت مهلة بدء الحملة — الخادم بطيء أو غير متاح",
  stop: "انتهت مهلة إيقاف الحملة — الخادم بطيء أو غير متاح",
};

// Shared fetch-with-timeout for every campaigns endpoint below.
async function request(path, { timeoutKey, action, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error(TIMEOUT_MESSAGES[timeoutKey]);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  // Non-2xx bodies name the offending field — apiError() keeps it visible.
  if (!res.ok) throw await apiError(res, action);
  return res;
}

// `objective`/`audienceId`/`schedule`/`rateLimits`/`retry` are only sent when
// provided — the trial-call flow (CallModal) omits all of them.
function buildBody({
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
  return {
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
}

export async function createCampaign(fields) {
  const res = await request("/api/v1/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(fields)),
    timeoutKey: "create",
    action: "تعذّر إنشاء الحملة",
  });
  const data = await res.json();
  if (!data?.id) throw new Error("لم يُرجع الخادم معرّف الحملة");
  return data.id;
}

// Sends the full merged campaign state (not just changed fields) since it's
// unconfirmed whether the backend's PUT is a partial patch or a full replace.
export async function updateCampaign(id, fields) {
  await request(`/api/v1/campaigns/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(fields)),
    timeoutKey: "update",
    action: "تعذّر تحديث الحملة",
  });
}

// Assumes the conventional DELETE /api/v1/campaigns/{id} route — unlike the
// other endpoints here, this was never explicitly confirmed against the
// backend contract, so a 404 here likely means the backend doesn't support it.
export async function deleteCampaign(id) {
  await request(`/api/v1/campaigns/${encodeURIComponent(id)}`, {
    method: "DELETE",
    timeoutKey: "delete",
    action: "تعذّر حذف الحملة",
  });
}

// POST /api/v1/campaigns/{id}/start (twilio_bridge.py) also resumes a
// previously-stopped campaign — same route, from_statuses includes "stopped".
// Its response reports status "running", NOT the persisted "in_progress"
// enum value, so that's normalized here to keep callers' local state in sync
// with what a subsequent GET /api/v1/campaigns would report.
export async function startCampaign(id) {
  const res = await request(`/api/v1/campaigns/${encodeURIComponent(id)}/start`, {
    method: "POST",
    timeoutKey: "start",
    action: "تعذّر بدء الحملة",
  });
  const data = await res.json().catch(() => null);
  return { status: data?.status === "running" ? "in_progress" : data?.status ?? "in_progress" };
}

// POST /api/v1/campaigns/{id}/stop (twilio_bridge.py): halts further dialling
// but does not cancel calls already placed. Its response's status ("stopped")
// matches the persisted enum already, unlike startCampaign's above.
export async function stopCampaign(id) {
  const res = await request(`/api/v1/campaigns/${encodeURIComponent(id)}/stop`, {
    method: "POST",
    timeoutKey: "stop",
    action: "تعذّر إيقاف الحملة",
  });
  const data = await res.json().catch(() => null);
  return { status: data?.status ?? "stopped" };
}

// Always 7 fixed fields per item (id, name, objective, status, audience_count,
// created_at, scheduled_at) — see CampaignsPage.jsx.
export async function listCampaigns() {
  const res = await request("/api/v1/campaigns", {
    headers: { Accept: "application/json" },
    timeoutKey: "list",
    action: "تعذّر تحميل الحملات",
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Same 7 fields as listCampaigns() plus prompt/greeting/overrides/schedule/
// rate_limits/retry, each present only if actually saved (sparse response).
export async function getCampaign(id) {
  const res = await request(`/api/v1/campaigns/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    timeoutKey: "get",
    action: "تعذّر تحميل الحملة",
  });
  return res.json();
}
