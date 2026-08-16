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
import "./TemplatesPage.css";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(() =>
    listTemplates().map(describeTemplate),
  );
  const [query, setQuery] = useState("");
  const [objective, setObjective] = useState("all");
  const [voice, setVoice] = useState("all");

  const objectives = useMemo(
    () => [...new Set(templates.map((t) => t.objective))],
    [templates],
  );
  const voices = useMemo(
    () => [...new Set(templates.map((t) => t.voice))],
    [templates],
  );

  const filtered = useMemo(
    () =>
      templates.filter((t) => {
        const matchesQuery = t.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesObjective =
          objective === "all" || t.objective === objective;
        const matchesVoice = voice === "all" || t.voice === voice;
        return matchesQuery && matchesObjective && matchesVoice;
      }),
    [templates, query, objective, voice],
  );

  const resetFilters = () => {
    setQuery("");
    setObjective("all");
    setVoice("all");
  };

  const handleDelete = (t) => {
    if (!window.confirm(`حذف قالب "${t.name}"؟ لا يمكن التراجع عن ذلك.`)) return;
    deleteTemplate(t.id);
    setTemplates((list) => list.filter((x) => x.id !== t.id));
  };

  return (
    <div className="templates">
      <header className="templates__header">
        <div className="templates__heading">
          <h1 className="templates__title">القوالب</h1>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/templates/new")}
        >
          <Plus size={18} />
          قالب جديد
        </button>
      </header>

      <section className="templates__filters">
        <div className="filter-field filter-field--grow">
          <div className="filter-search">
            <Search size={16} className="filter-search__icon" />
            <input
              id="template-search"
              type="search"
              placeholder="ابحث باسم القالب…"
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
            <option value="all">كل الأهداف</option>
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
            <option value="all">كل الأصوات</option>
            {voices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn--ghost" onClick={resetFilters}>
          <RotateCcw size={16} />
          إعادة تعيين
        </button>
      </section>

      <div className="templates__grid">
        {filtered.map((t) => (
          <article className="tpl-card" key={t.id}>
            <div className="tpl-card__body">
              <h3 className="tpl-card__name">{t.name}</h3>
              <p className="tpl-card__desc">{t.description}</p>
              <div className="tpl-card__meta">
                <span className="tag">
                  <Target size={13} />
                  {t.objective}
                </span>
                <span className="tag tag--muted">
                  <AudioLines size={13} />
                  {t.voice}
                </span>
              </div>
              <span className="tpl-card__updated">
                <Clock size={13} />
                آخر تحديث: {t.updated}
              </span>
            </div>

            <div className="tpl-card__footer">
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(`/templates/${t.id}/edit`)}
              >
                <Pencil size={16} />
                تعديل
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => handleDelete(t)}
              >
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="templates__empty">لا توجد قوالب مطابقة للبحث.</p>
      )}
    </div>
  );
}
