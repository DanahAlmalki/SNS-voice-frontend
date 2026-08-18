import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Clock, RotateCcw, Loader2 } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import { listCampaigns } from "../lib/campaigns";
import { OBJECTIVES, objectiveTitle } from "../lib/objectives";
import "./CampaignsPage.css";

const STATUS = {
  completed: { labelKey: "campaignsPage.statusCompleted", cls: "badge--completed" },
  in_progress: { labelKey: "campaignsPage.statusInProgress", cls: "badge--progress" },
  not_started: { labelKey: "campaignsPage.statusNotStarted", cls: "badge--pending" },
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : "ar-EG";

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [objective, setObjective] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listCampaigns()
      .then(setCampaigns)
      .catch((err) => setLoadError(err.message || t("campaignsPage.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  // "other"/unrecognized ids fall back to a generic label instead of a blank tag.
  const objectiveLabel = useCallback(
    (id) => {
      const found = OBJECTIVES.find((o) => o.id === id);
      return found ? objectiveTitle(found, lang) : t("campaignsPage.objectiveOther");
    },
    [lang, t],
  );

  const objectives = useMemo(
    () => [...new Set(campaigns.map((c) => c.objective))],
    [campaigns],
  );

  const filtered = useMemo(
    () =>
      campaigns.filter((c) => {
        const matchesQuery = (c.name ?? "")
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesStatus = status === "all" || c.status === status;
        const matchesObjective = objective === "all" || c.objective === objective;
        return matchesQuery && matchesStatus && matchesObjective;
      }),
    [campaigns, query, status, objective],
  );

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setObjective("all");
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
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            <option value="all">{t("campaignsPage.allTemplates")}</option>
            {objectives.map((id) => (
              <option key={id} value={id}>
                {objectiveLabel(id)}
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
        {loading ? (
          <p className="campaigns__empty">
            <Loader2 className="spin" size={18} />
            {t("campaignsPage.loading")}
          </p>
        ) : loadError ? (
          <div className="campaigns__empty campaigns__empty--error">
            <p>{loadError}</p>
            <button className="btn btn--ghost btn--sm" onClick={load}>
              <RotateCcw size={14} />
              {t("campaignsPage.retry")}
            </button>
          </div>
        ) : (
          <>
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
                {filtered.map((c) => {
                  const s = STATUS[c.status] ?? STATUS.not_started;
                  const when = c.scheduled_at ?? c.created_at;
                  return (
                    <tr key={c.id}>
                      <td className="campaigns__name">{c.name}</td>
                      <td>
                        <span className="tag tag--muted">
                          {objectiveLabel(c.objective)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.cls}`}>{t(s.labelKey)}</span>
                      </td>
                      <td>
                        <span className="campaigns__cell">
                          <Users size={14} />
                          {(c.audience_count ?? 0).toLocaleString(locale)}
                        </span>
                      </td>
                      <td>
                        <span className="campaigns__cell">
                          <Clock size={14} />
                          {when ? dateFmt.format(new Date(when)) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="campaigns__empty">{t("campaignsPage.empty")}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}


