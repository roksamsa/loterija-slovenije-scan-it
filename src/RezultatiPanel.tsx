import type { GameBlock, RezultatiResponse } from './rezultatiTypes'
import './RezultatiPanel.css'

const TITLES: Record<string, string> = {
  loto: 'Loto',
  eurojackpot: 'Eurojackpot',
  vikinglotto: 'Vikinglotto',
}

function Balls({ nums, kind }: { nums: string[]; kind: 'main' | 'add' }) {
  if (nums.length === 0) return null
  return (
    <span className={`rez-balls ${kind === 'add' ? 'rez-balls--add' : ''}`} aria-label="številke">
      {nums.map((n, i) => (
        <span className="rez-ball" key={`${kind}-${i}-${n}`}>
          {n}
        </span>
      ))}
    </span>
  )
}

function GameCard({ k, g }: { k: string; g: GameBlock }) {
  return (
    <div className="rez-game">
      <h3 className="rez-game-title">{TITLES[k] ?? k}</h3>
      <p className="rez-meta">
        <strong>{g.drawLabel}</strong>
        {g.nextDraw ? <span className="rez-next"> · {g.nextDraw}</span> : null}
      </p>
      <ul className="rez-subs">
        {g.subgames.map((s, i) => (
          <li key={`${s.name}-${i}`}>
            <div className="rez-sub-h">
              <span className="rez-sub-name">{s.name}</span>
            </div>
            <div className="rez-sub-nums">
              <Balls nums={s.main} kind="main" />
              {s.additional.length > 0 ? (
                <>
                  <span className="rez-plus">+</span>
                  <Balls nums={s.additional} kind="add" />
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type RezultatiPanelProps = {
  data: RezultatiResponse | null
  error: string | null
  loading: boolean
  onRefresh: () => void
}

export function RezultatiPanel({ data, error, loading, onRefresh }: RezultatiPanelProps) {
  const keys = data?.games
    ? (Object.keys(data.games) as (keyof RezultatiResponse['games'])[]).filter(
        (k) => data.games[k] != null
      )
    : []

  return (
    <section className="card rez" aria-labelledby="rez-naslov" id="tekoci-rezultati">
      <h2 className="subtitle" id="rez-naslov" style={{ margin: 0, fontSize: '1.1rem' }}>
        Tekoči rezultati (loterija.si)
      </h2>
      <p className="muted" style={{ margin: '0.4rem 0 0.75rem' }}>
        Podatki se preberejo z javne strani{' '}
        <a href="https://www.loterija.si/rezultati" target="_blank" rel="noreferrer">
          Rezultati
        </a>
        {data?.lotoPrizeTiers?.length
          ? ' in tabela dobitkov Loto (stran Loto / rezultati).'
          : ' prek lokalnega strežnika (parsiranje HTML). '}
        Za uradno preveritev <strong>vašega</strong> listka uporabite &quot;Preveri potrdilo&quot; ali
        spodnji bralnik.
      </p>

      <div className="row" style={{ marginBottom: 10 }}>
        <button type="button" className="btn secondary" onClick={() => onRefresh()} disabled={loading}>
          {loading ? 'Nalagam…' : 'Osveži'}
        </button>
        {data?.fetchedAt ? (
          <span className="muted" style={{ fontSize: 13 }}>
            Posodobljeno: {new Date(data.fetchedAt).toLocaleString('sl-SI')}
          </span>
        ) : null}
      </div>

      {error && <p className="rez-err">{error}</p>}

      {!error && !loading && data && keys.length === 0 && (
        <p className="muted">Ni bilo mogoče razčleniti iger. Stran se je morda spremenila.</p>
      )}

      {data && keys.length > 0 ? (
        <div className="rez-grid">
          {keys.map((k) => {
            const g = data.games[k]
            if (!g) return null
            return <GameCard key={k} k={String(k)} g={g} />
          })}
        </div>
      ) : null}
    </section>
  )
}
