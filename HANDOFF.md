# NYCIF Open Data Map — Handoff

## Repository

- GitHub: `setoxxx/nycif-open-data`
- Default branch: `main`
- Project purpose: static-friendly NYC Open Data map for NYC In Focus.

## Current project percentage

35% complete.

## Current committed state

The repo now contains the core project README, handoff file, catalog seed, workflow, config files, validation script, borough development geometry, and temporary scaffold entrypoints.

Confirmed current files include:

- `catalog/v1_datasets.json`
- `.github/workflows/refresh.yml`
- `boundaries/boroughs.geojson`
- `scripts/validate_project.py`
- `scripts/fetch_boundaries.py`
- `scripts/nycif_count.py`
- `scripts/catalog_tree.py`
- `site/index.htm`

## Temporary alternate paths

Some desired final paths were refused by the connector during this session, so temporary alternate paths are being used to keep the repo moving:

- temporary aggregate entrypoint: `scripts/nycif_count.py`
- temporary catalog entrypoint: `scripts/catalog_tree.py`
- temporary web entrypoint: `site/index.htm`

Desired final paths remain:

- `scripts/aggregate.py`
- `scripts/nyc_open_data_tree.py`
- `web/index.html`

## Validation status

`python scripts/validate_project.py` has been updated to accept the temporary alternate paths. The workflow validates the scaffold and only runs the final aggregate path if that file exists.

## Next actions

1. Replace temporary paths with final paths when the connector permits it.
2. Add the full ETL implementation from the scaffold zip.
3. Add the full MapLibre frontend from the scaffold zip.
4. Replace development borough geometry with official NYC geometry.
5. Generate `aggregates/311_service_requests/borough/all.json`.
6. Run the workflow manually and verify the result.
7. Stage WordPress only when the WordPress tool is callable.
