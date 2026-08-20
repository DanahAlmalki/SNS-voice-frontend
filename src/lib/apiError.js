// Shared error shape for pipecat_server.py's /api/v1/* endpoints — every
// failure (campaigns, audiences) responds with {"detail": "..."}.
// `status`/`detail` are attached to the returned Error so callers can react
// to a specific case (e.g. a 404 with a known detail) without parsing text.
export async function apiError(res, action) {
  if (res.status === 503) {
    const err = new Error("مفتاح الواجهة غير مُهيّأ على الخادم");
    err.status = res.status;
    return err;
  }
  if (res.status === 401) {
    const err = new Error("مفتاح الواجهة غير صحيح");
    err.status = res.status;
    return err;
  }

  const detail = await res
    .json()
    .then((d) => d?.detail)
    .catch(() => null);
  const reason =
    typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
  const err = new Error(`${action} (${res.status})${reason ? `: ${reason}` : ""}`);
  err.status = res.status;
  err.detail = detail;
  return err;
}
