import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home, ClipboardList } from "lucide-react";
import Layout from "./components/Layout.jsx";
import TemplatesPage from "./pages/TemplatesPage.jsx";
import CampaignsPage from "./pages/CampaignsPage.jsx";
import NewCampaignPage from "./pages/NewCampaignPage.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import TemplateWizard from "./TemplateWizard.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={<Placeholder title="الرئيسية" icon={Home} />}
          />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateWizard />} />
          <Route
            path="/records"
            element={<Placeholder title="السجلات" icon={ClipboardList} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
