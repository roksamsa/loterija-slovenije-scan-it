export type Subgame = {
  name: string
  main: string[]
  additional: string[]
}

export type GameBlock = {
  drawLabel: string
  nextDraw: string
  subgames: Subgame[]
}

export type LotoPrizeRow = {
  /** e.g. "5 + 1", "4" */
  tier: string
  /** npr. "7" ali "Prenos" */
  steviloDobitkov: string
  /** npr. "1.294,30 €" */
  vrednost: string
}

/** Eno žrebanje v arhivu (Loto, Loto plus, Joker, Eurojackpot, Viking). */
export type ArchiveDraw = {
  drawDate: string
  main: string[]
  additional: string[]
}

export type RezultatiResponse = {
  source: string
  fetchedAt: string
  games: {
    loto?: GameBlock
    eurojackpot?: GameBlock
    vikinglotto?: GameBlock
  }
  /** Tabela vrednosti dobitka na polje, z /loto/rezultati (če je parsiranje uspelo) */
  lotoPrizeTiers?: LotoPrizeRow[]
  lotoPrizeSource?: string
  /** Zadnjih do 5 krogov na igro (strežnik z /loto in /eurojackpot in /vikinglotto rezultati) */
  archives?: {
    loto?: ArchiveDraw[]
    lotoPlus?: ArchiveDraw[]
    joker?: ArchiveDraw[]
    eurojackpot?: ArchiveDraw[]
    vikinglotto?: ArchiveDraw[]
  }
  /** URL-ji strani, s katerih so arhivi (informativno) */
  archivesSource?: { loto?: string; eurojackpot?: string; vikinglotto?: string }
}
