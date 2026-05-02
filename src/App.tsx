import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CameraPage } from "./pages/CameraPage";
import { ListekPregledPage } from "./pages/ListekPregledPage";
import { RezultatiPage } from "./pages/RezultatiPage";
import "./styles/App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CameraPage />} />
        <Route path="/listek" element={<ListekPregledPage />} />
        <Route path="/rezultati" element={<RezultatiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
