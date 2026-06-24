#!/usr/bin/env python3
"""Fetch NYC boundary GeoJSON and normalize join keys for the map."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from urllib.request import Request, urlopen

SOURCES = {
    "boroughs": {
        "url": "https://data.cityofnewyork.us/resource/7t3b-ywvw.geojson?$limit=5000",
        "out": "boroughs.geojson",
        "id_fields": ["boro_code", "borocode", "BoroCode", "boro_name", "BoroName"],
        "name_fields": ["boro_name", "BoroName", "name"],
        "kind": "borough",
    }
}
BORO_CODE = {"1": "MN", "2": "BX", "3": "BK", "4": "QN", "5": "SI"}
BORO_NAME = {"MANHATTAN": "MN", "NEW YORK": "MN", "BRONX": "BX", "BROOKLYN": "BK", "QUEENS": "QN", "STATEN ISLAND": "SI"}
NAMES = {"MN": "Manhattan", "BX": "Bronx", "BK": "Brooklyn", "QN": "Queens", "SI": "Staten Island"}

def fetch(url: str) -> dict:
    req = Request(url, headers={"Accept": "application/geo+json, application/json", "User-Agent": "nycif-boundaries/1.0"})
    with urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))

def pick(props: dict, fields: list[str]):
    lower = {str(k).lower(): k for k in props}
    for field in fields:
        if field in props:
            return props[field]
        key = lower.get(field.lower())
        if key is not None:
            return props[key]
    return None

def norm(value, kind: str) -> str:
    text = str(value).strip()
    if kind == "borough":
        return BORO_CODE.get(text) or BORO_NAME.get(text.upper()) or text
    return text

def round_coords(obj, digits: int):
    if isinstance(obj, list):
        if obj and all(isinstance(x, (int, float)) for x in obj):
            return [round(float(x), digits) for x in obj]
        return [round_coords(x, digits) for x in obj]
    return obj

def normalize(data: dict, source: dict, digits: int) -> dict:
    features = []
    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        raw_id = pick(props, source["id_fields"]) or pick(props, source["name_fields"])
        if raw_id is None:
            continue
        join_id = norm(raw_id, source.get("kind", "raw"))
        geom = feature.get("geometry") or {}
        features.append({
            "type": "Feature",
            "id": join_id,
            "properties": {"id": join_id, "join_key": join_id, "name": NAMES.get(join_id, str(raw_id))},
            "geometry": {"type": geom.get("type"), "coordinates": round_coords(geom.get("coordinates"), digits)},
        })
    return {"type": "FeatureCollection", "name": source["out"].replace(".geojson", ""), "metadata": {"source_url": source["url"], "normalized_for": "NYC In Focus"}, "features": features}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--boundary", action="append", choices=sorted(SOURCES), help="Repeatable. Default: all.")
    parser.add_argument("--out", default="boundaries")
    parser.add_argument("--digits", type=int, default=5)
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for key in args.boundary or sorted(SOURCES):
        source = SOURCES[key]
        path = out_dir / source["out"]
        path.write_text(json.dumps(normalize(fetch(source["url"]), source, args.digits), indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"wrote {path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
