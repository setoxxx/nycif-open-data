# NYCIF Open Data Map — Handoff

Current project percentage: 85% complete.

Completed since previous checkpoint:

- Verified `HANDOFF.md` now reflects the previous validator improvement.
- Confirmed `scripts/validate_project.py` includes aggregate/boundary map-input consistency checks:
  - aggregate `counts` must be an object
  - aggregate count keys must match boundary feature IDs
  - counts must be non-negative numbers
  - `total_count`, when present, must match the sum of counts
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Confirmed no `Refresh generated data` commit is visible through the connector.
- Checked workflow evidence for the validator commit; no workflow runs were visible through the connector.
- Re-checked `scripts/aggregate.py`; its real generated output shape matches the validator/frontend expectations.
- Did not claim live-data readiness.

Current status:

- The repo is structurally safer and ready for a real refresh run.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- Further sample-data UI polishing should be avoided unless it fixes a concrete launch-safety issue.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh and commit real generated files, then perform live-data QA.
