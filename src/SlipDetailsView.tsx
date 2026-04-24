import './SlipDetailsView.css'

type Field = { main_numbers?: number[]; extra_numbers?: number[] }

type SlipShape = {
  price?: number
  slip_number?: string
  played_numbers?: {
    game_code?: number
    num_of_rounds?: number
    fields?: Field[]
    loto_extra?: { loto_plus?: boolean; lotko?: unknown[] }
  }
  slip_details?: {
    purchase_date?: string
    status?: string
    winnings?: {
      name?: string
      value?: number
      round?: number
      year?: number
      quantity?: number
    }[]
  }
  rounds?: {
    round?: number
    year?: number
    draw_on?: string
    draw_happened?: boolean
    status_winning?: boolean
    extra_draw?: boolean
  }[]
}

function asSlip(p: unknown): SlipShape {
  return p && typeof p === 'object' ? (p as SlipShape) : {}
}

type Props = {
  payload: unknown | null
  loading: boolean
  error: string | null
  /** e.g. listek ne obstaja (ob odgovoru brez polj) */
  serverMessage: string | null
  hasPotrdilo7: boolean
}

export function SlipDetailsView({ payload, loading, error, serverMessage, hasPotrdilo7 }: Props) {
  if (!hasPotrdilo7) {
    return null
  }
  if (loading && !payload) {
    return (
      <section className="card slip-view" aria-live="polite" aria-label="Listek">
        <h2 className="subtitle" style={{ margin: 0, fontSize: '1.05rem' }}>
          Listek (e.loterija)
        </h2>
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          Nalagam podatke s strežnika ob številki potrdila…
        </p>
      </section>
    )
  }
  if (error && !payload) {
    return (
      <section className="card slip-view">
        <h2 className="subtitle" style={{ margin: 0, fontSize: '1.05rem' }}>
          Listek (e.loterija)
        </h2>
        <p className="slip-view-err" role="alert">
          {error}
        </p>
        <p className="hint">Preverite, da imate 7 pravilnih števk, in da teče strežnik (npm run dev:all).</p>
      </section>
    )
  }
  if (!payload) {
    return null
  }

  const s = asSlip(payload)
  const pn = s.played_numbers
  if (!s.slip_number && !pn?.fields?.length && serverMessage) {
    return (
      <section className="card slip-view">
        <h2 className="subtitle" style={{ margin: 0, fontSize: '1.05rem' }}>
          Listek (e.loterija)
        </h2>
        <p className="muted" style={{ margin: '0.4rem 0 0' }}>
          {serverMessage}
        </p>
      </section>
    )
  }
  const fields = pn?.fields
  const sd = s.slip_details
  const rounds = s.rounds

  return (
    <section className="card slip-view" id="slip-odgovor" aria-label="Podatki listka s strežnika">
      <h2 className="subtitle" style={{ margin: 0, fontSize: '1.05rem' }}>
        Listek s strežnika (e.loterija)
      </h2>
      <p className="muted" style={{ margin: '0.35rem 0 0.75rem' }}>
        Po <strong>številki potrdila</strong> (7 mest) lokalni API naloži isti JSON kot splet, brez
        ročnega branja vseh polj s slike. Številko potrdila lokalno preberemo s skena.
      </p>

      <dl className="slip-kv">
        {s.slip_number != null && (
          <>
            <dt>Številka potrdila</dt>
            <dd>{s.slip_number}</dd>
          </>
        )}
        {s.price != null && (
          <>
            <dt>Vrednost vplačila</dt>
            <dd>
              {typeof s.price === 'number' ? `${s.price.toFixed(2).replace('.', ',')} €` : '—'}
            </dd>
          </>
        )}
        {sd?.purchase_date != null && (
          <>
            <dt>Datum vplačila</dt>
            <dd>
              {(() => {
                const d = new Date(sd.purchase_date)
                return Number.isNaN(d.getTime()) ? String(sd.purchase_date) : d.toLocaleString('sl-SI')
              })()}
            </dd>
          </>
        )}
        {sd?.status != null && (
          <>
            <dt>Status</dt>
            <dd>{sd.status}</dd>
          </>
        )}
        {pn?.num_of_rounds != null && (
          <>
            <dt>Št. krogov</dt>
            <dd>{pn.num_of_rounds}</dd>
          </>
        )}
        {pn?.loto_extra && (
          <>
            <dt>Loto plus</dt>
            <dd>{pn.loto_extra.loto_plus ? 'da' : 'ne'}</dd>
          </>
        )}
      </dl>

      {Array.isArray(fields) && fields.length > 0 ? (
        <div className="slip-fields">
          <h3 className="slip-h3">Polja (main_numbers)</h3>
          <ul className="slip-field-list">
            {fields.map((f, i) => (
              <li key={i} className="slip-field-row">
                <span className="slip-fi">Polje {i + 1}</span>
                <span className="slip-nums" aria-label="številke">
                  {Array.isArray(f.main_numbers) ? f.main_numbers.join(' · ') : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(sd?.winnings) && sd.winnings.length > 0 ? (
        <div className="slip-block">
          <h3 className="slip-h3">Dobitki (slip_details)</h3>
          <ul className="slip-win-list">
            {sd.winnings.map((w, i) => (
              <li key={i}>
                <strong>{w.name}</strong>
                {w.value != null ? ` — ${w.value.toFixed(2).replace('.', ',')} €` : ''}
                {w.round != null && w.year != null ? ` (krog ${w.round} / ${w.year})` : ''}
                {w.quantity != null && w.quantity > 1 ? ` · ${w.quantity}×` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(rounds) && rounds.length > 0 ? (
        <div className="slip-block">
          <h3 className="slip-h3">Krogi (rounds)</h3>
          <ul className="slip-rounds">
            {rounds.map((r, i) => (
              <li key={i} className="slip-round-item">
                <span className="slip-ri">Krog {r.round}</span> ({r.year})
                {r.draw_on ? (
                  <span className="slip-when">
                    {' '}
                    · {r.draw_happened ? 'žreb' : 'napoved'}:{' '}
                    {new Date(r.draw_on).toLocaleString('sl-SI')}
                  </span>
                ) : null}
                {r.status_winning != null ? (
                  <span className={r.status_winning ? 'slip-won' : ''}>
                    {r.status_winning ? ' · dobiten krog' : ''}
                  </span>
                ) : null}
                {r.extra_draw ? ' · posebno žrebanje' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="slip-raw" style={{ marginTop: '0.75rem' }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>
          Surovi JSON (odgovor API)
        </summary>
        <pre className="slip-pre">{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </section>
  )
}
