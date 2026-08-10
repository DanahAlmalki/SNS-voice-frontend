import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PhoneCall,
  PhoneOutgoing,
  Timer,
  TrendingUp,
  TrendingDown,
  Megaphone,
  CalendarDays,
  ListFilter,
} from "lucide-react";
import "./DashboardPage.css";

const nf = new Intl.NumberFormat("ar-EG");
const money = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dayMonthFmt = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "numeric",
});
const fullDateFmt = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const CAMPAIGNS = [
  { name: "حملة حجز المواعيد - الربع الثالث", weight: 0.34, baseRate: 78 },
  { name: "استطلاع رضا العملاء", weight: 0.28, baseRate: 71 },
  { name: "تأهيل العملاء المحتملين", weight: 0.22, baseRate: 66 },
  { name: "متابعة الطلبات - العملاء الجدد", weight: 0.16, baseRate: 59 },
];

const OUTCOME_META = [
  { key: "success", label: "مكتملة بنجاح", cls: "is-success" },
  { key: "no_answer", label: "بدون رد", cls: "is-warning" },
  { key: "failed", label: "فاشلة", cls: "is-danger" },
];

const BALANCE = { amount: 12450.75, currency: "ر.س", minutes: 8320 };

/* Semi-circle arc, left to right over the top (cx 50, cy 50, r 40) */
const GAUGE_ARC = "M 10 50 A 40 40 0 0 1 90 50";

const PRESETS = [
  { key: "today", label: "اليوم", days: 1 },
  { key: "7d", label: "آخر 7 أيام", days: 7 },
  { key: "30d", label: "آخر 30 يوم", days: 30 },
];

