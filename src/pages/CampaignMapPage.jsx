import { useMemo, useState } from "react";
import { LayoutTemplate, Users, Megaphone } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import "./CampaignMapPage.css";

/* ---------- Demo data ---------- */
const TEMPLATES = [
  { id: "t1", name: "حجز المواعيد", nameEn: "Appointment Booking" },
  { id: "t2", name: "تأهيل العملاء", nameEn: "Lead Qualification" },
  { id: "t3", name: "متابعة الطلبات", nameEn: "Order Follow-up" },
];

const AUDIENCES = [
  { id: "a1", name: "عملاء الرياض ٢٠٢٦", nameEn: "Riyadh Customers 2026", size: 1240 },
  { id: "a2", name: "قائمة المهتمين", nameEn: "Interested Leads List", size: 860 },
  { id: "a3", name: "العملاء الجدد", nameEn: "New Customers", size: 430 },
  { id: "a4", name: "قاعدة العملاء الكاملة", nameEn: "Full Customer Base", size: 2100 },
];

const CAMPAIGNS = [
  {
    id: "c1",
    name: "حجز المواعيد - الربع الثالث",
    nameEn: "Appointment Booking - Q3",
    template: "t1",
    audience: "a1",
    status: "in_progress",
  },
  {
    id: "c2",
    name: "تأهيل العملاء المحتملين",
    nameEn: "Lead Qualification",
    template: "t2",
    audience: "a2",
    status: "completed",
  },
  {
    id: "c3",
    name: "متابعة العملاء الجدد",
    nameEn: "New Customer Follow-up",
    template: "t3",
    audience: "a3",
    status: "not_started",
  },
  {
    id: "c4",
    name: "استطلاع رضا العملاء",
    nameEn: "Customer Satisfaction Survey",
    template: "t3",
    audience: "a4",
    status: "in_progress",
  },
  {
    id: "c5",
    name: "إعادة استهداف المهتمين",
    nameEn: "Re-targeting Interested Leads",
    template: "t1",
    audience: "a2",
    status: "not_started",
  },
];

const STATUS = {
  completed: { labelKey: "campaignMap.statusCompleted", cls: "cmap-badge--completed" },
  in_progress: { labelKey: "campaignMap.statusInProgress", cls: "cmap-badge--progress" },
  not_started: { labelKey: "campaignMap.statusNotStarted", cls: "cmap-badge--pending" },
};

/* ---------- Layout constants (LTR canvas coordinates) ---------- */
const NODE_W = 240;
const NODE_H = 76;
const V_GAP = 30;
const H_GAP = 110;
const PAD_X = 32;
const PAD_TOP = 56;
const PAD_BOTTOM = 32;

const COL_X = [PAD_X, PAD_X + NODE_W + H_GAP, PAD_X + 2 * (NODE_W + H_GAP)];

function layoutColumn(items, colIndex, canvasH) {
  const colH = items.length * (NODE_H + V_GAP) - V_GAP;
  const top = PAD_TOP + (canvasH - PAD_TOP - PAD_BOTTOM - colH) / 2;
  return items.map((item, i) => ({
    ...item,
    x: COL_X[colIndex],
    y: top + i * (NODE_H + V_GAP),
  }));
}

