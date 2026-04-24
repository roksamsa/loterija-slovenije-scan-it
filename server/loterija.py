"""
Parsiranje javne strani Rezultati (https://www.loterija.si/rezultati).
Stran je statičen HTML – zadostuje HTTP + parsel (Scrapy-združljivi CSS selektorji).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from parsel import Selector

RESULTS_URL = "https://www.loterija.si/rezultati"
LOTO_REZULTATI_URL = "https://www.loterija.si/loto/rezultati"
EJP_REZULTATI_URL = "https://www.loterija.si/eurojackpot/rezultati"
VIKING_REZULTATI_URL = "https://www.loterija.si/vikinglotto/rezultati"
ARCHIVE_MAX = 5

_WS = re.compile(r"\s+")


def _clean(s: str | None) -> str:
    if not s:
        return ""
    t = s.replace("\xa0", " ")
    return _WS.sub(" ", t).strip()


def _parse_subgame(node: Selector) -> dict[str, Any] | None:
    name_raw = node.css(".game-name::text").get()
    name = _clean(name_raw)
    if not name:
        return None

    main: list[str] = []
    for t in node.css("div.numbers div.number:not(.additional)::text").getall():
        t = t.strip()
        if t.isdigit():
            main.append(t)

    additional: list[str] = []
    for ad in node.css("div.numbers div.number.additional"):
        blob = " ".join(ad.css("::text").getall())
        for m in re.findall(r"\d+", blob):
            additional.append(m)

    return {"name": name, "main": main, "additional": additional}


def _parse_game_block(sec: Selector) -> dict[str, Any] | None:
    h2 = sec.css(".left h2")
    if not h2:
        return None
    draw_label = _clean(h2[0].xpath("string(.)").get())

    next_draw = _clean(sec.css(".next-draw").xpath("string(.)").get())

    subgames: list[dict[str, Any]] = []
    for el in sec.css(".left .subgame-element"):
        sg = _parse_subgame(el)
        if sg:
            subgames.append(sg)

    return {
        "drawLabel": draw_label,
        "nextDraw": next_draw,
        "subgames": subgames,
    }


def parse_results_html(html: str) -> dict[str, Any]:
    root = Selector(text=html)
    out: dict[str, Any] = {
        "source": RESULTS_URL,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "games": {},
    }

    mapping = [
        ("loto", "section.loto.results"),
        ("eurojackpot", "section.ejp.results"),
        ("vikinglotto", "section.vikinglotto.results"),
    ]

    for key, sel in mapping:
        sec = root.css(sel)
        if not sec:
            continue
        parsed = _parse_game_block(sec[0])
        if parsed:
            out["games"][key] = parsed

    return out


def parse_loto_prize_tiers(detail_html: str) -> list[dict[str, str]]:
    """Tabela dobitkov z #loto-dobitki (stran /loto/rezultati)."""
    root = Selector(text=detail_html)
    out: list[dict[str, str]] = []
    for row in root.css("#loto-dobitki .details-row-data"):
        cells = row.css('div[role="cell"]')
        if len(cells) < 3:
            continue
        tier = _clean(cells[0].xpath("string(.)").get())
        nwin = _clean(cells[1].xpath("string(.)").get())
        value = _clean(cells[2].xpath("string(.)").get())
        if not tier or not value:
            continue
        out.append({"tier": tier, "steviloDobitkov": nwin, "vrednost": value})
    return out


def _date_from_game_header(draw_label: str) -> str:
    m = re.search(r"(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})", draw_label)
    if m:
        return _clean(m.group(1).replace(" ", " "))
    return _clean(draw_label)


def _parse_one_archive_block(el: Selector) -> dict[str, Any] | None:
    """En krog iz arhiva (Loto, Loto plus, EJP, …)."""
    d_raw = el.css("h3.date::text").get() or el.css(".date").xpath("string(.)").get()
    date = _clean(d_raw or "")
    nums = el.css(".numbers")
    if not nums:
        return None
    n0 = nums[0]
    main: list[str] = []
    for t in n0.css("div.number:not(.additional)::text").getall():
        t = t.strip()
        if t.isdigit():
            main.append(t)
    additionals: list[str] = []
    for ad in n0.css("div.number.additional"):
        blob = " ".join(ad.css("::text").getall())
        for m in re.findall(r"\d+", blob):
            additionals.append(m)
    if not main:
        return None
    return {"drawDate": date, "main": main, "additional": additionals}


def _parse_tab_archive(
    loto_page_html: str, tab_id: str, cap: int = ARCHIVE_MAX
) -> list[dict[str, Any]]:
    root = Selector(text=loto_page_html)
    tab = root.css(f"div#{tab_id}")
    if not tab:
        return []
    out: list[dict[str, Any]] = []
    for el in tab[0].css(".archive-element"):
        b = _parse_one_archive_block(el)
        if b:
            out.append(b)
        if len(out) >= cap * 2:
            break
    return out[:cap]


