import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations.js";

const STORAGE_KEY = "sns-lang";

export function loadLang() {
  return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
}

export function saveLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function dirFor(lang) {
  return lang === "en" ? "ltr" : "rtl";
}

export function applyLang(lang) {
  document.documentElement.lang = lang === "en" ? "en" : "ar";
  document.documentElement.dir = dirFor(lang);
}

function resolve(dict, key) {
  return key
    .split(".")
    .reduce(
      (acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined),
      dict,
    );
}

function interpolate(str, vars) {
  if (!vars) return str;
  return Object.keys(vars).reduce(
    (acc, key) => acc.replaceAll(`{{${key}}}`, String(vars[key])),
    str,
  );
}

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  useEffect(() => {
    applyLang(lang);
    saveLang(lang);
  }, [lang]);

  const setLang = (next) => setLangState(next === "en" ? "en" : "ar");

  const t = (key, vars) => {
    const value =
      resolve(translations[lang], key) ?? resolve(translations.ar, key) ?? key;
    return typeof value === "string" ? interpolate(value, vars) : value;
  };

  const contextValue = { lang, setLang, t, dir: dirFor(lang) };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
