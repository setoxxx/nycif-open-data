# NYCIF Open Data Map — Handoff

Current project percentage: 60% complete.

Completed since previous checkpoint:

- Upgraded `scripts/fetch_boundaries.py` from placeholder to working borough boundary fetch/normalization script.
- Upgraded `scripts/nyc_open_data_tree.py` from placeholder to working Socrata catalog index builder.
- Created final `web/index.html` path.
- Updated `web/index.html` to load `aggregates/311_service_requests/borough/all.json` when available.
- Updated validation so required files now use final paths only.
- Deleted temporary `scripts/nycif_count.py`, `scripts/catalog_tree.py`, and `site/index.htm`.

Still pending:

- Run or manually trigger the refresh workflow.
- Confirm `aggregates/311_service_requests/borough/all.json` is generated.
- Replace development borough geometry with official NYC geometry after verifying the boundary fetch.
- Remove stray `scripts/a.py` if deletion becomes available.
- Build the MapLibre choropleth layer after aggregate output is confirmed.

Next: verify workflow output, commit generated aggregate JSON if needed, then wire MapLibre rendering.
