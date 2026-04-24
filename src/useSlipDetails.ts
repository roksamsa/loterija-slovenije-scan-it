import { useCallback, useEffect, useState } from 'react'
import { extractSlipLotoContext, poljaFromSlipJson, type SlipWinningInfo } from './parseSlipResponse'
import type { ParsedPolje } from './parseLotoFields'
import type { SlipRoundInfo } from './slipDate'

export type SlipHookState = {
  loading: boolean
  error: string | null
  /** Loto polja z uradnega vmesnika (če uspe) */
  polja: ParsedPolje[] | null
  /** true = Loto, false = ne Loto, null = ne vemo / ne velja */
  isLoto: boolean | null
  message: string | null
  /** Krog žreba z listka (usmeri primerjavo z arhivom) */
  rounds: SlipRoundInfo[] | null
  winnings: SlipWinningInfo[] | null
  /** surovi JSON za razhroščevanje (ne prikazuj) */
  lastPayload: unknown | null
}

const empty: SlipHookState = {
  loading: false,
  error: null,
  polja: null,
  isLoto: null,
  message: null,
  rounds: null,
  winnings: null,
  lastPayload: null,
}

export function useSlipDetails(serijska7: string) {
  const [st, setSt] = useState<SlipHookState>(empty)
  const base = import.meta.env.VITE_API_BASE ?? ''

  const load = useCallback(async (id: string) => {
    if (id.length !== 7) {
      setSt(empty)
      return
    }
    setSt({
      loading: true,
      error: null,
      polja: null,
      isLoto: null,
      message: null,
      rounds: null,
      winnings: null,
      lastPayload: null,
    })
    try {
      const r = await fetch(`${base}/api/slip/${id}`)
      const text = await r.text()
      let j: unknown
      try {
        j = JSON.parse(text) as unknown
      } catch {
        throw new Error('Nepričakovan odgovor')
      }
      if (r.status === 404) {
        setSt({
          loading: false,
          error: null,
          polja: null,
          isLoto: null,
          message: 'Listka s to številko nismo našli.',
          rounds: null,
          winnings: null,
          lastPayload: j,
        })
        return
      }
      if (!r.ok) {
        const detail =
          j && typeof j === 'object' && 'detail' in j && typeof (j as { detail: unknown }).detail === 'string'
            ? (j as { detail: string }).detail
            : r.statusText
        throw new Error(detail)
      }
      const ctx = extractSlipLotoContext(j)
      const parsed = poljaFromSlipJson(j)
      if (!parsed) {
        setSt({
          loading: false,
          error: null,
          polja: null,
          isLoto: null,
          message: 'Neprepoznana oblika',
          rounds: ctx.rounds.length > 0 ? ctx.rounds : null,
          winnings: ctx.winnings.length > 0 ? ctx.winnings : null,
          lastPayload: j,
        })
        return
      }
      if (parsed.isLoto && parsed.polja.length > 0) {
        setSt({
          loading: false,
          error: null,
          polja: parsed.polja,
          isLoto: true,
          message: null,
          rounds: ctx.rounds.length > 0 ? ctx.rounds : null,
          winnings: ctx.winnings.length > 0 ? ctx.winnings : null,
          lastPayload: j,
        })
        return
      }
      setSt({
        loading: false,
        error: null,
        polja: null,
        isLoto: parsed.isLoto,
        message: parsed.reason,
        rounds: ctx.rounds.length > 0 ? ctx.rounds : null,
        winnings: ctx.winnings.length > 0 ? ctx.winnings : null,
        lastPayload: j,
      })
    } catch (e) {
      setSt({
        loading: false,
        error: e instanceof Error ? e.message : 'Napaka',
        polja: null,
        isLoto: null,
        message: null,
        rounds: null,
        winnings: null,
        lastPayload: null,
      })
    }
  }, [base])

  useEffect(() => {
    if (serijska7.length !== 7 || !/^\d{7}$/.test(serijska7)) {
      setSt(empty)
      return
    }
    void load(serijska7)
  }, [serijska7, load])

  return { ...st, reload: () => load(serijska7) }
}
