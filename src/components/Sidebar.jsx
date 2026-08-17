import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Home,
  LayoutTemplate,
  Megaphone,
  ClipboardList,
  Waypoints,
  Settings,
  CircleHelp,
  Sun,
  Moon,
  LogOut,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import icon from "../assets/icon.svg";
import { applyScheme, loadScheme, saveScheme } from "../theme.js";
import { useLanguage } from "../lib/i18n.jsx";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", labelKey: "sidebar.home", icon: Home, end: true },
  { to: "/templates", labelKey: "sidebar.templates", icon: LayoutTemplate },
  { to: "/campaigns", labelKey: "sidebar.campaigns", icon: Megaphone },
  { to: "/campaign-map", labelKey: "sidebar.campaignMap", icon: Waypoints },
  //{ to: "/records", labelKey: "sidebar.records", icon: ClipboardList },
];

const SUPPORT_ITEMS = [
  { to: "/settings", labelKey: "sidebar.settings", icon: Settings },
  { to: "/help", labelKey: "sidebar.help", icon: CircleHelp },
];

const SCHEMES = [
  { key: "light", labelKey: "sidebar.themeLight", icon: Sun },
  { key: "dark", labelKey: "sidebar.themeDark", icon: Moon },
];

const LANGS = [
  { key: "ar", label: "عربي" },
  { key: "en", label: "English" },
];

function SidebarLink({ item }) {
  const { t } = useLanguage();
  const Icon = item.icon;
  const label = t(item.labelKey);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `sidebar__link ${isActive ? "is-active" : ""}`
      }
      title={label}
    >
      <span className="sidebar__icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="sidebar__label">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [scheme, setScheme] = useState(loadScheme);
  const { t, lang, setLang, dir } = useLanguage();

  useEffect(() => {
    applyScheme(scheme);
    saveScheme(scheme);
  }, [scheme]);

  const CollapseIcon = dir === "rtl" ? ChevronsRight : ChevronsLeft;
  const ExpandIcon = dir === "rtl" ? ChevronsLeft : ChevronsRight;

  return (
    <aside
      className={`sidebar ${collapsed ? "is-collapsed" : ""}`}
      onClick={collapsed ? () => setCollapsed(false) : undefined}
    >
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <img className="sidebar__logo" src={icon} alt="" />
          <span className="sidebar__name">SNS Voice</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__group">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>

        <div className="sidebar__group sidebar__group--support">
          {SUPPORT_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>

        <div className="sidebar__group sidebar__group--footer">
          <div
            className={`sidebar__lang ${lang === "en" ? "is-en" : ""}`}
            role="group"
            aria-label={t("sidebar.langAriaLabel")}
          >
            <span className="sidebar__theme-thumb" aria-hidden="true" />
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                className={`sidebar__theme-btn ${
                  lang === l.key ? "is-active" : ""
                }`}
                onClick={() => setLang(l.key)}
                aria-pressed={lang === l.key}
                title={l.label}
              >
                <span className="sidebar__label">{l.label}</span>
              </button>
            ))}
          </div>

          <div
            className={`sidebar__theme ${scheme === "dark" ? "is-dark" : ""}`}
            role="group"
            aria-label={t("sidebar.themeAriaLabel")}
          >
            <span className="sidebar__theme-thumb" aria-hidden="true" />
            {SCHEMES.map((s) => {
              const Icon = s.icon;
              const label = t(s.labelKey);
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`sidebar__theme-btn ${
                    scheme === s.key ? "is-active" : ""
                  }`}
                  onClick={() => setScheme(s.key)}
                  aria-pressed={scheme === s.key}
                  title={label}
                >
                  <Icon size={14} strokeWidth={2} />
                  <span className="sidebar__label">{label}</span>
                </button>
              );
            })}
          </div>

          <Link className="sidebar__logout" to="/login">
            <LogOut size={16} strokeWidth={2} />
            <span className="sidebar__label">{t("sidebar.logout")}</span>
          </Link>
        </div>
      </nav>

      <p className="sidebar__version" dir="ltr">
        <span className="sidebar__label">Version </span>2.0.0
      </p>

      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? t("sidebar.expandMenu") : t("sidebar.collapseMenu")}
        aria-label={
          collapsed ? t("sidebar.expandMenu") : t("sidebar.collapseMenu")
        }
      >
        {collapsed ? <ExpandIcon size={18} /> : <CollapseIcon size={18} />}
      </button>
    </aside>
  );
}