function edgePath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export default function CampaignMapPage() {
  const [hovered, setHovered] = useState(null);
  const { t, lang, dir } = useLanguage();
  const isEn = lang === "en";

  const { nodes, edges, canvasW, canvasH } = useMemo(() => {
    const rows = Math.max(TEMPLATES.length, CAMPAIGNS.length, AUDIENCES.length);
    const canvasH = PAD_TOP + PAD_BOTTOM + rows * (NODE_H + V_GAP) - V_GAP;
    const canvasW = COL_X[2] + NODE_W + PAD_X;

    const templates = layoutColumn(TEMPLATES, 0, canvasH);
    const campaigns = layoutColumn(CAMPAIGNS, 1, canvasH);
    const audiences = layoutColumn(AUDIENCES, 2, canvasH);

    const byId = {};
    [...templates, ...campaigns, ...audiences].forEach((n) => (byId[n.id] = n));

    const edges = [];
    campaigns.forEach((c) => {
      const t = byId[c.template];
      const a = byId[c.audience];
      if (t) {
        edges.push({
          id: `${t.id}-${c.id}`,
          from: t.id,
          to: c.id,
          type: "template",
          d: edgePath(t.x + NODE_W, t.y + NODE_H / 2, c.x, c.y + NODE_H / 2),
        });
      }
      if (a) {
        edges.push({
          id: `${c.id}-${a.id}`,
          from: c.id,
          to: a.id,
          type: "audience",
          d: edgePath(c.x + NODE_W, c.y + NODE_H / 2, a.x, a.y + NODE_H / 2),
        });
      }
    });

    return {
      nodes: { templates, campaigns, audiences },
      edges,
      canvasW,
      canvasH,
    };
  }, []);

  const connected = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    edges.forEach((e) => {
      if (e.from === hovered) set.add(e.to);
      if (e.to === hovered) set.add(e.from);
    });
    return set;
  }, [hovered, edges]);

  const isDim = (id) => connected && !connected.has(id);
  const edgeActive = (e) => hovered && (e.from === hovered || e.to === hovered);

  const templateUsage = (id) =>
    CAMPAIGNS.filter((c) => c.template === id).length;
  const audienceUsage = (id) =>
    CAMPAIGNS.filter((c) => c.audience === id).length;

  return (
    <div className="cmap">
      <header className="cmap__header">
        <div className="cmap__heading">
          <h1 className="cmap__title">{t("campaignMap.title")}</h1>
        </div>
        <ul className="cmap__legend">
          <li>
            <span className="cmap__dot cmap__dot--template" />
            {t("campaignMap.legendTemplates")}
          </li>
          <li>
            <span className="cmap__dot cmap__dot--campaign" />
            {t("campaignMap.legendCampaigns")}
          </li>
          <li>
            <span className="cmap__dot cmap__dot--audience" />
            {t("campaignMap.legendAudiences")}
          </li>
        </ul>
      </header>

      <section className="panel cmap__canvas-wrap">
        <div
          className="cmap__canvas"
          dir="ltr"
          style={{ width: canvasW, height: canvasH }}
        >
          <div
            className="cmap__col-label"
            style={{ left: COL_X[0], width: NODE_W }}
          >
            {t("campaignMap.legendTemplates")}
          </div>
          <div
            className="cmap__col-label"
            style={{ left: COL_X[1], width: NODE_W }}
          >
            {t("campaignMap.legendCampaigns")}
          </div>
          <div
            className="cmap__col-label"
            style={{ left: COL_X[2], width: NODE_W }}
          >
            {t("campaignMap.legendAudiences")}
          </div>

          <svg className="cmap__edges" width={canvasW} height={canvasH}>
            {edges.map((e) => (
              <path
                key={e.id}
                d={e.d}
                className={`cmap__edge cmap__edge--${e.type} ${
                  edgeActive(e) ? "is-active" : ""
                } ${hovered && !edgeActive(e) ? "is-dim" : ""}`}
              />
            ))}
          </svg>

          {nodes.templates.map((n) => (
            <MapNode
              key={n.id}
              node={n}
              type="template"
              icon={LayoutTemplate}
              meta={`${templateUsage(n.id)} ${t("campaignMap.campaignsSuffix")}`}
              dim={isDim(n.id)}
              lang={lang}
              dir={dir}
              onEnter={() => setHovered(n.id)}
              onLeave={() => setHovered(null)}
            />
          ))}

          {nodes.campaigns.map((n) => (
            <MapNode
              key={n.id}
              node={n}
              type="campaign"
              icon={Megaphone}
              badge={{ label: t(STATUS[n.status].labelKey), cls: STATUS[n.status].cls }}
              dim={isDim(n.id)}
              lang={lang}
              dir={dir}
              onEnter={() => setHovered(n.id)}
              onLeave={() => setHovered(null)}
            />
          ))}

          {nodes.audiences.map((n) => (
            <MapNode
              key={n.id}
              node={n}
              type="audience"
              icon={Users}
              meta={`${n.size.toLocaleString(isEn ? "en-US" : "ar-EG")} ${t(
                "campaignMap.contactsWord",
              )} · ${audienceUsage(n.id)} ${t("campaignMap.campaignsSuffix")}`}
              dim={isDim(n.id)}
              lang={lang}
              dir={dir}
              onEnter={() => setHovered(n.id)}
              onLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MapNode({
  node,
  type,
  icon: Icon,
  meta,
  badge,
  dim,
  lang,
  dir,
  onEnter,
  onLeave,
}) {
  return (
    <div
      className={`cmap-node cmap-node--${type} ${dim ? "is-dim" : ""}`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span className="cmap-node__icon">
        <Icon size={18} />
      </span>
      <div className="cmap-node__body" dir={dir}>
        <span className="cmap-node__name">
          {lang === "en" && node.nameEn ? node.nameEn : node.name}
        </span>
        {badge ? (
          <span className={`cmap-badge ${badge.cls}`}>{badge.label}</span>
        ) : (
          <span className="cmap-node__meta">{meta}</span>
        )}
      </div>
    </div>
  );
}
