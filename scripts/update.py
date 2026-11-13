#!/usr/bin/env python3
"""Met à jour data/events.json et les calendriers .ics.

Sources gratuites :
  - API publique d'ESPN (UFC, PFL) : carte complète avec l'heure de chaque combat.
  - Sherdog (toutes les autres organisations) : dates, lieux et cartes des combats.

Aucune dépendance externe : uniquement la bibliothèque standard de Python 3.9+.
Usage : python3 scripts/update.py [--days 150]
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "organizations.json"
OVERRIDES = ROOT / "data" / "overrides.json"
FRANCOPHONIE = ROOT / "config" / "francophonie.json"
FIGHTERS_CACHE = ROOT / "data" / "fighters.json"  # nationalités Sherdog déjà connues (url -> pays)
FIGHTER_COUNTRY: dict[str, str] = {}
OUT_JSON = ROOT / "data" / "events.json"
OUT_ICS_DIR = ROOT / "data" / "ics"

PARIS = ZoneInfo("Europe/Paris")
UA = "Mozilla/5.0 (compatible; mma-calendar-bot/1.0; +https://github.com/)"
SHERDOG = "https://www.sherdog.com"

SEGMENT_LABELS = {
    "early": "Early prelims",
    "prelims": "Prelims",
    "main": "Main card",
}

WEIGHTS_FR = {
    "strawweight": "Poids pailles",
    "flyweight": "Poids mouches",
    "bantamweight": "Poids coqs",
    "featherweight": "Poids plumes",
    "lightweight": "Poids légers",
    "super lightweight": "Poids super-légers",
    "welterweight": "Poids mi-moyens",
    "super welterweight": "Poids super mi-moyens",
    "middleweight": "Poids moyens",
    "super middleweight": "Poids super-moyens",
    "light heavyweight": "Poids mi-lourds",
    "cruiserweight": "Poids lourds-légers",
    "heavyweight": "Poids lourds",
    "super heavyweight": "Poids super-lourds",
    "atomweight": "Poids atomes",
    "catchweight": "Poids intermédiaire",
    "openweight": "Toutes catégories",
}

COUNTRY_TZ = {
    "france": "Europe/Paris", "belgium": "Europe/Brussels", "switzerland": "Europe/Zurich",
    "luxembourg": "Europe/Luxembourg", "monaco": "Europe/Monaco",
    "england": "Europe/London", "scotland": "Europe/London", "wales": "Europe/London",
    "northern ireland": "Europe/London", "united kingdom": "Europe/London", "uk": "Europe/London",
    "ireland": "Europe/Dublin", "poland": "Europe/Warsaw", "czech republic": "Europe/Prague",
    "czechia": "Europe/Prague", "slovakia": "Europe/Bratislava", "germany": "Europe/Berlin",
    "austria": "Europe/Vienna", "italy": "Europe/Rome", "spain": "Europe/Madrid",
    "portugal": "Europe/Lisbon", "netherlands": "Europe/Amsterdam", "the netherlands": "Europe/Amsterdam",
    "hungary": "Europe/Budapest", "croatia": "Europe/Zagreb", "serbia": "Europe/Belgrade",
    "slovenia": "Europe/Ljubljana", "bosnia and herzegovina": "Europe/Sarajevo",
    "romania": "Europe/Bucharest", "bulgaria": "Europe/Sofia", "greece": "Europe/Athens",
    "sweden": "Europe/Stockholm", "norway": "Europe/Oslo", "denmark": "Europe/Copenhagen",
    "finland": "Europe/Helsinki", "malta": "Europe/Malta", "cyprus": "Asia/Nicosia",
    "turkey": "Europe/Istanbul", "georgia": "Asia/Tbilisi", "armenia": "Asia/Yerevan",
    "azerbaijan": "Asia/Baku", "russia": "Europe/Moscow", "kazakhstan": "Asia/Almaty",
    "kyrgyzstan": "Asia/Bishkek", "uzbekistan": "Asia/Tashkent", "tajikistan": "Asia/Dushanbe",
    "united arab emirates": "Asia/Dubai", "uae": "Asia/Dubai", "qatar": "Asia/Qatar",
    "saudi arabia": "Asia/Riyadh", "bahrain": "Asia/Bahrain", "kuwait": "Asia/Kuwait",
    "jordan": "Asia/Amman", "egypt": "Africa/Cairo", "morocco": "Africa/Casablanca",
    "tunisia": "Africa/Tunis", "algeria": "Africa/Algiers", "south africa": "Africa/Johannesburg",
    "japan": "Asia/Tokyo", "south korea": "Asia/Seoul", "korea": "Asia/Seoul",
    "china": "Asia/Shanghai", "hong kong": "Asia/Hong_Kong", "taiwan": "Asia/Taipei",
    "thailand": "Asia/Bangkok", "vietnam": "Asia/Ho_Chi_Minh", "singapore": "Asia/Singapore",
    "malaysia": "Asia/Kuala_Lumpur", "philippines": "Asia/Manila", "indonesia": "Asia/Jakarta",
    "india": "Asia/Kolkata", "pakistan": "Asia/Karachi", "mongolia": "Asia/Ulaanbaatar",
    "australia": "Australia/Sydney", "new zealand": "Pacific/Auckland",
    "united states": "America/New_York", "usa": "America/New_York",
    "canada": "America/Toronto", "mexico": "America/Mexico_City", "brazil": "America/Sao_Paulo",
    "argentina": "America/Argentina/Buenos_Aires", "chile": "America/Santiago",
    "peru": "America/Lima", "colombia": "America/Bogota",
}

COUNTRY_FR = {
    "france": "France", "belgium": "Belgique", "switzerland": "Suisse", "england": "Angleterre",
    "scotland": "Écosse", "wales": "Pays de Galles", "ireland": "Irlande", "poland": "Pologne",
    "czech republic": "Tchéquie", "slovakia": "Slovaquie", "germany": "Allemagne",
    "austria": "Autriche", "italy": "Italie", "spain": "Espagne", "portugal": "Portugal",
    "the netherlands": "Pays-Bas", "netherlands": "Pays-Bas", "hungary": "Hongrie",
    "croatia": "Croatie", "serbia": "Serbie", "japan": "Japon", "thailand": "Thaïlande",
    "singapore": "Singapour", "philippines": "Philippines", "china": "Chine",
    "united arab emirates": "Émirats arabes unis", "uae": "Émirats arabes unis",
    "qatar": "Qatar", "saudi arabia": "Arabie saoudite", "bahrain": "Bahreïn",
    "united states": "États-Unis", "usa": "États-Unis", "canada": "Canada", "mexico": "Mexique",
    "brazil": "Brésil", "australia": "Australie", "kazakhstan": "Kazakhstan",
    "morocco": "Maroc", "united kingdom": "Royaume-Uni", "luxembourg": "Luxembourg",
    "monaco": "Monaco", "sweden": "Suède", "norway": "Norvège", "denmark": "Danemark",
    "south korea": "Corée du Sud", "argentina": "Argentine", "russia": "Russie",
    "georgia": "Géorgie", "turkey": "Turquie", "romania": "Roumanie", "greece": "Grèce",
}

US_STATE_TZ = {
    "NV": "America/Los_Angeles", "CA": "America/Los_Angeles", "WA": "America/Los_Angeles",
    "OR": "America/Los_Angeles", "AZ": "America/Phoenix", "UT": "America/Denver",
    "CO": "America/Denver", "NM": "America/Denver", "TX": "America/Chicago",
    "IL": "America/Chicago", "MO": "America/Chicago", "TN": "America/Chicago",
    "LA": "America/Chicago", "OK": "America/Chicago", "MN": "America/Chicago",
    "WI": "America/Chicago", "NE": "America/Chicago", "KS": "America/Chicago",
}


# --------------------------------------------------------------------------- #
# Outils
# --------------------------------------------------------------------------- #

def log(*args):
    print(*args, file=sys.stderr, flush=True)


def fetch(url: str, retries: int = 3) -> str:
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Échec du téléchargement {url}: {last}")


def parse_utc(s: str) -> datetime:
    """Accepte '2026-11-14T22:00Z' (ESPN) ou un ISO 8601 complet."""
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def clean(s: str) -> str:
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def weight_fr(w: str | None) -> str:
    if not w:
        return ""
    raw = w.strip()
    women = False
    low = raw.lower()
    if low.startswith("w ") or low.startswith("women's "):
        women = True
        low = re.sub(r"^(w|women's)\s+", "", low)
    fr = WEIGHTS_FR.get(low, raw)
    return f"{fr} (F)" if women else fr


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s[:80]


def country_key(country: str) -> str:
    return (country or "").strip().lower()


def tz_for(country: str, state: str | None, default_tz: str) -> ZoneInfo:
    key = country_key(country)
    if key in ("usa", "united states") and state and state in US_STATE_TZ:
        return ZoneInfo(US_STATE_TZ[state])
    if key in ("usa", "united states") and state:
        return ZoneInfo("America/New_York")
    return ZoneInfo(COUNTRY_TZ.get(key, default_tz))


def country_fr(country: str) -> str:
    return COUNTRY_FR.get(country_key(country), country)


# --------------------------------------------------------------------------- #
# ESPN
# --------------------------------------------------------------------------- #

def espn_events(org: dict, league: str, start: datetime, end: datetime) -> list[dict]:
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/mma/{league}/scoreboard"
        f"?dates={start:%Y%m%d}-{end:%Y%m%d}&limit=100"
    )
    data = json.loads(fetch(url))
    out = []
    for e in data.get("events", []):
        state = (e.get("status") or {}).get("type", {}).get("state")
        if state == "post":
            continue
        comps = e.get("competitions") or []
        venue = (e.get("venues") or [{}])[0] if e.get("venues") else (comps[0].get("venue") if comps else {}) or {}
        addr = venue.get("address") or {}
        fights = []
        for c in comps:
            competitors = sorted(c.get("competitors", []), key=lambda x: x.get("order", 0))
            if len(competitors) < 2:
                continue
            sides = []
            for x in competitors[:2]:
                a = x.get("athlete") or {}
                rec = (x.get("records") or [{}])[0].get("summary", "")
                sides.append({
                    "name": a.get("displayName") or a.get("fullName") or "?",
                    "record": rec,
                    "country": ((a.get("flag") or {}).get("alt")) or "",
                })
            fights.append({
                "a": sides[0],
                "b": sides[1],
                "weight": weight_fr((c.get("type") or {}).get("abbreviation")),
                "title": False,
                "start": c.get("date"),
                "time_valid": bool(c.get("timeValid", True)),
            })
        name = e.get("name", "")
        main_title, sub = split_title(name)
        out.append({
            "org": org["id"],
            "name": main_title,
            "subtitle": sub,
            "date_utc": e.get("date"),
            "venue": venue.get("fullName", ""),
            "city": addr.get("city", ""),
            "state": addr.get("state"),
            "country": addr.get("country", ""),
            "fights": fights,
            "url": next((l.get("href") for l in e.get("links", []) if l.get("href")), ""),
            "source": "ESPN",
        })
    return out


def split_title(name: str) -> tuple[str, str]:
    """'UFC 334: Gane vs. Hokit' -> ('UFC 334', 'Gane vs. Hokit')."""
    for sep in (": ", " - "):
        if sep in name:
            a, b = name.split(sep, 1)
            return a.strip(), b.strip()
    return name.strip(), ""


# --------------------------------------------------------------------------- #
# Sherdog
# --------------------------------------------------------------------------- #

def sherdog_title(name: str) -> tuple[str, str]:
    """Sherdog écrit '<Promo> - <Événement>' : 'Rizin FF - Rizin 55', 'ARES 45 - Zebo vs. Baki 2',
    'CW 213 - Cage Warriors 213: London', 'HXMMA 49 - Hexagone MMA 49'."""
    if " - " not in name:
        return split_title(name)
    x, y = (p.strip() for p in name.split(" - ", 1))
    if ": " in y:
        a, b = y.split(": ", 1)
        out = (a.strip(), b.strip())
    elif re.search(r"\d", x) and (" vs" in y.lower() or not re.search(r"\d", y)):
        out = (x, y)
    else:
        out = (y, "")
    return re.sub(r"^One ", "ONE ", out[0]), out[1]


def sherdog_events(org: dict, src: dict, start: datetime, end: datetime) -> list[dict]:
    page = fetch(f"{SHERDOG}/organizations/{src['org']}")
    i = page.find('class="single_tab" id="upcoming_tab"')
    j = page.find('class="single_tab" id="recent_tab"')
    if i < 0:
        return []
    block = page[i:j if j > i else None]
    rows = block.split("<tr onclick=")[1:]
    exclude = re.compile(src["exclude"], re.I) if src.get("exclude") else None
    out = []
    for row in rows:
        m_url = re.search(r"/events/[^'\"]+", row)
        m_date = re.search(r'startDate" content="(\d{4}-\d{2}-\d{2})', row)
        m_name = re.search(r'itemprop="name">([^<]+)<', row)
        m_loc = re.search(r'itemprop="location">(.*?)</td>', row, re.S)
        if not (m_url and m_date and m_name):
            continue
        name = clean(m_name.group(1))
        if exclude and exclude.search(name):
            continue
        day = datetime.strptime(m_date.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if day < start - timedelta(days=1) or day > end:
            continue
        loc = clean(m_loc.group(1)) if m_loc else ""
        parts = [p.strip() for p in loc.split(",") if p.strip()]
        ev = {
            "org": org["id"],
            "date_local": m_date.group(1),
            "venue": parts[0] if len(parts) >= 3 else "",
            "city": parts[-3] if len(parts) >= 4 else (parts[-2] if len(parts) >= 2 else ""),
            "state": None,
            "country": parts[-1] if parts else "",
            "url": SHERDOG + m_url.group(0),
            "source": "Sherdog",
        }
        main_title, sub = sherdog_title(name)
        ev["name"], ev["subtitle"] = main_title, sub
        try:
            time.sleep(1.0)  # politesse envers le site
            ev["fights"] = sherdog_card(fetch(ev["url"]))
            for f in ev["fights"]:
                for side in (f["a"], f["b"]):
                    side["country"] = fighter_country(side.pop("url", ""))
        except Exception as e:  # noqa: BLE001
            log(f"   ! carte indisponible pour {name}: {e}")
            ev["fights"] = []
        out.append(ev)
    return out


def fighter_urls(html_block: str) -> list[str]:
    """Liens /fighter/… dans l'ordre d'apparition, sans doublon."""
    seen: list[str] = []
    for u in re.findall(r'href=["\'](/fighter/[^"\']+)["\']', html_block):
        if u not in seen:
            seen.append(u)
    return seen


def fighter_country(path: str) -> str:
    """Nationalité d'un combattant Sherdog, lue sur sa fiche et gardée en mémoire d'une semaine sur l'autre."""
    if not path:
        return ""
    if path in FIGHTER_COUNTRY:
        return FIGHTER_COUNTRY[path]
    try:
        time.sleep(0.8)  # politesse envers le site
        m = re.search(r'itemprop="nationality">([^<]+)<', fetch(SHERDOG + path))
    except Exception as e:  # noqa: BLE001
        log(f"   ! nationalité indisponible pour {path}: {e}")
        return ""  # pas mis en mémoire : nouvel essai la semaine suivante
    FIGHTER_COUNTRY[path] = clean(m.group(1)) if m else ""
    return FIGHTER_COUNTRY[path]


