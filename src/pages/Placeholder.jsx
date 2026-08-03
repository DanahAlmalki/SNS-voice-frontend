import "./Placeholder.css";

export default function Placeholder({ title, icon: Icon }) {
  return (
    <div className="placeholder">
      <div className="placeholder__box">
        <span className="placeholder__icon">
          {Icon && <Icon size={30} strokeWidth={1.8} />}
        </span>
        <h1>{title}</h1>
        <p>هذه الصفحة قيد الإنشاء.</p>
      </div>
    </div>
  );
}
