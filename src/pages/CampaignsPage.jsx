import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Clock, RotateCcw } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import "./CampaignsPage.css";

const STATUS = {
  completed: { labelAr: "مكتملة", labelEn: "Completed", cls: "badge--completed" },
  in_progress: { labelAr: "قيد التنفيذ", labelEn: "In progress", cls: "badge--progress" },
  not_started: { labelAr: "لم تبدأ", labelEn: "Not started", cls: "badge--pending" },
};

const DEMO_CAMPAIGNS = [
  {
    id: 1,
    name: "حملة حجز المواعيد - الربع الثالث",
    nameEn: "Appointment Booking Campaign - Q3",
    template: "حجز موعد",
    templateEn: "Book appointment",
    status: "in_progress",
    audience: 1240,
    scheduled: "٢ أغسطس ٢٠٢٦",
    scheduledEn: "Aug 2, 2026",
  },
  {
    id: 2,
    name: "تأهيل العملاء المحتملين",
    nameEn: "Lead Qualification",
    template: "تأهيل عميل",
    templateEn: "Qualify lead",
    status: "completed",
    audience: 860,
    scheduled: "٢٨ يوليو ٢٠٢٦",
    scheduledEn: "Jul 28, 2026",
  },
  {
    id: 3,
    name: "متابعة الطلبات - العملاء الجدد",
    nameEn: "Order Follow-up - New Customers",
    template: "متابعة",
    templateEn: "Follow-up",
    status: "not_started",
    audience: 430,
    scheduled: "١٠ أغسطس ٢٠٢٦",
    scheduledEn: "Aug 10, 2026",
  },
  {
    id: 4,
    name: "استطلاع رضا العملاء",
    nameEn: "Customer Satisfaction Survey",
    template: "استطلاع",
    templateEn: "Survey",
    status: "in_progress",
    audience: 2100,
    scheduled: "١ أغسطس ٢٠٢٦",
    scheduledEn: "Aug 1, 2026",
  },
];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isEn = lang === "en";
  const [campaigns] = useState(DEMO_CAMPAIGNS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [template, setTemplate] = useState("all");

  const templates = useMemo(
    () => [...new Set(campaigns.map((c) => c.template))],
    [campaigns],
  );

  const filtered = useMemo(
    () =>
      campaigns.filter((c) => {
        const name = isEn ? c.nameEn : c.name;
        const matchesQuery = name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesStatus = status === "all" || c.status === status;
        const matchesTemplate = template === "all" || c.template === template;
        return matchesQuery && matchesStatus && matchesTemplate;
      }),
    [campaigns, query, status, template, isEn],
  );

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setTemplate("all");
  };

  return (
    <div className="campaigns">
      <header className="campaigns__header">
        <div className="campaigns__heading">
          <h1 className="campaigns__title">{t("campaignsPage.title")}</h1>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/campaigns/new")}
        >
          <Plus size={18} />
          {t("campaignsPage.newCampaign")}
        </button>
      </header>

      <section className="campaigns__filters">
        <div className="filter-field filter-field--grow">
          <div className="filter-search">
            <Search size={16} className="filter-search__icon" />
            <input
              id="campaign-search"
              type="search"
              placeholder={t("campaignsPage.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-field">
          <select
            id="campaign-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{t("campaignsPage.allStatuses")}</option>
            <option value="not_started">
              {t("campaignsPage.statusNotStarted")}
            </option>
            <option value="in_progress">
              {t("campaignsPage.statusInProgress")}
            </option>
            <option value="completed">{t("campaignsPage.statusCompleted")}</option>
          </select>
        </div>

        <div className="filter-field">
          <select
            id="campaign-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="all">{t("campaignsPage.allTemplates")}</option>
            {templates.map((tplName) => (
              <option key={tplName} value={tplName}>
                {tplName}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn--ghost" onClick={resetFilters}>
          <RotateCcw size={16} />
          {t("campaignsPage.resetFilters")}
        </button>
      </section>

      <section className="panel campaigns__table-panel">
        <table className="campaigns__table">
          <thead>
            <tr>
              <th>{t("campaignsPage.colName")}</th>
              <th>{t("campaignsPage.colTemplate")}</th>
              <th>{t("campaignsPage.colStatus")}</th>
              <th>{t("campaignsPage.colAudience")}</th>
              <th>{t("campaignsPage.colScheduled")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="campaigns__name">{isEn ? c.nameEn : c.name}</td>
                <td>
                  <span className="tag tag--muted">
                    {isEn ? c.templateEn : c.template}
                  </span>
                </td>
                <td>
                  <span className={`badge ${STATUS[c.status].cls}`}>
                    {isEn ? STATUS[c.status].labelEn : STATUS[c.status].labelAr}
                  </span>
                </td>
                <td>
                  <span className="campaigns__cell">
                    <Users size={14} />
                    {c.audience.toLocaleString(isEn ? "en-US" : "ar-EG")}
                  </span>
                </td>
                <td>
                  <span className="campaigns__cell">
                    <Clock size={14} />
                    {isEn ? c.scheduledEn : c.scheduled}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="campaigns__empty">{t("campaignsPage.empty")}</p>
        )}
      </section>
    </div>
  );
}

