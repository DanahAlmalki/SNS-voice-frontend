// Creates the campaign record that the voice pipeline binds to.
// The request goes through a proxy (see vite.config.js / your backend) that adds
// the CAMPAIGN_API_KEY bearer token — the key must never reach the browser.

const API_BASE = import.meta.env.VITE_CAMPAIGN_API_BASE ?? "";

// Server-side limits from campaigns.py.
const MAX_NAME = 255;
const MAX_PROMPT = 4000;
const MAX_GREETING = 4000;

// The greeting is spoken verbatim, so newlines collapse the same way the server does.
const oneLine = (value) => (value ?? "").replace(/\s*\n+\s*/g, " ").trim();

export async function createCampaign({ name, prompt, greeting, overrides }) {
  const spokenGreeting = oneLine(greeting).slice(0, MAX_GREETING);
  const body = {
    name: (name?.trim() || "اتصال تجريبي").slice(0, MAX_NAME),
    prompt: (prompt ?? "").slice(0, MAX_PROMPT),
    requires_identity_verification: false,
    ...(spokenGreeting ? { greeting: spokenGreeting } : {}),
    ...(overrides && Object.keys(overrides).length ? { overrides } : {}),
  };

  const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 503)
      throw new Error("مفتاح واجهة الحملات غير مُهيّأ على الخادم");
    if (res.status === 401) throw new Error("مفتاح واجهة الحملات غير صحيح");

    // The 400 body names the offending override key — keep it visible.
    const detail = await res
      .json()
      .then((d) => d?.detail)
      .catch(() => null);
    const reason =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : "";
    throw new Error(
      `تعذّر إنشاء الحملة (${res.status})${reason ? `: ${reason}` : ""}`,
    );
  }

  const data = await res.json();
  if (!data?.id) throw new Error("لم يُرجع الخادم معرّف الحملة");
  return data.id;
}
