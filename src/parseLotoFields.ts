/**
 * Išče "N.polje" in šest z naslednje vrstice / iste vrste (Loto listek).
 */
export type ParsedPolje = { index: number; numbers: number[] }

function addPolje(
  byIndex: Map<number, number[]>,
  idx: number,
  nums: number[]
): void {
  if (idx < 1 || idx > 20) return
  if (nums.length !== 6) return
  if (nums.some((n) => Number.isNaN(n) || n < 1 || n > 50)) return
  if (new Set(nums).size !== 6) return
  if (!byIndex.has(idx)) byIndex.set(idx, nums)
}

export function parseLotoFieldsFromOcr(text: string): ParsedPolje[] {
  const blob = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const byIndex = new Map<number, number[]>()
  // "1. polje:" 04 11 15 ... (ista vrstica)
  const re1 = /(\d+)\s*[\s.:)\]]*\s*polj\w*[^\d\n.]*\s*((?:\d{1,2}[\s,]+){5}\d{1,2})/gi
  let m: RegExpExecArray | null
  while ((m = re1.exec(blob)) !== null) {
    const idx = parseInt(m[1], 10)
    const parts = m[2].match(/\d{1,2}/g) ?? []
    if (parts.length < 6) continue
    const nums = parts.slice(0, 6).map((d) => parseInt(d, 10))
    addPolje(byIndex, idx, nums)
  }
  // "polje 1" / "polje.1"
  const re2 = /polj\w*\s*[:.)\]]*\s*(\d+)[^\d\n]*\s*((?:\d{1,2}[\s,·]+){5}\d{1,2})/gi
  while ((m = re2.exec(blob)) !== null) {
    const idx = parseInt(m[1], 10)
    const parts = m[2].match(/\d{1,2}/g) ?? []
    if (parts.length < 6) continue
    const nums = parts.slice(0, 6).map((d) => parseInt(d, 10))
    addPolje(byIndex, idx, nums)
  }
  // Vrstica z oznako, šest številk v naslednji vrstici
  const lines = blob.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const a = line.match(/(\d+)\s*[\s.:)\]]*\s*polj\w*\s*$/i)
    const b = line.match(/^polj\w*\s*[:.)\]]*\s*(\d+)\s*$/i)
    const idx = a ? parseInt(a[1], 10) : b ? parseInt(b[1], 10) : NaN
    if (Number.isNaN(idx) || byIndex.has(idx)) continue
    const next = lines[i + 1] ?? ''
    const parts = next.match(/\d{1,2}/g) ?? []
    if (parts.length < 6) continue
    const nums = parts.slice(0, 6).map((d) => parseInt(d, 10))
    addPolje(byIndex, idx, nums)
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, numbers]) => ({ index, numbers }))
}
