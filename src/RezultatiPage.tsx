import { Link } from "react-router-dom";
import { ArchivesPanel } from "./ArchivesPanel";
import { RezultatiPanel } from "./RezultatiPanel";
import { useRezultati } from "./useRezultati";
import "./App.css";

/**
 * Javni rezultati in arhiv (prej: pogled "Rezultati" v enem vmesniku).
 */
export function RezultatiPage() {
  const { data, error, loading, refresh } = useRezultati();

  return (
    <div className="app" id="rez-top">
      <a className="skip-link" href="#main">
        Skoči na vsebino
      </a>
      <header className="sub-h">
        <div className="sub-h-row">
          <Link to="/" className="nav-back">
            ← Kamera
          </Link>
        </div>
        <h1 className="sub-h-t" id="main">
          Rezultati
        </h1>
        <p className="subtitle" style={{ margin: "0.35rem 0 0.75rem" }}>
          Javne številke in zadnja žrebanja. Za vaš listek uporabite{" "}
          <Link to="/listek" className="nav-inline">
            Pregled listka
          </Link>{" "}
          ali <strong>Preveri potrdilo</strong> na loterija.si.
        </p>
      </header>
      <RezultatiPanel
        data={data}
        error={error}
        loading={loading}
        onRefresh={refresh}
      />
      <ArchivesPanel data={data} />
    </div>
  );
}
