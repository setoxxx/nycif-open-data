#!/usr/bin/env python3
"""Offline validation for the NYCIF Open Data scaffold."""
from __future__ import annotations

import json
import py_compile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md",
    "HANDOFF.md",
    "catalog/v1_datasets.json",
    "web/index.html",
    "scripts/aggregate.py",
    "scripts/fetch_boundaries.py",
    "scripts/nyc_open_data_tree.py",
    "boundaries/boroughs.geojson",
    ".github/workflows/refresh.yml",
]
EXPECTED_BOROUGH_IDS = {"MN", "BX", "BK", "QN", "SI"}


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
    print("OK JSON/GeoJSON parse")


def check_python() -> None:
    for path in (ROOT / "scripts").glob("*.py"):
        py_compile.compile(str(path), doraise=True)
    print("OK Python compiles")


def check_borough_join() -> None:
    data = json.loads((ROOT / "boundaries/boroughs.geojson").read_text(encoding="utf-8"))
    ids = {str(feature.get("properties", {}).get("id")) for feature in data.get("features", [])}
    if ids != EXPECTED_BOROUGH_IDS:
        fail(f"borough ids mismatch: {sorted(ids)}")
    print("OK borough ids")


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


def check_no_obvious_secrets() -> None:
    forbidden_fragments = ["s" + "k-", "BEGIN" + " PRIVATE " + "KEY", "xox" + "b-", "A" + "KIA", "gh" + "p_"]
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for frag in forbidden_fragments:
            if frag in text:
                fail(f"possible secret marker {frag} in {path.relative_to(ROOT)}")
    print("OK no obvious secret markers")


def main() -> int:
    check_required()
    check_json()
    check_python()
    check_borough_join()
    check_catalog()
    check_no_obvious_secrets()
    print("VALIDATION PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
