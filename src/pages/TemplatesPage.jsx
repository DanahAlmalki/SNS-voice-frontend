import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  AudioLines,
  Clock,
  Search,
  RotateCcw,
} from "lucide-react";
import { listTemplates, describeTemplate, deleteTemplate } from "../lib/templates";
import { useLanguage } from "../lib/i18n.jsx";
import "./TemplatesPage.css";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [templates, setTemplates] = useState(() => listTemplates());
  const [query, setQuery] = useState("");
  const [objective, setObjective] = useState("all");
  const [voice, setVoice] = useState("all");

  const described = useMemo(
    () => templates.map((record) => describeTemplate(record, lang)),
    [templates, lang],
  );

  const objectives = useMemo(
    () => [...new Set(described.map((tpl) => tpl.objective))],
    [described],
  );
  const voices = useMemo(
    () => [...new Set(described.map((tpl) => tpl.voice))],
    [described],
  );

  const filtered = useMemo(
    () =>
      described.filter((tpl) => {
        const matchesQuery = tpl.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesObjective =
          objective === "all" || tpl.objective === objective;
        const matchesVoice = voice === "all" || tpl.voice === voice;
        return matchesQuery && matchesObjective && matchesVoice;
      }),
    [described, query, objective, voice],
  );

  const resetFilters = () => {
    setQuery("");
    setObjective("all");
    setVoice("all");
  };

  const handleDelete = (tpl) => {
    if (!window.confirm(t("templatesPage.confirmDelete", { name: tpl.name })))
      return;
    deleteTemplate(tpl.id);
    setTemplates((list) => list.filter((x) => x.id !== tpl.id));
  };

  return (
    <div className="templates">
      <header className="templates__header">
        <div className="templates__heading">
          <h1 className="templates__title">{t("templatesPage.title")}</h1>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/templates/new")}
        >
          <Plus size={18} />
          {t("templatesPage.newTemplate")}
        </button>
      </header>

      <section className="templates__filters">
        <div className="filter-field filter-field--grow">
          <div className="filter-search">
            <Search size={16} className="filter-search__icon" />
            <input
              id="template-search"
              type="search"
              placeholder={t("templatesPage.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-field">
          <select
            id="template-objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            <option value="all">{t("templatesPage.allObjectives")}</option>
            {objectives.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <select
            id="template-voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
          >
            <option value="all">{t("templatesPage.allVoices")}</option>
            {voices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn--ghost" onClick={resetFilters}>
          <RotateCcw size={16} />
          {t("templatesPage.resetFilters")}
        </button>
      </section>

      <div className="templates__grid">
        {filtered.map((tpl) => (
          <article className="tpl-card" key={tpl.id}>
            <div className="tpl-card__body">
              <h3 className="tpl-card__name">{tpl.name}</h3>
              <p className="tpl-card__desc">{tpl.description}</p>
              <div className="tpl-card__meta">
                <span className="tag">
                  <Target size={13} />
                  {tpl.objective}
                </span>
                <span className="tag tag--muted">
                  <AudioLines size={13} />
                  {tpl.voice}
                </span>
              </div>
              <span className="tpl-card__updated">
                <Clock size={13} />
                {t("templatesPage.lastUpdated")}
                {tpl.updated}
              </span>
            </div>

            <div className="tpl-card__footer">
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(`/templates/${tpl.id}/edit`)}
              >
                <Pencil size={16} />
                {t("templatesPage.edit")}
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => handleDelete(tpl)}
              >
                <Trash2 size={16} />
                {t("templatesPage.delete")}
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="templates__empty">{t("templatesPage.empty")}</p>
      )}
    </div>
  );
}

