# loterija-slovenije-scan-it

Aplikacija naredi dve stvari:

1. **OCR** v brskalniku: s kamere ali s prebrane slike prebere [7-mestno številko potrdila](https://www.loterija.si/preveri-potrdilo), da jo lažje vpišete uradno na [Preveri potrdilo](https://www.loterija.si/preveri-potrdilo). Za dobitke in izplačilo velja uradno potrdilo in uradna stran.

2. **Tekoči rezultati**: majhen **Python (FastAPI)** strežnik prebere javno stran [Rezultati : Loterija Slovenije](https://www.loterija.si/rezultati), HTML razčleni z **parslom** (enake vrste CSS selektorjev kot pri [Scrapy](https://github.com/scrapy/parsel) / orodjih, sorodnih [Scrapling](https://github.com/D4Vinci/Scrapling)) in jih spletna stran prikaže. Ker je ta stran **statični HTML** v odzivu, **ni potrebe** po headless [Lightpanda](https://github.com/lightpanda-io/browser) ali brskalniku Playwright, dokler se oblikovanje ne spremeni v čisti SPA brez vsebine v prvem renderju.

## Zahtevi

- Node 20+ (priporočeno)
- Python 3.10+ z `pip`
- HTTPS ali `localhost` (dostop do kamere)

## Namestitev in zagon (frontend + API za rezultate)

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

**Oba procesa hkrati** (Vite + API na vratih 8000, proxy za `/api`):

```bash
npm run dev:all
```

- Samo UI (brez pridobivanja rezultatov prek API): `npm run dev`  
- Samo API: `npm run dev:api`  
- V brskalniku: npr. `http://127.0.0.1:5173` (Vite posreduje klice na `/api` proti `http://127.0.0.1:8000`).

Zgradba frontenda: `npm run build` (mape `dist/`). Za produkcijo potrebujete še proces, ki gosti API in po želji statične datoteke; nastavite `VITE_API_BASE` na javni bazi URL, če API ni na istem gostitelju.

## Opombe

- **Preveri potrdilo** osebnega listka: še vedno samo na [uradni strani](https://www.loterija.si/preveri-potrdilo); prikazani »rezultati« so javni podatki z Rezultati in ne pomenijo, da imate (ali nimate) dobitka.
- **Več žrebanj** na enem listku: [Preveri potrdilo](https://www.loterija.si/preveri-potrdilo) upošteva uradno stanje; ročno primerjavo s tabelo rezultatov ob novih krogih vzemite informativno.
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/); prvi zagon lahko naloži jezikovne pakete.

## Povezave

- [Preveri potrdilo](https://www.loterija.si/preveri-potrdilo)
- [Rezultati](https://www.loterija.si/rezultati) — vir za prikaz v aplikaciji