def sherdog_card(page: str) -> list[dict]:
    fights = []
    # Main event (bloc en haut de page)
    m = re.search(r'<div class="fight_card">(.*?)</section>', page, re.S)
    if m:
        blk = m.group(1)
        names = re.findall(r'<h3>\s*<a[^>]*><span itemprop="name">(.*?)</span>', blk, re.S)
        recs = re.findall(r'<span class="record">\s*([\d-]+)', blk)
        w = re.search(r'<span class="weight_class">(.*?)</span>', blk)
        urls = fighter_urls(blk)
        if len(names) >= 2:
            fights.append({
                "a": {"name": clean(names[0]), "record": recs[0] if recs else "", "country": "", "url": urls[0] if urls else ""},
                "b": {"name": clean(names[1]), "record": recs[1] if len(recs) > 1 else "", "country": "", "url": urls[1] if len(urls) > 1 else ""},
                "weight": weight_fr(clean(w.group(1)) if w else ""),
                "title": "title_fight" in blk,
                "main_event": True,
            })
    # Reste de la carte
    for row in re.findall(r'<tr itemprop="subEvent".*?</tr>', page, re.S):
        names = re.findall(r'<span itemprop="name">(.*?)</span>', row, re.S)
        recs = re.findall(r'<span class="record"><em>([\d-]+)</em>', row)
        w = re.search(r'<span class="weight_class">(.*?)</span>', row)
        urls = fighter_urls(row)
        if len(names) < 2:
            continue
        fights.append({
            "a": {"name": clean(names[0]), "record": recs[0] if recs else "", "country": "", "url": urls[0] if urls else ""},
            "b": {"name": clean(names[1]), "record": recs[1] if len(recs) > 1 else "", "country": "", "url": urls[1] if len(urls) > 1 else ""},
            "weight": weight_fr(clean(w.group(1)) if w else ""),
            "title": "title_fight" in row,
            "main_event": False,
        })
    return fights


