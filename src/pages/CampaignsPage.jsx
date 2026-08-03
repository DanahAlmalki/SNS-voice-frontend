import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Clock, RotateCcw } from "lucide-react";
import "./CampaignsPage.css";

const STATUS = {
  completed: { label: "مكتملة", cls: "badge--completed" },
  in_progress: { label: "قيد التنفيذ", cls: "badge--progress" },
  not_started: { label: "لم تبدأ", cls: "badge--pending" },
};

const DEMO_CAMPAIGNS = [
  {
    id: 1,
    name: "حملة حجز المواعيد - الربع الثالث",
    template: "حجز موعد",
    status: "in_progress",
    audience: 1240,
    scheduled: "٢ أغسطس ٢٠٢٦",
  },
  {
    id: 2,
    name: "تأهيل العملاء المحتملين",
    template: "تأهيل عميل",
    status: "completed",
    audience: 860,
    scheduled: "٢٨ يوليو ٢٠٢٦",
  },
  {
    id: 3,
    name: "متابعة الطلبات - العملاء الجدد",
    template: "متابعة",
    status: "not_started",
    audience: 430,
    scheduled: "١٠ أغسطس ٢٠٢٦",
  },
  {
    id: 4,
    name: "استطلاع رضا العملاء",
    template: "استطلاع",
    status: "in_progress",
    audience: 2100,
    scheduled: "١ أغسطس ٢٠٢٦",
  },
];

export default function CampaignsPage() {
  const navigate = useNavigate();
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
        const matchesQuery = c.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesStatus = status === "all" || c.status === status;
        const matchesTemplate = template === "all" || c.template === template;
        return matchesQuery && matchesStatus && matchesTemplate;
      }),
    [campaigns, query, status, template],
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
          <h1 className="campaigns__title">الحملات</h1>
          <p className="campaigns__sub">
            إدارة ومتابعة حملات المكالمات الصادرة.
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/campaigns/new")}
        >
          <Plus size={18} />
          حملة جديدة
        </button>
      </header>

      <section className="panel campaigns__filters">
        <div className="filter-field filter-field--grow">
          <label className="filter-label" htmlFor="campaign-search">
            بحث
          </label>
          <div className="filter-search">
            <Search size={16} className="filter-search__icon" />
            <input
              id="campaign-search"
              type="search"
              placeholder="ابحث باسم الحملة…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-field">
          <label className="filter-label" htmlFor="campaign-status">
            الحالة
          </label>
          <select
            id="campaign-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="not_started">لم تبدأ</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
          </select>
        </div>

        <div className="filter-field">
          <label className="filter-label" htmlFor="campaign-template">
            القالب
          </label>
          <select
            id="campaign-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="all">كل القوالب</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn--ghost" onClick={resetFilters}>
          <RotateCcw size={16} />
          إعادة تعيين
        </button>
      </section>

      <section className="panel campaigns__table-panel">
        <table className="campaigns__table">
          <thead>
            <tr>
              <th>اسم الحملة</th>
              <th>القالب</th>
              <th>الحالة</th>
              <th>الجمهور</th>
              <th>موعد الجدولة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="campaigns__name">{c.name}</td>
                <td>
                  <span className="tag tag--muted">{c.template}</span>
                </td>
                <td>
                  <span className={`badge ${STATUS[c.status].cls}`}>
                    {STATUS[c.status].label}
                  </span>
                </td>
                <td>
                  <span className="campaigns__cell">
                    <Users size={14} />
                    {c.audience.toLocaleString("ar-EG")}
                  </span>
                </td>
                <td>
                  <span className="campaigns__cell">
                    <Clock size={14} />
                    {c.scheduled}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="campaigns__empty">لا توجد حملات مطابقة للبحث.</p>
        )}
      </section>
    </div>
  );
}
