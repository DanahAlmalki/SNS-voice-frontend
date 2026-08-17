import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FilePlus2,
  FileSpreadsheet,
  X,
  Filter,
  CalendarClock,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import "./NewCampaignPage.css";

const ACCEPTED = ".csv,.xlsx,.xls";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const { t, dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    setFiles((prev) => [...prev, ...incoming]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="new-campaign" dir={dir}>
      <header className="new-campaign__header">
        <button
          className="new-campaign__back"
          onClick={() => navigate("/campaigns")}
        >
          <BackIcon size={16} />
          {t("newCampaign.back")}
        </button>
        <div className="new-campaign__heading">
          <h1 className="new-campaign__title">{t("newCampaign.title")}</h1>
        </div>
        <div className="new-campaign__actions">
          <button
            className="btn btn--ghost"
            onClick={() => navigate("/campaigns")}
          >
            {t("newCampaign.cancel")}
          </button>
          <button className="btn btn--primary">
            {t("newCampaign.createCampaign")}
          </button>
        </div>
      </header>

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
              multiple
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
                <select id="sch-tz" defaultValue="riyadh">
                  <option value="riyadh">{t("newCampaign.tzRiyadh")}</option>
                  <option value="cairo">{t("newCampaign.tzCairo")}</option>
                  <option value="dubai">{t("newCampaign.tzDubai")}</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-from">
                  {t("newCampaign.windowStartLabel")}
                </label>
                <input id="sch-from" type="time" defaultValue="09:00" />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="sch-to">
                  {t("newCampaign.windowEndLabel")}
                </label>
                <input id="sch-to" type="time" defaultValue="18:00" />
              </div>
              <label className="nc-check">
                <input type="checkbox" defaultChecked />
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
                  defaultValue="50"
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
                  defaultValue="500"
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="thr-carrier">
                  {t("newCampaign.carrierCapacityLabel")}
                </label>
                <select id="thr-carrier" defaultValue="auto">
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
                  defaultValue="30"
                />
              </div>
              <div className="filter-field">
                <label className="filter-label" htmlFor="retry-max">
                  {t("newCampaign.retryMaxLabel")}
                </label>
                <input id="retry-max" type="number" min="1" defaultValue="3" />
              </div>
              <label className="nc-check">
                <input type="checkbox" defaultChecked />
                <span>{t("newCampaign.fallbackTransfer")}</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

