# NYCIF Open Data Map — Handoff

Current project percentage: 89% complete.

Completed since previous checkpoint:

- Verified Howard successfully cloned the repo and pushed generated 311 borough aggregate data.
- Confirmed `aggregates/311_service_requests/borough/all.json` now contains generated 311 counts with generated_at, source_query, dataset_id, and total_count.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry because the boundary fetch failed with HTTP 404.
- Did not claim live-data readiness.
- Diagnosed the boundary failure: `scripts/fetch_boundaries.py` used the Socrata resource GeoJSON path, which returned 404 for the geospatial boundary dataset.
- Updated `scripts/fetch_boundaries.py` to use Socrata's geospatial export endpoint for dataset `7t3b-ywvw`.

Current status:

- Aggregate data is now generated and committed.
- Borough boundary data is still pending.
- The frontend remains QA-only until generated boundaries replace the placeholder file and strict validation passes.
- No live-data readiness claim should be made yet.

Still pending:

- Pull the latest repo changes locally.
- Re-run the borough boundary fetch with `python3` from the repo root.
- Re-run strict validation.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- QA borough join IDs, count scale, colors, popups, mobile layout, provenance metadata, and warning removal after generated boundaries exist.
- Stage WordPress only when the WordPress connector is callable.

Next: pull the patched boundary fetcher, generate borough boundaries, run strict validation, commit the boundary file, then perform live-data QA.
