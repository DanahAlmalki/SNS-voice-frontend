import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { useLanguage } from "../lib/i18n.jsx";
import "./Layout.css";

export default function Layout() {
  const { dir } = useLanguage();
  return (
    <div className="layout" dir={dir}>
      <Sidebar />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
