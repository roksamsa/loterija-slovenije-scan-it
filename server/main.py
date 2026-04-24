from __future__ import annotations

import asyncio
import re

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from loterija import (
    EJP_REZULTATI_URL,
    LOTO_REZULTATI_URL,
    RESULTS_URL,
    VIKING_REZULTATI_URL,
    build_full_payload,
)

app = FastAPI(title="Loterija rezultati (proxy)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LoterijaScanIt/0.1; +https://github.com/)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "sl,en;q=0.8",
}

# Javni JSON (enaka pot kot splet / e-igralnica) — v brskalniku CORS, zato proxy.
SLIP_BASE = (
    "https://e.loterija.si/eloterija-services/gaming/"
    "game-info/slip-details-by-serijska"
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/slip/{serijska}")
async def slip_by_serial(serijska: str) -> dict:
    """Surovi JSON: podatki o listu po 7-mestni številki potrdila (javni endpoint e.loterija.si)."""
    if not re.fullmatch(r"\d{7}", serijska):
        raise HTTPException(
            status_code=400, detail="Potrebna je 7-mestna številka potrdila (številke)"
        )
    url = f"{SLIP_BASE}/{serijska}"
    headers = {**DEFAULT_HEADERS, "Accept": "application/json, text/plain, */*"}
    try:
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(20.0),
            follow_redirects=True,
        ) as client:
            r = await client.get(url)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502, detail=f"Napaka pri povezavi e.loterija.si: {e!s}"
        ) from e
    if r.is_server_error:
        raise HTTPException(
            status_code=502, detail=f"Napaka strežnika e.loterija: HTTP {r.status_code}"
        )
    try:
        return r.json()  # bodisi podatki listka bodisi strukturna napaka v JSONu
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail="Odgovor ni veljaven JSON"
        ) from e


@app.get("/api/rezultati")
async def api_rezultati() -> dict:
    try:
        async with httpx.AsyncClient(
            headers=DEFAULT_HEADERS,
            timeout=httpx.Timeout(30.0),
            follow_redirects=True,
        ) as client:
            r_idx, r_loto, r_ejp, r_vik = await asyncio.gather(
                client.get(RESULTS_URL),
                client.get(LOTO_REZULTATI_URL),
                client.get(EJP_REZULTATI_URL),
                client.get(VIKING_REZULTATI_URL),
            )
        r_idx.raise_for_status()
        loto_html = r_loto.text if r_loto.is_success else None
        ejp_html = r_ejp.text if r_ejp.is_success else None
        vik_html = r_vik.text if r_vik.is_success else None
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Napaka pri branju loterija.si: {e!s}") from e

    try:
        return build_full_payload(r_idx.text, loto_html, ejp_html, vik_html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri parsiranju: {e!s}") from e