# --------------------------------------------------------------------------- #
# Construction des événements normalisés
# --------------------------------------------------------------------------- #

def rule_for(org: dict, name: str) -> dict:
    for rule in org.get("rules", []):
        if re.search(rule["match"], name, re.I):
            return rule
    return {}


def broadcast_for(org: dict, name: str) -> tuple[dict, str]:
    rule = rule_for(org, name)
    return rule.get("broadcast", org.get("broadcast", {})), rule.get("notes", org.get("notes", ""))


def local_time(day: str, hhmm: str, tz: ZoneInfo) -> datetime:
    h, m = map(int, hhmm.split(":"))
    y, mo, d = map(int, day.split("-"))
    return datetime(y, mo, d, h, m, tzinfo=tz)


def build_segments_espn(org: dict, raw: dict) -> tuple[list[dict], list[dict]]:
    """Déduit early prelims / prelims / main card à partir des heures ESPN."""
    fights = raw["fights"]
    valid = [f for f in fights if f.get("start") and f.get("time_valid")]
    times = sorted({f["start"] for f in valid})
    seg_keys: list[str]
    if len(times) >= 3:
        times = times[-3:]
        seg_keys = ["early", "prelims", "main"]
    elif len(times) == 2:
        seg_keys = ["prelims", "main"]
    elif len(times) == 1:
        seg_keys = ["main"]
    else:
        seg_keys = []

    segments = [{"key": k, "start": parse_utc(t), "estimated": False} for k, t in zip(seg_keys, times)]
    seg_by_time = dict(zip(times, seg_keys))
    for f in fights:
        s = f.get("start")
        if s in seg_by_time:
            f["segment"] = seg_by_time[s]
        elif times and s and s < times[0]:
            f["segment"] = seg_keys[0]
        else:
            f["segment"] = "main" if seg_keys else None

    # ESPN donne parfois la même heure pour tous les combats : on découpe la carte.
    split = org.get("split_single_slot")
    if len(segments) == 1 and split and len(fights) >= 8:
        size = split["main_size"]
        if re.search(split.get("numbered_regex", "$^"), raw["name"]):
            size = split.get("main_size_numbered", size)
        base = segments[0]["start"]
        segments = [
            {"key": "prelims", "start": base, "estimated": False},
            {"key": "main", "start": base + timedelta(minutes=split["main_offset_min"]), "estimated": True},
        ]
        for idx, f in enumerate(fights):
            f["segment"] = "main" if idx >= len(fights) - size else "prelims"

    if not segments and raw.get("date_utc"):
        segments = [{"key": "main", "start": parse_utc(raw["date_utc"]), "estimated": True}]

    # ESPN liste du premier au dernier combat : on inverse pour avoir le main event en tête.
    fights = list(reversed(fights))
    if fights:
        fights[0]["main_event"] = True
    for f in fights:
        f.pop("start", None)
        f.pop("time_valid", None)
        f.setdefault("main_event", False)
    return segments, fights


