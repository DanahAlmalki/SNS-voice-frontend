import { useLanguage } from "../lib/i18n.jsx";
import "./Placeholder.css";

export default function Placeholder({ title, icon: Icon }) {
  const { t } = useLanguage();
  return (
    <div className="placeholder">
      <div className="placeholder__box">
        <span className="placeholder__icon">
          {Icon && <Icon size={30} strokeWidth={1.8} />}
        </span>
        <h1>{title}</h1>
        <p>{t("placeholder.comingSoon")}</p>
      </div>
    </div>
  );
}