const MS_DAY = 86400000;
const HISTORY_DAYS = 180;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toISO(d) {
  const x = startOfDay(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

// Deterministic pseudo-random in [0,1) from an integer seed.
function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Build one synthetic record per day for the last HISTORY_DAYS days.
function buildDailyData(today) {
  const days = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = startOfDay(new Date(today.getTime() - i * MS_DAY));
    const isWeekend = date.getDay() === 5; // Friday lighter in this locale
    const seasonal = 1 + 0.18 * Math.sin(i / 7);
    const noise = 0.75 + rand(i) * 0.5;
    const base = isWeekend ? 520 : 1350;
    const dayCalls = Math.round(base * seasonal * noise);

    const campaigns = CAMPAIGNS.map((c, ci) => {
      const calls = Math.round(
        dayCalls * c.weight * (0.85 + rand(i + ci) * 0.3),
      );
      const successRate =
        Math.min(
          95,
          Math.max(40, c.baseRate + (rand(i + ci + 50) - 0.5) * 12),
        ) / 100;
      const noAnswerRate = 0.16 + rand(i + ci + 200) * 0.08;
      const success = Math.round(calls * successRate);
      const no_answer = Math.round(calls * noAnswerRate);
      const failed = Math.max(0, calls - success - no_answer);
      const connected = calls - no_answer;
      const durationSeconds = 110 + Math.round(rand(i + ci + 400) * 60);
      return {
        name: c.name,
        calls,
        connected,
        durationSeconds,
        outcomes: { success, no_answer, failed },
      };
    });

    days.push({ date, campaigns });
  }
  return days;
}

function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Aggregate daily records, optionally limited to a single campaign name.
function aggregate(days, campaignName = null) {
  const acc = {
    calls: 0,
    connected: 0,
    durationWeighted: 0,
    outcomes: { success: 0, no_answer: 0, failed: 0 },
    campaigns: {},
  };
  for (const d of days) {
    for (const c of d.campaigns) {
      if (campaignName && c.name !== campaignName) continue;
      acc.calls += c.calls;
      acc.connected += c.connected;
      acc.durationWeighted += c.durationSeconds * c.calls;
      for (const k of Object.keys(acc.outcomes)) {
        acc.outcomes[k] += c.outcomes[k];
      }
      const e = acc.campaigns[c.name] || { calls: 0, success: 0 };
      e.calls += c.calls;
      e.success += c.outcomes.success;
      acc.campaigns[c.name] = e;
    }
  }
  const successRate = acc.calls ? (acc.outcomes.success / acc.calls) * 100 : 0;
  const answerRate = acc.calls ? (acc.connected / acc.calls) * 100 : 0;
  const avgDuration = acc.calls ? acc.durationWeighted / acc.calls : 0;
  return { ...acc, successRate, answerRate, avgDuration };
}

function pctDelta(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

// Sum a day's calls, optionally limited to a single campaign.
function dayCallsFor(day, campaignName) {
  return day.campaigns.reduce(
    (s, c) => (!campaignName || c.name === campaignName ? s + c.calls : s),
    0,
  );
}

// Reduce a list of daily records to at most `maxBars` chart columns.
function buildChart(days, campaignName, maxBars = 12) {
  if (days.length <= maxBars) {
    return days.map((d) => ({
      label: dayMonthFmt.format(d.date),
      value: dayCallsFor(d, campaignName),
    }));
  }
  const bucketSize = Math.ceil(days.length / maxBars);
  const bars = [];
  for (let i = 0; i < days.length; i += bucketSize) {
    const slice = days.slice(i, i + bucketSize);
    bars.push({
      label: dayMonthFmt.format(slice[0].date),
      value: slice.reduce((s, d) => s + dayCallsFor(d, campaignName), 0),
    });
  }
  return bars;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const dailyData = useMemo(() => buildDailyData(today), [today]);

  const minISO = toISO(dailyData[0].date);
  const maxISO = toISO(today);

  const [preset, setPreset] = useState("7d");
  const [from, setFrom] = useState(
    toISO(new Date(today.getTime() - 6 * MS_DAY)),
  );
  const [to, setTo] = useState(maxISO);
  const [campaign, setCampaign] = useState("all");

  const campaignFilter = campaign === "all" ? null : campaign;

  // Resolve the active [start, end] range from preset or custom inputs.
  const range = useMemo(() => {
    if (preset === "custom") {
      const f = startOfDay(new Date(from));
      const t = startOfDay(new Date(to));
      return f <= t ? { start: f, end: t } : { start: t, end: f };
    }
    const days = PRESETS.find((p) => p.key === preset)?.days ?? 7;
    return {
      start: startOfDay(new Date(today.getTime() - (days - 1) * MS_DAY)),
      end: today,
    };
  }, [preset, from, to, today]);

  const selectedDays = useMemo(
    () => dailyData.filter((d) => d.date >= range.start && d.date <= range.end),
    [dailyData, range],
  );

  // Previous period of equal length, for delta comparison.
  const prevDays = useMemo(() => {
    const len = selectedDays.length;
    const prevEnd = new Date(range.start.getTime() - MS_DAY);
    const prevStart = new Date(prevEnd.getTime() - (len - 1) * MS_DAY);
    return dailyData.filter((d) => d.date >= prevStart && d.date <= prevEnd);
  }, [dailyData, range, selectedDays]);

  const current = useMemo(
    () => aggregate(selectedDays, campaignFilter),
    [selectedDays, campaignFilter],
  );
  const previous = useMemo(
    () => aggregate(prevDays, campaignFilter),
    [prevDays, campaignFilter],
  );

  const activeCount = (agg) =>
    Object.values(agg.campaigns).filter((e) => e.calls > 0).length;

  const stats = useMemo(
    () => [
      {
        key: "calls",
        label: "إجمالي المكالمات",
        value: nf.format(current.calls),
        delta: pctDelta(current.calls, previous.calls),
        icon: PhoneCall,
      },
      {
        key: "connected",
        label: "المكالمات المُتصلة",
        value: nf.format(current.connected),
        delta: pctDelta(current.connected, previous.connected),
        icon: PhoneOutgoing,
      },
      {
        key: "campaigns",
        label: "الحملات النشطة",
        value: nf.format(activeCount(current)),
        delta: pctDelta(activeCount(current), activeCount(previous)),
        icon: Megaphone,
      },
      {
        key: "duration",
        label: "متوسط مدة المكالمة",
        value: fmtDuration(current.avgDuration),
        delta: pctDelta(current.avgDuration, previous.avgDuration),
        icon: Timer,
      },
    ],
    [current, previous],
  );

  const spark = useMemo(
    () => buildChart(selectedDays, campaignFilter, 24),
    [selectedDays, campaignFilter],
  );

  // Normalise the series into a 0-100 viewBox so the SVG can stretch freely.
  const sparkPaths = useMemo(() => {
    const values = spark.map((d) => d.value);
    const min = Math.min(...values);
    const span = Math.max(1, Math.max(...values) - min);
    const stepX = values.length > 1 ? 100 / (values.length - 1) : 0;
    const points = values.map((v, i) => {
      const y = 96 - ((v - min) / span) * 88;
      return `${(i * stepX).toFixed(2)},${y.toFixed(2)}`;
    });
    const line = `M ${points.join(" L ")}`;
    return { line, area: `${line} L 100,100 L 0,100 Z` };
  }, [spark]);

  const totalOutcomes =
    current.outcomes.success +
    current.outcomes.no_answer +
    current.outcomes.failed;

  // Each segment carries the cumulative percentage before it, used as the arc offset.
  let outcomeOffset = 0;
  const outcomeSegments = OUTCOME_META.map((o) => {
    const value = current.outcomes[o.key];
    const pct = totalOutcomes ? (value / totalOutcomes) * 100 : 0;
    const segment = { ...o, value, pct, offset: outcomeOffset };
    outcomeOffset += pct;
    return segment;
  });

  // Per-campaign comparison across all campaigns in the selected range.
  const campaignStats = useMemo(() => {
    const agg = aggregate(selectedDays, null);
    return Object.entries(agg.campaigns)
      .map(([name, e]) => ({
        name,
        calls: e.calls,
        rate: e.calls ? Math.round((e.success / e.calls) * 100) : 0,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [selectedDays]);

  const totalCampaignCalls = Math.max(
    1,
    campaignStats.reduce((s, c) => s + c.calls, 0),
  );

  const rangeLabel = `${fullDateFmt.format(range.start)} — ${fullDateFmt.format(range.end)}`;

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero__aside">
          <div className="hero__balance">
            <p className="hero__balance-label">الرصيد المتاح</p>
            <p className="hero__balance-value">
              {money.format(BALANCE.amount)}
              <span className="hero__balance-currency">{BALANCE.currency}</span>
            </p>
            <p className="hero__balance-meta">
              {nf.format(BALANCE.minutes)} دقيقة متبقية
            </p>
          </div>

          <button
            type="button"
            className="hero__cta"
            onClick={() => navigate("/campaigns/new")}
          >
            <Megaphone size={16} />
            حملة جديدة
          </button>
        </div>

        <div className="hero__chart">
          <div className="hero__chart-head">
            <h2 className="hero__chart-title">المكالمات خلال الفترة</h2>
            <span className="hero__chart-total">
              {nf.format(current.calls)}
            </span>
          </div>
          <svg
            className="spark"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="مخطط المكالمات خلال الفترة المحددة"
          >
            <defs>
              <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ea2ff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8ea2ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="spark__area" d={sparkPaths.area} />
            <path className="spark__line" d={sparkPaths.line} />
          </svg>
          <div className="hero__chart-axis" dir="ltr">
            <span>{spark[0]?.label}</span>
            <span>{spark[spark.length - 1]?.label}</span>
          </div>
        </div>
      </section>

      <header className="dashboard__header">
        <div className="dashboard__heading">
          <div className="dashboard__range">
            <div className="dashboard__range-controls">
              <div className="range-toggle" role="tablist">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={preset === p.key}
                    className={`range-toggle__btn ${preset === p.key ? "is-active" : ""}`}
                    onClick={() => setPreset(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  role="tab"
                  aria-selected={preset === "custom"}
                  className={`range-toggle__btn ${preset === "custom" ? "is-active" : ""}`}
                  onClick={() => setPreset("custom")}
                >
                  <CalendarDays size={14} />
                  مخصص
                </button>
              </div>

              <label className="campaign-select">
                <ListFilter size={14} />
                <select
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  aria-label="اختيار الحملة"
                >
                  <option value="all">كل الحملات</option>
                  {CAMPAIGNS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {preset === "custom" ? (
              <div className="dashboard__range-custom">
                <label className="range-date">
                  <span>من</span>
                  <input
                    type="date"
                    value={from}
                    min={minISO}
                    max={to}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label className="range-date">
                  <span>إلى</span>
                  <input
                    type="date"
                    value={to}
                    min={from}
                    max={maxISO}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <span className="dashboard__range-label">{rangeLabel}</span>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard__overview">
        <section className="dashboard__stats">
          {stats.map((s) => {
            const Icon = s.icon;
            const up = s.delta >= 0;
            return (
              <article key={s.key} className="panel stat-card">
                <span className="stat-card__icon">
                  <Icon size={20} />
                </span>
                <p className="stat-card__label">{s.label}</p>
                <p className="stat-card__value">
                  {s.value}
                  {s.suffix && (
                    <span className="stat-card__suffix">{s.suffix}</span>
                  )}
                </p>
                <p
                  className={`stat-card__delta ${up ? "is-up" : "is-down"}`}
                  title="مقارنة بالفترة السابقة"
                >
                  {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(s.delta).toFixed(1)}%
                </p>
              </article>
            );
          })}
        </section>

        <section className="panel dashboard__outcomes">
          <div className="dashboard__panel-head">
            <h2 className="dashboard__panel-title">نتائج المكالمات</h2>
          </div>
          <div className="outcomes">
            <div className="outcomes__chart">
              <svg
                className="gauge"
                viewBox="0 0 100 56"
                role="img"
                aria-label="توزيع نتائج المكالمات"
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
                  {nf.format(totalOutcomes)}
                </span>
                <span className="outcomes__total-label">إجمالي المكالمات</span>
              </div>
            </div>

            <ul className="outcomes__legend">
              {outcomeSegments.map((s) => (
                <li key={s.key} className="outcomes__item">
                  <span className={`outcomes__dot ${s.cls}`} />
                  <span className="outcomes__label">{s.label}</span>
                  <span className="outcomes__value">
                    {nf.format(s.value)}
                    <span className="outcomes__pct">{Math.round(s.pct)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="panel dashboard__campaigns">
        <div className="dashboard__panel-head">
          <h2 className="dashboard__panel-title">أداء الحملات</h2>
          <span className="tag tag--muted">حسب عدد المكالمات</span>
        </div>
        <ul className="camp-list">
          {campaignStats.map((c) => {
            const share = Math.round((c.calls / totalCampaignCalls) * 100);
            return (
              <li
                key={c.name}
                className={`camp-row ${
                  campaignFilter === c.name ? "is-selected" : ""
                }`}
              >
                <div className="camp-row__top">
                  <span className="camp-row__name">{c.name}</span>
                  <span className="camp-row__calls">
                    {nf.format(c.calls)} مكالمة
                  </span>
                </div>
                <div className="camp-row__track">
                  <div
                    className="camp-row__fill"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <div className="camp-row__meta">
                  <span>{share}% من المكالمات</span>
                  <span className="camp-row__rate">نسبة النجاح {c.rate}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