def build_segments_sherdog(org: dict, raw: dict) -> tuple[list[dict], list[dict]]:
    rule = rule_for(org, f"{raw['name']} {raw.get('subtitle', '')}")
    if rule.get("tz"):
        tz = ZoneInfo(rule["tz"])
    else:
        tz = tz_for(raw["country"], raw.get("state"), org.get("default_tz", "Europe/Paris"))
    defaults = rule.get("default_times") or org.get("default_times", {"main": "20:00"})
    segments = []
    for key in ("early", "prelims", "main"):
        if key in defaults:
            segments.append({"key": key, "start": local_time(raw["date_local"], defaults[key], tz), "estimated": True})
    fights = raw.get("fights", [])
    keys = [s["key"] for s in segments]
    # Répartition indicative : main event + ~4 combats en main card, le reste en prelims.
    main_size = 5 if len(fights) >= 8 else len(fights)
    for idx, f in enumerate(fights):
        if "prelims" in keys and idx >= main_size:
            f["segment"] = "prelims"
        else:
            f["segment"] = "main"
    return segments, fights


def is_tba(name: str) -> bool:
    return bool(re.fullmatch(r"(opponent\s+)?tba|tbd|to be announced", name.strip(), re.I))


def load_francophonie() -> tuple[set[str], set[str], set[str]]:
    if not FRANCOPHONIE.exists():
        return set(), set(), set()
    cfg = json.loads(FRANCOPHONIE.read_text(encoding="utf-8"))
    low = lambda xs: {x.strip().lower() for x in xs}
    return low(cfg.get("pays", [])), low(cfg.get("toujours", [])), low(cfg.get("jamais", []))


