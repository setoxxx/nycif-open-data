# NYCIF Open Data Map — Handoff

## Repository

- GitHub: `setoxxx/nycif-open-data`
- Default branch: `main`
- Project purpose: static-friendly NYC Open Data map for NYC In Focus.

## Access status confirmed

- GitHub connector reports admin, maintain, pull, push, and triage permissions on the repo.
- WordPress connector responds for the NYC In Focus site and can read post counts.

## Seeded project state

The repository has been initialized with the project README. The next implementation batch should add:

1. `catalog/v1_datasets.json` — curated v1 dataset shortlist.
2. `scripts/aggregate.py` — Socrata server-side aggregation to small JSON summaries.
3. `scripts/fetch_boundaries.py` — boundary GeoJSON fetch/normalization helper.
4. `web/index.html` — MapLibre MVP.
5. `.github/workflows/refresh.yml` — scheduled/manual aggregate refresh.
6. `docs/` — project kit docs copied from the uploaded kit.
7. WordPress draft page: `NYC Open Data Map`, slug `nyc-open-data-map`.

## Architecture locked in

- Tier 1: committed boundaries, catalog metadata, and aggregate summaries.
- Tier 2: raw NYC Open Data rows queried live by the browser or scripts.
- Tier 3: future PMTiles/vector tiles when GeoJSON gets too heavy.

Raw datasets must not be committed.

## Current implementation target

The first wired map layer is 311 Service Requests by borough.

Expected MVP behavior:

1. Load borough boundary GeoJSON from the repo when present.
2. If the repo boundary file is missing, fetch the configured borough boundary source live.
3. Load cached 311 borough aggregate from `aggregates/311_service_requests/borough/all.json` when present.
4. If the cache is missing, fetch live 311 borough counts using SoQL in the browser.

## Verification notes

- `311_service_requests` uses NYC Open Data dataset ID `erm2-nwe9`.
- Non-311 layer IDs and boundary source IDs should be verified by running the catalog script before public launch.
- Do not present unverified layers as confirmed.

## Next actions

1. Add the project files listed above.
2. Run Python syntax validation on all scripts.
3. Add `SOCRATA_APP_TOKEN` as a repository secret if available.
4. Trigger the refresh workflow manually.
5. Enable GitHub Pages or deploy the `/web/` static map to the chosen distro/static host.
6. Create a WordPress draft page with map embed placeholder and source/method note.
7. QA mobile display, join keys, counts, and source links before publication.
