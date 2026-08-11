// Creates the campaign record that the voice pipeline binds to.
// The request goes through a proxy (see vite.config.js / your backend) that adds
// the CAMPAIGN_API_KEY bearer token — the key must never reach the browser.

const API_BASE = import.meta.env.VITE_CAMPAIGN_API_BASE ?? "";

// Server-side limits from campaigns.py.
const MAX_NAME = 255;
const MAX_PROMPT = 4000;

export async function createCampaign({ name, prompt, config }) {
  const body = {
    name: (name?.trim() || "اتصال تجريبي").slice(0, MAX_NAME),
    prompt: (prompt ?? "").slice(0, MAX_PROMPT),
    ...(config ? { config } : {}),
  };

  const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`تعذّر إنشاء الحملة (${res.status})`);
  }

  const data = await res.json();
  if (!data?.id) throw new Error("لم يُرجع الخادم معرّف الحملة");
  return data.id;
}