FR_PAYS, FR_TOUJOURS, FR_JAMAIS = load_francophonie()


def is_francophone(side: dict) -> bool:
    name = side["name"].strip().lower()
    if name in FR_TOUJOURS:
        return True
    if name in FR_JAMAIS:
        return False
    return side.get("country", "").strip().lower() in FR_PAYS


def normalize(org: dict, raw: dict) -> dict:
    raw["fights"] = [f for f in raw.get("fights", []) if not (is_tba(f["a"]["name"]) and is_tba(f["b"]["name"]))]
    for f in raw["fights"]:
        for side in (f["a"], f["b"]):
            side["fr"] = is_francophone(side)
    if raw["source"] == "ESPN":
        segments, fights = build_segments_espn(org, raw)
    else:
        segments, fights = build_segments_sherdog(org, raw)
    bc, notes = broadcast_for(org, f"{raw['name']} {raw.get('subtitle', '')}")
    seg_out = []
    for s in segments:
        seg_out.append({
            "key": s["key"],
            "label": SEGMENT_LABELS[s["key"]],
            "start": iso(s["start"]),
            "estimated": s["estimated"],
            "channels": bc.get(s["key"]) or bc.get("main") or [],
        })
    start = min((s["start"] for s in segments), default=None)
    day_paris = start.astimezone(PARIS).strftime("%Y-%m-%d") if start else raw.get("date_local", "")
    return {
        "id": f"{org['id']}-{day_paris}-{slugify(raw['name'])}",
        "org": org["id"],
        "name": raw["name"],
        "subtitle": raw.get("subtitle", ""),
        "start": iso(start) if start else None,
        "segments": seg_out,
        "venue": raw.get("venue", ""),
        "city": raw.get("city", ""),
        "country": country_fr(raw.get("country", "")),
        "fights": fights,
        "notes": notes,
        "url": raw.get("url", ""),
        "source": raw["source"],
    }


