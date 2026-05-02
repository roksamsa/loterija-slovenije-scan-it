const CONFETTI_WAVES = [
  { name: "dense", pieces: 72 },
  { name: "medium", pieces: 36 },
  { name: "light", pieces: 18 },
  { name: "final", pieces: 9 },
];

export function ListekPageConfetti() {
  return (
    <div className="listek-page-confetti" aria-hidden="true">
      {CONFETTI_WAVES.map((wave) => (
        <div
          key={wave.name}
          className={`listek-page-confetti__wave listek-page-confetti__wave--${wave.name}`}
        >
          {Array.from({ length: wave.pieces }, (_, piece) => (
            <span key={piece} className="listek-page-confetti__piece" />
          ))}
        </div>
      ))}
    </div>
  );
}
