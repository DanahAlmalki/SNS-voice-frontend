import { Globe } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import "./SettingsPage.css";

const LANGS = [
  { key: "ar", label: "عربي" },
  { key: "en", label: "English" },
];

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="settings">
      <header className="settings__header">
        <h1 className="settings__title">{t("settingsPage.title")}</h1>
      </header>

      <section className="settings__card">
        <div className="settings__row">
          <div className="settings__row-info">
            <span className="settings__row-icon">
              <Globe size={18} strokeWidth={2} />
            </span>
            <div>
              <h2 className="settings__row-title">
                {t("settingsPage.languageTitle")}
              </h2>
              <p className="settings__row-desc">
                {t("settingsPage.languageDesc")}
              </p>
            </div>
          </div>

          <div
            className="settings__choice"
            role="group"
            aria-label={t("settingsPage.languageTitle")}
          >
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                className={lang === l.key ? "is-selected" : ""}
                onClick={() => setLang(l.key)}
                aria-pressed={lang === l.key}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