def apply_overrides(events: list[dict], overrides: list[dict]) -> list[dict]:
    out = []
    for ev in events:
        label = f"{ev['name']} {ev['subtitle']}".lower()
        hide = False
        for ov in overrides:
            match = ov.get("match")
            if not match or match.lower() not in label:
                continue
            if ov.get("hide"):
                hide = True
            for key, val in (ov.get("times") or {}).items():
                dt = datetime.fromisoformat(val).replace(tzinfo=PARIS)
                seg = next((s for s in ev["segments"] if s["key"] == key), None)
                if seg is None:
                    seg = {"key": key, "label": SEGMENT_LABELS.get(key, key), "channels": []}
                    ev["segments"].append(seg)
                seg["start"], seg["estimated"] = iso(dt), False
            for key, chans in (ov.get("broadcast") or {}).items():
                for seg in ev["segments"]:
                    if seg["key"] == key:
                        seg["channels"] = chans
            if "notes" in ov:
                ev["notes"] = ov["notes"]
        order = {"early": 0, "prelims": 1, "main": 2}
        ev["segments"].sort(key=lambda s: order.get(s["key"], 9))
        if ev["segments"]:
            ev["start"] = min(s["start"] for s in ev["segments"])
        if not hide:
            out.append(ev)
    return out


