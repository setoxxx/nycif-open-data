# NYCIF Open Data Map — Handoff

Current project percentage: 84% complete.

Completed since previous checkpoint:

- Verified current repo state from the 82% checkpoint.
- Confirmed no `Refresh generated data` commit is visible through the connector.
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Did not claim live-data readiness.
- Improved `scripts/validate_project.py` with map input consistency checks:
  - aggregate `counts` must be an object
  - aggregate count keys must match boundary feature IDs
  - counts must be non-negative numbers
  - `total_count`, when present, must match the sum of counts
- Re-checked `web/index.html`; it remains aligned with launch blockers and visible QA warnings.

Current status:

- The repo is structurally safer for a future refresh run.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- The next real progress point is generated data, not more sample styling.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh and commit real generated files, then perform live-data QA.
