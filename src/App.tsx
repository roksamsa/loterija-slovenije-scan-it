import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CameraPage } from "./CameraPage";
import { ListekPregledPage } from "./ListekPregledPage";
import { RezultatiPage } from "./RezultatiPage";
import "./App.css";

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
