import type { LotoPrizeRow } from './rezultatiTypes'

/** Ključi iz tabele "Prikaz dobitkov Loto" (1. stolpec) — morajo ustrezi API. */
export type LotoTier = '6' | '5 + 1' | '5' | '4 + 1' | '4' | '3 + 1' | '3' | '0 + 1'

/** Višja vrednost = močnejši dobitek. */
export const TIER_SCORE: Record<LotoTier, number> = {
  '0 + 1': 1,
  '3': 2,
  '3 + 1': 3,
  '4': 4,
  '4 + 1': 5,
  '5': 6,
  '5 + 1': 7,
  '6': 8,
}

export function tierScore(tier: LotoTier | null): number {
  return tier == null ? 0 : TIER_SCORE[tier] ?? 0
}

function toNumSet(mains: string[], additionals: string[]): { mains: Set<number>; add: number | null } {
  const m = new Set(mains.map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)))
  const addRaw = additionals[0] != null ? parseInt(additionals[0], 10) : NaN
  return { mains: m, add: !Number.isNaN(addRaw) ? addRaw : null }
}

/**
 * Določi razred (6, 5+1, …) po pravilih tabele, ki jo prikazuje loterija.si /loto/rezultati.
 */
export function classifyLotoRow(user: number[], mainStr: string[], additionalStr: string[]): LotoTier | null {
  const { mains: M, add: A } = toNumSet(mainStr, additionalStr)
  if (A == null) return null
  const U = new Set(user)
  if (U.size < 6) return null
  let inMain = 0
  for (const n of U) {
    if (M.has(n)) inMain += 1
  }
  const aIn = U.has(A)

  if (inMain === 6) return '6'
  if (inMain === 5) {
    const notInM = [...U].find((n) => !M.has(n))
    if (notInM == null) return null
    return notInM === A ? '5 + 1' : '5'
  }
  if (inMain === 4) {
    return aIn ? '4 + 1' : '4'
  }
  if (inMain === 3) {
    return aIn ? '3 + 1' : '3'
  }
  if (inMain === 0) {
    return aIn ? '0 + 1' : null
  }
  return null
}

function normTier(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function findPrizeForTier(tier: LotoTier, rows: LotoPrizeRow[] | undefined): LotoPrizeRow | null {
  if (!rows?.length) return null
  const t = normTier(tier)
  for (const r of rows) {
    if (normTier(r.tier) === t) return r
  }
  return null
}
