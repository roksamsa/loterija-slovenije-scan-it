/**
 * Potrdila on Loterija receipts are 7 digits (številka potrdila).
 * OCR often confuses 0/O, 1/l/I, 5/S, 8/B — normalize before matching.
 */
const DIGIT_CONFUSION: [RegExp, string][] = [
  [/[Oo]/g, '0'],
  [/[Il|]/g, '1'],
  [/[Ss]/g, '5'],
  [/[Zz]/g, '2'],
  [/[Bb]/g, '8'],
  [/[G]/g, '6'],
]

function normalizeOcrDigits(input: string): string {
  let s = input
  for (const [re, ch] of DIGIT_CONFUSION) s = s.replace(re, ch)
  return s
}

/** Lines that often precede the confirmation id on the receipt. */
const CONTEXT_HINTS = /potrdil|tevil|števil|vplačilu|POTRDILO/i

function scoreCandidate(line: string, lineIndex: number): number {
  let score = 0
  if (CONTEXT_HINTS.test(line)) score += 30
  // Zgoraj na listku je pogosto številka potrdila (prve vrstice).
  if (lineIndex === 0) score += 45
  else if (lineIndex < 3) score += 20 - lineIndex * 2
  // Header (prvih ~8 vrstic) še vedno zgoraj
  if (lineIndex < 8) score += 5
  if (/^\s*\d{7}\s*$/.test(line)) score += 10
  return score
}

/**
 * Return unique 7-digit candidates sorted by heuristics (best first).
 */
export function findConfirmationIds(raw: string): { value: string; score: number }[] {
  const lines = raw.split(/\r?\n/)
  const scored: { value: string; score: number }[] = []
  const seen = new Set<string>()

  lines.forEach((line, i) => {
    const n = normalizeOcrDigits(line)
    for (const m of n.matchAll(/\b(\d{7})\b/g)) {
      const value = m[1]
      if (seen.has(value)) continue
      seen.add(value)
      scored.push({ value, score: scoreCandidate(line, i) + 1 })
    }
  })

  // Also scan full normalized blob for 7-digit runs not on word boundaries.
  const flat = normalizeOcrDigits(raw.replace(/\s+/g, ' '))
  for (const m of flat.matchAll(/(?:^|[^\d])(\d{7})(?:[^\d]|$)/g)) {
    const value = m[1]
    if (seen.has(value)) continue
    seen.add(value)
    scored.push({ value, score: 0 })
  }

  return scored.sort((a, b) => b.score - a.score)
}

export function bestConfirmationId(raw: string): string | null {
  const list = findConfirmationIds(raw)
  return list[0]?.value ?? null
}
