// Uploads an audience contact list; the returned id binds to a campaign's
// `audience_id`. Routed through the same dev proxy/bearer token as campaigns.js.
import { apiError } from "./apiError";

const API_BASE = import.meta.env.VITE_CAMPAIGN_API_BASE ?? "";

export async function uploadAudience(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/audiences`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw await apiError(res, "تعذّر رفع ملف الجمهور");

  const data = await res.json();
  if (!data?.id) throw new Error("لم يُرجع الخادم معرّف ملف الجمهور");
  return data;
}
