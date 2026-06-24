#!/usr/bin/env python3
"""Create small aggregate JSON files from the v1 dataset catalog."""
from __future__ import annotations
import argparse, json, os, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BORO = {"MANHATTAN":"MN","NEW YORK":"MN","BRONX":"BX","THE BRONX":"BX","BROOKLYN":"BK","KINGS":"BK","QUEENS":"QN","STATEN ISLAND":"SI","RICHMOND":"SI","MN":"MN","BX":"BX","BK":"BK","QN":"QN","SI":"SI","1":"MN","2":"BX","3":"BK","4":"QN","5":"SI"}

def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def fetch_json(url: str, token: str | None = None):
    headers = {"Accept": "application/json", "User-Agent": "nycif-open-data/1.0"}
    if token:
        headers["X-App-Token"] = token
    req = Request(url, headers=headers)
    last = None
    for attempt in range(4):
        try:
            with urlopen(req, timeout=90) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError) as exc:
            last = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"fetch failed: {last}")

def normalize(value, kind: str) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if kind == "borough_name":
        return BORO.get(text.upper())
    if kind == "precinct":
        match = re.search(r"\d+", text)
        return str(int(match.group(0))) if match else None
    return text

def data_id(dataset: dict) -> str:
    return dataset.get("dataset_id") or dataset.get("resource_id")

def run_one(dataset: dict, agg: dict, args) -> Path:
    domain = dataset.get("domain", "data.cityofnewyork.us")
    rid = data_id(dataset)
    field = agg["field"]
    params = {"$select": f"{field}, count(*) as count", "$group": field, "$order": "count DESC", "$limit": str(args.limit)}
    if agg.get("where"):
        params["$where"] = agg["where"]
    url = f"https://{domain}/resource/{rid}.json?" + urlencode(params)
    rows = fetch_json(url, args.token)
    counts = {}
    raw_values = {}
    for row in rows:
        key = normalize(row.get(field), agg.get("value_kind", "raw"))
        if not key:
            continue
        count = int(float(row.get("count") or row.get("count_1") or 0))
        counts[key] = counts.get(key, 0) + count
        raw_values.setdefault(key, str(row.get(field)))
    payload = {"schema_version": 1, "dataset_slug": dataset["slug"], "dataset_name": dataset.get("name"), "dataset_id": rid, "boundary": agg.get("boundary"), "period": "all", "generated_at": now(), "source_query": url, "counts": counts, "raw_values": raw_values, "total_count": sum(counts.values())}
    out = Path(args.out) / dataset["slug"] / agg.get("boundary", "unknown") / "all.json"
    write_json(out, payload)
    return out

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", default="catalog/v1_datasets.json")
    parser.add_argument("--out", default="aggregates")
    parser.add_argument("--dataset", action="append")
    parser.add_argument("--limit", type=int, default=50000)
    parser.add_argument("--token", default=os.environ.get("SOCRATA_APP_TOKEN"))
    args = parser.parse_args()
    catalog = read_json(Path(args.catalog))
    wanted = set(args.dataset or [])
    wrote = 0
    for dataset in catalog.get("datasets", []):
        if wanted and dataset.get("slug") not in wanted:
            continue
        for agg in dataset.get("aggregations", []):
            out = run_one(dataset, agg, args)
            print(f"wrote {out}")
            wrote += 1
    print(f"done: {wrote} files")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
