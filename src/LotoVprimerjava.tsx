import { useMemo } from 'react'
import { classifyLotoRow, findPrizeForTier, tierScore, type LotoTier } from './lotoMatch'
import { parseLotoFieldsFromOcr } from './parseLotoFields'
import type { SlipWinningInfo } from './parseSlipResponse'
import type { ArchiveDraw, RezultatiResponse } from './rezultatiTypes'
import type { ParsedPolje } from './parseLotoFields'
import { matchArchiveToSlipRounds, type SlipRoundInfo } from './slipDate'
import './LotoVprimerjava.css'

type Props = {
  ocrText: string
  rez: RezultatiResponse | null
  rezultatiLoading?: boolean
  /** Uradna polja (e.loterija) — če jih je, imajo prednost pred OCR */
  officialPolja?: ParsedPolje[] | null
  slipLoading?: boolean
  /** Obvestilo (npr. listek ni Loto) */
  slipNote?: string | null
  /** Krogi s potrdila — primerjava je samo s temi dnevi, ne s poljubnimi zadnjimi 5 iz arhiva */
  slipRounds?: SlipRoundInfo[] | null
  slipWinnings?: SlipWinningInfo[] | null
  /** Ne podvajaj polja "Uradno s potrdila" (npr. stran /listek ga že prikazuje zgoraj) */
  hideSlipWinningsBanner?: boolean
}

function getLotoSubgame(rez: RezultatiResponse | null) {
  const subs = rez?.games.loto?.subgames
  if (!subs) return null
  return subs.find((s) => s.name === 'Loto') ?? null
}

/** Žrebanja Loto: arhiv (do 5) ali en zapis s tekoče strani. */
function getLotoDraws(rez: RezultatiResponse | null): ArchiveDraw[] {
  const arch = rez?.archives?.loto
  if (arch && arch.length > 0) return arch
  const lsg = getLotoSubgame(rez)
  const g = rez?.games.loto
  if (lsg?.main?.length && lsg.main.length >= 6 && lsg.additional?.length && g) {
    return [
      {
        drawDate: g.drawLabel || '',
        main: lsg.main,
        additional: lsg.additional,
      },
    ]
  }
  return []
}