# --------------------------------------------------------------------------- #
# Calendriers .ics
# --------------------------------------------------------------------------- #

def ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def ics_fold(line: str) -> str:
    raw = line.encode("utf-8")
    if len(raw) <= 74:
        return line
    parts, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > 73:
            parts.append(cur.decode("utf-8"))
            cur = b""
        cur += b
    parts.append(cur.decode("utf-8"))
    return "\r\n ".join(parts)


def build_ics(events: list[dict], orgs: dict, title: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FIGHTLY//FR", "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH", f"X-WR-CALNAME:{ics_escape(title)}", "X-WR-TIMEZONE:Europe/Paris",
        "REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:P1D",
    ]
    for ev in events:
        if not ev.get("start"):
            continue
        start = parse_utc(ev["start"])
        main = next((s for s in ev["segments"] if s["key"] == "main"), None)
        main_start = parse_utc(main["start"]) if main else start
        end = main_start + timedelta(hours=3)
        org = orgs[ev["org"]]
        desc = []
        if ev["subtitle"]:
            desc.append(ev["subtitle"])
        for s in ev["segments"]:
            t = parse_utc(s["start"]).astimezone(PARIS).strftime("%Hh%M")
            ch = ", ".join(c["name"] + (" (gratuit)" if c.get("free") else "") for c in s["channels"])
            desc.append(f"{s['label']} : {t}{' (estimée)' if s['estimated'] else ''} — {ch}")
        if ev["fights"]:
            desc.append("")
            for i, f in enumerate(ev["fights"][:6]):
                prefix = "Main event : " if i == 0 else "Co-main : " if i == 1 else ""
                belt = " ★ titre" if f.get("title") else ""
                desc.append(f"{prefix}{f['a']['name']} vs {f['b']['name']}" + (f" ({f['weight']}{belt})" if f["weight"] else belt))
        if ev.get("notes"):
            desc.append("")
            desc.append(ev["notes"])
        if ev.get("url"):
            desc.append(ev["url"])
        loc = ", ".join(x for x in (ev["venue"], ev["city"], ev["country"]) if x)
        summary = f"[{org['name']}] {ev['name']}" + (f" : {ev['subtitle']}" if ev["subtitle"] else "")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{ev['id']}@calendrier-mma",
            f"DTSTAMP:{now}",
            f"DTSTART:{start.strftime('%Y%m%dT%H%M%SZ')}",
            f"DTEND:{end.strftime('%Y%m%dT%H%M%SZ')}",
            f"SUMMARY:{ics_escape(summary)}",
            f"LOCATION:{ics_escape(loc)}",
            f"DESCRIPTION:{ics_escape(chr(10).join(desc))}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(ics_fold(l) for l in lines) + "\r\n"


