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
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "الرئيسية", icon: Home, end: true },
  { to: "/templates", label: "القوالب", icon: LayoutTemplate },
  { to: "/campaigns", label: "الحملات", icon: Megaphone },
  { to: "/campaign-map", label: "خريطة الحملات", icon: Waypoints },
  //{ to: "/records", label: "السجلات", icon: ClipboardList },
];

const SUPPORT_ITEMS = [
  { to: "/settings", label: "الإعدادات", icon: Settings },
  { to: "/help", label: "المساعدة", icon: CircleHelp },
];

const SCHEMES = [
  { key: "light", label: "فاتح", icon: Sun },
  { key: "dark", label: "داكن", icon: Moon },
];

function SidebarLink({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `sidebar__link ${isActive ? "is-active" : ""}`
      }
      title={item.label}
    >
      <span className="sidebar__icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="sidebar__label">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [scheme, setScheme] = useState(loadScheme);

  useEffect(() => {
    applyScheme(scheme);
    saveScheme(scheme);
  }, [scheme]);

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
            className={`sidebar__theme ${scheme === "dark" ? "is-dark" : ""}`}
            role="group"
            aria-label="مظهر الواجهة"
          >
            <span className="sidebar__theme-thumb" aria-hidden="true" />
            {SCHEMES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`sidebar__theme-btn ${
                    scheme === s.key ? "is-active" : ""
                  }`}
                  onClick={() => setScheme(s.key)}
                  aria-pressed={scheme === s.key}
                  title={s.label}
                >
                  <Icon size={14} strokeWidth={2} />
                  <span className="sidebar__label">{s.label}</span>
                </button>
              );
            })}
          </div>

          <Link className="sidebar__logout" to="/login">
            <LogOut size={16} strokeWidth={2} />
            <span className="sidebar__label">تسجيل الخروج</span>
          </Link>
        </div>
      </nav>

      <p className="sidebar__version" dir="ltr">
        <span className="sidebar__label">Version </span>2.0.0
      </p>

      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {collapsed ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
      </button>
    </aside>
  );
}
