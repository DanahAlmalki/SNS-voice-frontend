// Shared error shape for pipecat_server.py's /api/v1/* endpoints — every
// failure (campaigns, audiences) responds with {"detail": "..."}.
export async function apiError(res, action) {
  if (res.status === 503) return new Error("مفتاح الواجهة غير مُهيّأ على الخادم");
  if (res.status === 401) return new Error("مفتاح الواجهة غير صحيح");

  const detail = await res
    .json()
    .then((d) => d?.detail)
    .catch(() => null);
  const reason =
    typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
  return new Error(`${action} (${res.status})${reason ? `: ${reason}` : ""}`);
}
