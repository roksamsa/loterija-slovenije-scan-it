import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LotoVprimerjava } from "./LotoVprimerjava";
import { useRezultati } from "./useRezultati";
import { useSlipDetails } from "./useSlipDetails";
import type { SlipWinningInfo } from "./parseSlipResponse";
import "./ListekPregledPage.css";

const URL_PREVERI = "https://www.loterija.si/preveri-potrdilo";
const URL_REZULTATI = "https://www.loterija.si/rezultati?";

function formatEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function totalWinningsEur(w: SlipWinningInfo[]): number {
  return w.reduce((a, x) => a + (typeof x.value === "number" ? x.value : 0), 0);
}

/** Eno vrstico na prikaz (kot na uradni strani) – razbijemo količino. */
function expandWinningLines(w: SlipWinningInfo[]): { name: string; value: number }[] {
  const out: { name: string; value: number }[] = [];
  for (const x of w) {
    const q = x.quantity > 0 ? x.quantity : 1;
    const per = q > 0 ? x.value / q : x.value;
    for (let i = 0; i < q; i += 1) {
      out.push({ name: x.name, value: per });
    }
  }
  return out;
}

function slipStatusText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const sd = (payload as { slip_details?: { status?: string } }).slip_details;
  return typeof sd?.status === "string" ? sd.status : null;
}

const ACTIVE_HINT = /ACTIVE|AKTIV/i;

/**
 * Pregled listka z URL: /listek?p=1234567 — osvežitev ohranja enako številko.
 */
export function ListekPregledPage() {
  const [search, setSearch] = useSearchParams();
  const pRaw = (search.get("p") ?? "").replace(/\D/g, "").slice(0, 7);
  const [localP, setLocalP] = useState(pRaw);
  useEffect(() => {
    setLocalP(pRaw);
  }, [pRaw]);

  const potrdilo7 = pRaw.length === 7 && /^\d{7}$/.test(pRaw) ? pRaw : "";

  const {
    data: rezData,
    error: rezError,
    loading: rezLoading,
    refresh: rezRefresh,
  } = useRezultati();

  const slip = useSlipDetails(potrdilo7);

  const onApplyP = useCallback(() => {
    const v = localP.replace(/\D/g, "").slice(0, 7);
    setLocalP(v);
    if (v.length === 7) setSearch({ p: v });
  }, [localP, setSearch]);

  const winLines = useMemo(
    () => (slip.winnings ? expandWinningLines(slip.winnings) : []),
    [slip.winnings],
  );

  const total = slip.winnings ? totalWinningsEur(slip.winnings) : 0;
  const hasWin = (slip.winnings?.length ?? 0) > 0;
  const status = slipStatusText(slip.lastPayload);
  const showActive = Boolean(
    hasWin && (status == null || ACTIVE_HINT.test(status)),
  );

  return (
    <div className="app listek-pregled" id="listek-top">
      <a className="skip-link" href="#listek-main">
        Skoči na vsebino
      </a>

      <header className="listek-hero">
        <div className="listek-hero__row">
          <Link to="/" className="nav-back">
            ← Kamera
          </Link>
          <Link to="/rezultati" className="nav-inline">
            Rezultati
          </Link>
        </div>
        <p className="listek-query" aria-label="Pot v naslovu">
          <code>
            {typeof window !== "undefined" ? window.location.pathname : "/listek"}
            ?p={potrdilo7 || "_______"}
          </code>
        </p>
        <h1 className="listek-hero__title" id="listek-main">
          Potrdilo:{" "}
          <span className="listek-hero__digits">{potrdilo7 || "— — — — — — —"}</span>
        </h1>
        {potrdilo7.length < 7 ? (
          <div className="listek-apply">
            <label className="muted" htmlFor="listek-p">
              7-mestno potrdilo
            </label>
            <div className="listek-apply__row">
              <input
                id="listek-p"
                className="manual"
                inputMode="numeric"
                maxLength={7}
                value={localP}
                onChange={(e) =>
                  setLocalP(e.target.value.replace(/\D/g, "").slice(0, 7))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") onApplyP();
                }}
                placeholder="_______"
                aria-label="Sedem mest potrdila"
              />
              <button type="button" className="btn" onClick={onApplyP}>
                Prikaži
              </button>
            </div>
            <p className="hint">Vpišite številko skenirane ali ročne vrednosti, nato se naložijo podatki.</p>
          </div>
        ) : null}
      </header>

      {potrdilo7.length === 7 && (
        <section
          className="listek-prize"
          aria-label="Dobitki s potrdila"
        >
          {slip.loading && !slip.lastPayload ? (
            <p className="muted">Nalagam podatke o listku…</p>
          ) : slip.error && !slip.lastPayload ? (
            <p className="listek-err" role="alert">
              {slip.error}
            </p>
          ) : slip.message && !slip.polja ? (
            <>
              <p className="muted">{slip.message}</p>
              <p className="listek-prize__info" style={{ marginTop: "0.75rem" }}>
                <a href={URL_PREVERI} target="_blank" rel="noreferrer">
                  Informacije o prevzemu dobitka
                </a>
                {" · "}
                <a href={URL_REZULTATI} target="_blank" rel="noreferrer">
                  Javni rezultati
                </a>
              </p>
            </>
          ) : (
            <>
              {hasWin ? (
                <>
                  <h2 className="listek-prize__cheer">Juuuuhuu, čestitamo!</h2>
                  <p className="listek-prize__lead">Imate dobitek.</p>
                  {showActive || status == null ? (
                    <p className="listek-prize__active">Listek je še aktiven.</p>
                  ) : status ? (
                    <p className="listek-prize__meta">Status: {status}</p>
                  ) : null}
                  <ul className="listek-prize__lines">
                    {winLines.map((line, i) => (
                      <li key={`${line.name}-${i}`} className="listek-prize__line">
                        <div>
                          <div className="listek-prize__kv">Ime igre: Loto</div>
                          <div className="listek-prize__kv">Zadeli ste: {line.name || "—"}</div>
                          <div className="listek-prize__kv">Znesek: {formatEur(line.value)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="listek-prize__total">
                    <span className="listek-prize__total-l">Vaš dobitek znaša</span>
                    <br />
                    <span className="listek-prize__total-n">{formatEur(total)}</span>
                  </p>
                </>
              ) : (
                <p className="listek-prize__none">
                  Po podatkih, ki jih trenutno vračamo, na tem listku ni prikazanega dobitka. Za
                  uradno preverite <a href={URL_PREVERI}>Preveri potrdilo</a>.
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
            </>
          )}
        </section>
      )}

      {potrdilo7.length === 7 && (
        <LotoVprimerjava
          ocrText=""
          rez={rezData}
          rezultatiLoading={rezLoading}
          officialPolja={slip.polja}
          slipLoading={slip.loading}
          slipNote={slip.error || slip.message || undefined}
          slipRounds={slip.rounds}
          slipWinnings={slip.winnings ?? undefined}
          hideSlipWinningsBanner
        />
      )}

      {rezError ? (
        <p className="listek-aux hint" role="status">
          Rezultati niso bili mogoči: {rezError}{" "}
          <button type="button" className="nav-inline" onClick={rezRefresh}>
            Znova
          </button>
        </p>
      ) : null}

      <footer className="listek-foot">
        <p className="hint">
          Dobitek potrdi uradno &quot;Preveri potrdilo&quot; in veljavno potrdilo. Ta stran je
          informativna; podatke naložimo z strežniškega posrednika (e.loterija), kot splet.
        </p>
      </footer>
    </div>
  );
}
