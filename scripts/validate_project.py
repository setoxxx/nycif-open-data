#!/usr/bin/env python3
"""Offline validation for the NYCIF Open Data scaffold."""
from __future__ import annotations

import argparse
import json
import py_compile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md",
    "HANDOFF.md",
    "catalog/v1_datasets.json",
    "boundaries/boroughs.geojson",
    ".github/workflows/refresh.yml",
    "scripts/aggregate.py",
    "scripts/fetch_boundaries.py",
    "scripts/nyc_open_data_tree.py",
    "web/index.html",
]
EXPECTED_BOROUGH_IDS = {"MN", "BX", "BK", "QN", "SI"}
AGGREGATE = ROOT / "aggregates/311_service_requests/borough/all.json"
BOUNDARIES = ROOT / "boundaries/boroughs.geojson"


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def check_required() -> None:
    for rel in REQUIRED:
        if not (ROOT / rel).exists():
            fail(f"missing {rel}")
    print("OK required files")


def check_json() -> None:
    for path in ROOT.rglob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))
    for path in ROOT.rglob("*.geojson"):
        json.loads(path.read_text(encoding="utf-8"))
    print("OK JSON and GeoJSON parse")


def check_python() -> None:
    for path in (ROOT / "scripts").glob("*.py"):
        py_compile.compile(str(path), doraise=True)
    print("OK Python compiles")


def read_boundaries() -> dict:
    return json.loads(BOUNDARIES.read_text(encoding="utf-8"))


def read_aggregate() -> dict | None:
    if not AGGREGATE.exists():
        return None
    return json.loads(AGGREGATE.read_text(encoding="utf-8"))


def check_borough_join(strict_refresh: bool) -> set[str]:
    data = read_boundaries()
    features = data.get("features", [])
    ids = {str(feature.get("properties", {}).get("id")) for feature in features}
    if ids != EXPECTED_BOROUGH_IDS:
        fail(f"borough ids mismatch: {sorted(ids)}")
    metadata = data.get("metadata", {})
    status = metadata.get("status")
    if status == "development_placeholder":
        msg = "borough geometry is development placeholder only"
        if strict_refresh:
            fail(msg)
        print(f"WARN {msg}")
    if strict_refresh:
        accepted_statuses = {"generated_from_source", "kept_existing_source_unavailable"}
        if status not in accepted_statuses:
            fail("borough geometry is missing generated_from_source status")
        if status == "kept_existing_source_unavailable":
            print("WARN borough geometry source unavailable; preserved existing boundary file")
        if not metadata.get("source_url") or not metadata.get("source_dataset_id"):
            fail("borough geometry missing source metadata")
        if status == "generated_from_source" and metadata.get("feature_count") != len(features):
            fail("borough feature_count metadata does not match feature length")
        if status == "kept_existing_source_unavailable" and metadata.get("feature_count") not in (None, len(features)):
            print("WARN preserved boundary feature_count metadata is stale; using actual feature length")
    print("OK borough ids")
    return ids


def check_catalog() -> None:
    catalog = json.loads((ROOT / "catalog/v1_datasets.json").read_text(encoding="utf-8"))
    slugs = set()
    for dataset in catalog.get("datasets", []):
        slug = dataset.get("slug")
        if not slug:
            fail("dataset missing slug")
        if slug in slugs:
            fail(f"duplicate slug {slug}")
        slugs.add(slug)
        if not (dataset.get("dataset_id") or dataset.get("resource_id")):
            fail(f"dataset {slug} missing dataset/resource id")
        if not dataset.get("aggregations"):
            fail(f"dataset {slug} missing aggregations")
    print(f"OK dataset catalog ({len(slugs)} datasets)")


def check_aggregate_status(strict_refresh: bool) -> dict | None:
    data = read_aggregate()
    if data is None:
        msg = "aggregate not generated yet"
        if strict_refresh:
            fail(msg)
        print(f"WARN {msg}")
        return None
    if data.get("development_sample") or data.get("status") == "development_sample":
        msg = "aggregate is development sample only"
        if strict_refresh:
            fail(msg)
        print(f"WARN {msg}; replace before public launch")
    elif strict_refresh:
        if not data.get("generated_at"):
            fail("aggregate missing generated_at")
        if not data.get("source_query"):
            fail("aggregate missing source_query")
        if not data.get("dataset_id"):
            fail("aggregate missing dataset_id")
        print("OK aggregate provenance")
    else:
        print("OK aggregate appears generated")
    return data


def check_map_input_consistency(boundary_ids: set[str], aggregate: dict | None) -> None:
    if aggregate is None:
        return
    counts = aggregate.get("counts")
    if not isinstance(counts, dict):
        fail("aggregate missing counts object")
    count_ids = {str(key) for key in counts}
    if count_ids != boundary_ids:
        fail(f"aggregate/boundary key mismatch: aggregate={sorted(count_ids)} boundaries={sorted(boundary_ids)}")
    for key, value in counts.items():
        if not isinstance(value, (int, float)) or value < 0:
            fail(f"aggregate count for {key} is not a non-negative number")
    total = aggregate.get("total_count")
    if isinstance(total, (int, float)) and int(total) != int(sum(counts.values())):
        fail("aggregate total_count does not equal sum of counts")
    print("OK aggregate keys match boundary ids")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict-refresh", action="store_true", help="Fail if QA placeholder files remain after refresh.")
    args = parser.parse_args()
    check_required()
    check_json()
    check_python()
    boundary_ids = check_borough_join(args.strict_refresh)
    check_catalog()
    aggregate = check_aggregate_status(args.strict_refresh)
    check_map_input_consistency(boundary_ids, aggregate)
    print("VALIDATION PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
