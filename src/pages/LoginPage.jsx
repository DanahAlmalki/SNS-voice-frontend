import { useState } from "react";
import icon from "../assets/icon.svg";
import { useLanguage } from "../lib/i18n.jsx";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t, dir } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="login" dir={dir}>
      <div className="login__card">
        {/* ---------- Left: form ---------- */}
        <div className="login__form-side">
          <img className="login__logo" src={icon} alt="SNS Voice" />

          <div className="login__form-inner">
            <h1 className="login__title">{t("login.welcome")}</h1>

            <form className="login__form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="login__field"
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                type="password"
                className="login__field"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <a className="login__forgot" href="#forgot">
                {t("login.forgotPassword")}
              </a>

              <button type="submit" className="login__submit">
                {t("login.signIn")}
              </button>
            </form>
          </div>
        </div>

        {/* ---------- Right: gradient hero ---------- */}
        <div className="login__hero">
          <nav className="login__nav">
            <a className="login__nav-link" href="#join">
              {t("login.joinUs")}
            </a>
            <a className="login__nav-link" href="#about">
              {t("login.aboutUs")}
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}

