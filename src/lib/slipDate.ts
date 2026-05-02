import type { ArchiveDraw } from './rezultatiTypes'

/**
 * Enotna količina za primerjavo datumov: "2026-04-19" (iz ISO ali "19. 04. 2026").
 */
export function toDateKey(s: string): string | null {
  const t = s.trim()
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const sl = t.match(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/)
  if (sl) {
    const dd = sl[1].padStart(2, '0')
    const mm = sl[2].padStart(2, '0')
    return `${sl[3]}-${mm}-${dd}`
  }
  return null
}

export type SlipRoundInfo = {
  drawOn: string
  round: number
  year: number
  drawHappened: boolean
  statusWinning: boolean
  extraDraw?: boolean
}

/**
 * Pusti samo žrebe, ki ujemajo dni krogov s potrdila; vrstni red = vrstni red krogov na listek.
 * Če se nobeden ne ujame (npr. napačna oblika datuma v arhivu), vrne prazno in kličem naj fallback.
 */
export function matchArchiveToSlipRounds(
  archive: ArchiveDraw[],
  rounds: SlipRoundInfo[]
): ArchiveDraw[] {
  if (archive.length === 0 || rounds.length === 0) return []

  const byKey = new Map<string, ArchiveDraw>()
  for (const a of archive) {
    const k = toDateKey(a.drawDate)
    if (k) byKey.set(k, a)
  }

  const out: ArchiveDraw[] = []
  for (const r of rounds) {
    const k = toDateKey(r.drawOn)
    if (!k) continue
    const row = byKey.get(k)
    if (row) out.push(row)
  }
  return out
}
