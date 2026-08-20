import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  X,
  ExternalLink,
  Filter,
  CalendarClock,
  Gauge,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import { createCampaign, getCampaign, updateCampaign } from "../lib/campaigns";
import { uploadAudience, getAudience } from "../lib/audiences";
import { listTemplates, findTemplate, describeTemplate, rememberCampaignTemplate, lastCampaignTemplateId } from "../lib/templates";
import { OBJECTIVES } from "../lib/objectives";
import { buildPrompt } from "../lib/buildPrompt";
import { buildOverrides } from "../lib/buildOverrides";
import "./NewCampaignPage.css";

const ACCEPTED = ".csv,.xlsx,.xls";

// Maps the scheduling select's demo-city values onto real IANA timezones.
const TZ_MAP = { riyadh: "Asia/Riyadh", cairo: "Africa/Cairo", dubai: "Asia/Dubai" };
const TZ_REVERSE = Object.fromEntries(
  Object.entries(TZ_MAP).map(([key, value]) => [value, key]),
);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const { t, lang, dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const locale = lang === "en" ? "en-US" : "ar-EG";

  const [templates] = useState(() => listTemplates());
  const [form, setForm] = useState({
    name: "",
    templateId: "",
    timezone: "riyadh",
    windowStart: "09:00",
    windowEnd: "18:00",
    excludeHolidays: true,
    concurrentCalls: "50",
    hourlyMax: "500",
    carrierCapacity: "auto",
    retryInterval: "30",
    retryMax: "3",
    fallbackTransfer: true,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Existing prompt/greeting/overrides/objective from GET — kept as-is on
  // save unless the user explicitly picks a different template below.
  const [baseFields, setBaseFields] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  // The audience file already attached server-side (files[] only tracks a
  // NEW pick made this session, so without this the import panel looked
  // empty — as if the file had vanished — on every reopen for editing.
  const [existingAudience, setExistingAudience] = useState(null);

  const [fieldError, setFieldError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("campaign");

  const loadCampaign = useCallback(() => {
    if (!isEdit) return;
    setLoadingCampaign(true);
    setLoadError(null);
    setExistingAudience(null);
    getCampaign(id)
      .then((data) => {
        setBaseFields({
          prompt: data.prompt ?? "",
          greeting: data.greeting ?? "",
          overrides: data.overrides ?? {},
          objective: data.objective,
        });
        if (data.audience_id) {
          const count = data.audience_count ?? 0;
          setExistingAudience({ count, filename: null });
          // Filename is a nice-to-have; the count above already came from
          // this same GET, so a failure here just leaves it unnamed.
          getAudience(data.audience_id)
            .then((info) =>
              setExistingAudience((prev) =>
                prev ? { ...prev, filename: info.filename } : prev,
              ),
            )
            .catch(() => {});
        }
        // Pre-select whichever template was last applied to this campaign
        // (remembered locally — the backend itself only stores the flattened
        // prompt/greeting/overrides, not a template reference) so the field
        // doesn't just reset to "keep current script" on every reload. Falls
        // back to "" if that template was since deleted.
        const rememberedTemplateId = lastCampaignTemplateId(id);
        set({
          name: data.name ?? "",
          templateId: findTemplate(rememberedTemplateId)
            ? rememberedTemplateId
            : "",
          ...(data.schedule
            ? {
                timezone:
                  TZ_REVERSE[data.schedule.timezone] ?? data.schedule.timezone,
                windowStart: data.schedule.window_start ?? "09:00",
                windowEnd: data.schedule.window_end ?? "18:00",
                excludeHolidays: data.schedule.exclude_holidays ?? true,
              }
            : {}),
          ...(data.rate_limits
            ? {
                concurrentCalls: String(
                  data.rate_limits.max_concurrent_calls ?? "50",
                ),
                hourlyMax: String(data.rate_limits.max_calls_per_hour ?? "500"),
                carrierCapacity: data.rate_limits.carrier_capacity ?? "auto",
              }
            : {}),
          ...(data.retry
            ? {
                retryInterval: String(data.retry.interval_minutes ?? "30"),
                retryMax: String(data.retry.max_attempts ?? "3"),
                fallbackTransfer: data.retry.fallback_transfer ?? true,
              }
            : {}),
        });
      })
      .catch((err) => setLoadError(err.message || t("newCampaign.loadError")))
      .finally(() => setLoadingCampaign(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    // Only one audience file is supported per campaign right now.
    setFiles([incoming[0]]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  // Files live only in memory until submit, so "opening" one just hands the
  // browser a temporary blob URL to view in its own tab. Re-wrapped as
  // text/plain because Windows tags .csv picks as application/vnd.ms-excel,
  // which Chrome/Edge force-download instead of displaying.
  const openFile = (file) => {
    const url = URL.createObjectURL(new Blob([file], { type: "text/plain" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleSubmit = async () => {
    setFieldError(null);
    setSubmitError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFieldError(t("newCampaign.nameRequired"));
      return;
    }
    const record = form.templateId ? findTemplate(form.templateId) : null;
    if (!isEdit && !record) {
      setFieldError(t("newCampaign.templateRequired"));
      return;
    }

    setSubmitting(true);
    try {
      let audienceId;
      if (files[0]) {
        setSubmitPhase("audience");
        const uploaded = await uploadAudience(files[0]);
        audienceId = uploaded.id;
      }

      setSubmitPhase("campaign");
      const tplData = record ? record.data || {} : null;
      // The backend's own "objective" enum never includes "other" (its GET
      // fallback for campaigns saved without one) — resending it verbatim on
      // PUT is rejected, so only carry it over when it's a real objective id.
      const keptObjective = OBJECTIVES.some((o) => o.id === baseFields?.objective)
        ? baseFields.objective
        : undefined;
      const payload = {
        name: trimmedName,
        prompt: tplData ? buildPrompt(tplData) : baseFields?.prompt,
        greeting: tplData ? tplData.opening : baseFields?.greeting,
        overrides: tplData ? buildOverrides(tplData) : baseFields?.overrides,
        objective: tplData ? tplData.objective : keptObjective,
        audienceId,
        schedule: {
          timezone: TZ_MAP[form.timezone] ?? form.timezone,
          window_start: form.windowStart,
          window_end: form.windowEnd,
          exclude_holidays: form.excludeHolidays,
        },
        rateLimits: {
          max_concurrent_calls: Number(form.concurrentCalls),
          max_calls_per_hour: Number(form.hourlyMax),
          carrier_capacity: form.carrierCapacity,
        },
        retry: {
          interval_minutes: Number(form.retryInterval),
          max_attempts: Number(form.retryMax),
          fallback_transfer: form.fallbackTransfer,
        },
      };

      if (isEdit) {
        await updateCampaign(id, payload);
        // Only overwrite the remembered template when one was actually picked
        // this time — leaving the dropdown on "keep current script" must not
        // erase what an earlier save already remembered.
        if (form.templateId) rememberCampaignTemplate(id, form.templateId);
      } else {
        const newId = await createCampaign(payload);
        rememberCampaignTemplate(newId, form.templateId);
      }

      navigate("/campaigns");
    } catch (err) {
      setSubmitError(err.message || t("newCampaign.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-campaign" dir={dir}>
      <header className="new-campaign__header">
        <button
          className="new-campaign__back"
          onClick={() => navigate("/campaigns")}
          disabled={submitting}
        >
          <BackIcon size={16} />
          {t("newCampaign.back")}
        </button>
        <div className="new-campaign__heading">
          <h1 className="new-campaign__title">
            {t(isEdit ? "newCampaign.editTitle" : "newCampaign.title")}
          </h1>
        </div>
        <div className="new-campaign__actions">
          <button
            className="btn btn--ghost"
            onClick={() => navigate("/campaigns")}
            disabled={submitting}
          >
            {t("newCampaign.cancel")}
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={
              submitting || loadingCampaign || (!isEdit && templates.length === 0)
            }
          >
            {submitting ? <Loader2 className="spin" size={16} /> : null}
            {submitting
              ? submitPhase === "audience"
                ? t("newCampaign.uploadingAudience")
                : t(isEdit ? "newCampaign.savingChanges" : "newCampaign.creating")
              : t(isEdit ? "newCampaign.saveChanges" : "newCampaign.createCampaign")}
          </button>
        </div>
      </header>

      {(fieldError || submitError) && (
        <p className="nc-msg nc-msg--err">
          {fieldError || submitError}
        </p>
      )}

      {loadingCampaign ? (
        <p className="nc-msg">
          <Loader2 className="spin" size={16} />
          {t("newCampaign.loading")}
        </p>
      ) : loadError ? (
        <div className="nc-msg nc-msg--err">
          <p>{loadError}</p>
          <button className="btn btn--ghost btn--sm" onClick={loadCampaign}>
            <RotateCcw size={14} />
            {t("campaignsPage.retry")}
          </button>
        </div>
      ) : (
      <div className="new-campaign__grid">
        {/* ---------- Right: Audience import ---------- */}
        <section className="panel nc-col nc-import">
          <div className="nc-col__head">
            <h2 className="nc-col__title">{t("newCampaign.importAudienceTitle")}</h2>
            <p className="nc-col__desc">{t("newCampaign.importAudienceDesc")}</p>
          </div>

          <div
            className={`nc-drop ${dragging ? "is-dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
          >
            <UploadCloud className="nc-drop__icon" size={40} />
            <p className="nc-drop__title">{t("newCampaign.dropTitle")}</p>
            <p className="nc-drop__hint">{t("newCampaign.dropHint")}</p>
            <p className="nc-drop__hint">{t("newCampaign.audienceColumnsHint")}</p>
            {isEdit && (
              <p className="nc-drop__hint">
                {t("newCampaign.replaceAudienceHint")}
              </p>
            )}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <FilePlus2 size={16} />
              {t("newCampaign.addFile")}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="nc-files">
              {files.map((file, i) => (
                <li className="nc-files__item" key={`${file.name}-${i}`}>
                  <FileSpreadsheet size={18} className="nc-files__icon" />
                  <span className="nc-files__name">{file.name}</span>
                  <span className="nc-files__size">
                    {formatSize(file.size)}
                  </span>
                  <button
                    type="button"
                    className="nc-files__open"
                    onClick={() => openFile(file)}
                    aria-label={t("newCampaign.openFileAria", { name: file.name })}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    type="button"
                    className="nc-files__remove"
                    onClick={() => removeFile(i)}
                    aria-label={t("newCampaign.removeFileAria", { name: file.name })}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {files.length === 0 && existingAudience && (
            <ul className="nc-files">
              <li className="nc-files__item">
                <FileSpreadsheet size={18} className="nc-files__icon" />
                <span className="nc-files__name">
                  {existingAudience.filename ||
                    t("newCampaign.existingAudienceFallbackName")}
                </span>
                <span className="nc-files__size">
                  {t("newCampaign.existingAudienceCount", {
                    count: existingAudience.count.toLocaleString(locale),
                  })}
                </span>
              </li>
            </ul>
          )}

          <div className="nc-card__head nc-import__seg-head">
            <Filter size={18} className="nc-card__icon" />
            <div>
              <h3 className="nc-card__title">{t("newCampaign.segmentationTitle")}</h3>
            </div>
          </div>
          <div className="nc-fields">
            <div className="filter-field">
              <label className="filter-label" htmlFor="seg-demographic">
                {t("newCampaign.demographicsLabel")}
              </label>
              <select id="seg-demographic" defaultValue="all">
                <option value="all">{t("newCampaign.demoAll")}</option>
                <option value="age">{t("newCampaign.demoAge")}</option>
                <option value="gender">{t("newCampaign.demoGender")}</option>
                <option value="region">{t("newCampaign.demoRegion")}</option>
              </select>
            </div>
            <div className="filter-field">
              <label className="filter-label" htmlFor="seg-status">
                {t("newCampaign.accountStatusLabel")}
              </label>
              <select id="seg-status" defaultValue="all">
                <option value="all">{t("newCampaign.statusAll")}</option>
                <option value="active">{t("newCampaign.statusActive")}</option>
                <option value="inactive">{t("newCampaign.statusInactive")}</option>
                <option value="churned">{t("newCampaign.statusChurned")}</option>
              </select>
            </div>
            <div className="filter-field filter-field--grow">
              <label className="filter-label" htmlFor="seg-custom">
                {t("newCampaign.customFieldLabel")}
              </label>
              <input
                id="seg-custom"
                type="text"
                placeholder={t("newCampaign.customFieldPlaceholder")}
              />
            </div>
          </div>
        </section>

        {/* ---------- Left: Configuration ---------- */}
        <section className="nc-col nc-config">
          <div className="panel nc-card">
            <div className="nc-card__head">
              <FileText size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">{t("newCampaign.detailsTitle")}</h3>
                <p className="nc-card__desc">{t("newCampaign.detailsDesc")}</p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field filter-field--grow">
                <label className="filter-label" htmlFor="camp-name">
                  {t("newCampaign.nameLabel")}
                </label>
                <input
                  id="camp-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder={t("newCampaign.namePlaceholder")}
                  disabled={submitting}
                />
              </div>
              <div className="filter-field filter-field--grow">
                <label className="filter-label" htmlFor="camp-template">
                  {t("newCampaign.templateLabel")}
                </label>
                <select
                  id="camp-template"
                  value={form.templateId}
                  onChange={(e) => set({ templateId: e.target.value })}
                  disabled={submitting}
                >
                  <option value="">
                    {t(
                      isEdit
                        ? "newCampaign.keepCurrentScript"
                        : "newCampaign.selectTemplate",
                    )}
                  </option>
                  {templates.map((record) => (
                    <option key={record.id} value={record.id}>
                      {describeTemplate(record, lang).name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="muted">
                    {t("newCampaign.noTemplates")}{" "}
                    <Link to="/templates/new">
                      {t("newCampaign.createTemplateLink")}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="panel nc-card">
            <div className="nc-card__head">
              <CalendarClock size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">{t("newCampaign.schedulingTitle")}</h3>
                <p className="nc-card__desc">{t("newCampaign.schedulingDesc")}</p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-tz">
                  {t("newCampaign.timezoneLabel")}
                </label>
                <select
                  id="sch-tz"
                  value={form.timezone}
                  onChange={(e) => set({ timezone: e.target.value })}
                >
                  <option value="riyadh">{t("newCampaign.tzRiyadh")}</option>
                  <option value="cairo">{t("newCampaign.tzCairo")}</option>
                  <option value="dubai">{t("newCampaign.tzDubai")}</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-from">
                  {t("newCampaign.windowStartLabel")}
                </label>
                <input
                  id="sch-from"
                  type="time"
                  value={form.windowStart}
                  onChange={(e) => set({ windowStart: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-to">
                  {t("newCampaign.windowEndLabel")}
                </label>
                <input
                  id="sch-to"
                  type="time"
                  value={form.windowEnd}
                  onChange={(e) => set({ windowEnd: e.target.value })}
                />
              </div>
              <label className="nc-check">
                <input
                  type="checkbox"
                  checked={form.excludeHolidays}
                  onChange={(e) => set({ excludeHolidays: e.target.checked })}
                />
                <span>{t("newCampaign.excludeHolidays")}</span>
              </label>
            </div>
          </div>

          <div className="panel nc-card">
            <div className="nc-card__head">
              <Gauge size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">{t("newCampaign.rateControlTitle")}</h3>
                <p className="nc-card__desc">{t("newCampaign.rateControlDesc")}</p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-concurrent">
                  {t("newCampaign.concurrentCallsLabel")}
                </label>
                <input
                  id="thr-concurrent"
                  type="number"
                  min="1"
                  value={form.concurrentCalls}
                  onChange={(e) => set({ concurrentCalls: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-hourly">
                  {t("newCampaign.hourlyMaxLabel")}
                </label>
                <input
                  id="thr-hourly"
                  type="number"
                  min="1"
                  value={form.hourlyMax}
                  onChange={(e) => set({ hourlyMax: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-carrier">
                  {t("newCampaign.carrierCapacityLabel")}
                </label>
                <select
                  id="thr-carrier"
                  value={form.carrierCapacity}
                  onChange={(e) => set({ carrierCapacity: e.target.value })}
                >
                  <option value="auto">{t("newCampaign.capacityAuto")}</option>
                  <option value="low">{t("newCampaign.capacityLow")}</option>
                  <option value="high">{t("newCampaign.capacityHigh")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="panel nc-card">
            <div className="nc-card__head">
              <RotateCcw size={18} className="nc-card__icon" />
              <div>
                <h3 className="nc-card__title">{t("newCampaign.retryLogicTitle")}</h3>
                <p className="nc-card__desc">{t("newCampaign.retryLogicDesc")}</p>
              </div>
            </div>
            <div className="nc-fields">
              <div className="filter-field">
                <label className="filter-label" htmlFor="retry-interval">
                  {t("newCampaign.retryIntervalLabel")}
                </label>
                <input
                  id="retry-interval"
                  type="number"
                  min="1"
                  value={form.retryInterval}
                  onChange={(e) => set({ retryInterval: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="retry-max">
                  {t("newCampaign.retryMaxLabel")}
                </label>
                <input
                  id="retry-max"
                  type="number"
                  min="1"
                  value={form.retryMax}
                  onChange={(e) => set({ retryMax: e.target.value })}
                />
              </div>
              <label className="nc-check">
                <input
                  type="checkbox"
                  checked={form.fallbackTransfer}
                  onChange={(e) => set({ fallbackTransfer: e.target.checked })}
                />
                <span>{t("newCampaign.fallbackTransfer")}</span>
              </label>
            </div>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}


