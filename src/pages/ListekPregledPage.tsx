import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ListekHeader } from "../components/listek/ListekHeader";
import { ListekOutcomePanel } from "../components/listek/ListekOutcomePanel";
import { ListekPageConfetti } from "../components/listek/ListekPageConfetti";
import {
  expandWinningLines,
  getOutcomeState,
  isActiveStatus,
  slipStatusText,
  totalWinningsEur,
} from "../components/listek/listekOutcome";
import { LotoVprimerjava } from "../components/listek/LotoVprimerjava";
import { useRezultati } from "../hooks/useRezultati";
import { useSlipDetails } from "../hooks/useSlipDetails";
import "./ListekPregledPage.scss";

/**
 * Pregled listka z URL: /listek?p=1234567 — osvežitev ohranja enako številko.
 */
export function ListekPregledPage() {
  const [search] = useSearchParams();
  const pRaw = (search.get("p") ?? "").replace(/\D/g, "").slice(0, 7);

  const potrdilo7 = pRaw.length === 7 && /^\d{7}$/.test(pRaw) ? pRaw : "";

  const {
    data: rezData,
    error: rezError,
    loading: rezLoading,
    refresh: rezRefresh,
  } = useRezultati();

  const slip = useSlipDetails(potrdilo7);

  const winLines = useMemo(
    () => (slip.winnings ? expandWinningLines(slip.winnings) : []),
    [slip.winnings],
  );

  const total = slip.winnings ? totalWinningsEur(slip.winnings) : 0;
  const hasWin = (slip.winnings?.length ?? 0) > 0;
  const hasPayload = Boolean(slip.lastPayload);
  const hasPolja = Boolean(slip.polja);
  const status = slipStatusText(slip.lastPayload);
  const showActive = hasWin && isActiveStatus(status);
  const outcome = getOutcomeState({
    loading: slip.loading,
    error: slip.error,
    hasPayload,
    hasWin,
    hasPolja,
    hasMessage: Boolean(slip.message),
  });

  return (
    <div className="app listek-pregled" id="listek-top">
      <a className="skip-link" href="#listek-main">
        Skoči na vsebino
      </a>
      {hasWin ? <ListekPageConfetti /> : null}

      <ListekHeader />

      {potrdilo7.length === 7 ? (
        <div className="listek-layout">
          <ListekOutcomePanel
            outcome={outcome}
            loading={slip.loading}
            error={slip.error}
            message={slip.message}
            hasPolja={hasPolja}
            hasPayload={hasPayload}
            hasWin={hasWin}
            showActive={showActive}
            winLines={winLines}
            total={total}
          />

          <div className="listek-layout__match">
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
          </div>
        </div>
      ) : null}

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
          Prikazani podatki so zgolj informativne narave. Za uradno potrditev
          dobitka, veljavnosti listka in pogojev izplačila vedno uporabite
          storitev &quot;Preveri potrdilo&quot; ter uradne strani Loterije
          Slovenije. Za morebitne napake, zamude pri osveževanju podatkov ali
          napačno interpretacijo prikaza ne odgovarjamo.
        </p>
        <p>
          Created by{" "}
          <a href="https://roksamsa.com/sl" target="_blank" rel="noreferrer noopener">
            Rok Samsa
          </a> with ❤️
        </p>
      </footer>
    </div>
  );
}
