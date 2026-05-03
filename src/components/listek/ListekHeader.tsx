import { Link } from "react-router-dom";
import { Logo } from "../logo/Logo";

export function ListekHeader() {
  return (
    <header className="listek-header">
      <Logo />
      <nav className="listek-nav" aria-label="Glavna navigacija">
        <Link to="/rezultati" className="nav-inline">
          Rezultati
        </Link>
      </nav>
    </header>
  );
}
