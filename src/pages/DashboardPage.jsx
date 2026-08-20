import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Megaphone,
  PhoneCall,
  Users,
  CheckCircle2,
  ListFilter,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import { listCampaigns, getCampaign } from "../lib/campaigns";
import "./DashboardPage.css";

/* Semi-circle arc, left to right over the top (cx 50, cy 50, r 40) */
const GAUGE_ARC = "M 10 50 A 40 40 0 0 1 90 50";

// pending/calling/retry_scheduled collapse into one "still trying" segment;
// completed = succeeded + exhausted (see campaign_runs.py's run_progress_summary).
const OUTCOME_META = [
  { key: "succeeded", labelKey: "dashboard.outcomeSucceeded", cls: "is-success" },
  { key: "inProgress", labelKey: "dashboard.outcomeInProgress", cls: "is-warning" },
  { key: "exhausted", labelKey: "dashboard.outcomeExhausted", cls: "is-danger" },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const [campaigns, setCampaigns] = useState([]);
  // campaignId -> the "progress" object GET /campaigns/{id} returns once a
  // campaign has been started at least once (absent for never-started ones).
  const [progressById, setProgressById] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const list = await listCampaigns();
      setCampaigns(list);
      // Progress only lives on the detail endpoint - one failed detail fetch
      // just leaves that campaign without progress, not the whole dashboard.
      const results = await Promise.allSettled(
        list.map((c) => getCampaign(c.id)),
      );
      const next = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.progress) {
          next[list[i].id] = r.value.progress;
        }
      });
      setProgressById(next);
    } catch (err) {
      setLoadError(err?.message || t("dashboard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCampaigns = useMemo(
    () =>
      campaignFilter === "all"
        ? campaigns
        : campaigns.filter((c) => c.id === campaignFilter),
    [campaigns, campaignFilter],
  );

  // Real aggregate dialling progress across the (optionally filtered) campaigns.
  const totals = useMemo(() => {
    const acc = { total: 0, succeeded: 0, exhausted: 0, inProgress: 0 };
    for (const c of filteredCampaigns) {
      const p = progressById[c.id];
      if (!p) continue;
      acc.total += p.total ?? 0;
      acc.succeeded += p.succeeded ?? 0;
      acc.exhausted += p.exhausted ?? 0;
      acc.inProgress +=
        (p.pending ?? 0) + (p.calling ?? 0) + (p.retry_scheduled ?? 0);
    }
    return acc;
  }, [filteredCampaigns, progressById]);

  const stats = useMemo(
    () => [
      {
        key: "total",
        label: t("dashboard.statCampaignsTotal"),
        value: nf.format(campaigns.length),
        icon: Megaphone,
      },
      {
        key: "active",
        label: t("dashboard.statCampaignsActive"),
        value: nf.format(
          campaigns.filter((c) => c.status === "in_progress").length,
        ),
        icon: PhoneCall,
      },
      {
        key: "recipients",
        label: t("dashboard.statRecipients"),
        value: nf.format(totals.total),
        icon: Users,
      },
      {
        key: "succeeded",
        label: t("dashboard.statSucceeded"),
        value: nf.format(totals.succeeded),
        icon: CheckCircle2,
      },
    ],
    [campaigns, totals, nf, t],
  );

  // Each segment carries the cumulative percentage before it, used as the arc offset.
  const outcomeSegments = useMemo(() => {
    const values = {
      succeeded: totals.succeeded,
      inProgress: totals.inProgress,
      exhausted: totals.exhausted,
    };
    let offset = 0;
    return OUTCOME_META.map((o) => {
      const value = values[o.key];
      const pct = totals.total ? (value / totals.total) * 100 : 0;
      const segment = { ...o, value, pct, offset };
      offset += pct;
      return segment;
    });
  }, [totals]);

  // Real per-campaign rows, biggest runs first; never-started campaigns sort last.
  const campaignRows = useMemo(
    () =>
      filteredCampaigns
        .map((c) => {
          const p = progressById[c.id] ?? null;
          const total = p?.total ?? 0;
          const completed = p?.completed ?? 0;
          const succeeded = p?.succeeded ?? 0;
          return {
            id: c.id,
            name: c.name,
            total,
            share: total ? Math.round((completed / total) * 100) : 0,
            rate: total ? Math.round((succeeded / total) * 100) : null,
          };
        })
        .sort((a, b) => b.total - a.total),
    [filteredCampaigns, progressById],
  );

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__heading">
          <h1 className="dashboard__title">{t("dashboard.title")}</h1>
          <p className="dashboard__sub">{t("dashboard.subtitle")}</p>
        </div>

        <div className="dashboard__header-actions">
          <label className="campaign-select">
            <ListFilter size={14} />
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              aria-label={t("dashboard.campaignSelectAria")}
            >
              <option value="all">{t("dashboard.allCampaigns")}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate("/campaigns/new")}
          >
            <Plus size={18} />
            {t("dashboard.newCampaignCta")}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="dashboard__empty">
          <Loader2 className="spin" size={18} />
          {t("dashboard.loading")}
        </p>
      ) : loadError ? (
        <p className="dashboard__empty dashboard__empty--error">
          {loadError}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={load}
          >
            <RotateCcw size={14} />
            {t("dashboard.retry")}
          </button>
        </p>
      ) : campaigns.length === 0 ? (
        <p className="dashboard__empty">{t("dashboard.empty")}</p>
      ) : (
        <>
          <div className="dashboard__overview">
            <section className="dashboard__stats">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <article key={s.key} className="panel stat-card">
                    <span className="stat-card__icon">
                      <Icon size={20} />
                    </span>
                    <p className="stat-card__label">{s.label}</p>
                    <p className="stat-card__value">{s.value}</p>
                  </article>
                );
              })}
            </section>

            <section className="panel dashboard__outcomes">
              <div className="dashboard__panel-head">
                <h2 className="dashboard__panel-title">
                  {t("dashboard.outcomesTitle")}
                </h2>
              </div>
              <div className="outcomes">
                <div className="outcomes__chart">
                  <svg
                    className="gauge"
                    viewBox="0 0 100 56"
                    role="img"
                    aria-label={t("dashboard.outcomesGaugeAria")}
                  >
                    <path className="gauge__track" d={GAUGE_ARC} pathLength="100" />
                    {outcomeSegments.map((s) => (
                      <path
                        key={s.key}
                        className={`gauge__seg ${s.cls}`}
                        d={GAUGE_ARC}
                        pathLength="100"
                        strokeDasharray={`${s.pct} 100`}
                        strokeDashoffset={-s.offset}
                      />
                    ))}
                  </svg>
                  <div className="outcomes__total">
                    <span className="outcomes__total-value">
                      {nf.format(totals.total)}
                    </span>
                    <span className="outcomes__total-label">
                      {t("dashboard.totalRecipientsLabel")}
                    </span>
                  </div>
                </div>

                <ul className="outcomes__legend">
                  {outcomeSegments.map((s) => (
                    <li key={s.key} className="outcomes__item">
                      <span className={`outcomes__dot ${s.cls}`} />
                      <span className="outcomes__label">{t(s.labelKey)}</span>
                      <span className="outcomes__value">
                        {nf.format(s.value)}
                        <span className="outcomes__pct">
                          {Math.round(s.pct)}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <section className="panel dashboard__campaigns">
            <div className="dashboard__panel-head">
              <h2 className="dashboard__panel-title">
                {t("dashboard.campaignsPerfTitle")}
              </h2>
              <span className="tag tag--muted">
                {t("dashboard.byRecipientsTag")}
              </span>
            </div>
            <ul className="camp-list">
              {campaignRows.map((c) => (
                <li
                  key={c.id}
                  className={`camp-row ${
                    campaignFilter === c.id ? "is-selected" : ""
                  }`}
                >
                  <div className="camp-row__top">
                    <span className="camp-row__name">{c.name}</span>
                    <span className="camp-row__calls">
                      {nf.format(c.total)} {t("dashboard.recipientsSuffix")}
                    </span>
                  </div>
                  <div className="camp-row__track">
                    <div
                      className="camp-row__fill"
                      style={{ width: `${c.share}%` }}
                    />
                  </div>
                  <div className="camp-row__meta">
                    <span>
                      {t("dashboard.completionLabel", { share: c.share })}
                    </span>
                    <span className="camp-row__rate">
                      {c.rate === null
                        ? t("dashboard.notStartedDialing")
                        : t("dashboard.successRate", { rate: c.rate })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
