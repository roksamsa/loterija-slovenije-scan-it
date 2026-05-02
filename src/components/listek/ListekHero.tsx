type ListekHeroProps = {
  potrdilo7: string;
  localP: string;
  onLocalPChange: (value: string) => void;
  onApplyP: () => void;
};

export function ListekHero({
  potrdilo7,
  localP,
  onLocalPChange,
  onApplyP,
}: ListekHeroProps) {
  return (
    <section className="listek-hero" aria-labelledby="listek-main">
      <p className="listek-query" aria-label="Pot v naslovu">
        <code>
          {typeof window !== "undefined" ? window.location.pathname : "/listek"}
          ?p={potrdilo7 || "_______"}
        </code>
      </p>
      <h1 className="listek-hero__title" id="listek-main">
        Potrdilo:{" "}
        <span className="listek-hero__digits">{potrdilo7 || "- - - - - - -"}</span>
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
              onChange={(event) => onLocalPChange(event.target.value.replace(/\D/g, "").slice(0, 7))}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApplyP();
              }}
              placeholder="_______"
              aria-label="Sedem mest potrdila"
            />
            <button type="button" className="btn" onClick={onApplyP}>
              Prikaži
            </button>
          </div>
          <p className="hint">
            Vpišite številko skenirane ali ročne vrednosti, nato se naložijo podatki.
          </p>
        </div>
      ) : null}
    </section>
  );
}
