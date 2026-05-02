import type { ParsedPolje } from './parseLotoFields'
import type { SlipRoundInfo } from './slipDate'

/** Loto (vzorec: game_code: 2). */
const GAME_LOTO = 2

type SlipField = { main_numbers?: number[] }
type SlipJson = {
  played_numbers?: {
    game_code?: number
    fields?: SlipField[]
  }
  rounds?: {
    game_code?: number
    draw_on?: string
    round?: number
    year?: number
    draw_happened?: boolean
    status_winning?: boolean
    extra_draw?: boolean
  }[]
  slip_details?: {
    winnings?: {
      game_code?: number
      name?: string
      value?: number
      year?: number
      round?: number
      quantity?: number
      type?: string
    }[]
  }
}

function isValidLotoField(m: number[]): boolean {
  if (m.length !== 6) return false
  return m.every((n) => Number.isFinite(n) && n >= 1 && n <= 50)
}

export type SlipParseResult = {
  polja: ParsedPolje[]
  isLoto: boolean
  reason: string
}

/**
 * Izvleče polja Loto iz JSON-a e.loterija (slip-details-by-serijska).
 */
export function poljaFromSlipJson(data: unknown): SlipParseResult | null {
  if (!data || typeof data !== 'object') return null
  const o = data as SlipJson
  const played = o.played_numbers
  if (!played) return { polja: [], isLoto: false, reason: 'Ni iger' }

  const code = played.game_code
  const fields = played.fields
  if (!Array.isArray(fields) || fields.length === 0) {
    return { polja: [], isLoto: false, reason: 'Ni polj' }
  }

  if (code !== undefined && code !== GAME_LOTO) {
    return { polja: [], isLoto: false, reason: 'Ta potrditev ni Loto' }
  }

  const polja: ParsedPolje[] = []
  for (let i = 0; i < fields.length; i++) {
    const m = fields[i]?.main_numbers
    if (!Array.isArray(m) || !isValidLotoField(m)) continue
    polja.push({ index: i + 1, numbers: [...m] })
  }

  if (polja.length === 0) {
    return {
      polja: [],
      isLoto: code === GAME_LOTO,
      reason: code === GAME_LOTO ? 'Ni prepoznanih Loto polj' : 'Ni Loto polj',
    }
  }
  return { polja, isLoto: true, reason: 'ok' }
}

export type SlipWinningInfo = {
  name: string
  value: number
  year: number
  round: number
  quantity: number
  type: string
}

/**
 * Krog žreba in izplačila z listka — za usmerjeno primerjavo in prikaz uradnega dobitka.
 */
export function extractSlipLotoContext(data: unknown): {
  rounds: SlipRoundInfo[]
  winnings: SlipWinningInfo[]
} {
  if (!data || typeof data !== 'object') {
    return { rounds: [], winnings: [] }
  }
  const o = data as SlipJson
  const rounds: SlipRoundInfo[] = []
  if (Array.isArray(o.rounds)) {
    for (const r of o.rounds) {
      if (r?.game_code != null && r.game_code !== GAME_LOTO) continue
      const draw = r?.draw_on
      if (typeof draw !== 'string' || !draw) continue
      rounds.push({
        drawOn: draw,
        round: typeof r.round === 'number' ? r.round : 0,
        year: typeof r.year === 'number' ? r.year : 0,
        drawHappened: r.draw_happened === true,
        statusWinning: r.status_winning === true,
        extraDraw: r.extra_draw === true,
      })
    }
  }
  const winnings: SlipWinningInfo[] = []
  const w = o.slip_details?.winnings
  if (Array.isArray(w)) {
    for (const x of w) {
      if (x?.game_code != null && (x as { game_code: number }).game_code !== GAME_LOTO) continue
      const name = typeof x?.name === 'string' ? x.name : ''
      winnings.push({
        name,
        value: typeof x?.value === 'number' ? x.value : 0,
        year: typeof x?.year === 'number' ? x.year : 0,
        round: typeof x?.round === 'number' ? x.round : 0,
        quantity: typeof x?.quantity === 'number' ? x.quantity : 0,
        type: typeof x?.type === 'string' ? x.type : '',
      })
    }
  }
  return { rounds, winnings }
}