# --------------------------------------------------------------------------- #
# Programme principal
# --------------------------------------------------------------------------- #

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=150, help="horizon en jours (défaut 150)")
    args = ap.parse_args()

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    orgs = cfg["organizations"]
    overrides = []
    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")).get("overrides", [])

    previous = {}
    if OUT_JSON.exists():
        try:
            for ev in json.loads(OUT_JSON.read_text(encoding="utf-8")).get("events", []):
                previous.setdefault(ev["org"], []).append(ev)
        except json.JSONDecodeError:
            pass

    if FIGHTERS_CACHE.exists():
        try:
            FIGHTER_COUNTRY.update(json.loads(FIGHTERS_CACHE.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            pass

    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=12)
    end = now + timedelta(days=args.days)
    all_events: list[dict] = []
    status = {}

    for org in orgs:
        log(f"→ {org['name']}")
        got = None
        for src in org["sources"]:
            try:
                if src["type"] == "espn":
                    raws = espn_events(org, src["league"], start, end)
                else:
                    raws = sherdog_events(org, src, start, end)
                got = [normalize(org, r) for r in raws]
                status[org["id"]] = {"ok": True, "source": src["type"], "count": len(got)}
                log(f"   {len(got)} événement(s) via {src['type']}")
                break
            except Exception as e:  # noqa: BLE001
                log(f"   ! source {src['type']} en échec : {e}")
        if got is None:
            # Toutes les sources ont échoué : on garde les données précédentes encore à venir.
            kept = [ev for ev in previous.get(org["id"], []) if ev.get("start") and ev["start"] >= iso(start)]
            status[org["id"]] = {"ok": False, "source": "cache", "count": len(kept)}
            log(f"   ! conservation de {len(kept)} événement(s) précédents")
            got = kept
        all_events.extend(got)

    all_events = apply_overrides(all_events, overrides)
    # On retire les soirées terminées (début de la main card il y a plus de 6 h).
    cutoff = iso(now - timedelta(hours=6))
    all_events = [
        ev for ev in all_events
        if max((s["start"] for s in ev["segments"]), default=ev.get("start") or "") >= cutoff
    ]
    # Dédoublonnage (même id)
    seen, uniq = set(), []
    for ev in sorted(all_events, key=lambda e: (e.get("start") or "9999", e["org"])):
        if ev["id"] in seen:
            continue
        seen.add(ev["id"])
        uniq.append(ev)

    org_meta = {
        o["id"]: {k: o.get(k) for k in ("name", "full_name", "color", "region", "notes")}
        for o in orgs
    }
    payload = {
        "generated_at": iso(now),
        "timezone": "Europe/Paris",
        "horizon_days": args.days,
        "organizations": org_meta,
        "status": status,
        "events": uniq,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    FIGHTERS_CACHE.write_text(json.dumps(dict(sorted(FIGHTER_COUNTRY.items())), ensure_ascii=False, indent=0) + "\n", encoding="utf-8")

    OUT_ICS_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_ICS_DIR / "mma.ics").write_text(build_ics(uniq, org_meta, "FIGHTLY — toutes les orgas"), encoding="utf-8", newline="")
    for oid, meta in org_meta.items():
        evs = [e for e in uniq if e["org"] == oid]
        (OUT_ICS_DIR / f"{oid}.ics").write_text(build_ics(evs, org_meta, f"FIGHTLY — {meta['name']}"), encoding="utf-8", newline="")

    log(f"✓ {len(uniq)} événements écrits dans {OUT_JSON.relative_to(ROOT)}")
    failed = [k for k, v in status.items() if not v["ok"]]
    if len(failed) == len(orgs):
        log("✗ Toutes les sources ont échoué")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
