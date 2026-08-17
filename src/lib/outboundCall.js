// Places a real outbound phone call through twilio_bridge.py's POST
// /outbound-call. Routed through the dev proxy (see vite.config.js) so the
// CAMPAIGN_API_KEY bearer token is attached server-side — same pattern as
// createCampaign in campaigns.js. The key must never reach the browser.

const API_BASE = import.meta.env.VITE_OUTBOUND_CALL_API_BASE ?? "";

// Same format twilio_bridge.py's own call page validates client-side.
const E164 = /^\+[1-9]\d{7,14}$/;

export async function startOutboundCall({ to, campaignId, beneficiaryId }) {
  const phone = (to ?? "").trim();
  if (!E164.test(phone)) {
    throw new Error("الرقم لازم يكون بصيغة دولية مثل +9665XXXXXXXX");
  }

  const body = { to: phone };
  if (campaignId) body.campaign_id = campaignId;
  if (beneficiaryId) body.beneficiary_id = beneficiaryId;

  const res = await fetch(`${API_BASE}/api/v1/outbound-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 503)
      throw new Error(
        "خدمة الاتصال الحقيقي غير مُفعّلة على الخادم (CAMPAIGN_API_KEY)",
      );
    if (res.status === 401) throw new Error("مفتاح واجهة الاتصال غير صحيح");

    const reason = data?.detail ?? data?.error;
    throw new Error(
      `تعذّر بدء الاتصال الحقيقي (${res.status})${reason ? `: ${typeof reason === "string" ? reason : JSON.stringify(reason)}` : ""}`,
    );
  }

  // twilio_bridge.py reports some failures as 200 + {"error": "..."} instead
  // of an HTTP error status (e.g. missing NGROK_URL) — check for that too.
  if (data?.error) throw new Error(data.error);
  if (!data?.call_sid) throw new Error("لم يُرجع الخادم معرّف المكالمة");
  return data;
}
