import type { ArchiveDraw, RezultatiResponse } from './rezultatiTypes'
import './ArchivesPanel.css'

const TITLES: Record<string, string> = {
  loto: 'Loto',
  lotoPlus: 'Loto plus',
  joker: 'Joker 6',
  eurojackpot: 'Eurojackpot',
  vikinglotto: 'Vikinglotto',
}

function Balls({ nums, kind }: { nums: string[]; kind: 'main' | 'add' }) {
  if (nums.length === 0) return null
  return (
    <span className={`arch-balls ${kind === 'add' ? 'arch-balls--add' : ''}`} aria-label="številke">
      {nums.map((n, i) => (
        <span className="arch-ball" key={`${kind}-${i}-${n}`}>
          {n}
        </span>
      ))}
    </span>
  )
}

function ArchiveTable({ label, rows, sourceUrl }: { label: string; rows: ArchiveDraw[]; sourceUrl?: string }) {
  if (rows.length === 0) return null
  return (
    <div className="arch-block">
      <h3 className="arch-block-title">
        {label}
        {sourceUrl ? (
          <a className="arch-src" href={sourceUrl} target="_blank" rel="noreferrer">
            vir
          </a>
        ) : null}
      </h3>
      <ul className="arch-list" aria-label={`Arhiv ${label}`}>
        {rows.map((row, i) => (
          <li key={`${row.drawDate}-${i}`} className="arch-row">
            <div className="arch-date">{row.drawDate || '—'}</div>
            <div className="arch-nums">
              <Balls nums={row.main} kind="main" />
              {row.additional.length > 0 ? (
                <>
                  <span className="arch-plus">+</span>
                  <Balls nums={row.additional} kind="add" />
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type Props = { data: RezultatiResponse | null }

export function ArchivesPanel({ data }: Props) {
  const a = data?.archives
  if (!a) {
    return (
      <section className="card arch" aria-labelledby="arch-naslov">
        <h2 className="subtitle" id="arch-naslov" style={{ margin: 0, fontSize: '1.05rem' }}>
          Zadnjih 5 žrebanj
        </h2>
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          Arhiv še ni na voljo. Osvežite, ko je API povezan in so strani parsirane.
        </p>
      </section>
    )
  }

  const src = data.archivesSource
  const keys = (['loto', 'lotoPlus', 'joker', 'eurojackpot', 'vikinglotto'] as const).filter(
    (k) => a[k] != null && (a[k] as ArchiveDraw[]).length > 0
  )

  if (keys.length === 0) {
    return null
  }

  return (
    <section className="card arch" aria-labelledby="arch-naslov">
      <h2 className="subtitle" id="arch-naslov" style={{ margin: 0, fontSize: '1.05rem' }}>
        Zadnjih do 5 žrebanj (javni arhiv)
      </h2>
      <p className="muted" style={{ margin: '0.4rem 0 0.75rem' }}>
        Številke po žrebanjih — za primerjavo s skenom. Uradne vrednosti in preveritev listka: Loterija
        Slovenije.
      </p>
      {keys.map((k) => {
        const rows = a[k] as ArchiveDraw[]
        const url = k === 'eurojackpot' ? src?.eurojackpot : k === 'vikinglotto' ? src?.vikinglotto : src?.loto
        return <ArchiveTable key={k} label={TITLES[k] ?? k} rows={rows} sourceUrl={url} />
      })}
    </section>
  )
}
