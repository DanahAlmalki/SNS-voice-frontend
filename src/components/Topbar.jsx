import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { applyScheme, loadScheme, saveScheme } from "../theme.js";
import { useLanguage } from "../lib/i18n.jsx";
import "./Topbar.css";

export default function Topbar() {
  const [scheme, setScheme] = useState(loadScheme);
  const { t } = useLanguage();

  useEffect(() => {
    applyScheme(scheme);
    saveScheme(scheme);
  }, [scheme]);

  const Icon = scheme === "dark" ? Moon : Sun;
  const label = t("sidebar.themeAriaLabel");

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__theme-btn"
        onClick={() => setScheme(scheme === "dark" ? "light" : "dark")}
        aria-label={label}
        title={label}
      >
        <Icon size={18} strokeWidth={2} />
      </button>
    </header>
  );
}
