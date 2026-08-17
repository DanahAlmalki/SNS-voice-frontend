import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyScheme, loadScheme } from "./theme.js";
import { applyLang, loadLang } from "./lib/i18n.jsx";
import "./index.css";

applyScheme(loadScheme());
applyLang(loadLang());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
