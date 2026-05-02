import { Link } from "react-router-dom";

export function ListekHeader() {
  return (
    <header className="listek-header">
      <Link to="/" className="listek-logo" aria-label="Preveri LOTO, nazaj na kamero">
        <span className="listek-logo__mark" aria-hidden="true">
          7
        </span>
        <span>Preveri LOTO</span>
      </Link>
      <nav className="listek-nav" aria-label="Glavna navigacija">
        <Link to="/rezultati" className="nav-inline">
          Rezultati
        </Link>
      </nav>
    </header>
  );
}
