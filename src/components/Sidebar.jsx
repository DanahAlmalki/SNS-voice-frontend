import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutTemplate,
  ClipboardList,
  Waypoints,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import icon from "../assets/icon.svg";
import homeIcon from "../assets/home.svg";
import campaignIcon from "../assets/campaign.svg";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "الرئيسية", img: homeIcon, end: true },
  { to: "/templates", label: "القوالب", icon: LayoutTemplate },
  { to: "/campaigns", label: "الحملات", img: campaignIcon },
  { to: "/campaign-map", label: "خريطة الحملات", icon: Waypoints },
  { to: "/records", label: "السجلات", icon: ClipboardList },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );

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

      <nav
        className={`sidebar__nav ${activeIndex < 0 ? "is-none" : ""}`}
        style={{
          "--active-index": Math.max(activeIndex, 0),
          "--nav-count": NAV_ITEMS.length,
        }}
      >
        <span className="sidebar__nav-indicator" aria-hidden="true" />
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "is-active" : ""}`
              }
              title={item.label}
            >
              <span className="sidebar__icon">
                {item.img ? (
                  <span
                    className="sidebar__icon-img"
                    style={{
                      maskImage: `url(${item.img})`,
                      WebkitMaskImage: `url(${item.img})`,
                    }}
                  />
                ) : (
                  <Icon size={20} strokeWidth={2} />
                )}
              </span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

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
