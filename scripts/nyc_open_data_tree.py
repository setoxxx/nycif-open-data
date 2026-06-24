#!/usr/bin/env python3
"""Fetch a compact NYC Open Data catalog index from Socrata Discovery API."""
from __future__ import annotations
import argparse, json, re, time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DOMAIN = "data.cityofnewyork.us"
API = "https://api.us.socrata.com/api/catalog/v1"
GEO_TYPES = {"point", "location", "polygon", "line", "multipolygon", "multipoint", "multiline"}
HTML = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")

def clean(text) -> str:
    text = HTML.sub(" ", str(text or ""))
    text = text.replace("&amp;", "&").replace("&nbsp;", " ").replace("&#39;", "'").replace("&quot;", '"')
    return WS.sub(" ", text).strip()

def first_sentence(text: str, max_chars: int = 240) -> str:
    text = clean(text)
    if not text:
        return ""
    match = re.search(r"(.+?[.!?])(\s|$)", text)
    sentence = match.group(1) if match else text
    if len(sentence) > max_chars:
        sentence = sentence[:max_chars].rsplit(" ", 1)[0] + "..."
    return sentence

def fetch_page(offset: int, limit: int) -> dict:
    params = {"domains": DOMAIN, "search_context": DOMAIN, "offset": str(offset), "limit": str(limit)}
    req = Request(API + "?" + urlencode(params), headers={"Accept": "application/json", "User-Agent": "nycif-catalog/1.0"})
    with urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))

def agency(item: dict) -> str:
    for kv in item.get("classification", {}).get("domain_metadata", []) or []:
        if kv.get("key") in {"Dataset-Information_Agency", "Agency"} and kv.get("value"):
            return clean(kv["value"])
    return clean(item.get("resource", {}).get("attribution") or "agency not specified")

def has_geo(item: dict) -> bool:
    cols = item.get("resource", {}).get("columns_datatype", []) or []
    return any(str(col).lower() in GEO_TYPES for col in cols)

def normalize_agency(raw: str) -> tuple[str, str]:
    text = clean(raw).replace("’", "'").replace("&", "and")
    key = re.sub(r"\s*\([A-Z][A-Z0-9 &/\-]+\)\s*$", "", text).strip().lower()
    return text, key

def record(item: dict) -> dict:
    res = item.get("resource", {})
    cls = item.get("classification", {})
    rid = res.get("id") or res.get("resource_name") or ""
    tags = cls.get("domain_tags") or cls.get("tags") or []
    return {
        "id": rid,
        "name": clean(res.get("name")),
        "summary": first_sentence(res.get("description")),
        "category": cls.get("domain_category") or "Uncategorized",
        "agency": agency(item),
        "type": res.get("type", "dataset"),
        "tags": tags[:8],
        "updated": res.get("data_updated_at") or res.get("updatedAt") or "",
        "created": res.get("createdAt") or "",
        "views": int(res.get("page_views", {}).get("page_views_total") or 0) if isinstance(res.get("page_views"), dict) else 0,
        "downloads": int(res.get("download_count") or 0),
        "has_geo": has_geo(item),
        "url": f"https://{DOMAIN}/d/{rid}" if rid else None,
        "json_url": f"https://{DOMAIN}/resource/{rid}.json" if rid else None,
        "geojson_url": f"https://{DOMAIN}/resource/{rid}.geojson" if rid else None,
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geo-only", action="store_true")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--out", default="catalog")
    args = parser.parse_args()
    first = fetch_page(0, args.limit)
    total = int(first.get("resultSetSize", 0))
    items = list(first.get("results", []))
    offset = args.limit
    while offset < total:
        page = fetch_page(offset, args.limit)
        items.extend(page.get("results", []))
        offset += args.limit
        time.sleep(0.1)
    rows = [record(item) for item in items]
    rows = [row for row in rows if row["id"] and row["name"]]
    if args.geo_only:
        rows = [row for row in rows if row["has_geo"]]
    counts = Counter(row["category"] for row in rows)
    agency_counts = Counter(row["agency"] for row in rows)
    tree = defaultdict(list)
    for row in rows:
        tree[row["category"]].append({"id": row["id"], "name": row["name"], "agency": row["agency"], "has_geo": row["has_geo"]})
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    full = {"fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "domain": DOMAIN, "count": len(rows), "categories": dict(counts), "agencies": dict(agency_counts), "datasets": rows, "tree": tree}
    mini = {"fetched_at": full["fetched_at"], "count": len(rows), "categories": dict(counts), "datasets": [{"i": r["id"], "n": r["name"], "s": r["summary"], "c": r["category"], "a": r["agency"], "u": r["updated"], "g": r["has_geo"]} for r in rows]}
    (out / "nyc_open_data_catalog.json").write_text(json.dumps(full, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out / "nyc_open_data_catalog.min.json").write_text(json.dumps(mini, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    (out / "nyc_open_data_tree.txt").write_text("\n".join(f"{r['category']} | {r['agency']} | {r['name']} | {r['id']}" for r in rows) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} datasets")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
