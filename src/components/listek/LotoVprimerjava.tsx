import { useMemo } from 'react'
import { classifyLotoRow, findPrizeForTier, tierScore, type LotoTier } from '../../lib/lotoMatch'
import { parseLotoFieldsFromOcr } from '../../lib/parseLotoFields'
import type { SlipWinningInfo } from '../../lib/parseSlipResponse'
import type { ArchiveDraw, RezultatiResponse } from '../../lib/rezultatiTypes'
import type { ParsedPolje } from '../../lib/parseLotoFields'
import { matchArchiveToSlipRounds, toDateKey, type SlipRoundInfo } from '../../lib/slipDate'
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

function formatRoundDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('sl-SI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function roundStatus(round: SlipRoundInfo, checkedDateKeys: Set<string>): {
    className: string
    label: string
} {
    const key = toDateKey(round.drawOn)
    if (round.drawHappened && key && checkedDateKeys.has(key)) {
        return { className: 'lvm-rounds__badge--checked', label: 'Preverjeno' }
    }
    if (round.drawHappened) {
        return { className: 'lvm-rounds__badge--done', label: 'Žrebanje zaključeno' }
    }
    return { className: 'lvm-rounds__badge--pending', label: 'Čaka žrebanje' }
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
    officialPolja,
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
    const checkedDateKeys = useMemo(() => {
        const keys = new Set<string>()
        for (const draw of draws) {
            const key = toDateKey(draw.drawDate)
            if (key) keys.add(key)
        }
        return keys
    }, [draws])
    const rows = useMemo(() => {
        if (draws.length === 0 || polja.length === 0) {
            return null
        }
        return polja.map((p) => {
            const nums = Array.isArray(p.numbers) ? p.numbers : []
            const uniq = new Set(nums)
            const valid = fromApi || uniq.size === 6
            const perDraw: { drawDate: string; tier: LotoTier | null }[] = []
            let best: { drawDate: string; tier: LotoTier; score: number } | null = null
            for (const d of draws) {
                if (!d.main.length || d.additional.length < 1) {
                    perDraw.push({ drawDate: d.drawDate, tier: null })
                    continue
                }
                const tier = valid
                    ? (classifyLotoRow(nums, d.main, d.additional) as LotoTier | null)
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
                nums,
                valid,
                perDraw,
                best,
                vrednost: pr?.vrednost ?? null,
            }
        })
    }, [draws, polja, rez?.lotoPrizeTiers, fromApi])

    return (
        <section
            className="lvm"
            id="loto-ujemanje"
            aria-label="Loto ujemanje z rezultati"
        >
            {slipRounds && slipRounds.length > 0 ? (
                <section className="lvm-rounds" aria-label="Krogi, za katere je listek vplačan">
                    <div className="lvm-rounds__head">
                        <h3 className="lvm-rounds__title">Krogi na listku</h3>
                        <span className="lvm-rounds__count">{slipRounds.length}× vplačano</span>
                    </div>
                    <p className="lvm-rounds__note">
                        Primerjava spodaj preveri samo kroge, kjer je žrebanje že opravljeno in so rezultati
                        najdeni v arhivu.
                    </p>
                    <ul className="lvm-rounds__list">
                        {slipRounds.map((round) => {
                            const status = roundStatus(round, checkedDateKeys)
                            return (
                                <li key={`${round.year}-${round.round}-${round.drawOn}`} className="lvm-rounds__item">
                                    <div>
                                        <div className="lvm-rounds__round">
                                            Krog {round.round}
                                            {round.year ? ` (${round.year})` : ''}
                                        </div>
                                        <div className="lvm-rounds__date">{formatRoundDate(round.drawOn)}</div>
                                    </div>
                                    <div className="lvm-rounds__meta">
                                        {round.statusWinning ? (
                                            <span className="lvm-rounds__win">Dobitni krog</span>
                                        ) : null}
                                        <span className={`lvm-rounds__badge ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            ) : null}

            {slipWinnings && slipWinnings.length > 0 && !hideSlipWinningsBanner ? (
                <div className="lvm-official" role="status">
                    <h3 className="lvm-official-h">Uradno s potrdila (e.loterija)</h3>
                    <ul className="lvm-official-ul">
                        {slipWinnings.map((w) => (
                            <li key={`${w.year}-${w.round}-${w.name}-${w.value}`}>
                                <strong>{w.name}</strong>
                                {w.value > 0
                                    ? ` · ${w.value.toFixed(2).replace(".", ",")} €`
                                    : ""}
                                {w.round > 0 ? ` · krog ${w.round} (${w.year})` : ""}
                                {w.quantity > 1 ? ` · ${w.quantity}×` : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <ul className="lvm-list">
                {rows?.map((r) => (
                    <li key={r.index} className="lvm-row">
                        <div className="lvm-idx__wrapper">
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
                                        Sken je podvojil številke ali vnos ni veljaven (potrebnih
                                        6 različnih) — uredite OCR ali uporabite 7-mestno
                                        potrdila.
                                    </span>
                                ) : r.best == null ? (
                                    <span className="lvm-lose">
                                        Brez ujemanja s kategorijami v izbranih žrebanjih
                                    </span>
                                ) : (
                                    <>
                                        <span className="lvm-win">
                                            Najboljše: {r.best.tier}
                                            {r.best.drawDate ? ` (${r.best.drawDate})` : ""}
                                        </span>
                                        {r.vrednost ? (
                                            <span
                                                className="lvm-eur"
                                                title="Zadnja objavljena tabela, okvirno"
                                            >
                                                ≈ {r.vrednost}
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>
                        {r.valid && r.perDraw.length > 0 ? (
                            <ul className="lvm-by-draw" aria-label="Po žrebanjih">
                                {r.perDraw.map((d, i) => (
                                    <li key={`${d.drawDate}-${i}`}>
                                        <span className="lvm-dt">{d.drawDate || "—"}</span>
                                        {d.tier == null ? (
                                            <span className="lvm-lose"> —</span>
                                        ) : (
                                            <span
                                                className={
                                                    d.tier === r.best?.tier &&
                                                        d.drawDate === r.best?.drawDate
                                                        ? "lvm-win"
                                                        : ""
                                                }
                                            >
                                                {" "}
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
    );
}
