import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Users, Megaphone, Loader2, RotateCcw } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import { listCampaigns, getCampaign } from "../lib/campaigns";
import { getAudience } from "../lib/audiences";
import {
  findTemplate,
  lastCampaignTemplateId,
  describeTemplate,
} from "../lib/templates";
import "./CampaignMapPage.css";

const STATUS = {
  completed: { labelKey: "campaignMap.statusCompleted", cls: "cmap-badge--completed" },
  in_progress: { labelKey: "campaignMap.statusInProgress", cls: "cmap-badge--progress" },
  not_started: { labelKey: "campaignMap.statusNotStarted", cls: "cmap-badge--pending" },
  stopped: { labelKey: "campaignMap.statusStopped", cls: "cmap-badge--stopped" },
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
  const locale = isEn ? "en-US" : "ar-EG";

  const [campaigns, setCampaigns] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Neither a campaign's template nor its audience_id is on the list
  // endpoint's 7 fixed fields (templates are never sent to the backend at
  // all - see templates.js - and audience_id only comes back from the
  // per-campaign detail endpoint), so every campaign that has an audience
  // needs one extra GET before its audience's filename can be resolved.
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listCampaigns()
      .then(async (list) => {
        const withAudience = list.filter((c) => c.audience_count);
        const details = await Promise.allSettled(withAudience.map((c) => getCampaign(c.id)));

        const audienceIdByCampaign = {};
        const audienceSizeById = {};
        details.forEach((res, i) => {
          if (res.status !== "fulfilled" || !res.value.audience_id) return;
          const aid = res.value.audience_id;
          audienceIdByCampaign[withAudience[i].id] = aid;
          audienceSizeById[aid] = withAudience[i].audience_count ?? 0;
        });

        // Filenames are a nice-to-have on top of the id/size above, so a
        // failure here (e.g. a deleted audience file) just leaves it unnamed
        // instead of dropping the node.
        const audienceIds = Object.keys(audienceSizeById);
        const infos = await Promise.allSettled(audienceIds.map((aid) => getAudience(aid)));
        setAudiences(
          audienceIds.map((aid, i) => ({
            id: aid,
            size: audienceSizeById[aid],
            filename: infos[i].status === "fulfilled" ? infos[i].value.filename : null,
          })),
        );

        setCampaigns(
          list.map((c) => {
            const tid = lastCampaignTemplateId(c.id);
            return {
              ...c,
              audienceId: audienceIdByCampaign[c.id] ?? null,
              templateId: tid && findTemplate(tid) ? tid : null,
            };
          }),
        );
      })
      .catch((err) => setLoadError(err.message || t("campaignMap.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only templates at least one loaded campaign actually points to - an
  // unused saved template already has a home on the Templates page, and
  // showing it here would just be a dangling node with no edge to anything.
  const templates = useMemo(() => {
    const usedIds = [...new Set(campaigns.map((c) => c.templateId).filter(Boolean))];
    return usedIds.map((id) => ({ id, name: describeTemplate(findTemplate(id), lang).name }));
  }, [campaigns, lang]);

  const { nodes, edges, canvasW, canvasH } = useMemo(() => {
    const rows = Math.max(templates.length, campaigns.length, audiences.length);
    const canvasH = PAD_TOP + PAD_BOTTOM + rows * (NODE_H + V_GAP) - V_GAP;
    const canvasW = COL_X[2] + NODE_W + PAD_X;

    const templateNodes = layoutColumn(templates, 0, canvasH);
    const campaignNodes = layoutColumn(campaigns, 1, canvasH);
    const audienceNodes = layoutColumn(audiences, 2, canvasH);

    const byId = {};
    [...templateNodes, ...campaignNodes, ...audienceNodes].forEach((n) => (byId[n.id] = n));

    const edges = [];
    campaignNodes.forEach((c) => {
      const tpl = byId[c.templateId];
      const aud = byId[c.audienceId];
      if (tpl) {
        edges.push({
          id: `${tpl.id}-${c.id}`,
          from: tpl.id,
          to: c.id,
          type: "template",
          d: edgePath(tpl.x + NODE_W, tpl.y + NODE_H / 2, c.x, c.y + NODE_H / 2),
        });
      }
      if (aud) {
        edges.push({
          id: `${c.id}-${aud.id}`,
          from: c.id,
          to: aud.id,
          type: "audience",
          d: edgePath(c.x + NODE_W, c.y + NODE_H / 2, aud.x, aud.y + NODE_H / 2),
        });
      }
    });

    return {
      nodes: { templates: templateNodes, campaigns: campaignNodes, audiences: audienceNodes },
      edges,
      canvasW,
      canvasH,
    };
  }, [templates, campaigns, audiences]);

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

  const templateUsage = (id) => campaigns.filter((c) => c.templateId === id).length;
  const audienceUsage = (id) => campaigns.filter((c) => c.audienceId === id).length;

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

      {loading ? (
        <p className="cmap__empty">
          <Loader2 className="spin" size={18} />
          {t("campaignMap.loading")}
        </p>
      ) : loadError ? (
        <div className="cmap__empty cmap__empty--error">
          <p>{loadError}</p>
          <button className="btn btn--ghost btn--sm" onClick={load}>
            <RotateCcw size={14} />
            {t("campaignMap.retry")}
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <p className="cmap__empty">{t("campaignMap.empty")}</p>
      ) : (
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

            {nodes.campaigns.map((n) => {
              const status = STATUS[n.status] ?? STATUS.not_started;
              return (
                <MapNode
                  key={n.id}
                  node={n}
                  type="campaign"
                  icon={Megaphone}
                  badge={{ label: t(status.labelKey), cls: status.cls }}
                  dim={isDim(n.id)}
                  lang={lang}
                  dir={dir}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                />
              );
            })}

            {nodes.audiences.map((n) => (
              <MapNode
                key={n.id}
                node={{ ...n, name: n.filename || t("campaignMap.audienceFallbackName") }}
                type="audience"
                icon={Users}
                meta={`${n.size.toLocaleString(locale)} ${t(
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
      )}
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
