import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Check,
  X,
  Target,
  AudioLines,
  Clock,
  Search,
  RotateCcw,
} from "lucide-react";
import "./TemplatesPage.css";

const DEMO_TEMPLATES = [
  {
    id: 1,
    name: "حملة حجز المواعيد",
    description: "قالب لتحديد مواعيد مع العملاء المحتملين وعرض الخدمات.",
    objective: "حجز موعد",
    voice: "صوت نسائي",
    updated: "قبل يومين",
  },
  {
    id: 2,
    name: "تأهيل العملاء المحتملين",
    description: "أسئلة سريعة لتقييم اهتمام العميل وجاهزيته للشراء.",
    objective: "تأهيل عميل",
    voice: "صوت رجالي",
    updated: "قبل ٥ أيام",
  },
  {
    id: 3,
    name: "متابعة الطلبات",
    description: "الاتصال بالعملاء للتأكد من رضاهم بعد الطلب.",
    objective: "متابعة",
    voice: "صوت محايد",
    updated: "قبل أسبوع",
  },
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(DEMO_TEMPLATES);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [query, setQuery] = useState("");
  const [objective, setObjective] = useState("all");
  const [voice, setVoice] = useState("all");

  const objectives = useMemo(
    () => [...new Set(DEMO_TEMPLATES.map((t) => t.objective))],
    [],
  );
  const voices = useMemo(
    () => [...new Set(DEMO_TEMPLATES.map((t) => t.voice))],
    [],
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

  const startEdit = (t) => {
    setEditingId(t.id);
    setDraft({ name: t.name, description: t.description });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id) => {
    setTemplates((list) =>
      list.map((t) =>
        t.id === id
          ? { ...t, name: draft.name, description: draft.description }
          : t,
      ),
    );
    setEditingId(null);
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
        {filtered.map((t) => {
          const isEditing = editingId === t.id;
          return (
            <article className="tpl-card" key={t.id}>
              {isEditing ? (
                <div className="tpl-card__edit">
                  <input
                    className="tpl-card__input"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="اسم القالب"
                  />
                  <textarea
                    className="tpl-card__input"
                    rows={3}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, description: e.target.value }))
                    }
                    placeholder="الوصف"
                  />
                </div>
              ) : (
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
              )}

              <div className="tpl-card__footer">
                {isEditing ? (
                  <>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => saveEdit(t.id)}
                    >
                      <Check size={16} />
                      حفظ
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={cancelEdit}
                    >
                      <X size={16} />
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn--ghost btn--block btn--sm"
                    onClick={() => startEdit(t)}
                  >
                    <Pencil size={16} />
                    تعديل
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="templates__empty">لا توجد قوالب مطابقة للبحث.</p>
      )}
    </div>
  );
}
