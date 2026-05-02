import {
    formatEur,
    getOutcomeTitle,
    type OutcomeState,
    type WinningLine,
} from "./listekOutcome";

const URL_PREVERI = "https://www.loterija.si/preveri-potrdilo";
const URL_REZULTATI = "https://www.loterija.si/rezultati?";

type ListekOutcomePanelProps = {
    outcome: OutcomeState;
    loading: boolean;
    error?: string | null;
    message?: string | null;
    hasPolja: boolean;
    hasPayload: boolean;
    hasWin: boolean;
    showActive: boolean;
    winLines: WinningLine[];
    total: number;
};

function outcomeIcon(outcome: OutcomeState): string {
    if (outcome === "win") return "€";
    if (outcome === "lose") return "x";
    return "?";
}

export function ListekOutcomePanel({
    outcome,
    loading,
    error,
    message,
    hasPolja,
    hasPayload,
    hasWin,
    showActive,
    winLines,
    total,
}: ListekOutcomePanelProps) {
    const showInitialLoading = loading && !hasPayload;
    const showInitialError = Boolean(error && !hasPayload);
    const showMessageOnly = Boolean(message && !hasPolja);

    return (
      <section
        className={`listek-prize listek-outcome listek-outcome--${outcome}`}
        aria-label="Dobitki s potrdila"
      >
        <div className="listek-outcome__visual" aria-hidden="true">
          <span className="listek-outcome__halo" />
          <span className="listek-outcome__icon">{outcomeIcon(outcome)}</span>
          {outcome === "win" ? <span className="listek-confetti" /> : null}
        </div>

        <h2 className="listek-outcome__title">{getOutcomeTitle(outcome)}</h2>

        {showInitialLoading ? (
          <p className="muted">Nalagam podatke o listku...</p>
        ) : showInitialError ? (
          <p className="listek-err" role="alert">
            {error}
          </p>
        ) : showMessageOnly ? (
          <p className="muted">{message}</p>
        ) : hasWin ? (
          <>
            {showActive ? (
              <p className="listek-prize__active">Listek je še aktiven.</p>
            ) : null}

            <p className="listek-prize__total">
              <span className="listek-prize__total-l">Vaš dobitek znaša</span>
              <br />
              <span className="listek-prize__total-n">{formatEur(total)}</span>
            </p>

            <ul className="listek-prize__lines">
              {winLines.map((line, index) => (
                <li
                  key={`${line.name}-${index}`}
                  className="listek-prize__line"
                >
                  <div className="card lvm">
                    <div className="listek-prize__kv">{line.name || "-"}</div>
                    <div className="listek-prize__kv">
                      {formatEur(line.value)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="listek-prize__none">
            Po podatkih, ki jih trenutno vračamo, na tem listku ni prikazanega
            dobitka. Za uradno preverite{" "}
            <a href={URL_PREVERI}>Preveri potrdilo</a>.
          </p>
        )}

        <p className="listek-prize__info">
          <a href={URL_PREVERI} target="_blank" rel="noreferrer">
            Informacije o prevzemu dobitka
          </a>
          {" · "}
          <a href={URL_REZULTATI} target="_blank" rel="noreferrer">
            Javni rezultati
          </a>
        </p>
      </section>
    );
}
