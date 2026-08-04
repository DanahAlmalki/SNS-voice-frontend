import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Layout from "./components/Layout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TemplatesPage from "./pages/TemplatesPage.jsx";
import CampaignsPage from "./pages/CampaignsPage.jsx";
import CampaignMapPage from "./pages/CampaignMapPage.jsx";
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
          <Route path="/" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/campaign-map" element={<CampaignMapPage />} />
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
