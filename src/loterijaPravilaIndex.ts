/**
 * Uradni viri pravil (PDF + strani) z https://www.loterija.si/pravila-iger-na-sreco
 * Posodobite datume/URL, ko Loterija objavi nove različice (preveri stran).
 * NE vgrajevati polnega besedila pravil (avtorsko, se spreminja) — le povezave.
 */

export const PRAVILA_IGER_HUB = 'https://www.loterija.si/pravila-iger-na-sreco'

type GamePravila = {
  name: string
  /** “Prečiščeno besedilo” ali osnovno pravilo (PDF) */
  primaryPdf: string
  /** Dodatna dopolnila, če so na hub strani navedena */
  supplements?: { label: string; url: string }[]
  infoPage?: string
}

/** Glavne številčne igre (težje dobiti iz skena) — uporabno za UI / povezave v README */
export const PRAVILA_PO_IGRAH: Record<string, GamePravila> = {
  'igralni-racun': {
    name: 'Igralni račun',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-o-poslovanju-z-igralnim-racunom170625.pdf',
  },
  joker: {
    name: 'Joker',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/pravila-igre-joker-precisceno-besedilo-16062025.pdf',
    infoPage: 'https://www.loterija.si/loto/joker',
  },
  loto: {
    name: 'Loto',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-igre-na-sreco-loto-010725.pdf',
    supplements: [
      {
        label: 'Dodatek 5.2.2026',
        url: 'https://www.loterija.si/files/za-igralce/pravila-iger/dodatek-pravil-igre-na-sreco-loto-050226.pdf',
      },
    ],
    infoPage: 'https://www.loterija.si/loto/vse-o-igri',
  },
  eurojackpot: {
    name: 'Eurojackpot',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-igre-na-sreco-eurojackpot-081025.pdf',
    infoPage: 'https://www.loterija.si/eurojackpot/vse-o-igri',
  },
  vikinglotto: {
    name: 'Vikinglotto',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-igre-na-sreco-vikinglotto-160625.pdf',
    infoPage: 'https://www.loterija.si/vikinglotto/vse-o-igri',
  },
  '3x3': {
    name: '3x3 plus 6',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-igre-na-sreco-3x3-170625.pdf',
    infoPage: 'https://www.loterija.si/3x3/vse-o-igri',
  },
  tikitaka: {
    name: 'TikiTaka',
    primaryPdf:
      'https://www.loterija.si/files/za-igralce/pravila-iger/precisceno-besedilo-pravil-igre-na-sreco-tikitaka-170625.pdf',
    infoPage: 'https://www.loterija.si/tikitaka/vse-o-igri',
  },
  'mednarodna-srecka': {
    name: 'Mednarodna srečka',
    primaryPdf:
      'https://www.loterija.si/files/srecke/pravila-sreck/pravila-igre-na-sreco-mednarodna-srecka-240425.pdf',
    supplements: [
      {
        label: 'Dodatek BIG CASH 8.9.2025',
        url: 'https://www.loterija.si/files/srecke/pravila-sreck/dodatek-pravil-igre-na-sreco-mednarodna-srecka-080925.pdf',
      },
    ],
  },
}

export function pravilaListForUi(): { key: string; name: string; url: string }[] {
  return [
    { key: 'hub', name: 'Vse igre (povezave na PDF)', url: PRAVILA_IGER_HUB },
    ...Object.entries(PRAVILA_PO_IGRAH).map(([key, p]) => ({
      key,
      name: p.name,
      url: p.primaryPdf,
    })),
  ]
}