export function LotoVprimerjava({
  ocrText,
  rez,
  rezultatiLoading,
  officialPolja,
  slipLoading,
  slipNote,
  slipRounds,
  slipWinnings,
  hideSlipWinningsBanner = false,
}: Props) {
  const ocrPolja = useMemo(() => parseLotoFieldsFromOcr(ocrText), [ocrText])
  const fromApi = Boolean(officialPolja && officialPolja.length > 0)
  const polja = fromApi && officialPolja ? officialPolja : ocrPolja
  const fullArch = useMemo(() => getLotoDraws(rez), [rez])
  const draws: ArchiveDraw[] = useMemo(() => {
    if (fromApi && slipRounds && slipRounds.length > 0) {
      const m = matchArchiveToSlipRounds(fullArch, slipRounds)
      if (m.length > 0) return m
    }
    return fullArch
  }, [fromApi, fullArch, slipRounds])
  const usedSlipRoundFilter = Boolean(fromApi && slipRounds && slipRounds.length > 0 && draws.length > 0)

  const rows = useMemo(() => {
    if (draws.length === 0 || polja.length === 0) {
      return null
    }
    return polja.map((p) => {
      const uniq = new Set(p.numbers)
      const valid = fromApi || uniq.size === 6
      const perDraw: { drawDate: string; tier: LotoTier | null }[] = []
      let best: { drawDate: string; tier: LotoTier; score: number } | null = null
      for (const d of draws) {
        if (!d.main.length || d.additional.length < 1) {
          perDraw.push({ drawDate: d.drawDate, tier: null })
          continue
        }
        const tier = valid
          ? (classifyLotoRow(p.numbers, d.main, d.additional) as LotoTier | null)
          : null
        perDraw.push({ drawDate: d.drawDate, tier })
        const sc = tierScore(tier)
        if (tier && sc > 0 && (!best || sc > best.score)) {
          best = { drawDate: d.drawDate, tier, score: sc }
        }
      }
      const pr = best ? findPrizeForTier(best.tier, rez?.lotoPrizeTiers) : null
      return {
        index: p.index,
        nums: p.numbers,
        valid,
        perDraw,
        best,
        vrednost: pr?.vrednost ?? null,
      }
    })
  }, [draws, polja, rez?.lotoPrizeTiers, fromApi])

  if (polja.length === 0 && slipLoading) {
    return (
      <section className="card lvm" id="loto-ujemanje" aria-label="Loto ujemanje z rezultati">
        <h2 className="subtitle lvm-title" style={{ margin: 0 }}>
          Loto: primerjava z rezultati
        </h2>
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          Nalagam ujemajoče podatke o poljih ob številki potrdila (če jih spletna storitev posreduje)…
        </p>
        {ocrPolja.length > 0 ? (
          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
            Medtem so na voljo le številke s skena (spodaj, ko se naloži).
          </p>
        ) : null}
      </section>
    )
  }

  if (polja.length === 0) {
    return (
      <section className="card lvm" id="loto-ujemanje" aria-label="Loto ujemanje z rezultati">
        <h2 className="subtitle lvm-title" style={{ margin: 0 }}>
          Loto: primerjava z rezultati
        </h2>
        {slipNote ? <p className="muted" style={{ margin: '0.35rem 0' }}>{slipNote}</p> : null}
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          Na listku nismo zaznali <strong>1. polje</strong> … <strong>6 števk</strong> in uradnega
          povezovanja. Osvetljujte listek ali uredite vnos, ali vnesite 7-mestno potrdila za prenos polj
          s strežnika.
        </p>
        <p className="lvm-ocr" aria-label="OCR za pomoč">
          {ocrText.slice(0, 800)}
        </p>
      </section>
    )
  }

  if (!rows) {
    return (
      <section className="card lvm">
        <h2 className="subtitle lvm-title" style={{ margin: 0 }}>
          Loto: primerjava z rezultati
        </h2>
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          {rezultatiLoading
            ? 'Nalagam zadnje objavljeno žrebanje in arhiv…'
            : 'Ni podatkov o žrebanjih (preverite API z rezultati).'}
        </p>
      </section>
    )
  }

  const n = draws.length
  const isArchive = n > 1 || (rez?.archives?.loto?.length ?? 0) > 0

  return (
    <section className="card lvm" id="loto-ujemanje" aria-label="Loto ujemanje z rezultati">
      <h2 className="subtitle lvm-title" style={{ margin: 0 }}>
        Loto: verjeten dobitek (informativno)
      </h2>
      {slipWinnings && slipWinnings.length > 0 && !hideSlipWinningsBanner ? (
        <div className="lvm-official" role="status">
          <h3 className="lvm-official-h">Uradno s potrdila (e.loterija)</h3>
          <ul className="lvm-official-ul">
            {slipWinnings.map((w) => (
              <li key={`${w.year}-${w.round}-${w.name}-${w.value}`}>
                <strong>{w.name}</strong>
                {w.value > 0 ? ` · ${w.value.toFixed(2).replace('.', ',')} €` : ''}
                {w.round > 0 ? ` · krog ${w.round} (${w.year})` : ''}
                {w.quantity > 1 ? ` · ${w.quantity}×` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {usedSlipRoundFilter ? (
        <p className="lvm-lead">
          Primerjava samo z <strong>{n} žrebanji</strong>, ki ustrezajo krogom na potrdilu (ne s poljubno
          petico z rezultatov). Najmočnejši razred med temi dnevi. Končno:{' '}
          <strong>Preveri potrdilo</strong>.
        </p>
      ) : isArchive ? (
        <p className="lvm-lead">
          Primerjava z <strong>do {n} zadnjih</strong> objavljenih žrebanj (Loto). Prikazan je
          močnejši razred, če se razlikuje po krogih. Za vaš listek velja <strong>Preveri potrdilo</strong>.
        </p>
      ) : (
        <p className="lvm-lead">
          Zadnje objavljeno žrebanje (za primerjavo). Če je listek vplačan še za prihodnja žrebanja, velja{' '}
          <strong>Preveri potrdilo</strong>.
        </p>
      )}
      {fromApi ? (
        <p className="muted" style={{ fontSize: 13, margin: '0.2rem 0 0.6rem' }}>
          <strong>Polja</strong> gredo z uradnega API-ja (številka potrdila), ne s skenom.
          {usedSlipRoundFilter
            ? ' Številke za primerjavo se vzamejo le za datume krogov na listku.'
            : ' Če nismo našli ujemajočih datumov v arhivu, velja spodnja tabela (zadnji arhiv).'}
        </p>
      ) : null}
      {rez?.lotoPrizeSource ? (
        <p className="muted" style={{ fontSize: 13, margin: '0.2rem 0 0.6rem' }}>
          Približne vrednosti na polje ustrezajo zadnji tabeli na{' '}
          <a href={rez.lotoPrizeSource} target="_blank" rel="noreferrer">
            Loto – rezultati
          </a>{' '}
          (ne nujno za vsako žrebanje v arhivu{fromApi ? '' : '; OCR je lahko napačen'}).
        </p>
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: '0.2rem 0 0.6rem' }}>
          Tabela vrednosti ni na voljo. Osvežite &quot;Tekoči rezultati&quot;.
        </p>
      )}

      <ul className="lvm-list">
        {rows.map((r) => (
          <li key={r.index} className="lvm-row">
            <div className="lvm-idx">Polje {r.index}</div>
            <div className="lvm-nums">
              {r.nums.map((n, i) => (
                <span className="lvm-b" key={`${r.index}-${i}`}>
                  {n < 10 ? `0${n}` : n}
                </span>
              ))}
            </div>
            <div className="lvm-t">
              {!r.valid ? (
                <span className="lvm-lose">
                  Sken je podvojil številke ali vnos ni veljaven (potrebnih 6 različnih) — uredite OCR ali
                  uporabite 7-mestno potrdila.
                </span>
              ) : r.best == null ? (
                <span className="lvm-lose">Brez ujemanja s kategorijami v izbranih žrebanjih</span>
              ) : (
                <>
                  <span className="lvm-win">
                    Najboljše: {r.best.tier}
                    {r.best.drawDate ? ` (${r.best.drawDate})` : ''}
                  </span>
                  {r.vrednost ? (
                    <span className="lvm-eur" title="Zadnja objavljena tabela, okvirno">
                      ≈ {r.vrednost}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            {r.valid && r.perDraw.length > 0 ? (
              <ul className="lvm-by-draw" aria-label="Po žrebanjih">
                {r.perDraw.map((d, i) => (
                  <li key={`${d.drawDate}-${i}`}>
                    <span className="lvm-dt">{d.drawDate || '—'}</span>
                    {d.tier == null ? (
                      <span className="lvm-lose"> —</span>
                    ) : (
                      <span className={d.tier === r.best?.tier && d.drawDate === r.best?.drawDate ? 'lvm-win' : ''}>
                        {' '}
                        → {d.tier}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
