# NYC In Focus Open Data Map

Interactive, static-friendly NYC Open Data map for **NYC In Focus**.

The project turns large public datasets into readable map layers by aggregating raw NYC Open Data rows to the geographic boundaries that make sense for each agency: boroughs, police precincts, community districts, council districts, ZIP/ZCTA areas, and more.

## Current MVP

This repository is initialized with:

- Project docs in `docs/`, copied from the NYC In Focus project kit.
- A dataset catalog generator in `scripts/nyc_open_data_tree.py`.
- A v1 dataset shortlist in `catalog/v1_datasets.json`.
- An aggregation script in `scripts/aggregate.py`.
- A boundary downloader/normalizer in `scripts/fetch_boundaries.py`.
- A MapLibre web MVP in `web/index.html`.
- A scheduled GitHub Actions refresh workflow in `.github/workflows/refresh.yml`.

The first wired map layer is 311 Service Requests aggregated by borough. The frontend is cache-first: it looks for `aggregates/311_service_requests/borough/all.json`, then falls back to a live Socrata aggregation query when the cache has not been generated yet.

## Data model

Do **not** commit raw NYC Open Data dumps. The repo stores only small, useful artifacts:

1. Boundary GeoJSON files.
2. Dataset catalog metadata.
3. Pre-aggregated summaries for choropleths.
4. Static frontend files.

Huge source datasets stay live on NYC Open Data and are queried through Socrata APIs.

## Local quick start

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/web/
```

The map can run without a generated aggregate because it falls back to live NYC Open Data queries in the browser.

## Run the catalog

```bash
python3 scripts/nyc_open_data_tree.py --geo-only
```

This writes the current NYC Open Data catalog outputs next to the script. Move or copy the JSON output into `catalog/` when you are ready to version it.

## Fetch boundaries

```bash
python3 scripts/fetch_boundaries.py boroughs
python3 scripts/fetch_boundaries.py police_precincts community_districts council_districts zcta ntas
```

Boundary source IDs should be re-verified against the live catalog before treating non-borough layers as publication-ready. The downloader preserves this by marking source metadata and normalizing join IDs.

## Generate aggregates

```bash
python3 scripts/aggregate.py --dataset 311_service_requests --boundary borough
```

With a Socrata app token:

```bash
python3 scripts/aggregate.py --dataset 311_service_requests --boundary borough --token "$SOCRATA_APP_TOKEN"
```

## GitHub Actions

The refresh workflow is manual and scheduled. Add this repository secret if available:

```text
SOCRATA_APP_TOKEN
```

The workflow runs the aggregation script and commits changed aggregate files back to the repo.

## WordPress / NYC In Focus deployment path

Recommended first deployment:

1. Serve `web/index.html` from GitHub Pages or a static path.
2. Embed the published map URL on an NYC In Focus WordPress page with an iframe.
3. Keep the repo as the source of truth for code, data-cache outputs, docs, and handoff notes.

A production WordPress page should stay lightweight: intro text, iframe embed, source/method note, and links to NYC Open Data and the GitHub repo.

## Handoff

See `HANDOFF.md` for the exact current state and next actions.