def _merge_ejp(games: dict, arch: list[dict[str, Any]]) -> list[dict[str, Any]]:
    g = games.get("eurojackpot")
    if not g:
        return arch[:ARCHIVE_MAX]
    sub = next(
        (s for s in g.get("subgames", []) if s.get("name") == "Eurojackpot"), None
    )
    if not sub or not sub.get("main"):
        return arch[:ARCHIVE_MAX]
    latest = {
        "drawDate": _date_from_game_header(g.get("drawLabel", "")),
        "main": sub.get("main", []),
        "additional": sub.get("additional", []),
    }
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in (latest, *arch):
        d = row.get("drawDate") or ""
        if d and d not in seen and row.get("main"):
            seen.add(d)
            out.append(row)
        if len(out) >= ARCHIVE_MAX:
            break
    return out[:ARCHIVE_MAX]


def _merge_viking(games: dict, arch: list[dict[str, Any]]) -> list[dict[str, Any]]:
    g = games.get("vikinglotto")
    if not g:
        return arch[:ARCHIVE_MAX]
    sub = next(
        (s for s in g.get("subgames", []) if s.get("name") == "Vikinglotto"), None
    )
    if not sub or not sub.get("main"):
        return arch[:ARCHIVE_MAX]
    latest = {
        "drawDate": _date_from_game_header(g.get("drawLabel", "")),
        "main": sub.get("main", []),
        "additional": sub.get("additional", []),
    }
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in (latest, *arch):
        d = row.get("drawDate") or ""
        if d and d not in seen and row.get("main"):
            seen.add(d)
            out.append(row)
        if len(out) >= ARCHIVE_MAX:
            break
    return out[:ARCHIVE_MAX]


def _merge_loto(
    games: dict[str, Any], sub_name: str, arch: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    g = games.get("loto")
    if not g:
        return arch[:ARCHIVE_MAX]
    sub = next(
        (s for s in g.get("subgames", []) if s.get("name") == sub_name), None
    )
    if not sub or not sub.get("main"):
        return arch[:ARCHIVE_MAX]
    latest = {
        "drawDate": _date_from_game_header(g.get("drawLabel", "")),
        "main": sub.get("main", []),
        "additional": sub.get("additional", []),
    }
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in (latest, *arch):
        d = row.get("drawDate") or ""
        if d and d not in seen and row.get("main"):
            seen.add(d)
            out.append(row)
        if len(out) >= ARCHIVE_MAX:
            break
    return out[:ARCHIVE_MAX]


def _merge_joker_sub(games: dict, arch: list[dict[str, Any]]) -> list[dict[str, Any]]:
    g = games.get("loto")
    if not g:
        return arch[:ARCHIVE_MAX]
    sub = next((s for s in g.get("subgames", []) if s.get("name") == "Joker"), None)
    if not sub or not sub.get("main"):
        return arch[:ARCHIVE_MAX]
    latest = {
        "drawDate": _date_from_game_header(g.get("drawLabel", "")),
        "main": sub.get("main", []),
        "additional": sub.get("additional", []),
    }
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in (latest, *arch):
        d = row.get("drawDate") or ""
        if d and d not in seen and row.get("main"):
            seen.add(d)
            out.append(row)
        if len(out) >= ARCHIVE_MAX:
            break
    return out[:ARCHIVE_MAX]


def build_full_payload(
    index_html: str,
    loto_page_html: str | None,
    ejp_page_html: str | None = None,
    viking_page_html: str | None = None,
) -> dict[str, Any]:
    out = parse_results_html(index_html)
    games = out.get("games", {})
    if loto_page_html:
        try:
            tiers = parse_loto_prize_tiers(loto_page_html)
            if tiers:
                out["lotoPrizeTiers"] = tiers
                out["lotoPrizeSource"] = LOTO_REZULTATI_URL
        except Exception:
            pass

    archives: dict[str, list[dict[str, Any]]] = {}
    if loto_page_html:
        try:
            a_l = _parse_tab_archive(loto_page_html, "loto", cap=8)
            a_lp = _parse_tab_archive(loto_page_html, "lotoplus", cap=8)
            a_j = _parse_tab_archive(loto_page_html, "joker", cap=8)
            archives["loto"] = _merge_loto(games, "Loto", a_l)
            archives["lotoPlus"] = _merge_loto(games, "Loto plus", a_lp)
            archives["joker"] = _merge_joker_sub(games, a_j)
        except Exception:
            pass
    if ejp_page_html:
        try:
            a_e = _parse_tab_archive(ejp_page_html, "ejp", cap=8)
            archives["eurojackpot"] = _merge_ejp(games, a_e)
        except Exception:
            pass
    if viking_page_html:
        try:
            a_v = _parse_tab_archive(viking_page_html, "vikinglotto", cap=8)
            archives["vikinglotto"] = _merge_viking(games, a_v)
        except Exception:
            pass
    if archives:
        out["archives"] = archives
        out["archivesSource"] = {
            "loto": LOTO_REZULTATI_URL,
            "eurojackpot": EJP_REZULTATI_URL,
            "vikinglotto": VIKING_REZULTATI_URL,
        }
    return out
