import { useState } from "react";
import icon from "../assets/icon.svg";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="login" dir="rtl">
      <div className="login__card">
        {/* ---------- Left: form ---------- */}
        <div className="login__form-side">
          <img className="login__logo" src={icon} alt="SNS Voice" />

          <div className="login__form-inner">
            <h1 className="login__title">أهلاً بك</h1>

            <form className="login__form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="login__field"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                type="password"
                className="login__field"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <a className="login__forgot" href="#forgot">
                نسيت كلمة المرور؟
              </a>

              <button type="submit" className="login__submit">
                تسجيل الدخول
              </button>
            </form>
          </div>
        </div>

        {/* ---------- Right: gradient hero ---------- */}
        <div className="login__hero">
          <nav className="login__nav">
            <a className="login__nav-link" href="#join">
              انضم إلينا
            </a>
            <a className="login__nav-link" href="#about">
              SNS Voice عن
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
