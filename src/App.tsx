import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "./lib/analytics";
import { CameraPage } from "./pages/CameraPage";
import { ListekPregledPage } from "./pages/ListekPregledPage";
import { RezultatiPage } from "./pages/RezultatiPage";
import "./styles/App.css";

function AnalyticsPageTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsPageTracker />
      <Routes>
        <Route path="/" element={<CameraPage />} />
        <Route path="/listek" element={<ListekPregledPage />} />
        <Route path="/rezultati" element={<RezultatiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
